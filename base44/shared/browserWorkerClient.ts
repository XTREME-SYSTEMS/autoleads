import { secrets } from 'base44:runtime';

type BrowserLink = { href: string; text?: string };
export type BrowserWorkerResult = {
  ok: boolean;
  content: string;
  links: BrowserLink[];
  receiptId?: string;
  workerVersion?: string;
  finalUrl?: string;
  consoleErrors: string[];
  networkErrors: string[];
  error?: string;
};

const DEFAULT_WORKER_URL = 'https://browserworker.vercel.app';

function workerConfig() {
  const url = String(secrets.get('BROWSER_WORKER_URL') || DEFAULT_WORKER_URL).replace(/\/$/, '');
  const secret = String(secrets.get('BROWSER_WORKER_SECRET') || '');
  return { url, secret };
}

export async function browserWorkerFetch(
  targetUrl: string,
  options: { maxChars?: number; waitMs?: number; maxLinks?: number } = {},
): Promise<BrowserWorkerResult> {
  const { url, secret } = workerConfig();
  if (!secret) {
    return { ok: false, content: '', links: [], consoleErrors: [], networkErrors: [], error: 'BROWSER_WORKER_SECRET is not configured' };
  }

  const maxChars = Math.min(100000, Math.max(1000, options.maxChars ?? 30000));
  const waitMs = Math.min(15000, Math.max(0, options.waitMs ?? 2500));
  const maxLinks = Math.min(500, Math.max(1, options.maxLinks ?? 200));

  try {
    const res = await fetch(`${url}/api/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '1.0',
        objective: 'Extract public procurement or planning source content for AUTOLEADS',
        url: targetUrl,
        viewport: { width: 1440, height: 1200, deviceScaleFactor: 1 },
        timeout_ms: 60000,
        capture: { screenshot: false, console: true, network_errors: true, html: false },
        steps: [
          { action: 'goto', url: targetUrl, timeout_ms: 30000 },
          { action: 'wait_for_selector', selector: 'body', timeout_ms: 15000 },
          ...(waitMs > 0 ? [{ action: 'wait', milliseconds: waitMs }] : []),
          { action: 'extract_text', selector: 'body', max_chars: maxChars },
          { action: 'extract_links', max_items: maxLinks },
          { action: 'capture_console' },
          { action: 'capture_network_errors' },
        ],
      }),
      signal: AbortSignal.timeout(70000),
    });

    const data: any = await res.json().catch(() => null);
    if (!res.ok || !data) {
      return { ok: false, content: '', links: [], consoleErrors: [], networkErrors: [], error: `BrowserWorker HTTP ${res.status}` };
    }

    let content = '';
    let links: BrowserLink[] = [];
    for (const step of data.steps || []) {
      if (step?.action === 'extract_text' && step?.status === 'pass') content = String(step?.result?.text || '');
      if (step?.action === 'extract_links' && step?.status === 'pass' && Array.isArray(step?.result?.links)) links = step.result.links;
    }

    return {
      ok: Boolean(data.ok) && content.length > 0,
      content,
      links,
      receiptId: data.receipt_id,
      workerVersion: data.worker_version,
      finalUrl: data?.navigation?.final_url,
      consoleErrors: Array.isArray(data?.artifacts?.console_errors) ? data.artifacts.console_errors : [],
      networkErrors: Array.isArray(data?.artifacts?.network_errors) ? data.artifacts.network_errors : [],
      error: Array.isArray(data?.errors) && data.errors.length ? data.errors.join('; ').slice(0, 800) : undefined,
    };
  } catch (e: any) {
    return { ok: false, content: '', links: [], consoleErrors: [], networkErrors: [], error: e?.message || 'BrowserWorker request failed' };
  }
}
