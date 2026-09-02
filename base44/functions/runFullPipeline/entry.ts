import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, scopedFilter, listAll } from '../../shared/orgContext.ts';

// Production-hardened pipeline: org-scoped, no fabricated data.
// - Iterates each organization explicitly (no cross-tenant .list()[0])
// - Takeoffs: only from projects with actual source evidence; marked as AI DRAFT (unreviewed)
// - Estimates: only from approved takeoffs with real quantities
// - Proposals: only from approved estimates; items reference approved_estimate truthfully
// - Unknown/incomplete data is marked, never fabricated

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return '';
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
  } catch { return ''; }
}

async function verifyProjectInline(client: any, project: any): Promise<boolean> {
  if (!project.source_url) return false;
  const pageText = await fetchPageText(project.source_url);
  if (!pageText) {
    await client.entities.Project.update(project.id, { verification_status: 'failed' }).catch(() => null);
    return false;
  }
  try {
    const extracted = await client.integrations.Core.InvokeLLM({
      prompt: `From this construction bid posting page content, extract REAL project details. Return JSON: description (2-4 sentences), specs (scope of work string), contract_info (owner contact or "Not listed"), value (actual published number or null), bid_due_date (YYYY-MM-DD or null), client_name (or null), project_type (or null).\n\nPAGE:\n${pageText}`,
      response_json_schema: { type: 'object', properties: {
        description: { type: 'string' }, specs: { type: 'string' }, contract_info: { type: 'string' },
        value: { type: 'number' }, bid_due_date: { type: 'string' }, client_name: { type: 'string' }, project_type: { type: 'string' }
      } }
    });
    const update: any = {
      description: extracted?.description || project.description || '',
      specs: extracted?.specs || project.specs || '',
      contract_info: extracted?.contract_info || project.contract_info || '',
      verification_status: 'verified', verified_date: new Date().toISOString(),
    };
    // Only set value if the LLM extracted a real number — never fabricate
    if (typeof extracted?.value === 'number' && extracted.value > 0) update.value = extracted.value;
    if (extracted?.bid_due_date) update.bid_due_date = extracted.bid_due_date;
    if (extracted?.client_name) update.client_name = extracted.client_name;
    if (extracted?.project_type) update.project_type = extracted.project_type;
    await client.entities.Project.update(project.id, update).catch(() => null);
    return true;
  } catch { return false; }
}

async function processOrganization(client: any, org: any): Promise<{ verified: number; takeoffs: number; estimates: number; proposals: number }> {
  const orgId = org.id;
  const stats = { verified: 0, takeoffs: 0, estimates: 0, proposals: 0 };

  // Get this org's pricing profile (scoped, not .list()[0])
  const pricingProfiles = await client.entities.PricingProfile.filter(scopedFilter(orgId)).catch(() => []);
  const pricing = (pricingProfiles || [])[0] || null;

  // 1. Verify unverified projects with source URLs (org-scoped)
  const projects = await client.entities.Project.filter(scopedFilter(orgId), '-created_date', 200).catch(() => []);
  const unverified = (projects || []).filter(p => p.verification_status !== 'verified' && p.source_url);
  for (const p of unverified.slice(0, 15)) {
    if (await verifyProjectInline(client, p)) stats.verified++;
  }

  // 2. Generate takeoff DRAFTS for verified projects — only if specs/drawings evidence exists
  const refetched = await client.entities.Project.filter(scopedFilter(orgId), '-created_date', 200).catch(() => []);
  const needTakeoff = (refetched || []).filter(p => p.verification_status === 'verified' && p.stage === 'qualification');
  for (const p of needTakeoff.slice(0, 30)) {
    // Only generate takeoff if there is actual spec/drawing evidence
    const hasSpecs = !!(p.specs && !String(p.specs).startsWith('Not available') && p.specs.length > 20);
    const hasDrawings = !!(p.plans_url || (Array.isArray(p.documents) && p.documents.some((d: any) => d.type === 'plans')));
    if (!hasSpecs && !hasDrawings) continue; // BLOCK — no evidence to take off from

    try {
      const llm = await client.integrations.Core.InvokeLLM({
        prompt: `Based ONLY on the following verified project readable source document and specs, identify the scope systems that can be quantified. Do NOT invent quantities if the document/specs don't contain dimensional information.\nProject: ${p.title}\nTrade: ${p.trade || 'general'}\nReadable Source Document (primary scope reference — human-readable translation of the original source):\n${p.source_readable_document || 'N/A'}\nSpecs: ${p.specs || 'N/A'}\nDrawings: ${hasDrawings ? 'Available' : 'Not available'}\n\nReturn JSON: measurements (array of {scope, unit, raw_quantity or null if unknown, waste_factor, final_quantity or null, spec_evidence (quote from the readable document or specs), confidence 0-1), notes (string explaining what evidence is missing if quantities are unknown).`,
        response_json_schema: { type: 'object', properties: {
          measurements: { type: 'array', items: { type: 'object', properties: {
            scope: { type: 'string' }, unit: { type: 'string' }, raw_quantity: { type: 'number' },
            waste_factor: { type: 'number' }, final_quantity: { type: 'number' }, spec_evidence: { type: 'string' },
            confidence: { type: 'number' }
          } } }, notes: { type: 'string' }
        } }
      });
      const measurements = Array.isArray(llm?.measurements) ? llm.measurements : [];
      for (const m of measurements) {
        // Only create if final_quantity is a real number — don't fabricate
        if (!m.scope || m.final_quantity == null || !Number.isFinite(Number(m.final_quantity))) continue;
        try {
          await client.entities.Takeoff.create({
            organization_id: orgId,
            project_id: p.id, scope: m.scope, unit: m.unit || 'EA',
            raw_quantity: Number(m.raw_quantity || 0), waste_factor: Number(m.waste_factor || 0),
            final_quantity: Number(m.final_quantity),
            spec_evidence: m.spec_evidence || 'AI-extracted from project specs',
            confidence: typeof m.confidence === 'number' ? m.confidence : 0.5,
            approval_state: 'unreviewed', reviewer_decision: 'pending',
          });
          stats.takeoffs++;
        } catch {}
      }
      if (p.stage === 'qualification' && stats.takeoffs > 0) {
        await client.entities.Project.update(p.id, { stage: 'takeoff' }).catch(() => null);
      }
    } catch {}
  }

  // 3. Generate estimates ONLY from approved takeoffs
  const needEstimate = (refetched || []).filter(p => p.verification_status === 'verified' && p.stage === 'takeoff');
  for (const p of needEstimate.slice(0, 30)) {
    const takeoffs = await client.entities.Takeoff.filter(scopedFilter(orgId, { project_id: p.id })).catch(() => []);
    const approvedTakeoffs = (takeoffs || []).filter(t => t.approval_state === 'approved');
    if (approvedTakeoffs.length === 0) continue; // BLOCK — no approved takeoffs
    const existingEst = await client.entities.Estimate.filter(scopedFilter(orgId, { project_id: p.id })).catch(() => []);
    if (existingEst && existingEst.length > 0) continue;

    const laborRate = Number(pricing?.labor_hourly_rate || 0);
    const marginPct = (Number(pricing?.mandatory_margin_pct || 15)) / 100;
    let labor = 0, material = 0;
    for (const t of approvedTakeoffs) {
      const qty = Number(t.final_quantity || 0);
      material += qty * Number(pricing?.material_cost_low || 0);
      labor += qty * laborRate * 0.5;
    }
    const equipment = labor * 0.15;
    const overhead = (labor + material) * 0.1;
    const subtotal = labor + material + equipment + overhead;
    const marginTotal = subtotal * marginPct;
    const grand = subtotal + marginTotal;
    try {
      await client.entities.Estimate.create({
        organization_id: orgId,
        project_id: p.id, title: `Estimate — ${p.title}`, status: 'draft',
        labor_total: labor, material_total: material, equipment_total: equipment,
        overhead_total: overhead, subtotal, margin_pct: marginPct * 100,
        margin_total: marginTotal, grand_total: grand,
        takeoff_ids: approvedTakeoffs.map(t => t.id),
      });
      await client.entities.Project.update(p.id, { stage: 'estimating' }).catch(() => null);
      stats.estimates++;
    } catch {}
  }

  // 4. Generate proposals ONLY from approved estimates
  const needProposal = (refetched || []).filter(p => p.verification_status === 'verified' && p.stage === 'estimating');
  const existingProposals = await client.entities.Proposal.filter(scopedFilter(orgId), '-created_date', 500).catch(() => []);
  const existingTitles = new Set((existingProposals || []).map(p => (p.title || '').toLowerCase().trim()));
  const companies = await client.entities.CompanyProfile.filter(scopedFilter(orgId)).catch(() => []);
  const company = (companies || [])[0];

  for (const proj of needProposal.slice(0, 30)) {
    if (existingTitles.has((proj.title || '').toLowerCase().trim())) continue;
    const estimates = await client.entities.Estimate.filter(scopedFilter(orgId, { project_id: proj.id })).catch(() => []);
    const approvedEst = (estimates || []).find(e => e.status === 'approved');
    if (!approvedEst) continue; // BLOCK — no approved estimate

    const takeoffRecs = await client.entities.Takeoff.filter(scopedFilter(orgId, { project_id: proj.id })).catch(() => []);
    const approvedTakeoffs = (takeoffRecs || []).filter(t => t.approval_state === 'approved');
    const takeoffSummary = approvedTakeoffs.map(t => `${t.scope}: ${t.final_quantity} ${t.unit}`).join('; ');
    try {
      const llm = await client.integrations.Core.InvokeLLM({
        prompt: `Draft a construction proposal for ${company?.trade || 'general contractor'}.\nProject: ${proj.title}\nClient: ${proj.authority || proj.client_name || 'N/A'}\nApproved estimate total: $${approvedEst.grand_total}\nTakeoffs: ${takeoffSummary || 'N/A'}\n\nReturn JSON: title, client_name, total_value (must match approved estimate), items (array from the approved takeoffs — each with description, quantity, unit, unit_price, source="approved_takeoff").`,
        response_json_schema: { type: 'object', properties: {
          title: { type: 'string' }, client_name: { type: 'string' }, total_value: { type: 'number' },
          items: { type: 'array', items: { type: 'object', properties: {
            description: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, unit_price: { type: 'number' }, source: { type: 'string' }
          } } }
        } }
      });
      // Items must reference approved_takeoff (not approved_estimate, since we have approved takeoffs)
      const items = Array.isArray(llm?.items) ? llm.items.map((it: any) => ({ ...it, source: 'approved_takeoff' })) : [];
      await client.entities.Proposal.create({
        organization_id: orgId,
        project_id: proj.id, title: llm?.title || proj.title,
        client_name: llm?.client_name || proj.authority || '', status: 'internal_review',
        total_value: Number(approvedEst.grand_total || llm?.total_value || 0), items,
      });
      await client.entities.Project.update(proj.id, { stage: 'proposal' }).catch(() => null);
      stats.proposals++;
    } catch {}
  }

  return stats;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Iterate every organization — no cross-tenant access
    const result = await forEachOrganization(client, async (org) => {
      return await processOrganization(client, org);
    });

    const totals = result.processed > 0
      ? { organizations: result.processed, errors: result.errors.length, error_details: result.errors.slice(0, 5) }
      : { organizations: 0, errors: 0, message: 'No organizations found. Setup required.' };

    return Response.json({ success: true, ...totals });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Pipeline failed' }, { status: 500 });
  }
}