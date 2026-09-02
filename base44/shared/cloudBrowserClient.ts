// Shared client for the self-hosted cloud browser engine (Playwright + self-CAPTCHA).
// Deploy the browser-engine from the attached zip and set BROWSER_ENGINE_URL +
// BROWSER_ENGINE_API_KEY in Settings -> Secrets. When not configured, callers
// should fall back to InvokeLLM web search.
import { secrets } from 'base44:runtime';

export interface CloudBrowserResult {
  ok: boolean;
  content: string;
  error?: string;
  sessionId?: string;
}

function engineConfig() {
  const url = String(secrets.get('BROWSER_ENGINE_URL') || '').replace(/\/$/, '');
  const key = String(secrets.get('BROWSER_ENGINE_API_KEY') || '');
  return { url, key, configured: Boolean(url && key.length >= 16) };
}

export function isCloudBrowserConfigured(): boolean {
  return engineConfig().configured;
}

async function execAction(url: string, key: string, sid: string, action_type: string, payload: Record<string, any> = {}): Promise<any> {
  try {
    const res = await fetch(`${url}/sessions/${sid}/execute`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_type, ...payload }),
      signal: AbortSignal.timeout(90000),
    });
    return await res.json().catch(() => ({}));
  } catch {
    return {};
  }
}

// Navigate to a URL with the cloud browser engine, scroll to load lazy content,
// and extract the full page text (the "eyes" for AI). Returns up to maxChars.
export async function cloudBrowserExtract(targetUrl: string, maxChars = 20000): Promise<CloudBrowserResult> {
  const { url, key, configured } = engineConfig();
  if (!configured) return { ok: false, content: '', error: 'cloud browser not configured' };
  let sid: string | undefined;
  try {
    const cr = await fetch(`${url}/sessions`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewport: { width: 1366, height: 900 }, locale: 'en-US', timezone: 'America/New_York' }),
      signal: AbortSignal.timeout(30000),
    });
    const cd = await cr.json().catch(() => ({}));
    sid = cd.id || cd.session_id || cd.sessionId;
    if (!sid) return { ok: false, content: '', error: 'no session id returned' };

    await execAction(url, key, sid, 'goto', { value: targetUrl, options: { waitUntil: 'domcontentloaded', timeout: 35000 } });
    // scroll a few times to trigger lazy-loaded feeds (Reddit, FB, forums)
    for (let i = 0; i < 4; i++) await execAction(url, key, sid, 'scroll', { value: 1500 });
    await execAction(url, key, sid, 'wait_for_timeout', { value: 1500 });
    const ex = await execAction(url, key, sid, 'ai_extract', {});
    const content = String(ex?.data || '').slice(0, maxChars);
    return { ok: content.length > 100, content, sessionId: sid };
  } catch (e: any) {
    return { ok: false, content: '', error: e?.message || 'cloud browser request failed' };
  } finally {
    if (sid) {
      try { await fetch(`${url}/sessions/${sid}`, { method: 'DELETE', headers: { 'x-api-key': key } }); } catch {}
    }
  }
}