import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeListScoped, safeFilter, todayISO, isStale, createGap, closeGapsByTitle, fetchPageText } from '../../shared/systemUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';

async function processOrg(client: any, orgId: string) {
  const projects = await safeListScoped(client, 'Project', orgId);
  let enriched = 0, purged = 0, validated = 0, unreachable = 0;

  // --- 1. Suppress stale, non-actionable data (org-scoped, NO hard deletion) ---
  const proposals = await safeListScoped(client, 'Proposal', orgId);
  const proposalProjectIds = new Set(proposals.map((p: any) => p.project_id));
  for (const p of projects) {
    if (p.bid_due_date && isStale(p.bid_due_date) && p.stage === 'qualification' && !proposalProjectIds.has(p.id)) {
      try { await client.entities.Project.update(p.id, { stage: 'lost', verification_status: 'failed' }); purged++; } catch {}
    }
    if (p.data_class === 'NON_PRODUCTION_EXAMPLE') {
      try { await client.entities.Project.update(p.id, { data_class: 'production', stage: 'lost' }); purged++; } catch {}
    }
  }

  // --- 2. Validate source URLs in parallel batches (org-scoped) ---
  const withUrls = projects.filter((p: any) => p.source_url);
  const BATCH_SIZE = 10;
  for (let i = 0; i < withUrls.length; i += BATCH_SIZE) {
    const batch = withUrls.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (p: any) => {
      try {
        const res = await fetch(p.source_url, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
        if (res.status === 404) {
          const stale = p.bid_due_date && isStale(p.bid_due_date) && p.stage === 'qualification' && !proposalProjectIds.has(p.id);
          if (stale) {
            try { await client.entities.Project.update(p.id, { stage: 'lost', verification_status: 'failed' }); purged++; } catch {}
          } else {
            try { await client.entities.Project.update(p.id, { verification_status: 'failed', source_url: '' }); } catch {}
          }
          await closeGapsByTitle(client, `Broken source URL: ${p.title?.slice(0, 40)}`, 'Source URL returned 404 — project marked failed or purged.');
        } else if (!res.ok) { unreachable++; }
        validated++;
      } catch { unreachable++; }
    }));
  }

  // --- 3. Enrich missing fields (org-scoped) ---
  const missingCritical = projects.filter((p: any) =>
    !p.specs || p.specs.length < 20 || !p.contract_info || p.value == null
  );
  const enrichBatch = missingCritical.slice(0, 8);
  const ENRICH_BATCH_SIZE = 4;
  for (let i = 0; i < enrichBatch.length; i += ENRICH_BATCH_SIZE) {
    const batch = enrichBatch.slice(i, i + ENRICH_BATCH_SIZE);
    await Promise.all(batch.map(async (p: any) => {
      try {
        const llm = await client.integrations.Core.InvokeLLM({
          prompt: `From the project's own source data, extract ONLY details explicitly present. Do NOT infer or fabricate. Project: "${p.title}" in ${p.jurisdiction || 'unknown location'}. Return JSON: description, specs, contract_info, value (number or null), bid_due_date (YYYY-MM-DD or null), client_name, project_type, jurisdiction. If a field is not available, return empty string or null.`,
          response_json_schema: { type: 'object', properties: {
            description: { type: 'string' }, specs: { type: 'string' }, contract_info: { type: 'string' },
            value: { type: 'number' }, bid_due_date: { type: 'string' }, client_name: { type: 'string' },
            project_type: { type: 'string' }, jurisdiction: { type: 'string' }
          } },
        });
        // P1-5: add_context_from_internet removed — no open-ended web search fabrication
        const real = (v: any) => v && v !== 'null' && v !== 'N/A' && v !== 'Not listed' ? v : undefined;
        const update: any = {};
        if (real(llm?.description) && (!p.description || p.description.length < 20)) update.description = llm.description;
        if (real(llm?.specs) && (!p.specs || p.specs.length < 20)) update.specs = llm.specs;
        if (real(llm?.contract_info)) update.contract_info = llm.contract_info;
        if (typeof llm?.value === 'number' && llm.value > 0 && !p.value) update.value = llm.value;
        if (real(llm?.bid_due_date) && !p.bid_due_date) update.bid_due_date = llm.bid_due_date;
        if (real(llm?.client_name) && !p.client_name) update.client_name = llm.client_name;
        if (real(llm?.project_type) && !p.project_type) update.project_type = llm.project_type;
        if (real(llm?.jurisdiction) && !p.jurisdiction) update.jurisdiction = llm.jurisdiction;
        if (Object.keys(update).length > 0) {
          await client.entities.Project.update(p.id, update);
          enriched++;
        }
      } catch {}
    }));
  }

  // --- 4. Ensure completeness check (org-scoped) ---
  const requiredFields = ['title', 'description', 'specs', 'contract_info', 'jurisdiction', 'trade', 'project_type', 'bid_due_date', 'value'];
  let incomplete = 0;
  for (const p of projects) {
    const missing = requiredFields.filter((f) => !p[f] || p[f] === 'null');
    if (missing.length > 3) incomplete++;
  }
  if (incomplete > 0) {
    await createGap(client, { title: `${incomplete} projects missing critical fields (org ${orgId.slice(-6)})`, category: 'data_integrity', severity: 'medium',
      description: `${incomplete} projects are missing more than 3 of: ${requiredFields.join(', ')}. Web enrichment could not fill all gaps.` });
  }

  // Update latest SystemScore for this org
  const scores = await safeFilter(client, 'SystemScore', { organization_id: orgId });
  if (scores && scores.length > 0) {
    const latest = scores.sort((a: any, b: any) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0];
    try { await client.entities.SystemScore.update(latest.id, { run_phase: 'integrity' }); } catch {}
  }

  return { purged, enriched, validated, unreachable, incomplete };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      let totals: any = { purged: 0, enriched: 0, validated: 0, unreachable: 0, incomplete: 0 };
      for (const orgId of ctx.orgIds) {
        const r = await processOrg(client, orgId);
        for (const k of Object.keys(totals)) totals[k] += (r as any)[k];
      }
      return Response.json({ success: true, ...totals });
    }

    // Service-role: iterate all organizations
    let totals: any = { purged: 0, enriched: 0, validated: 0, unreachable: 0, incomplete: 0 };
    const result = await forEachOrganization(base44.asServiceRole, async (org) => {
      const r = await processOrg(base44.asServiceRole, org.id);
      for (const k of Object.keys(totals)) totals[k] += (r as any)[k];
    });
    return Response.json({ success: true, ...totals, org_errors: result.errors.length });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}