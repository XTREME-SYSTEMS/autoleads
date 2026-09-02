import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

function stripeSecret(): string { return secrets.get('STRIPE_SECRET_KEY') || ''; }
function asMoney(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; }

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function stripeRequest(path: string, init: RequestInit = {}) {
  const secret = stripeSecret();
  if (!secret) throw new Error('STRIPE_NOT_CONFIGURED');
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', `Bearer ${secret}`);
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/x-www-form-urlencoded');
  const res = await fetch(`https://api.stripe.com/v1/${path}`, { ...init, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Stripe API error (${res.status})`);
  return data;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    if (!stripeSecret()) return Response.json({ error: 'Stripe is not configured', blocker: 'STRIPE_SECRET_KEY' }, { status: 503 });

    const projectId = String(body?.project_id || '').trim();
    const invoiceId = String(body?.invoice_id || '').trim();
    if (!projectId || !invoiceId) return Response.json({ error: 'project_id and invoice_id are required' }, { status: 400 });

    // Use service role for entity lookups (invoice/project may belong to any org)
    const svc = base44.asServiceRole;
    const [project, invoice] = await Promise.all([
      svc.entities.Project.get(projectId).catch(() => null),
      svc.entities.Invoice.get(invoiceId).catch(() => null),
    ]);
    if (!project || !invoice || invoice.project_id !== projectId) {
      return Response.json({ error: 'Invoice or project not found' }, { status: 404 });
    }
    if (invoice.status === 'paid' || Number(invoice.balance_due || 0) <= 0) {
      return Response.json({ error: 'Invoice is already paid' }, { status: 409 });
    }

    // ---- Authorization: require either org membership OR a valid payment token ----
    let authorized = false;
    let orgId = project.organization_id || invoice.organization_id || '';

    // Path A: Authenticated user with org membership
    try {
      const user = await base44.auth.me();
      if (user) {
        const ctx = await resolveUserOrgs(base44, user.id);
        if (ctx.orgIds.includes(orgId)) {
          authorized = true;
        }
      }
    } catch (authErr) {
      // User not authenticated via session — payment token path (Path B) will be checked next
      console.error('PaymentIntent auth check failed (session path, token path may apply):', authErr?.message || authErr);
    }

    // Path B: Payment capability token (for clients paying an invoice)
    if (!authorized && body?.payment_token) {
      const tokenHash = await hashToken(String(body.payment_token));
      if (invoice.payment_token_hash && constantTimeEqual(String(invoice.payment_token_hash), tokenHash)) {
        // Check expiration
        if (invoice.payment_token_expires && new Date(invoice.payment_token_expires) > new Date()) {
          authorized = true;
        } else {
          return Response.json({ error: 'Payment link has expired' }, { status: 403 });
        }
      }
    }

    if (!authorized) {
      return Response.json({ error: 'Authorization required. Provide a valid payment token or log in as an organization member.' }, { status: 403 });
    }

    // ---- Server-side validation: amount, balance, currency ----
    const balance = asMoney(invoice.balance_due || invoice.total);
    const requested = asMoney(body?.amount || balance);
    if (requested < 0.50 || requested > balance) {
      return Response.json({ error: `Payment must be between $0.50 and $${balance.toFixed(2)}` }, { status: 400 });
    }
    const amountCents = Math.round(requested * 100);

    // Check for existing pending payment (idempotency)
    const existing = await svc.entities.Payment.filter({ invoice_id: invoiceId }).catch(() => []);
    const pending = (existing || []).find((p: any) => p.provider === 'stripe' && p.status === 'pending' && p.stripe_payment_id);
    if (pending) {
      try {
        const pi = await stripeRequest(`payment_intents/${encodeURIComponent(pending.stripe_payment_id)}`, { method: 'GET' });
        if (pi?.client_secret && pi.status !== 'canceled') {
          return Response.json({ success: true, idempotent: true, payment_id: pending.id, payment_intent_id: pi.id, client_secret: pi.client_secret, amount: requested });
        }
      } catch (checkErr) {
        // Existing pending payment check failed — fall through to create new PaymentIntent
        console.error('PaymentIntent existing-payment check failed, creating new:', { invoice_id: invoiceId, error: checkErr?.message || String(checkErr), retryable: true });
      }
    }

    const idempotencyKey = `autoleads:${invoiceId}:${amountCents}`;
    const params = new URLSearchParams();
    params.set('amount', String(amountCents));
    params.set('currency', String(body?.currency || 'usd').toLowerCase());
    params.set('automatic_payment_methods[enabled]', 'true');
    params.set('description', `AUTOLEADS ${invoice.invoice_number} - ${project.title}`.slice(0, 500));
    params.set('metadata[project_id]', projectId);
    params.set('metadata[invoice_id]', invoiceId);
    params.set('metadata[base44_app_id]', Deno.env.get('BASE44_APP_ID') || '');

    const pi = await stripeRequest('payment_intents', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: params.toString(),
    });

    const payment = await svc.entities.Payment.create({
      organization_id: orgId,
      project_id: projectId,
      invoice_id: invoiceId,
      amount: requested,
      method: 'credit',
      status: 'pending',
      provider: 'stripe',
      provider_status: pi.status || 'requires_payment_method',
      idempotency_key: idempotencyKey,
      stripe_payment_id: pi.id,
      deposit_pct: Number(body?.deposit_pct || 0),
      payment_type: body?.payment_type || 'deposit',
    });

    return Response.json({ success: true, payment_id: payment.id, payment_intent_id: pi.id, client_secret: pi.client_secret, amount: requested });
  } catch (error: any) {
    const message = error?.message || 'Payment initialization failed';
    if (message === 'STRIPE_NOT_CONFIGURED') return Response.json({ error: 'Stripe is not configured', blocker: 'STRIPE_SECRET_KEY' }, { status: 503 });
    return Response.json({ error: message }, { status: 500 });
  }
}