import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';

const STAGES = [
  { days: 3, label: 'Check-in', instruction: 'Brief friendly check-in. Ask if they received the proposal and have questions.' },
  { days: 7, label: 'Value Reminder', instruction: 'Remind them of value, reliability, and invite a short decision call.' },
  { days: 10, label: 'Final Follow-Up', instruction: 'Polite final follow-up. Keep the door open and offer a quick call.' },
];
function extractEmail(text: unknown): string {
  const m = String(text || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : '';
}
function addDays(iso: string, days: number): string {
  const base = new Date(iso || Date.now());
  return new Date(base.getTime() + days * 86400000).toISOString();
}

async function processOrg(client: any, orgId: string, projectId: string, setupOnly: boolean) {
  const proposals = projectId
    ? await client.entities.Proposal.filter({ organization_id: orgId, project_id: projectId }).catch(() => [])
    : await client.entities.Proposal.filter({ organization_id: orgId }, '-created_date', 200).catch(() => []);
  const targets = (proposals || []).filter((p: any) => ['delivered', 'responded'].includes(p.status)).slice(0, setupOnly ? 1 : 30);
  if (projectId && targets.length === 0) return { drafted: 0, results: [{ status: 'blocked', blocker: 'email' } as any] };

  let drafted = 0;
  const results: any[] = [];
  for (const proposal of targets) {
    const project = proposal.project_id ? await client.entities.Project.get(proposal.project_id).catch(() => null) : null;
    const recipient = String(proposal.client_email || extractEmail(project?.contract_info)).trim().toLowerCase();
    if (!recipient) { results.push({ proposal_id: proposal.id, status: 'blocked', blocker: 'client_email' }); continue; }
    const existing = await client.entities.Message.filter({ organization_id: orgId, project_id: proposal.project_id, direction: 'outbound' }).catch(() => []);
    const already = (existing || []).filter((m: any) => m.related_proposal_id === proposal.id && Number(m.sequence_step || 0) > 0);
    if (already.length >= STAGES.length) { results.push({ proposal_id: proposal.id, status: 'already_configured', count: already.length }); continue; }
    const companies = await client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []);
    const company = (companies || [])[0] || {};
    const sentBase = proposal.sent_date || new Date().toISOString();

    for (let i = 0; i < STAGES.length; i++) {
      if (already.some((m: any) => Number(m.sequence_step) === i + 1)) continue;
      const stage = STAGES[i];
      let subject = `Following up on ${project?.title || proposal.title || 'your project'}`;
      let emailBody = `Hi ${proposal.client_name || project?.client_name || 'there'},\n\nI wanted to follow up on the proposal we sent for ${project?.title || proposal.title || 'your project'}. Please let us know if you have any questions or would like to review next steps.\n\nBest,\n${company.name || 'The team'}`;
      try {
        const llm = await client.integrations.Core.InvokeLLM({
          prompt: `Draft a professional construction sales follow-up. ${stage.instruction}\nProject: ${project?.title || proposal.title || ''}\nClient: ${proposal.client_name || project?.client_name || ''}\nProposal value: $${Number(proposal.total_value || 0).toLocaleString()}\nCompany: ${company.name || ''}\nReturn JSON with subject and body under 180 words. Do not invent guarantees, pricing, scope, or deadlines.`,
          response_json_schema: { type: 'object', properties: { subject: { type: 'string' }, body: { type: 'string' } } },
        });
        if (llm?.subject) subject = String(llm.subject).slice(0, 240);
        if (llm?.body) emailBody = String(llm.body).slice(0, 10000);
      } catch {}
      await client.entities.Message.create({
        organization_id: orgId,
        direction: 'outbound', channel: 'email', subject, body: emailBody, recipient, project_id: proposal.project_id || '',
        related_proposal_id: proposal.id, status: 'queued', ai_generated: true, requires_approval: true,
        scheduled_for: addDays(sentBase, stage.days), sequence_step: i + 1,
      });
      drafted++;
    }
    await client.entities.PipelineEvent.create({
      organization_id: orgId,
      project_id: proposal.project_id, step: 'followup', status: 'completed', event_type: 'followup_sequence_configured', source_record_id: proposal.id,
      message: `${STAGES.length} approval-gated follow-up messages configured.`, occurred_at: new Date().toISOString(),
    }).catch(() => null);
    results.push({ proposal_id: proposal.id, status: 'configured', recipient });
  }

  if (drafted > 0) await client.entities.Notification.create({
    organization_id: orgId,
    type: 'task', title: `${drafted} follow-up messages prepared`, body: 'Follow-ups are queued for review. No customer message is sent until approved.', priority: 'medium', linked_route: '/messages',
  }).catch(() => null);

  return { drafted, results };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !client) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = String(body?.project_id || '').trim();
    const setupOnly = body?.setup_only === true || Boolean(projectId);

    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      let totalDrafted = 0;
      const allResults: any[] = [];
      for (const orgId of ctx.orgIds) {
        const r = await processOrg(client, orgId, projectId, setupOnly);
        totalDrafted += r.drafted;
        allResults.push(...r.results);
      }
      return Response.json({ success: true, drafted: totalDrafted, approval_required: true, stages: STAGES, results: allResults });
    }

    // Service-role: iterate all organizations
    let totalDrafted = 0;
    const allResults: any[] = [];
    await forEachOrganization(base44.asServiceRole, async (org) => {
      const r = await processOrg(base44.asServiceRole, org.id, projectId, setupOnly);
      totalDrafted += r.drafted;
      allResults.push(...r.results);
    });
    return Response.json({ success: true, drafted: totalDrafted, approval_required: true, stages: STAGES, results: allResults });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Follow-up setup failed' }, { status: 500 });
  }
}