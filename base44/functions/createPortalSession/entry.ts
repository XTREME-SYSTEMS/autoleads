import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

function stripeSecret(): string { return secrets.get('STRIPE_SECRET_KEY') || ''; }

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
    let user: any = null;
    try { user = await base44.auth.me(); } catch { /* public app */ }
    if (!user?.email) return Response.json({ error: 'Sign in required to manage billing' }, { status: 401 });

    // Find the Stripe customer by email
    const customersRes = await stripeRequest(`customers?email=${encodeURIComponent(user.email)}&limit=1`);
    const customer = (customersRes?.data || [])[0];
    if (!customer) return Response.json({ error: 'No billing account found. Subscribe to a plan first.', no_customer: true }, { status: 404 });

    const origin = String(body?.origin || 'https://autoleads.base44.app').replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('customer', customer.id);
    params.set('return_url', `${origin}/settings/billing`);

    const session = await stripeRequest('billing_portal/sessions', {
      method: 'POST',
      headers: { 'Idempotency-Key': `autoleads:portal:${customer.id}:${Date.now()}` },
      body: params.toString(),
    });

    return Response.json({ success: true, portal_url: session.url });
  } catch (error: any) {
    const message = error?.message || 'Portal session creation failed';
    if (message === 'STRIPE_NOT_CONFIGURED') return Response.json({ error: 'Stripe is not configured', blocker: 'STRIPE_SECRET_KEY' }, { status: 503 });
    return Response.json({ error: message }, { status: 500 });
  }
}