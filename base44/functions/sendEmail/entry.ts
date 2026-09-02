import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

const GMAIL_CONNECTOR_ID = '69db200274332486fd28dd7e';
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

function base64UrlEncode(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function cleanHeader(value: unknown, max = 500): string {
  return String(value || '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}
function buildMimeMessage(to: string, fromEmail: string, fromName: string | null, subject: string, body: string): string {
  const safeFromName = fromName ? cleanHeader(fromName, 120) : '';
  const from = safeFromName ? `${safeFromName} <${fromEmail}>` : fromEmail;
  const isHtml = body.trim().startsWith('<') && /<\/?(p|div|html|br|body|h[1-6]|table|a)\b/i.test(body);
  const contentType = isHtml ? 'text/html' : 'text/plain';
  return base64UrlEncode([
    `To: ${to}`, `From: ${from}`, `Subject: ${subject}`, 'MIME-Version: 1.0',
    `Content-Type: ${contentType}; charset=UTF-8`, 'Content-Transfer-Encoding: 8bit', '', body,
  ].join('\r\n'));
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user || !client) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const to = cleanHeader(body?.to, 320).toLowerCase();
    const subject = cleanHeader(body?.subject, 300);
    const bodyText = String(body?.body || '').trim().slice(0, 200000);
    const fromName = body?.from_name ? cleanHeader(body.from_name, 120) : null;
    const projectId = cleanHeader(body?.project_id, 200) || null;
    if (!EMAIL_RE.test(to)) return Response.json({ error: 'A valid recipient email is required' }, { status: 400 });
    if (!subject || !bodyText) return Response.json({ error: 'subject and body are required' }, { status: 400 });
    if (String(body?.subject || '').includes('\n') || String(body?.subject || '').includes('\r') || String(body?.to || '').includes('\n') || String(body?.to || '').includes('\r')) {
      return Response.json({ error: 'Invalid email headers' }, { status: 400 });
    }

    // Test mode: redirect all emails to TEST_EMAIL_RECIPIENT if set
    const testRecipient = (Deno.env.get('TEST_EMAIL_RECIPIENT') || '').trim().toLowerCase();
    const finalTo = testRecipient && EMAIL_RE.test(testRecipient) ? testRecipient : to;
    const isTestRedirect = finalTo !== to;

    let accessToken = '';
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
      accessToken = conn?.accessToken || '';
    } catch {}
    if (!accessToken) return Response.json({ error: 'Gmail is not connected. Connect Gmail in Settings → Integrations.', blocker: 'gmail' }, { status: 409 });

    const raw = buildMimeMessage(finalTo, user.email, fromName, subject, bodyText);
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ error: data?.error?.message || `Gmail API error (${res.status})` }, { status: 502 });

    let message = null;
    try {
      message = await client.entities.Message.create({
        direction: 'outbound', channel: 'email', subject, body: bodyText, sender: user.email, recipient: finalTo,
        project_id: projectId, status: 'sent', ai_generated: Boolean(body?.ai_generated), requires_approval: false, sent_date: new Date().toISOString(),
      });
      if (projectId) await client.entities.PipelineEvent.create({
        project_id: projectId, step: 'email', status: 'completed', event_type: 'proposal_email_sent', source_record_id: message?.id || data?.id || '',
        message: `Email sent to ${finalTo}.${isTestRedirect ? ` (TEST REDIRECT from ${to})` : ''}`, occurred_at: new Date().toISOString(),
      }).catch(() => null);
    } catch {}
    return Response.json({ success: true, to, actual_recipient: finalTo, test_redirect: isTestRedirect, subject, sentVia: 'gmail', gmail_message_id: data?.id || null, message_id: message?.id || null });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Email send failed' }, { status: 500 });
  }
}