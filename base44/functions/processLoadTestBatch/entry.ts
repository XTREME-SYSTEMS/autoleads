// Load Test Batch Processor
// Claims a QUEUED batch via lease, processes it, and records results.
// Implements lease/claim, heartbeat, stale recovery, retry, and dead-letter.
//
// Lease behavior:
//   1. Find oldest QUEUED batch (or stale LEASED batch past lease_expires_at)
//   2. Claim it: set status=LEASED, lease_owner=workerId, lease_expires_at=now+5min
//   3. Process: simulate org-context operations with timing
//   4. Record results: latencies, errors, rate limits
//   5. Complete: set status=COMPLETE or DEAD_LETTER (if max_attempts exceeded)
//
// This function processes ONE batch per call. A workflow calls it repeatedly.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

const LEASE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const workerId = body.worker_id || `worker-${Math.random().toString(36).slice(2, 8)}`;
    const runId = body.run_id; // optional: process batches for a specific run

    // Find a batch to claim: oldest QUEUED or stale LEASED
    const now = new Date();
    const allBatches = await svc.entities.LoadTestBatch.list('-created_date', 500);
    const prodBatches = allBatches.filter((b: any) =>
      b.data_class === 'NON_PRODUCTION_EXAMPLE' || b.data_class === 'production'
    );

    let batch: any = null;
    for (const b of prodBatches) {
      if (runId && b.run_id !== runId) continue;
      if (b.status === 'QUEUED') {
        batch = b;
        break;
      }
      if (b.status === 'LEASED' && b.lease_expires_at) {
        const expires = new Date(b.lease_expires_at);
        if (expires < now) {
          batch = b; // stale lease — reclaim
          break;
        }
      }
      if (b.status === 'FAILED' && b.attempts < b.max_attempts) {
        batch = b; // retry
        break;
      }
    }

    if (!batch) {
      return Response.json({
        success: true,
        status: 'NO_BATCH_AVAILABLE',
        message: 'No queued or reclaimable batches found.',
        worker_id: workerId,
      });
    }

    // Claim the batch
    const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS).toISOString();
    const newAttempts = (batch.attempts || 0) + 1;

    await svc.entities.LoadTestBatch.update(batch.id, {
      status: 'LEASED',
      lease_owner: workerId,
      lease_expires_at: leaseExpiresAt,
      heartbeat_at: now.toISOString(),
      attempts: newAttempts,
      started_at: batch.started_at || now.toISOString(),
    });

    // Simulate processing: org-context operations with timing
    // Each org context = 3 operations (read, match, score)
    const orgContexts = batch.org_contexts || 100;
    const opsPerContext = 3;
    const totalOps = orgContexts * opsPerContext;

    const latencies: number[] = [];
    let completed = 0;
    let failed = 0;
    let rateLimitHits = 0;
    const errors: string[] = [];

    // Inject failure if specified
    const injectFailure = batch.failure_injection || '';

    for (let i = 0; i < totalOps; i++) {
      // Simulate latency: 20-200ms base, with occasional spikes
      let latency = 20 + Math.random() * 180;
      if (Math.random() < 0.05) latency += 200 + Math.random() * 300; // 5% slow ops

      // Inject failures
      let shouldFail = false;
      if (injectFailure === 'source_timeout' && i === Math.floor(totalOps * 0.3)) {
        shouldFail = true;
        errors.push('source_timeout at op ' + i);
      } else if (injectFailure === 'llm_timeout' && i === Math.floor(totalOps * 0.5)) {
        shouldFail = true;
        errors.push('llm_timeout at op ' + i);
      } else if (injectFailure === 'rate_limit' && i === Math.floor(totalOps * 0.2)) {
        rateLimitHits++;
        latency += 1000; // backoff
      } else if (injectFailure === 'db_transient' && Math.random() < 0.1) {
        shouldFail = true;
      }

      // Random failure rate: 0.5% baseline
      if (!shouldFail && Math.random() < 0.005) {
        shouldFail = true;
        errors.push('random_transient_error');
      }

      if (shouldFail) {
        failed++;
      } else {
        completed++;
      }
      latencies.push(latency);

      // Heartbeat every 50 ops
      if (i > 0 && i % 50 === 0) {
        await svc.entities.LoadTestBatch.update(batch.id, {
          heartbeat_at: new Date().toISOString(),
          operations_completed: completed,
          operations_failed: failed,
        });
      }
    }

    // Compute percentiles
    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0;
    const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0;
    const p99 = latencies[Math.floor(latencies.length * 0.99)] || 0;

    const batchStatus = newAttempts >= batch.max_attempts && failed > completed
      ? 'DEAD_LETTER'
      : 'COMPLETE';

    // Update batch with results
    await svc.entities.LoadTestBatch.update(batch.id, {
      status: batchStatus,
      operations_total: totalOps,
      operations_completed: completed,
      operations_failed: failed,
      latencies_ms: JSON.stringify(latencies.slice(0, 100)), // sample
      p50_latency_ms: Math.round(p50),
      p95_latency_ms: Math.round(p95),
      p99_latency_ms: Math.round(p99),
      error_details: errors.slice(0, 10).join('; '),
      rate_limit_hits: rateLimitHits,
      completed_at: new Date().toISOString(),
    });

    // Update parent run with aggregated progress
    const runBatches = prodBatches.filter((b: any) => b.run_id === batch.run_id);
    const completedBatches = runBatches.filter((b: any) =>
      b.status === 'COMPLETE' || (b.id === batch.id && batchStatus === 'COMPLETE')
    ).length;
    const failedBatches = runBatches.filter((b: any) =>
      b.status === 'DEAD_LETTER' || (b.id === batch.id && batchStatus === 'DEAD_LETTER')
    ).length;

    // Aggregate latencies across all completed batches for this run
    const allLatencies: number[] = [];
    for (const b of runBatches) {
      if (b.latencies_ms) {
        try {
          const parsed = JSON.parse(b.latencies_ms);
          allLatencies.push(...parsed);
        } catch {}
      }
    }
    allLatencies.push(...latencies);
    allLatencies.sort((a, b) => a - b);

    const runP50 = allLatencies[Math.floor(allLatencies.length * 0.5)] || 0;
    const runP95 = allLatencies[Math.floor(allLatencies.length * 0.95)] || 0;
    const runP99 = allLatencies[Math.floor(allLatencies.length * 0.99)] || 0;

    const totalOpsRun = runBatches.reduce((sum: number, b: any) =>
      sum + (b.operations_total || 0), 0) + totalOps;
    const completedOpsRun = runBatches.reduce((sum: number, b: any) =>
      sum + (b.operations_completed || 0), 0) + completed;
    const failedOpsRun = runBatches.reduce((sum: number, b: any) =>
      sum + (b.operations_failed || 0), 0) + failed;

    const errorRate = totalOpsRun > 0 ? (failedOpsRun / totalOpsRun) * 100 : 0;
    const throughput = completedOpsRun > 0
      ? Math.round(completedOpsRun / ((Date.now() - new Date(runBatches[0]?.started_at || now.toISOString()).getTime()) / 1000))
      : 0;

    const runStatus = completedBatches + failedBatches >= (runBatches.length)
      ? (failedBatches > 0 ? 'PARTIAL' : 'COMPLETE')
      : 'RUNNING';

    // Find the run record
    const runs = await svc.entities.LoadTestRun.list('-created_date', 100);
    const runRecord = runs.find((r: any) => r.id === batch.run_id);
    if (runRecord) {
      await svc.entities.LoadTestRun.update(runRecord.id, {
        status: runStatus,
        completed_batches: completedBatches,
        failed_batches: failedBatches,
        total_operations: totalOpsRun,
        completed_operations: completedOpsRun,
        failed_operations: failedOpsRun,
        p50_latency_ms: Math.round(runP50),
        p95_latency_ms: Math.round(runP95),
        p99_latency_ms: Math.round(runP99),
        error_rate: Math.round(errorRate * 100) / 100,
        throughput_ops_per_sec: throughput,
        rate_limit_count: runBatches.reduce((sum: number, b: any) =>
          sum + (b.rate_limit_hits || 0), 0) + rateLimitHits,
        dead_letter_count: failedBatches,
        retry_count: runBatches.reduce((sum: number, b: any) =>
          sum + Math.max(0, (b.attempts || 0) - 1), 0),
        ...(runStatus === 'COMPLETE' || runStatus === 'PARTIAL'
          ? { completed_at: new Date().toISOString() }
          : {}),
      });
    }

    return Response.json({
      success: true,
      status: 'BATCH_PROCESSED',
      worker_id: workerId,
      batch_id: batch.id,
      batch_number: batch.batch_number,
      run_id: batch.run_id,
      batch_status: batchStatus,
      attempts: newAttempts,
      operations: {
        total: totalOps,
        completed: completed,
        failed: failed,
      },
      latency: {
        p50: Math.round(p50),
        p95: Math.round(p95),
        p99: Math.round(p99),
      },
      rate_limit_hits: rateLimitHits,
      errors: errors.slice(0, 5),
      run_progress: {
        completed_batches: completedBatches,
        failed_batches: failedBatches,
        total_batches: runBatches.length,
        run_status: runStatus,
      },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Batch processing failed' }, { status: 500 });
  }
}