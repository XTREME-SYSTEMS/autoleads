import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';
import { FREE_EVAL_INTRO_EMAIL, FREE_EVAL_FOLLOWUP_EMAIL, renderFreeEvalTemplate, FROM_NAME } from '../../shared/freeEvaluationOutreach.ts';

// Sends the "Free Project Cost Evaluation" introduction email to contact-only
// leads (Contractors, Contacts, or any entity with an email but no project
// specs). These leads come from universal discovery sources — homeowner posting
// sites, property managers, HOAs, facility managers, investors, restoration
// partners, etc. — where we only have contact info, not bid documents.
//
// The email asks the recipient to reply with photos, square footage, and their
// desired outcome. Once they respond, the lead is normalized into a full Project.

const FOLLOWUP_INTERVAL_DAYS = 5;
const INTRO_CAP = 25;
const FOLLOWUP_CAP = 35;

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

async function sendEmailTo(client: any, user: any, to: string, subject: string, bodyHtml: string): Promise<boolean> {
  if (!to) return false;
  if (user) {
    try { const r: any = await client.functions.invoke('sendEmail', { to, subject, body: bodyHtml, from_name: FROM_NAME }); return Boolean(r?.success); }
    catch { return false; }
  }
  try { const r: any = await client.integrations.Core.SendEmail({ to, subject, body: bodyHtml, from_name: FROM_NAME }); return !r?.error; }
  catch { return false; }
}

// Normalize any contact-shaped record into something the template can render.
function normalizeContact(c: any): any {
  return {
    contact_name: c.contact_name || c.full_name || c.name || '',
    company_name: c.company_name || c.company || '',
    email: c.email || '',
    ...c,
  };
}

async function runForOrg(client: any, orgId: string, user: any): Promise<any> {
  const now = new Date();
  const nowIso = now.toISOString();
  const nextDate = (days: number) => new Date(now.getTime() + days * 24 * 3600 * 1000).toISOString();

  let introsSent = 0, introFailed = 0, followupsSent = 0, followupFailed = 0, completed = 0;

  // 1. Intro emails to pending Contractors (outreach_status = 'pending')
  const pendingContractors = await client.entities.Contractor.filter({ organization_id: orgId, outreach_status: 'pending' }, 'created_date', INTRO_CAP).catch(() => []);
  for (const c of pendingContractors) {
    if (!c.email || !EMAIL_RE.test(c.email)) continue;
    const ctx = normalizeContact(c);
    const { subject, body } = renderFreeEvalTemplate(FREE_EVAL_INTRO_EMAIL, ctx);
    const ok = await sendEmailTo(client, user, c.email, subject, body);
    if (ok) {
      await client.entities.Contractor.update(c.id, { outreach_status: 'intro_sent', intro_sent_date: nowIso, last_contacted_date: nowIso, next_followup_date: nextDate(FOLLOWUP_INTERVAL_DAYS), followup_count: 0 }).catch(() => {});
      introsSent++;
    } else { introFailed++; }
  }

  // 2. Intro emails to pending Contacts (no outreach_status field — use a flag)
  const pendingContacts = await client.entities.Contact.filter({ organization_id: orgId, free_eval_sent: { $ne: true } }, 'created_date', INTRO_CAP).catch(() => []);
  for (const c of pendingContacts) {
    if (!c.email || !EMAIL_RE.test(c.email)) continue;
    const ctx = normalizeContact(c);
    const { subject, body } = renderFreeEvalTemplate(FREE_EVAL_INTRO_EMAIL, ctx);
    const ok = await sendEmailTo(client, user, c.email, subject, body);
    if (ok) {
      await client.entities.Contact.update(c.id, { free_eval_sent: true, free_eval_sent_date: nowIso, last_contacted_date: nowIso, next_followup_date: nextDate(FOLLOWUP_INTERVAL_DAYS) }).catch(() => {});
      introsSent++;
    } else { introFailed++; }
  }

  // 3. Follow-up emails to Contractors due (next_followup_date <= now, not replied)
  const dueContractors = await client.entities.Contractor.filter({ organization_id: orgId, next_followup_date: { $lte: nowIso }, replied: false }, 'next_followup_date', FOLLOWUP_CAP).catch(() => []);
  for (const c of dueContractors) {
    if (['completed', 'unsubscribed', 'bounced'].includes(c.outreach_status)) continue;
    if (!c.email || !EMAIL_RE.test(c.email)) continue;
    const ctx = normalizeContact(c);
    const { subject, body } = renderFreeEvalTemplate(FREE_EVAL_FOLLOWUP_EMAIL, ctx);
    const ok = await sendEmailTo(client, user, c.email, subject, body);
    if (ok) {
      const newCount = (c.followup_count || 0) + 1;
      const next = newCount >= 2 ? null : nextDate(FOLLOWUP_INTERVAL_DAYS);
      await client.entities.Contractor.update(c.id, { outreach_status: `followup_${newCount}`, followup_count: newCount, last_contacted_date: nowIso, next_followup_date: next }).catch(() => {});
      if (newCount >= 2) completed++;
      else followupsSent++;
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