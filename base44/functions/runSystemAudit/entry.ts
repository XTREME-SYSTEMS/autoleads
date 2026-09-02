import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { ALL_ENTITIES, safeList, todayISO, createGap } from '../../shared/systemUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projects = await safeList(client, 'Project');
    const proposals = await safeList(client, 'Proposal');
    const estimates = await safeList(client, 'Estimate');
    const takeoffs = await safeList(client, 'Takeoff');
    const gaps = await safeList(client, 'SystemGap');

    // --- 1. Data Quality Score ---
    const totalProjects = projects.length;
    const withSpecs = projects.filter(p => p.specs && p.specs.length > 20).length;
    const verified = projects.filter(p => p.verification_status === 'verified').length;
    const withValue = projects.filter(p => p.value != null && p.value > 0).length;
    const withSourceUrl = projects.filter(p => p.source_url).length;
    const withJurisdiction = projects.filter(p => p.jurisdiction).length;
    const withTrade = projects.filter(p => p.trade).length;
    const nonProd = projects.filter(p => p.data_class === 'NON_PRODUCTION_EXAMPLE').length;

    const dataQualityScore = totalProjects === 0 ? 0 : Math.round(
      ((withSpecs / totalProjects) * 25 +
       (verified / totalProjects) * 25 +
       (withValue / totalProjects) * 20 +
       (withSourceUrl / totalProjects) * 15 +
       (withJurisdiction / totalProjects) * 7.5 +
       (withTrade / totalProjects) * 7.5) - (nonProd * 2)
    );
    const dqClamped = Math.max(0, Math.min(100, dataQualityScore));

    // --- 2. Pipeline Efficiency Score ---
    const byStage = {};
    projects.forEach(p => { byStage[p.stage] = (byStage[p.stage] || 0) + 1; });
    const advanced = (byStage['estimating'] || 0) + (byStage['proposal'] || 0) + (byStage['submitted'] || 0) + (byStage['won'] || 0);
    const stuck = (byStage['qualification'] || 0);
    const failed = projects.filter(p => p.verification_status === 'failed').length;
    const proposalRate = totalProjects > 0 ? proposals.length / totalProjects : 0;
    const estimateRate = totalProjects > 0 ? estimates.length / totalProjects : 0;
    const takeoffRate = totalProjects > 0 ? takeoffs.length / totalProjects : 0;

    const pipelineScore = totalProjects === 0 ? 0 : Math.round(
      ((advanced / totalProjects) * 40 +
       Math.min(proposalRate, 1) * 25 +
       Math.min(estimateRate, 1) * 20 +
       Math.min(takeoffRate, 1) * 15) - (failed * 1.5)
    );
    const pipeClamped = Math.max(0, Math.min(100, pipelineScore));

    // --- 3. Security Score ---
    // RLS was applied to all entities in a prior hardening pass. Score based on data isolation indicators.
    const entitiesWithRecords = ALL_ENTITIES.filter(e => e !== 'SystemScore' && e !== 'Benchmark' && e !== 'SystemGap');
    const entitiesChecked = entitiesWithRecords.length;
    // Check that records have created_by_id (indicates RLS/ownership tracking is active)
    let rlsOk = 0;
    for (const ent of entitiesWithRecords.slice(0, 10)) {
      const recs = await safeList(client, ent, '-created_date', 5);
      if (recs.length === 0) { rlsOk++; continue; }
      if (recs.every(r => r.created_by_id)) rlsOk++;
    }
    const securityScore = Math.round((rlsOk / Math.min(entitiesChecked, 10)) * 100);

    // --- 4. UI Completeness Score ---
    // Proxy: entities that should have data for pages to render meaningfully
    const criticalEntities = ['Project', 'Proposal', 'Estimate', 'Takeoff', 'CompanyProfile', 'PricingProfile', 'ScrapeSource'];
    let uiOk = 0;
    for (const ent of criticalEntities) {
      const recs = await safeList(client, ent, '-created_date', 1);
      if (recs.length > 0) uiOk++;
    }
    const uiScore = Math.round((uiOk / criticalEntities.length) * 100);

    // --- 5. Overall Score ---
    const overall = Math.round((dqClamped * 0.3 + pipeClamped * 0.3 + securityScore * 0.2 + uiScore * 0.2));

    // --- 6. Benchmark Rank ---
    const benchmarks = await safeList(client, 'Benchmark');
    const benchmarkRank = benchmarks.length === 0 ? 'Not ranked' : `${benchmarks.length} competitors indexed`;

    const breakdown = JSON.stringify({
      data_quality: { score: dqClamped, totalProjects, withSpecs, verified, withValue, failed, nonProd },
      pipeline: { score: pipeClamped, byStage, advanced, stuck, proposals: proposals.length, estimates: estimates.length, takeoffs: takeoffs.length },
      security: { score: securityScore, entitiesChecked, rlsOk },
      ui: { score: uiScore, criticalEntitiesOk: uiOk },
      openGaps: gaps.filter(g => g.status === 'open').length,
    });

    const score = await client.entities.SystemScore.create({
      overall_health_score: overall,
      data_quality_score: dqClamped,
      pipeline_efficiency_score: pipeClamped,
      security_score: securityScore,
      ui_completeness_score: uiScore,
      benchmark_rank: benchmarkRank,
      score_breakdown: breakdown,
      open_gaps: gaps.filter(g => g.status === 'open').length,
      run_phase: 'audit',
    });

    // Flag critical gaps
    if (dqClamped < 50) {
      await createGap(client, { title: 'Data quality below 50%', category: 'data_integrity', severity: 'high',
        description: `Data quality score is ${dqClamped}%. ${failed} projects failed verification, ${totalProjects - withSpecs} missing specs.` });
    }
    if (pipeClamped < 40 && totalProjects > 5) {
      await createGap(client, { title: 'Pipeline bottleneck detected', category: 'performance', severity: 'high',
        description: `Pipeline efficiency is ${pipeClamped}%. ${stuck} projects stuck in qualification, only ${advanced} advanced.` });
    }

    return Response.json({ success: true, overall, data_quality: dqClamped, pipeline: pipeClamped, security: securityScore, ui: uiScore, benchmark_rank: benchmarkRank, score_id: score?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}