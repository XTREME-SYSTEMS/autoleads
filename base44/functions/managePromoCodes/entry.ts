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
    const action = body?.action || 'list';

    // Verify admin
    let user;
    try { user = await base44.auth.me(); } catch { return Response.json({ error: 'Not authenticated' }, { status: 401 }); }
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    if (action === 'create') {
      const code = String(body.code || '').toUpperCase().trim();
      if (!code) return Response.json({ error: 'Code is required' }, { status: 400 });
      const dtype = body.discount_type;
      const dval = Number(body.discount_value) || 0;

      // Create Stripe coupon
      const couponParams = new URLSearchParams();
      if (dtype === 'percentage') {
        couponParams.set('percent_off', String(dval));
      } else if (dtype === 'fixed_amount') {
        couponParams.set('amount_off', String(Math.round(dval * 100)));
        couponParams.set('currency', 'usd');
      } else if (dtype === 'free_months') {
        couponParams.set('duration', 'repeating');
        couponParams.set('duration_in_months', String(dval));
      } else {
        return Response.json({ error: 'Invalid discount_type' }, { status: 400 });
      }
      couponParams.set('name', body.description || code);
      if (body.max_uses > 0) couponParams.set('max_redemptions', String(body.max_uses));
      if (body.valid_until) couponParams.set('redeem_by', String(Math.floor(new Date(body.valid_until).getTime() / 1000)));

      const coupon = await stripeRequest('coupons', {
        method: 'POST',
        headers: { 'Idempotency-Key': `autoleads:coupon:${code}:${Date.now()}` },
        body: couponParams.toString(),
      });

      // Create Stripe promotion code
      const promoParams = new URLSearchParams();
      promoParams.set('coupon', coupon.id);
      promoParams.set('code', code);
      const promo = await stripeRequest('promotion_codes', {
        method: 'POST',
        headers: { 'Idempotency-Key': `autoleads:promo:${code}:${Date.now()}` },
        body: promoParams.toString(),
      });

      // Store local record
      const record = await base44.entities.PromoCode.create({
        code,
        description: body.description || '',
        discount_type: dtype,
        discount_value: dval,
        max_uses: body.max_uses || 0,
        used_count: 0,
        valid_from: body.valid_from || new Date().toISOString(),
        valid_until: body.valid_until || '',
        status: 'active',
        applicable_plans: body.applicable_plans || 'all',
        min_purchase_amount: body.min_purchase_amount || 0,
        stripe_coupon_id: coupon.id,
        stripe_promo_id: promo.id,
        created_by_name: user?.email || 'admin',
        notes: body.notes || '',
      });

      return Response.json({ success: true, promo_code: record });
    }

    if (action === 'list') {
      const codes = await base44.entities.PromoCode.list('-created_date', 100);
      return Response.json({ success: true, promo_codes: codes });
    }

    if (action === 'archive') {
      const promoId = body.stripe_promo_id;
      if (promoId) {
        const params = new URLSearchParams();
        params.set('active', 'false');
        await stripeRequest(`promotion_codes/${promoId}`, { method: 'POST', body: params.toString() });
      }
      await base44.entities.PromoCode.update(body.id, { status: 'paused' });
      return Response.json({ success: true });
    }

    if (action === 'delete') {
      if (body.stripe_promo_id) {
        try { await stripeRequest(`promotion_codes/${body.stripe_promo_id}`, { method: 'DELETE' }); } catch { /* ignore */ }
      }
      await base44.entities.PromoCode.delete(body.id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    const msg = error?.message || 'Failed';
    if (msg === 'STRIPE_NOT_CONFIGURED') return Response.json({ error: 'Stripe not configured' }, { status: 503 });
    return Response.json({ error: msg }, { status: 500 });
  }
}