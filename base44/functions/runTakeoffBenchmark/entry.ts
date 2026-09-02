// Takeoff Benchmark Engine
// Calculates accuracy metrics from TakeoffBenchmark entries.
// Does NOT manufacture benchmark plans — it processes whatever real
// benchmark records exist and reports accuracy metrics.
//
// When 50+ benchmark records exist, this produces production-grade accuracy metrics.
// Until then, it reports the current state and what's needed.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const records = await svc.entities.TakeoffBenchmark.list(500).catch(() => []);
    const total = (records || []).length;

    if (total === 0) {
      return Response.json({
        success: true,
        status: 'NO_BENCHMARK',
        message: 'No benchmark records found. The benchmark engine is ready — populate TakeoffBenchmark with 50+ approved plan sets with known ground-truth quantities to generate accuracy metrics.',
        target_benchmarks: 50,
        metrics: null,
      });
    }

    // Calculate metrics
    const approved = records.filter((r: any) => r.approval_status === 'approved');
    const approvedTotal = approved.length;

    if (approvedTotal === 0) {
      return Response.json({
        success: true,
        status: 'NO_APPROVED_BENCHMARKS',
        message: `${total} benchmark record(s) exist but none are approved. Approve records with verified ground-truth quantities to generate accuracy metrics.`,
        metrics: null,
      });
    }

    let totalAbsError = 0;
    let totalPctError = 0;
    let passCount = 0;
    let marginalCount = 0;
    let failCount = 0;
    const bySystem: Record<string, any> = {};

    for (const r of approved) {
      const gt = Number(r.ground_truth_quantity) || 0;
      const ai = Number(r.ai_quantity) || 0;
      const absError = Math.abs(ai - gt);
      const pctError = gt > 0 ? (absError / gt) * 100 : absError > 0 ? 999 : 0;

      totalAbsError += absError;
      totalPctError += pctError;

      let result = 'fail';
      if (pctError < 5) { result = 'pass'; passCount++; }
      else if (pctError < 10) { result = 'marginal'; marginalCount++; }
      else { failCount++; }

      // Group by scope system
      const key = r.scope_system || r.system_code || 'unknown';
      if (!bySystem[key]) bySystem[key] = { count: 0, totalError: 0, passCount: 0 };
      bySystem[key].count++;
      bySystem[key].totalError += pctError;
      if (result === 'pass') bySystem[key].passCount++;
    }

    const avgPctError = Math.round((totalPctError / approvedTotal) * 100) / 100;
    const avgAbsError = Math.round((totalAbsError / approvedTotal) * 100) / 100;
    const passRate = Math.round((passCount / approvedTotal) * 100 * 100) / 100;

    const systemBreakdown = Object.entries(bySystem).map(([system, data]: [string, any]) => ({
      system,
      count: data.count,
      avg_pct_error: Math.round((data.totalError / data.count) * 100) / 100,
      pass_rate: Math.round((data.passCount / data.count) * 100 * 100) / 100,
    }));

    const metrics = {
      total_benchmarks: total,
      approved_benchmarks: approvedTotal,
      avg_absolute_error: avgAbsError,
      avg_percentage_error: avgPctError,
      pass_rate: passRate,
      pass_count: passCount,
      marginal_count: marginalCount,
      fail_count: failCount,
      by_system: systemBreakdown,
    };

    const targets = {
      avg_percentage_error: { target: 5, actual: avgPctError, pass: avgPctError < 5 },
      pass_rate: { target: 80, actual: passRate, pass: passRate >= 80 },
    };

    const allTargetsPass = Object.values(targets).every((t: any) => t.pass);
    const corpusComplete = approvedTotal >= 50;

    return Response.json({
      success: true,
      status: corpusComplete ? 'BENCHMARK_COMPLETE' : 'BENCHMARK_PARTIAL',
      benchmark_size: approvedTotal,
      benchmark_needed: 50,
      metrics,
      targets,
      all_targets_pass: allTargetsPass,
      corpus_complete: corpusComplete,
      verdict: corpusComplete && allTargetsPass ? 'PASS' : 'UNVERIFIED (benchmark corpus incomplete or targets not met)',
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Takeoff benchmark failed' }, { status: 500 });
  }
}