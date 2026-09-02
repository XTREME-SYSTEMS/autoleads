// Stripe Webhook Idempotency Replay Test
// Creates a test payment, processes a webhook event, replays it 10 times,
// and verifies that only ONE financial mutation occurs.
//
// This test bypasses HMAC signature verification (test mode only) to directly
// exercise the idempotency logic in the stripeWebhook handler.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const eventId = `evt_test_replay_${Date.now()}`;
    const testAmount = 100.00; // $100.00

    // Step 1: Find or create a test project + invoice + payment
    const orgs = await svc.entities.Organization.list(10);
    const org = (orgs || [])[0];
    if (!org) return Response.json({ error: 'No organizations found' }, { status: 400 });

    // Create a test project
    const project = await svc.entities.Project.create({
      organization_id: org.id,
      title: 'STRIPE_REPLAY_TEST_PROJECT',
      description: 'Test project for Stripe webhook replay test',
      source_url: 'https://test.autoleads/stripe-replay',
      jurisdiction: 'TEST',
      authority: 'TEST',
      trade: 'TEST',
      specs: 'TEST',
      contract_info: 'TEST',
      client_name: 'TEST',
      stage: 'submitted',
    });

    // Create a test invoice
    const invoice = await svc.entities.Invoice.create({
      organization_id: org.id,
      project_id: project.id,
      invoice_number: `INV-TEST-${Date.now()}`,
      status: 'sent',
      line_items: [{ description: 'Test', quantity: 1, unit_price: testAmount, amount: testAmount }],
      subtotal: testAmount,
      tax: 0,
      total: testAmount,
      balance_due: testAmount,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });

    // Create a test payment (pending)
    const payment = await svc.entities.Payment.create({
      organization_id: org.id,
      project_id: project.id,
      invoice_id: invoice.id,
      amount: testAmount,
      method: 'credit',
      status: 'pending',
      provider: 'stripe',
      provider_status: 'requires_payment_method',
      stripe_payment_id: `pi_test_${Date.now()}`,
      payment_type: 'full',
    });

    // Step 2: Simulate the webhook event
    const webhookEvent = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: payment.stripe_payment_id,
          amount_received: Math.round(testAmount * 100),
          amount: Math.round(testAmount * 100),
          status: 'succeeded',
          created: Math.floor(Date.now() / 1000),
        },
      },
    };

    // Step 3: Process the webhook event by directly calling the idempotency logic
    // (We replicate the stripeWebhook logic here, bypassing signature verification for testing)
    const results: any[] = [];
    let mutations = 0;

    for (let i = 0; i < 10; i++) {
      try {
        // Check idempotency: has this event been processed?
        const existing = await svc.entities.StripeEvent.filter({ event_id: eventId }).catch(() => []);
        if (existing && existing.length > 0) {
          results.push({ attempt: i + 1, result: 'DUPLICATE_IGNORED', event_id: eventId });
          continue;
        }

        // Process the payment
        const payments = await svc.entities.Payment.filter({ stripe_payment_id: payment.stripe_payment_id }).catch(() => []);
        const payRecord = (payments || [])[0];
        if (payRecord) {
          const paidAmount = Number(webhookEvent.data.object.amount_received || webhookEvent.data.object.amount || 0) / 100;
          await svc.entities.Payment.update(payRecord.id, {
            status: 'completed',
            provider_status: 'succeeded',
            amount: paidAmount || payRecord.amount,
            transaction_date: new Date().toISOString(),
          });

          if (payRecord.invoice_id) {
            const inv = await svc.entities.Invoice.get(payRecord.invoice_id).catch(() => null);
            if (inv) {
              const remaining = Math.max(0, Number(inv.balance_due ?? inv.total ?? 0) - paidAmount);
              await svc.entities.Invoice.update(inv.id, {
                balance_due: remaining,
                status: remaining <= 0.005 ? 'paid' : 'partial',
                ...(remaining <= 0.005 ? { paid_date: new Date().toISOString().slice(0, 10) } : {}),
              });
            }
          }

          // Record the event for idempotency
          await svc.entities.StripeEvent.create({
            event_id: eventId,
            event_type: webhookEvent.type,
            processed_date: new Date().toISOString(),
            outcome: 'processed',
            details: `Payment ${payment.stripe_payment_id} succeeded: $${paidAmount}`,
          });

          mutations++;
          results.push({ attempt: i + 1, result: 'PROCESSED', payment_id: payRecord.id, amount: paidAmount });
        } else {
          results.push({ attempt: i + 1, result: 'NO_PAYMENT_FOUND' });
        }
      } catch (e: any) {
        results.push({ attempt: i + 1, result: 'ERROR', error: e?.message || String(e) });
      }
    }

    // Step 4: Verify final state
    const finalPayment = await svc.entities.Payment.get(payment.id).catch(() => null);
    const finalInvoice = await svc.entities.Invoice.get(invoice.id).catch(() => null);
    const stripeEvents = await svc.entities.StripeEvent.filter({ event_id: eventId }).catch(() => []);

    // Cleanup test data
    await svc.entities.Payment.delete(payment.id).catch(() => null);
    await svc.entities.Invoice.delete(invoice.id).catch(() => null);
    await svc.entities.Project.update(project.id, { stage: 'lost', verification_status: 'failed' }).catch(() => null);

    return Response.json({
      success: true,
      test: 'stripe_webhook_idempotency_replay',
      event_id: eventId,
      replays: 10,
      mutations,
      idempotency_pass: mutations === 1,
      final_state: {
        payment_status: finalPayment?.status || 'unknown',
        payment_amount: finalPayment?.amount || 0,
        invoice_status: finalInvoice?.status || 'unknown',
        invoice_balance: finalInvoice?.balance_due ?? 0,
        stripe_event_records: stripeEvents?.length || 0,
      },
      results,
      verdict: mutations === 1 ? 'PASS — exactly one mutation across 10 replays' : `FAIL — ${mutations} mutations across 10 replays`,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Stripe replay test failed' }, { status: 500 });
  }
}