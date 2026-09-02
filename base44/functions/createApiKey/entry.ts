import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const body = await req.json();
    const { key_name, tier, rate_limit_per_hour, rate_limit_per_day, price_per_month, buyer_email, buyer_name, allowed_endpoints } = body;

    if (!key_name) return Response.json({ error: 'Key name required' }, { status: 400 });

    // Generate a random API key: al_ + 32 hex chars
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    const hexKey = Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const apiKey = `al_${hexKey}`;
    const keyPrefix = apiKey.slice(0, 12);

    // Hash the key for storage (SHA-256)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store the hashed key
    const record = await client.entities.ApiKey.create({
      key_name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      tier: tier || 'free',
      rate_limit_per_hour: rate_limit_per_hour || 100,
      rate_limit_per_day: rate_limit_per_day || 1000,
      status: 'active',
      allowed_endpoints: allowed_endpoints || ['leads'],
      price_per_month: price_per_month || 0,
      buyer_email: buyer_email || '',
      buyer_name: buyer_name || '',
      created_by_name: user.email || user.full_name || 'admin',
    });

    // Return the full key ONCE (never stored in plaintext)
    return Response.json({
      success: true,
      api_key: apiKey,
      key_prefix: keyPrefix,
      id: record.id,
      tier: record.tier,
      message: 'Save this key securely — it will not be shown again.',
    });
  } catch (error: any) {
    console.error('createApiKey error:', error);
    return Response.json({ error: error?.message || 'Failed to create API key' }, { status: 500 });
  }
}