import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeListScoped, safeFilter, todayISO, isStale, createGap, closeGapsByTitle, fetchPageText } from '../../shared/systemUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';

function normalizeTitle(t: string): string {
  return (t || '').toLowerCase().trim().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ');
}

async function processOrg(client: any, orgId: string) {
  const projects = await safeListScoped(client, 'Project', orgId);
  let purged = 0, fixed = 0, hardened = 0, optimized = 0, enhanced = 0, evolved = 0, merged = 0;

  // --- PHASE 2: SUPPRESS STALE DATA (org-scoped, NO hard deletion) ---
  // Stale/expired projects are marked, not deleted — source intelligence is preserved.
  const proposals = await safeListScoped(client, 'Proposal', orgId);
  const proposalProjectIds = new Set(proposals.map((p: any) => p.project_id));
  for (const p of projects) {
    if (p.bid_due_date && isStale(p.bid_due_date) && p.stage === 'qualification' && !proposalProjectIds.has(p.id)) {
      try { await client.entities.Project.update(p.id, { stage: 'lost', verification_status: 'failed' }); purged++; } catch {}
    }
  }
  const nonProd = projects.filter((p: any) => p.data_class === 'NON_PRODUCTION_EXAMPLE');
  for (const p of nonProd) {
    try { await client.entities.Project.update(p.id, { data_class: 'production', stage: 'lost' }); purged++; } catch {}
  }

  // --- PHASE 3: FIX (org-scoped) ---
  const needVerify = projects.filter((p: any) => p.source_url && (p.verification_status === 'failed' || !p.verification_status));
  for (const p of needVerify.slice(0, 10)) {
    const pageText = await fetchPageText(p.source_url);
    if (!pageText) continue;
    try {
      const extracted = await client.integrations.Core.InvokeLLM({
        prompt: `From this construction bid page, extract REAL details. Return JSON: description, specs, contract_info, value (number or null), bid_due_date (YYYY-MM-DD or null), client_name (or null), project_type (or null).\n\nPAGE:\n${pageText}`,
        response_json_schema: { type: 'object', properties: {
          description: { type: 'string' }, specs: { type: 'string' }, contract_info: { type: 'string' },
          value: { type: 'number' }, bid_due_date: { type: 'string' }, client_name: { type: 'string' }, project_type: { type: 'string' }
        } }
      });
      const real = (v: any) => v && v !== 'null' && v !== 'N/A' ? v : undefined;
      const update: any = {
        description: extracted?.description || p.description || '',
        specs: extracted?.specs || p.specs || '',
        contract_info: extracted?.contract_info || p.contract_info || '',
        verification_status: 'verified', verified_date: new Date().toISOString(),
      };
      if (typeof extracted?.value === 'number' && extracted.value > 0) update.value = extracted.value;
      if (real(extracted?.bid_due_date)) update.bid_due_date = extracted.bid_due_date;
      if (real(extracted?.client_name)) update.client_name = extracted.client_name;
      if (real(extracted?.project_type)) update.project_type = extracted.project_type;
      await client.entities.Project.update(p.id, update);
      fixed++;
    } catch {}
  }

  // --- PHASE 4: HARDEN (org-scoped) ---
  const entityCheck = ['Project', 'Proposal', 'Estimate', 'Takeoff', 'Contact', 'Message', 'Material', 'ScrapeSource'];
  for (const ent of entityCheck) {
    const recs = await safeListScoped(client, ent, orgId, '-created_date', 3);
    if (recs.length > 0 && recs.some((r: any) => !r.created_by_id)) {
      await createGap(client, { title: `RLS gap: ${ent} has records without ownership (org ${orgId.slice(-6)})`, category: 'security', severity: 'high',
        description: `Entity ${ent} has records missing created_by_id, indicating RLS may not be enforced.` });
    } else {
      hardened++;
    }
  }

  // --- PHASE 5: MERGE DUPLICATES (within this org only) ---
  const titleMap: Record<string, any[]> = {};
  projects.forEach((p: any) => { const k = normalizeTitle(p.title); if (k) (titleMap[k] = titleMap[k] || []).push(p); });
  for (const [title, dups] of Object.entries(titleMap)) {
    if (dups.length < 2) { optimized++; continue; }
    const criticalFields = ['title', 'description', 'specs', 'contract_info', 'jurisdiction', 'trade', 'project_type', 'bid_due_date', 'value', 'client_name', 'authority', 'address'];
    const scored = dups.map((p: any) => ({ p, score: criticalFields.filter((f) => p[f] != null && p[f] !== '' && p[f] !== 'null').length }));
    scored.sort((a, b) => b.score - a.score);
    const keeper = scored[0].p;
    const losers = scored.slice(1);
    const mergedUpdate: any = {};
    for (const { p: loser } of losers) {
      for (const f of criticalFields) {
        if (!keeper[f] && loser[f] && loser[f] !== 'null') mergedUpdate[f] = loser[f];
      }
    }
    if (Object.keys(mergedUpdate).length > 0) {
      try { await client.entities.Project.update(keeper.id, mergedUpdate); } catch {}
    }
    // Suppress duplicates instead of hard-deleting — preserve source intelligence
    for (const { p: loser } of losers) {
      try { await client.entities.Project.update(loser.id, { stage: 'lost', verification_status: 'failed' }); merged++; } catch {}
    }
    await closeGapsByTitle(client, `Duplicate projects: ${title.slice(0, 50)}`, `Merged ${dups.length} duplicates into 1, suppressed ${losers.length}.`);
  }

  // --- PHASE 6: ENHANCE (use org's own company profile) ---
  const companies = await safeListScoped(client, 'CompanyProfile', orgId);
  const company = companies[0];
  if (company) {
    const missingTrade = projects.filter((p: any) => !p.trade && company.trade);
    for (const p of missingTrade.slice(0, 20)) {
      try { await client.entities.Project.update(p.id, { trade: company.trade }); enhanced++; } catch {}
    }
  }

  // --- PHASE 7: EVOLVE (compare org's own scores) ---
  const scores = await safeFilter(client, 'SystemScore', { organization_id: orgId });
  const sortedScores = (scores || []).sort((a: any, b: any) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
  if (sortedScores.length >= 2) {
    const current = sortedScores[0];
    const prev = sortedScores[1];
    const regressions: string[] = [];
    if (current.data_quality_score < prev.data_quality_score) regressions.push(`data_quality: ${prev.data_quality_score} → ${current.data_quality_score}`);
    if (current.pipeline_efficiency_score < prev.pipeline_efficiency_score) regressions.push(`pipeline: ${prev.pipeline_efficiency_score} → ${current.pipeline_efficiency_score}`);
    if (current.security_score < prev.security_score) regressions.push(`security: ${prev.security_score} → ${current.security_score}`);
    if (current.ui_completeness_score < prev.ui_completeness_score) regressions.push(`ui: ${prev.ui_completeness_score} → ${current.ui_completeness_score}`);
    if (regressions.length > 0) {
      await createGap(client, { title: `Score regression detected (org ${orgId.slice(-6)})`, category: 'performance', severity: 'high',
        description: `Scores dropped since last audit: ${regressions.join(', ')}. Investigate and fix.` });
    } else {
      evolved++;
    }
  } else {
    evolved++;
  }

  // Update latest SystemScore for this org
  if (sortedScores.length > 0) {
    try { await client.entities.SystemScore.update(sortedScores[0].id, { run_phase: 'heal' }); } catch {}
  }

  return { purged, fixed, hardened, optimized, enhanced, evolved, merged };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      let totals: any = { purged: 0, fixed: 0, hardened: 0, optimized: 0, enhanced: 0, evolved: 0, merged: 0 };
      for (const orgId of ctx.orgIds) {
        const r = await processOrg(client, orgId);
        for (const k of Object.keys(totals)) totals[k] += (r as any)[k];
      }
      return Response.json({ success: true, ...totals });
    }

    // Service-role: iterate all organizations
    let totals: any = { purged: 0, fixed: 0, hardened: 0, optimized: 0, enhanced: 0, evolved: 0, merged: 0 };
    const result = await forEachOrganization(base44.asServiceRole, async (org) => {
      const r = await processOrg(base44.asServiceRole, org.id);
      for (const k of Object.keys(totals)) totals[k] += (r as any)[k];
    });
    return Response.json({ success: true, ...totals, org_errors: result.errors.length });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}