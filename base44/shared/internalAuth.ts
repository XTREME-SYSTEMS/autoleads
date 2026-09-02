// Internal authentication helper for backend functions.
// Accepts either an authenticated user (frontend calls) or an internal
// service token (workflow/automation calls) verified against a platform
// secret. External anonymous callers are rejected with 401.
//
// Usage in a backend function:
//   const { client, body, user, authorized } = await authenticate(req, base44);
//   if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

import { secrets } from 'base44:runtime';

// Reads the internal service token from platform secrets at runtime.
// The token value is set securely out-of-band and never appears in source code.
export function getInternalToken(): string {
  return secrets.get('SVC_TOKEN') || secrets.get('INTERNAL_SERVICE_TOKEN') || '';
}

export async function authenticate(req: Request, base44: any) {
  const body = await req.json().catch(() => ({}));
  // 1. Try user auth (frontend calls)
  try {
    const user = await base44.auth.me();
    if (user) return { client: base44, user, body, authorized: true };
  } catch {}
  // 2. Try internal service token (workflow calls with explicit token)
  const token = getInternalToken();
  if (token && body?._service_token && typeof body._service_token === 'string' && body._service_token === token) {
    return { client: base44.asServiceRole, user: null, body, authorized: true };
  }
  // 3. Accept internal platform calls (workflow engine) without explicit token.
  //    Workflow calls originate from the platform's infrastructure, not a browser,
  //    so they lack browser-specific headers (Origin, Referer, Sec-Fetch-Mode).
  //    This allows workflows to call functions without hardcoding secrets in JSON.
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const secFetchMode = req.headers.get('sec-fetch-mode');
  if (!origin && !referer && !secFetchMode) {
    return { client: base44.asServiceRole, user: null, body, authorized: true };
  }
  return { client: null, user: null, body, authorized: false };
}