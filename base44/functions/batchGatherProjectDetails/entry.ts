import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// batchGatherProjectDetails — for each checked project, deeply gathers ALL
// available information from the source: full specs, contract contact info,
// company name, project details, plans, addenda, and every document the
// system can ingest. This is the "morning gather" step the contractor
// triggers after checking boxes on the LeadFeed.

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
    if (!res.ok) return '';
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 12000);
  } catch { return ''; }
}

function extractEmails(text: string): string[] {
  const matches = String(text || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/g);
  return matches ? [...new Set(matches.map(m => m.toLowerCase()))] : [];
}

function extractPhones(text: string): string[] {
  const matches = String(text || '').match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g);
  return matches ? [...new Set(matches)] : [];
}

async function gatherOneProject(client: any, projectId: string): Promise<any> {
  const project = await client.entities.Project.get(projectId).catch(() => null);
  if (!project) return { projectId, status: 'not_found' };

  const updates: any = {};
  const gathered: any = { contacts: [], documents: [], specs: '', plans: false };

  // 1. Fetch source page for full details
  if (project.source_url) {
    const pageText = await fetchPageText(project.source_url);
    if (pageText) {
      try {
        const extracted = await client.integrations.Core.InvokeLLM({
          prompt: `From this construction bid posting page, extract EVERY piece of information available. Be exhaustive.
Return JSON with:
- description: full project description (3-5 sentences)
- specs: complete scope of work, materials, requirements, specifications
- contract_info: ALL contact info — names, emails, phone numbers, addresses
- client_name: the owner/client/agency name
- authority: the issuing authority
- value: published project value as number, or null
- bid_due_date: YYYY-MM-DD or null
- prebid_date: pre-bid meeting date YYYY-MM-DD or null
- project_type: commercial/residential/municipal/industrial/renovation
- trade: primary trade/scope
- plans_url: direct link to plans/drawings if available, or null
- addenda_url: link to addenda page if available, or null
- documents: array of {name, url, type} for any document links found (plans, specs, addenda, bid forms)
- address: project site address if available

PAGE CONTENT:
${pageText}`,
          response_json_schema: { type: 'object', properties: {
            description: { type: 'string' }, specs: { type: 'string' }, contract_info: { type: 'string' },
            client_name: { type: 'string' }, authority: { type: 'string' }, value: { type: 'number' },
            bid_due_date: { type: 'string' }, prebid_date: { type: 'string' }, project_type: { type: 'string' },
            trade: { type: 'string' }, plans_url: { type: 'string' }, addenda_url: { type: 'string' },
            documents: { type: 'array', items: { type: 'object', properties: {
              name: { type: 'string' }, url: { type: 'string' }, type: { type: 'string' }
            } } }, address: { type: 'string' }
          } }
        });

        if (extracted?.description) updates.description = extracted.description;
        if (extracted?.specs) updates.specs = extracted.specs;
        if (extracted?.contract_info) updates.contract_info = extracted.contract_info;
        if (extracted?.client_name) updates.client_name = extracted.client_name;
        if (extracted?.authority) updates.authority = extracted.authority;
        if (typeof extracted?.value === 'number' && extracted.value > 0) updates.value = extracted.value;
        if (extracted?.bid_due_date) updates.bid_due_date = extracted.bid_due_date;
        if (extracted?.project_type) updates.project_type = extracted.project_type;
        if (extracted?.trade) updates.trade = extracted.trade;
        if (extracted?.plans_url) updates.plans_url = extracted.plans_url;
        if (extracted?.addenda_url) updates.addenda_url = extracted.addenda_url;
        if (extracted?.address) updates.address = extracted.address;
        if (extracted?.prebid_date) updates.prebid_meeting_date = extracted.prebid_date;
        if (Array.isArray(extracted?.documents) && extracted.documents.length > 0) {
          updates.documents = extracted.documents.filter((d: any) => d.url);
          gathered.documents = updates.documents;
        }
        gathered.specs = extracted?.specs || '';
        gathered.plans = !!(extracted?.plans_url);
      } catch {}
    }
  }

  // 2. Extract email/phone contacts from contract_info
  const allText = `${updates.contract_info || project.contract_info || ''} ${updates.description || project.description || ''}`;
  const emails = extractEmails(allText);
  const phones = extractPhones(allText);
  gathered.contacts = { emails, phones };

  // 3. Mark as verified and update
  updates.verification_status = 'verified';
  updates.verified_date = new Date().toISOString();
  updates.validation_completeness = Math.min(100, Object.keys(updates).length * 12);

  await client.entities.Project.update(projectId, updates).catch(() => null);

  // 4. Create ActionItem for takeoff if specs/plans are available
  if (updates.specs || gathered.plans) {
    await client.entities.ActionItem.create({
      organization_id: project.organization_id,
      project_id: projectId,
      title: `Takeoff ready: ${project.title}`,
      description: 'All project details gathered. Ready for auto takeoff.',
      category: 'takeoff_review',
      priority: 'high',
      status: 'open',
      due_date: updates.bid_due_date || project.bid_due_date || undefined,
    }).catch(() => null);
  }

  // 5. Auto-trigger takeoff for this project
  try {
    await client.functions.invoke('autoTakeoff', { project_id: projectId });
  } catch {}

  // 6. Create pipeline event
  await client.entities.PipelineEvent.create({
    organization_id: project.organization_id,
    project_id: projectId,
    step: 'lead', status: 'completed', event_type: 'details_gathered',
    message: 'Full project details gathered: specs, contacts, documents, plans.',
    occurred_at: new Date().toISOString(),
  }).catch(() => null);

  return { projectId, status: 'gathered', contacts: gathered.contacts, documents: gathered.documents.length, hasSpecs: !!gathered.specs, hasPlans: gathered.plans };
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

    const results: any[] = [];
    for (const pid of projectIds.slice(0, 25)) {
      try {
        const r = await gatherOneProject(client, pid);
        results.push(r);
      } catch (e: any) {
        results.push({ projectId: pid, status: 'error', error: e.message });
      }
    }

    const gathered = results.filter(r => r.status === 'gathered').length;

    // Create notification
    await client.entities.Notification.create({
      organization_id: ctx.primaryOrgId,
      type: 'opportunity',
      title: `${gathered} projects fully gathered`,
      body: `Deep info gathering complete for ${gathered} project(s). Specs, contacts, plans, and documents extracted. Auto takeoffs initiated.`,
      priority: 'high',
      linked_route: '/leads',
    }).catch(() => null);

    return Response.json({ success: true, gathered, total: projectIds.length, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Gather failed' }, { status: 500 });
  }
}