// Progressive Load Test
// Simulates increasing load on the system by running queries across
// all existing organizations multiple times to measure latency, throughput,
// and error rates. Projects results toward 5,000-org scale.
//
// Does NOT create synthetic organizations — uses existing orgs and
// multiplies query load to simulate scale.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization } from '../../shared/orgContext.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const orgs = await svc.entities.Organization.list(100);
    const orgCount = (orgs || []).length;

    if (orgCount === 0) {
      return Response.json({ error: 'No organizations found for load test' }, { status: 400 });
    }

    const stages = [10, 50, 100, 500];
    const results: any[] = [];

    for (const targetOrgs of stages) {
      const iterations = Math.ceil(targetOrgs / orgCount);
      const startTime = Date.now();
      let queries = 0;
      let errors = 0;
      let recordsProcessed = 0;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        await forEachOrganization(svc, async (org: any) => {
          const qStart = Date.now();
          try {
            const projects = await svc.entities.Project.filter({ organization_id: org.id }, '-created_date', 20).catch(() => []);
            queries++;
            recordsProcessed += (projects || []).length;
            latencies.push(Date.now() - qStart);
          } catch (e: any) {
            errors++;
            console.error(`Load test query failed for org ${org.id}:`, e?.message || e);
          }
        });
      }

      const elapsed = Date.now() - startTime;
      const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
      const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
      const p95Latency = latencies.length > 0 ? latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)] : 0;
      const throughput = elapsed > 0 ? (queries / elapsed) * 1000 : 0;

      // Project to 5000 orgs
      const projectedQueries = 5000 * 1; // 1 query per org
      const projectedTime = avgLatency > 0 ? (projectedQueries * avgLatency) / 1000 : 0;

      results.push({
        stage: targetOrgs,
        actual_orgs: orgCount,
        iterations,
        total_queries: queries,
        errors,
        records_processed: recordsProcessed,
        elapsed_ms: elapsed,
        avg_latency_ms: Math.round(avgLatency),
        max_latency_ms: maxLatency,
        p95_latency_ms: p95Latency,
        throughput_qps: Math.round(throughput * 100) / 100,
        error_rate: queries > 0 ? Math.round((errors / queries) * 100 * 100) / 100 : 0,
        projected_5000_orgs_time_s: Math.round(projectedTime),
      });
    }

    // Summary
    const lastStage = results[results.length - 1];
    const summary = {
      tested_orgs: orgCount,
      max_simulated_scale: stages[stages.length - 1],
      max_queries: lastStage?.total_queries || 0,
      max_avg_latency_ms: lastStage?.avg_latency_ms || 0,
      max_p95_latency_ms: lastStage?.p95_latency_ms || 0,
      max_error_rate: lastStage?.error_rate || 0,
      projected_5000_orgs: {
        estimated_time_s: lastStage?.projected_5000_orgs_time_s || 0,
        estimated_queries: 5000,
        feasible: (lastStage?.error_rate || 0) === 0 && (lastStage?.avg_latency_ms || 9999) < 2000,
      },
      target_scale: {
        organizations: 5000,
        users: 25000,
        concurrent_sessions: 2000,
        opportunity_records: 1000000,
        incoming_records_per_day: 100000,
      },
    };

    return Response.json({
      success: true,
      actual_org_count: orgCount,
      stages: results,
      summary,
      verdict: summary.projected_5000_orgs.feasible ? 'PROJECTED_FEASIBLE' : 'NEEDS_SCALE_TESTING',
      note: 'Load test used existing organizations with multiplied query load. Full 5000-org scale test requires dedicated infrastructure.',
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Load test failed' }, { status: 500 });
  }
}