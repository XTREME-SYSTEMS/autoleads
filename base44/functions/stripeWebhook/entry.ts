import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

function hex(bytes: ArrayBuffer): string { return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join(''); }
async function hmacSha256(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
}
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function(req: Request): Promise<Response> {
  try {
    const secret = secrets.get('STRIPE_WEBHOOK_SECRET') || '';
    if (!secret) return Response.json({ error: 'Webhook secret not configured' }, { status: 503 });
    const signature = req.headers.get('stripe-signature') || '';
    const parts = signature.split(',').map(p => p.trim().split('='));
    const timestamp = parts.find(p => p[0] === 't')?.[1] || '';
    const signatures = parts.filter(p => p[0] === 'v1').map(p => p[1]);
    if (!timestamp || signatures.length === 0) return Response.json({ error: 'Missing Stripe signature' }, { status: 400 });
    const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
    if (!Number.isFinite(age) || age > 300) return Response.json({ error: 'Stale Stripe webhook' }, { status: 400 });
    const raw = await req.text();
    const expected = await hmacSha256(secret, `${timestamp}.${raw}`);
    if (!signatures.some(sig => constantTimeEqual(sig, expected))) return Response.json({ error: 'Invalid Stripe signature' }, { status: 400 });

    const event = JSON.parse(raw);
    const base44 = createClientFromRequest(req);
    const entity = base44.asServiceRole.entities;
    const eventId = String(event?.id || '');

    // ---- Idempotency: check if this event was already processed ----
    if (eventId) {
      const existing = await entity.StripeEvent.filter({ event_id: eventId }).catch(() => []);
      if (existing && existing.length > 0) {
        return Response.json({ received: true, duplicate: true, event_id: eventId });
      }
    }

    const intent = event?.data?.object;
    const intentId = intent?.id;

    // ---- Record the event for idempotency ----
    async function recordEvent(outcome: string, details: string) {
      if (!eventId) return;
      try {
        await entity.StripeEvent.create({
          event_id: eventId,
          event_type: String(event?.type || 'unknown'),
          processed_date: new Date().toISOString(),
          outcome,
          details,
        });
      } catch (e) {
        // If create fails (e.g. duplicate), the filter above will catch it next time
        console.error('Failed to record Stripe event:', e?.message || e);
      }
    }

    // Handle subscription events (checkout, subscription lifecycle)
    if (event.type === 'checkout.session.completed') {
      const session = intent;
      const plan = session?.metadata?.plan || session?.subscription_data?.metadata?.plan;
      const customerId = session?.customer;
      const subscriptionId = session?.subscription;
      const customerEmail = session?.customer_email || session?.customer_details?.email;

      // Find the organization by customer email or customer ID
      let org = null;
      if (customerEmail) {
        const memberships = await entity.OrganizationMembership.filter({ user_email: customerEmail, status: 'active' }).catch(() => []);
        if (memberships && memberships.length > 0) {
          org = await entity.Organization.get(memberships[0].organization_id).catch(() => null);
        }
      }
      if (!org && customerId) {
        const orgs = await entity.Organization.filter({ stripe_customer_id: customerId }).catch(() => []);
        org = (orgs || [])[0] || null;
      }

      if (org && plan) {
        await entity.Organization.update(org.id, {
          plan,
          subscription_status: 'active',
          stripe_customer_id: customerId || org.stripe_customer_id,
          stripe_subscription_id: subscriptionId || org.stripe_subscription_id,
        }).catch(() => null);
      }

      await recordEvent('processed', `Checkout completed: plan=${plan}, org=${org?.id || 'unmatched'}`);
      return Response.json({ received: true, processed: true });
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = intent;
      const customerId = subscription?.customer;
      const status = subscription?.status;
      const plan = subscription?.metadata?.plan;

      if (customerId) {
        const orgs = await entity.Organization.filter({ stripe_customer_id: customerId }).catch(() => []);
        const org = (orgs || [])[0];
        if (org) {
          const subStatus = status === 'active' ? 'active' : status === 'trialing' ? 'trialing' : status === 'past_due' ? 'past_due' : status === 'canceled' ? 'canceled' : 'none';
          await entity.Organization.update(org.id, {
            subscription_status: subStatus,
            ...(plan ? { plan } : {}),
            stripe_subscription_id: subscription?.id || org.stripe_subscription_id,
          }).catch(() => null);
        }
      }
      await recordEvent('processed', `Subscription ${event.type}: status=${status}`);
      return Response.json({ received: true, processed: true });
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = intent;
      const customerId = subscription?.customer;
      if (customerId) {
        const orgs = await entity.Organization.filter({ stripe_customer_id: customerId }).catch(() => []);
        const org = (orgs || [])[0];
        if (org) {
          await entity.Organization.update(org.id, { subscription_status: 'canceled', plan: 'free' }).catch(() => null);
        }
      }
      await recordEvent('processed', 'Subscription canceled');
      return Response.json({ received: true, processed: true });
    }

    // ---- Payment intent events (invoice payments) ----
    if (!intentId || !String(intentId).startsWith('pi_')) {
      await recordEvent('ignored', `Event type ${event.type} — not a payment intent`);
      return Response.json({ received: true, ignored: true });
    }

    const payments = await entity.Payment.filter({ stripe_payment_id: intentId }).catch(() => []);
    const payment = (payments || [])[0];
    if (!payment) {
      await recordEvent('unmatched', `No payment for intent ${intentId}`);
      return Response.json({ received: true, unmatched: true });
    }

    if (event.type === 'payment_intent.succeeded') {
      const paidAmount = Number(intent.amount_received || intent.amount || 0) / 100;
      await entity.Payment.update(payment.id, {
        status: 'completed', provider_status: intent.status || 'succeeded', amount: paidAmount || payment.amount,
        transaction_date: new Date((intent.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      });
      if (payment.invoice_id) {
        const invoice = await entity.Invoice.get(payment.invoice_id).catch(() => null);
        if (invoice) {
          const remaining = Math.max(0, Number(invoice.balance_due ?? invoice.total ?? 0) - paidAmount);
          await entity.Invoice.update(invoice.id, {
            balance_due: remaining,
            status: remaining <= 0.005 ? 'paid' : 'partial',
            ...(remaining <= 0.005 ? { paid_date: new Date().toISOString().slice(0, 10) } : {}),
          });
        }
      }
      if (payment.project_id) {
        await entity.Project.update(payment.project_id, { stage: 'won' }).catch(() => null);
        await entity.PipelineEvent.create({
          project_id: payment.project_id, step: 'payment', status: 'completed', event_type: 'payment_succeeded', source_record_id: payment.id,
          message: `Payment of $${paidAmount.toFixed(2)} completed.`, occurred_at: new Date().toISOString(),
        }).catch(() => null);
      }
      await recordEvent('processed', `Payment ${intentId} succeeded: $${paidAmount}`);
    } else if (event.type === 'payment_intent.payment_failed' || event.type === 'payment_intent.canceled') {
      await entity.Payment.update(payment.id, { status: 'failed', provider_status: intent.status || event.type }).catch(() => null);
      if (payment.project_id) await entity.PipelineEvent.create({
        project_id: payment.project_id, step: 'payment', status: 'failed', event_type: event.type, source_record_id: payment.id,
        message: intent?.last_payment_error?.message || 'Payment failed or was cancelled.', occurred_at: new Date().toISOString(),
      }).catch(() => null);
      await recordEvent('processed', `Payment ${intentId} ${event.type}`);
    } else {
      await recordEvent('ignored', `Unhandled payment event: ${event.type}`);
    }

    return Response.json({ received: true });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Webhook processing failed' }, { status: 400 });
  }
}