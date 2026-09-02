import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { safeList, safeListScoped } from '../../shared/systemUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization } from '../../shared/orgContext.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Check if already researched this month
    const existing = await safeList(client, 'Benchmark');
    const thisMonth = new Date().toISOString().slice(0, 7);
    const recent = existing.filter(b => b.last_researched_date && b.last_researched_date.slice(0, 7) === thisMonth);
    if (recent.length >= 6) {
      return Response.json({ success: true, skipped: true, reason: 'Already researched this month', count: recent.length });
    }

    const categories = [
      { key: 'construction_os', query: 'top construction management operating systems software platforms 2026 with AI features, project management, bidding, estimating' },
      { key: 'ai_takeoff', query: 'best AI construction takeoff software 2026 automated quantity takeoff measurement tools' },
      { key: 'ai_bidding', query: 'top AI construction bidding and proposal software 2026 automated bid estimation platforms' },
    ];

    let totalCreated = 0;
    for (const cat of categories) {
      try {
        const llm = await client.integrations.Core.InvokeLLM({
          prompt: `Research and identify the top 3-5 ${cat.query}. For each, return: name, features (array of strings), pricing_model, ai_capabilities, market_position, differentiators, source_url (real URL if known). Return a JSON object with a "competitors" array.\n\nFormat: {"competitors": [{"name": "...", "features": [...], "pricing_model": "...", "ai_capabilities": "...", "market_position": "...", "differentiators": "...", "source_url": "..."}]}`,
          response_json_schema: { type: 'object', properties: {
            competitors: { type: 'array', items: { type: 'object', properties: {
              name: { type: 'string' }, features: { type: 'array', items: { type: 'string' } },
              pricing_model: { type: 'string' }, ai_capabilities: { type: 'string' },
              market_position: { type: 'string' }, differentiators: { type: 'string' }, source_url: { type: 'string' }
            } } }
          } },
          add_context_from_internet: true,
          model: 'gemini_3_flash',
        });

        const competitors = llm?.competitors || [];
        for (const c of competitors) {
          if (!c.name) continue;
          // Skip if already exists
          const dupe = existing.find(b => b.competitor_name?.toLowerCase() === c.name.toLowerCase());
          if (dupe) {
            await client.entities.Benchmark.update(dupe.id, {
              features: c.features || dupe.features,
              pricing_model: c.pricing_model || dupe.pricing_model,
              ai_capabilities: c.ai_capabilities || dupe.ai_capabilities,
              market_position: c.market_position || dupe.market_position,
              differentiators: c.differentiators || dupe.differentiators,
              source_url: c.source_url || dupe.source_url,
              last_researched_date: new Date().toISOString(),
            });
          } else {
            await client.entities.Benchmark.create({
              competitor_name: c.name,
              category: cat.key,
              features: c.features || [],
              pricing_model: c.pricing_model || '',
              ai_capabilities: c.ai_capabilities || '',
              market_position: c.market_position || '',
              differentiators: c.differentiators || '',
              source_url: c.source_url || '',
              last_researched_date: new Date().toISOString(),
            });
            totalCreated++;
          }
        }
      } catch {}
    }

    // Generate gap analysis vs AUTOLEADS
    const allBenchmarks = await safeList(client, 'Benchmark');
    let gapSummary = '';
    try {
      const gapLlm = await client.integrations.Core.InvokeLLM({
        prompt: `Compare AUTOLEADS (an autonomous preconstruction OS with AI lead discovery, automated takeoff, estimating, proposal generation, contractor portal, and pricing intelligence) against these competitors:\n${JSON.stringify(allBenchmarks.slice(0, 10).map(b => ({ name: b.competitor_name, category: b.category, features: b.features, ai: b.ai_capabilities })))}\n\nReturn a concise gap analysis: what AUTOLEADS does better, what it lacks, and its competitive rank. 200 words max.`,
      });
      gapSummary = gapLlm || '';
    } catch {}

    // Update each org's latest SystemScore with benchmark info (per-tenant, not cross-tenant)
    await forEachOrganization(client, async (org) => {
      const scores = await safeListScoped(client, 'SystemScore', org.id, '-created_date', 1);
      if (scores.length > 0) {
        await client.entities.SystemScore.update(scores[0].id, {
          benchmark_rank: `${allBenchmarks.length} competitors indexed`,
          score_breakdown: (scores[0].score_breakdown || '') + '\n---BENCHMARK---\n' + gapSummary,
          run_phase: 'benchmark',
        });
      } else {
        await client.entities.SystemScore.create({
          organization_id: org.id,
          overall_health_score: 0,
          benchmark_rank: `${allBenchmarks.length} competitors indexed`,
          score_breakdown: `---BENCHMARK---\n${gapSummary}`,
          run_phase: 'benchmark',
          open_gaps: 0,
        });
      }
    });

    return Response.json({ success: true, created: totalCreated, total_benchmarks: allBenchmarks.length, gap_analysis: gapSummary.slice(0, 500) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}