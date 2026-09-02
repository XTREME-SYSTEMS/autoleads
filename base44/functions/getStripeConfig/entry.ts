import { secrets } from 'base44:runtime';

// Returns the Stripe publishable key to the frontend so it can initialize Stripe.js.
// The publishable key is safe to expose publicly (it is not a secret).
export default async function(req: Request): Promise<Response> {
  try {
    const publishable_key = secrets.get('STRIPE_PUBLISHABLE_KEY') || '';
    if (!publishable_key) return Response.json({ error: 'Stripe publishable key not configured', blocker: 'STRIPE_PUBLISHABLE_KEY' }, { status: 503 });
    return Response.json({ publishable_key });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed to load Stripe config' }, { status: 500 });
  }
}