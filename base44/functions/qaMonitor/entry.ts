import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// qaMonitor — the autonomous QA agent's backend. Scans outbound emails and
// proposals for completeness, professionalism, and accuracy. Checks:
// - Missing required documents (insurance, company info, proposal)
// - Misspellings and grammar issues
// - Missing recipient name personalization
// - Missing company branding
// - Missing contact info
// - Bid revision needed
// - Email revision needed
// Creates SystemFlag records that show on the dashboard for the contractor.

async function qaOrg(client: any, orgId: string): Promise<any> {
  const flags: any[] = [];

  // 1. Check recent outbound emails (last 7 days)
  const messages = await client.entities.Message.filter({ organization_id: orgId, direction: 'outbound' }, '-created_date', 50).catch(() => []);
  const recentMessages = (messages || []).filter((m: any) => {
    const age = Date.now() - new Date(m.created_date || m.scheduled_for || Date.now()).getTime();
    return age < 7 * 86400000;
  });

  for (const msg of recentMessages.slice(0, 20)) {
    if (msg.status === 'draft') continue;
    try {
      const qa = await client.integrations.Core.InvokeLLM({
        prompt: `You are a QA agent reviewing a construction bid email for professionalism and completeness. Check for issues.

EMAIL SUBJECT: ${msg.subject || ''}
EMAIL BODY:
${(msg.body || '').slice(0, 3000)}

RECIPIENT: ${msg.recipient || 'N/A'}

Check for:
1. Missing recipient personalization (should address by name, not just "Dear")
2. Misspellings or grammar errors
3. Missing company name in signature
4. Missing contact info (phone, email)
5. Missing license/insurance mention
6. Missing project reference
7. Unprofessional tone
8. Missing proposal attachment mention

Return JSON:
- has_issues: boolean
- issues: array of {type: "spelling"|"grammar"|"missing_personalization"|"missing_company_info"|"missing_contact"|"missing_insurance"|"missing_project_ref"|"unprofessional"|"missing_attachment_ref", severity: "high"|"medium"|"low", description: string}
- overall_quality: number 0-100
- recommendation: string — what to fix`,
        response_json_schema: { type: 'object', properties: {
          has_issues: { type: 'boolean' },
          issues: { type: 'array', items: { type: 'object', properties: {
            type: { type: 'string' }, severity: { type: 'string' }, description: { type: 'string' }
          } } },
          overall_quality: { type: 'number' }, recommendation: { type: 'string' }
        } }
      });

      if (qa?.has_issues && Array.isArray(qa.issues)) {
        for (const issue of qa.issues) {
          const flagType = issue.type === 'spelling' ? 'compliance_issue' :
            issue.type === 'missing_insurance' ? 'compliance_issue' :
            issue.type === 'missing_company_info' ? 'data_gap' : 'compliance_issue';
          const severity = issue.severity === 'high' ? 'high' : issue.severity === 'medium' ? 'medium' : 'low';

          await client.entities.SystemFlag.create({
            flag_type: flagType, severity,
            target_type: 'project', target_id: msg.project_id || '',
            target_name: msg.subject || 'Email',
            title: `Email QA: ${issue.type.replace(/_/g, ' ')}`,
            description: issue.description,
            fix_description: qa.recommendation || 'Revise the email to fix the issue.',
            fix_action: 'email_revision',
            status: 'open', auto_fix_available: false,
            state_code: '', data_class: 'production',
          }).catch(() => null);
          flags.push({ type: issue.type, severity: issue.severity, message: msg.subject });
        }
      }
    } catch {}
  }

  // 2. Check recent proposals for completeness
  const proposals = await client.entities.Proposal.filter({ organization_id: orgId }, '-created_date', 30).catch(() => []);
  for (const proposal of (proposals || []).slice(0, 15)) {
    if (!['internal_review', 'approved', 'sent'].includes(proposal.status)) continue;
    const issues: string[] = [];
    if (!proposal.items || proposal.items.length === 0) issues.push('No line items in proposal');
    if (!proposal.total_value || proposal.total_value === 0) issues.push('No total value set');
    if (!proposal.client_name) issues.push('No client name');
    if (!proposal.client_email) issues.push('No client email — cannot send');

    for (const issueDesc of issues) {
      await client.entities.SystemFlag.create({
        flag_type: 'data_gap', severity: 'high',
        target_type: 'project', target_id: proposal.project_id || '',
        target_name: proposal.title || 'Proposal',
        title: `Bid QA: ${issueDesc}`,
        description: issueDesc,
        fix_description: 'Review and complete the proposal before sending.',
        fix_action: 'bid_revision', status: 'open', auto_fix_available: false,
        state_code: '', data_class: 'production',
      }).catch(() => null);
      flags.push({ type: 'proposal_issue', description: issueDesc, proposal: proposal.title });
    }
  }

  // 3. Check for projects with incomplete data that have proposals
  const projects = await client.entities.Project.filter({ organization_id: orgId, verification_status: 'unverified' }, '-created_date', 20).catch(() => []);
  for (const project of (projects || []).slice(0, 10)) {
    if (['proposal', 'submitted', 'won'].includes(project.stage)) {
      await client.entities.SystemFlag.create({
        flag_type: 'stale_data', severity: 'medium',
        target_type: 'project', target_id: project.id,
        target_name: project.title,
        title: `Unverified project in pipeline: ${project.title?.slice(0, 50)}`,
        description: 'Project has advanced to proposal/submitted stage but was never verified against source.',
        fix_description: 'Re-verify project details from source.',
        fix_action: 'verify_project', status: 'open', auto_fix_available: true,
        state_code: '', data_class: 'production',
      }).catch(() => null);
      flags.push({ type: 'unverified_in_pipeline', project: project.title });
    }
  }

  return { flagsFound: flags.length, flags };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await resolveUserOrgs(client, user.id);
    if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });

    const results: any[] = [];
    for (const orgId of ctx.orgIds) {
      const r = await qaOrg(client, orgId);
      results.push(r);
    }

    const totalFlags = results.reduce((s, r) => s + r.flagsFound, 0);

    if (totalFlags > 0) {
      await client.entities.Notification.create({
        organization_id: ctx.primaryOrgId,
        type: 'task',
        title: `QA: ${totalFlags} issues found`,
        body: 'The QA agent found issues with your emails or proposals. Review the flags on your dashboard.',
        priority: 'high', linked_route: '/dashboard',
      }).catch(() => null);
    }

    return Response.json({ success: true, totalFlags, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'QA monitor failed' }, { status: 500 });
  }
}