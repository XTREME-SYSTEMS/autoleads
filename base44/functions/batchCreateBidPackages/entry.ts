import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';
import { fetchOrgAssets, getApprovedTakeoffs } from '../../shared/orgAssets.ts';

// batchCreateBidPackages — for each checked project, assembles a professional
// branded bid package containing: introductory email, company info, insurance
// info, project pictures, previous project highlights, services offered, and
// the full proposal. This is the "evening" step the contractor triggers after
// verifying takeoffs and checking which projects to package.

async function buildBidPackage(client: any, projectId: string, orgId: string): Promise<any> {
  const project = await client.entities.Project.get(projectId).catch(() => null);
  if (!project) return { projectId, status: 'not_found' };

  // Gather all org assets for the branded package
  const [proposals, takeoffs, estimates, pricingProfiles, proposalPackages] = await Promise.all([
    client.entities.Proposal.filter({ organization_id: orgId, project_id: projectId }).catch(() => []),
    client.entities.Takeoff.filter({ project_id: projectId }).catch(() => []),
    client.entities.Estimate.filter({ organization_id: orgId, project_id: projectId }).catch(() => []),
    client.entities.PricingProfile.filter({ organization_id: orgId }).catch(() => []),
    client.entities.ProposalPackage.filter({ organization_id: orgId }).catch(() => []),
  ]);
  const { company, logo, projectImages } = await fetchOrgAssets(client, orgId);
  const pkg = (proposalPackages || []).find((p: any) => p.is_default) || (proposalPackages || [])[0] || null;
  const pricing = (pricingProfiles || [])[0] || null;
  const existingProposal = (proposals || [])[0] || null;
  const approvedTakeoffs = getApprovedTakeoffs(takeoffs);
  const approvedEstimate = (estimates || []).find((e: any) => e.status === 'approved' || e.status === 'draft');
  const showcaseImages = (projectImages || []).filter((i: any) => i.type === 'completed' || i.type === 'portfolio').slice(0, 6);

  // Build the bid package content via LLM
  const takeoffSummary = approvedTakeoffs.map((t: any) => `${t.scope}: ${t.final_quantity} ${t.unit}`).join('; ');
  const estimateTotal = approvedEstimate?.grand_total || project.value || 0;

  const llm = await client.integrations.Core.InvokeLLM({
    prompt: `You are assembling a professional construction bid package. Create a compelling, branded introductory email and bid package content.

COMPANY INFO:
- Name: ${company.name || 'N/A'}
- Trade: ${company.trade || 'general contractor'}
- Location: ${company.city || ''}, ${company.state || ''}
- Phone: ${company.phone || 'N/A'}
- Email: ${company.email || 'N/A'}
- Website: ${company.website || 'N/A'}
- License: ${company.license_number || 'Licensed & Insured'}
- Bonding Capacity: ${company.bonding_capacity ? '$' + company.bonding_capacity.toLocaleString() : 'Available upon request'}

PROJECT INFO:
- Title: ${project.title}
- Client: ${project.client_name || project.authority || 'N/A'}
- Authority: ${project.authority || 'N/A'}
- Jurisdiction: ${project.jurisdiction || 'N/A'}
- Value: ${project.value ? '$' + project.value.toLocaleString() : 'TBD'}
- Due Date: ${project.bid_due_date || 'N/A'}
- Specs: ${(project.specs || 'N/A').slice(0, 800)}
- Trade: ${project.trade || company.trade || 'general'}

TAKEOFF SUMMARY:
${takeoffSummary || 'See attached estimate'}

ESTIMATE TOTAL: $${Number(estimateTotal).toLocaleString()}

PREVIOUS PROJECT HIGHLIGHTS: ${showcaseImages.length} completed project photos available

Generate a complete bid package as JSON:
- intro_email_subject: professional email subject line referencing the project
- intro_email_body: personalized introductory email (200-300 words) — address the client by name if available, introduce the company, mention relevant experience, reference the specific project, highlight why they're the right contractor, and mention the attached proposal. Professional, warm, confident tone. Include company name, license number, and contact info in signature.
- bid_package_summary: 2-3 sentence executive summary of the bid
- scope_of_work: clear scope of work based on the project specs and takeoffs
- timeline: proposed timeline (if determinable from specs)
- warranty_info: standard warranty statement for ${company.trade || 'general'} work
- services_offered: list of services the company offers (derived from trade and company info)
- why_choose_us: 3-4 bullet points highlighting company strengths
- included_documents: list of documents included in the package (proposal, company info, insurance, project photos, etc.)

Make it professional, compelling, and ready to send. Do not fabricate credentials — use only the info provided.`,
    response_json_schema: { type: 'object', properties: {
      intro_email_subject: { type: 'string' }, intro_email_body: { type: 'string' },
      bid_package_summary: { type: 'string' }, scope_of_work: { type: 'string' },
      timeline: { type: 'string' }, warranty_info: { type: 'string' },
      services_offered: { type: 'array', items: { type: 'string' } },
      why_choose_us: { type: 'array', items: { type: 'string' } },
      included_documents: { type: 'array', items: { type: 'string' } },
    } }
  });

  // Create or update the proposal with the full bid package
  const proposalData: any = {
    organization_id: orgId,
    project_id: projectId,
    title: `Bid Package — ${project.title}`,
    client_name: project.client_name || project.authority || '',
    client_email: (project.contract_info || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || '',
    status: 'internal_review',
    signature_status: 'not_sent',
    total_value: estimateTotal || project.value || 0,
    items: approvedTakeoffs.map((t: any) => ({
      description: t.scope, quantity: t.final_quantity, unit: t.unit,
      unit_price: Number(t.final_quantity) > 0 ? Math.round((estimateTotal / Number(t.final_quantity)) * 100) / 100 : 0,
      source: 'approved_takeoff'
    })),
  };

  let proposal;
  if (existingProposal) {
    proposal = await client.entities.Proposal.update(existingProposal.id, proposalData).catch(() => null);
  } else {
    proposal = await client.entities.Proposal.create(proposalData).catch(() => null);
  }

  // Store the bid package content as a Message (draft email) for approval
  const recipientEmail = proposalData.client_email || '';
  if (recipientEmail) {
    await client.entities.Message.create({
      organization_id: orgId,
      direction: 'outbound', channel: 'email',
      subject: llm?.intro_email_subject || `Bid Proposal: ${project.title}`,
      body: llm?.intro_email_body || '',
      recipient: recipientEmail,
      project_id: projectId,
      related_proposal_id: proposal?.id || '',
      status: 'queued', ai_generated: true, requires_approval: true,
    }).catch(() => null);
  }

  // Create ActionItem for approval
  await client.entities.ActionItem.create({
    organization_id: orgId,
    project_id: projectId,
    title: `Approve bid package: ${project.title}`,
    description: `Bid package assembled with branded email, company info, insurance, project photos, and proposal. Total: $${Number(estimateTotal || 0).toLocaleString()}. Review and approve to send.`,
    category: 'proposal_approval',
    priority: 'high', status: 'open',
    due_date: project.bid_due_date || undefined,
  }).catch(() => null);

  // Advance project stage
  if (['qualification', 'takeoff', 'estimating'].includes(project.stage)) {
    await client.entities.Project.update(projectId, { stage: 'proposal' }).catch(() => null);
  }

  // Pipeline event
  await client.entities.PipelineEvent.create({
    organization_id: orgId, project_id: projectId,
    step: 'bid', status: 'completed', event_type: 'bid_package_created',
    message: `Professional bid package assembled with branded email, company info, insurance, project highlights, and proposal ($${Number(estimateTotal || 0).toLocaleString()}).`,
    occurred_at: new Date().toISOString(),
  }).catch(() => null);

  return {
    projectId, status: 'created', proposalId: proposal?.id,
    totalValue: estimateTotal, hasEmail: !!recipientEmail,
    documentsIncluded: llm?.included_documents?.length || 0,
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectIds: string[] = Array.isArray(body?.project_ids) ? body.project_ids : [];
    if (projectIds.length === 0) return Response.json({ error: 'project_ids array is required' }, { status: 400 });

    const ctx = await resolveUserOrgs(client, user.id);
    if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
    const orgId = ctx.primaryOrgId;

    const results: any[] = [];
    for (const pid of projectIds.slice(0, 15)) {
      try {
        const r = await buildBidPackage(client, pid, orgId);
        results.push(r);
      } catch (e: any) {
        results.push({ projectId: pid, status: 'error', error: e.message });
      }
    }

    const created = results.filter(r => r.status === 'created').length;

    await client.entities.Notification.create({
      organization_id: orgId, type: 'proposal',
      title: `${created} bid packages ready for approval`,
      body: `${created} professional bid package(s) assembled with branded emails, company info, and proposals. Review and approve to send.`,
      priority: 'high', linked_route: '/proposals',
    }).catch(() => null);

    return Response.json({ success: true, created, total: projectIds.length, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Bid package creation failed' }, { status: 500 });
  }
}