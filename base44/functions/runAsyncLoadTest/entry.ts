// Async Load Test Harness
// Creates a LoadTestRun with LoadTestBatch records for asynchronous execution.
// Each batch is a queued unit of work that a worker can claim via lease.
//
// This replaces the synchronous loadTest function that timed out at 300s.
// The async architecture allows:
//   - Persistent queued work with lease/claim behavior
//   - Batch ownership and heartbeat
//   - Stale lease recovery
//   - Idempotency keys
//   - Dead-letter state for failed batches
//   - Progress tracking across many batches
//
// Usage:
//   POST with { target_org_contexts: 1000, batch_size: 100, concurrency: 5 }
//   Creates the run + batch queue, returns immediately.
//   Workers process batches via processLoadTestBatch function.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;

    const targetOrgContexts = body.target_org_contexts || 1000;
    const batchSize = body.batch_size || 100;
    const concurrency = body.concurrency || 5;
    const failureInjections = body.failure_injections || [];

    // Validate scale waves: 1000 → 2500 → 5000
    if (![1000, 2500, 5000].includes(targetOrgContexts)) {
      return Response.json({
        error: 'target_org_contexts must be 1000, 2500, or 5000 (staged scale waves)',
      }, { status: 400 });
    }

    // Count existing runs to generate run_id
    const existingRuns = await svc.entities.LoadTestRun.list('-created_date', 100);
    const runNumber = (existingRuns || []).length + 1;
    const runId = `RUN-${String(runNumber).padStart(3, '0')}-${targetOrgContexts}ctx`;

    const totalBatches = Math.ceil(targetOrgContexts / batchSize);
    const now = new Date().toISOString();

    // Create the run record
    const run = await svc.entities.LoadTestRun.create({
      run_id: runId,
      target_org_contexts: targetOrgContexts,
      target_operations: targetOrgContexts * 3, // ~3 ops per org context (read, match, score)
      batch_size: batchSize,
      concurrency,
      status: 'QUEUED',
      started_at: now,
      total_batches: totalBatches,
      completed_batches: 0,
      failed_batches: 0,
      total_operations: 0,
      completed_operations: 0,
      failed_operations: 0,
      queue_depth_peak: totalBatches,
      retry_count: 0,
      rate_limit_count: 0,
      dead_letter_count: 0,
      failure_injections: JSON.stringify(failureInjections),
      data_class: 'NON_PRODUCTION_EXAMPLE',
    });

    // Create batch queue — all batches start as QUEUED
    const batches: any[] = [];
    for (let i = 0; i < totalBatches; i++) {
      const orgContexts = Math.min(batchSize, targetOrgContexts - i * batchSize);
      batches.push({
        run_id: run.id,
        batch_number: i + 1,
        org_contexts: orgContexts,
        status: 'QUEUED',
        attempts: 0,
        max_attempts: 3,
        idempotency_key: `${runId}-BATCH-${i + 1}`,
        operations_total: orgContexts * 3,
        operations_completed: 0,
        operations_failed: 0,
        rate_limit_hits: 0,
        data_class: 'NON_PRODUCTION_EXAMPLE',
        // Inject failures into specific batches if requested
        failure_injection: failureInjections.includes(i + 1)
          ? ['source_timeout', 'llm_timeout', 'rate_limit', 'db_transient'][i % 4]
          : '',
      });
    }

    await svc.entities.LoadTestBatch.bulkCreate(batches);

    return Response.json({
      success: true,
      status: 'RUN_QUEUED',
      run_id: runId,
      run_record_id: run.id,
      target_org_contexts: targetOrgContexts,
      batch_size: batchSize,
      total_batches: totalBatches,
      concurrency: concurrency,
      failure_injections: failureInjections,
      message: `Load test run queued with ${totalBatches} batches. Workers can now claim batches via processLoadTestBatch.`,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Async load test creation failed' }, { status: 500 });
  }
}