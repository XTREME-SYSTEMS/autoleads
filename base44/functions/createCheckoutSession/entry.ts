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

const PRICE_MAP: Record<string, { price: string; name: string; amount: number }> = {
  free:         { price: 'price_1U0xF8E1RJmhxwydN6zF2qE1', name: 'Free',         amount: 0 },
  starter:      { price: 'price_1U0xzTE1RJmhxwydylAjzS38', name: 'Starter',      amount: 10000 },
  pro:          { price: 'price_1U0xF8E1RJmhxwydRSlCaLDg', name: 'Pro',          amount: 14900 },
  elite:        { price: 'price_1U5dY6E1RJmhxwyd4aY1SrU1', name: 'Elite',        amount: 29900 },
  growth:       { price: 'price_1U0xzTE1RJmhxwydaHs2Cl0w', name: 'Growth',       amount: 20000 },
  professional: { price: 'price_1U0xzTE1RJmhxwydKc56w3Np', name: 'Professional', amount: 40000 },
  business:     { price: 'price_1U0xzTE1RJmhxwydTHCmdwxx', name: 'Business',     amount: 50000 },
  enterprise:   { price: 'price_1U0xJsE1RJmhxwydmePEKwfD', name: 'Enterprise',   amount: 49900 },
};

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const planKey = String(body?.plan || '').toLowerCase().trim();
    const plan = PRICE_MAP[planKey];
    if (!plan) return Response.json({ error: 'Invalid plan. Use: free, starter, pro, growth, professional, business, enterprise' }, { status: 400 });

    // Free plan doesn't need checkout
    if (plan.amount === 0) return Response.json({ success: true, free: true, message: 'Free plan requires no checkout' });

    const origin = String(body?.origin || 'https://autoleads.base44.app').replace(/\/$/, '');
    const params = new URLSearchParams();
    params.set('mode', 'subscription');
    params.set('line_items[0][price]', plan.price);
    params.set('line_items[0][quantity]', '1');
    params.set('success_url', `${origin}/settings/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
    params.set('cancel_url', `${origin}/pricing?checkout=cancelled`);
    params.set('metadata[plan]', planKey);
    params.set('metadata[base44_app_id]', Deno.env.get('BASE44_APP_ID') || '');
    params.set('subscription_data[metadata][plan]', planKey);
    params.set('subscription_data[metadata][base44_app_id]', Deno.env.get('BASE44_APP_ID') || '');
    params.set('allow_promotion_codes', 'true');

    // Attach customer email and org context if authenticated
    try {
      const user = await base44.auth.me();
      if (user?.email) params.set('customer_email', user.email);
      if (user?.active_organization_id) {
        params.set('metadata[organization_id]', user.active_organization_id);
        params.set('subscription_data[metadata][organization_id]', user.active_organization_id);
      }
    } catch { /* public app — user may not be authenticated */ }

    const session = await stripeRequest('checkout/sessions', {
      method: 'POST',
      headers: { 'Idempotency-Key': `autoleads:checkout:${planKey}:${Date.now()}` },
      body: params.toString(),
    });

    return Response.json({ success: true, checkout_url: session.url, session_id: session.id });
  } catch (error: any) {
    const message = error?.message || 'Checkout session creation failed';
    if (message === 'STRIPE_NOT_CONFIGURED') return Response.json({ error: 'Stripe is not configured', blocker: 'STRIPE_SECRET_KEY' }, { status: 503 });
    return Response.json({ error: message }, { status: 500 });
  }
}