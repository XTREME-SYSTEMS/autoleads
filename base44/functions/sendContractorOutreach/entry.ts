import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';
import { INTRO_EMAIL, FOLLOWUP_EMAILS, renderTemplate, FROM_NAME } from '../../shared/contractorOutreach.ts';

// Autonomous contractor outreach engine. Sends the branded intro email to
// pending contractors, then follow-ups every ~4 days (3-email sequence) to
// stay top-of-mind. In a user context it sends via the Gmail connector; in a
// workflow (service-role) context it uses the built-in SendEmail integration.

const FOLLOWUP_INTERVAL_DAYS = 4;
const INTRO_CAP = 20;
const FOLLOWUP_CAP = 30;

async function sendEmailTo(client: any, user: any, to: string, subject: string, bodyHtml: string): Promise<boolean> {
  if (!to) return false;
  if (user) {
    try { const r: any = await client.functions.invoke('sendEmail', { to, subject, body: bodyHtml, from_name: FROM_NAME }); return Boolean(r?.success); }
    catch { return false; }
  }
  try { const r: any = await client.integrations.Core.SendEmail({ to, subject, body: bodyHtml, from_name: FROM_NAME }); return !r?.error; }
  catch { return false; }
}

async function runForOrg(client: any, orgId: string, user: any): Promise<any> {
  const now = new Date();
  const nowIso = now.toISOString();
  const nextDate = (days: number) => new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();

  const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
  // 1. Intro emails to pending contractors
  const pending = await client.entities.Contractor.filter({ organization_id: orgId, outreach_status: 'pending' }, 'created_date', INTRO_CAP).catch(() => []);
  let introsSent = 0, introFailed = 0;
  for (const c of pending) {
    if (!c.email || !EMAIL_RE.test(c.email)) continue;
    const { subject, body } = renderTemplate(INTRO_EMAIL, c);
    const ok = await sendEmailTo(client, user, c.email, subject, body);
    if (ok) {
      await client.entities.Contractor.update(c.id, { outreach_status: 'intro_sent', intro_sent_date: nowIso, last_contacted_date: nowIso, next_followup_date: nextDate(FOLLOWUP_INTERVAL_DAYS), followup_count: 0 }).catch(() => {});
      introsSent++;
    } else { introFailed++; }
  }

  // 2. Follow-up emails to contractors due (next_followup_date <= now)
  const due = await client.entities.Contractor.filter({ organization_id: orgId, next_followup_date: { $lte: nowIso }, replied: false }, 'next_followup_date', FOLLOWUP_CAP).catch(() => []);
  let followupsSent = 0, followupFailed = 0, completed = 0;
  for (const c of due) {
    if (['completed', 'unsubscribed', 'bounced'].includes(c.outreach_status)) continue;
    if (!c.email || !EMAIL_RE.test(c.email)) continue;
    const idx = c.followup_count || 0;
    if (idx >= FOLLOWUP_EMAILS.length) {
      await client.entities.Contractor.update(c.id, { outreach_status: 'completed', next_followup_date: null }).catch(() => {});
      completed++; continue;
    }
    const { subject, body } = renderTemplate(FOLLOWUP_EMAILS[idx], c);
    const ok = await sendEmailTo(client, user, c.email, subject, body);
    if (ok) {
      const newCount = idx + 1;
      const next = newCount >= FOLLOWUP_EMAILS.length ? null : nextDate(FOLLOWUP_INTERVAL_DAYS);
      await client.entities.Contractor.update(c.id, { outreach_status: `followup_${newCount}`, followup_count: newCount, last_contacted_date: nowIso, next_followup_date: next }).catch(() => {});
      followupsSent++;
    } else { followupFailed++; }
  }

  return { introsSent, introFailed, followupsSent, followupFailed, completed };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (body._service_token || body.all_orgs) {
      const svc = base44.asServiceRole;
      const out = await forEachOrganization(svc, async (org) => {
        try { return await runForOrg(svc, org.id, null); }
        catch (e: any) { return { error: e?.message, org: org.id }; }
      });
      return Response.json({ success: true, mode: 'all_orgs', ...out });
    }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const ctx = await resolveUserOrgs(base44, user.id);
    const orgId = body.organization_id || ctx.primaryOrgId;
    if (!orgId) return Response.json({ error: 'No organization membership' }, { status: 403 });
    return Response.json({ success: true, mode: 'single_org', ...await runForOrg(client, orgId, user) });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}