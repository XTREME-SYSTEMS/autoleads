// Review Batch Creator
// Creates balanced 25-record review batches from the validation corpus.
// Balances across source categories to avoid presenting 25 nearly identical
// permit records in one batch.
//
// Batch creation rules:
//   - 25 records per batch
//   - Balance across source categories (government_portal, permit, agenda, etc.)
//   - Prioritize pending (unreviewed) records
//   - Track source and category distribution per batch

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

const BATCH_SIZE = 25;

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;

    // Fetch all pending validation records
    const records = await svc.entities.LeadValidationRecord.list('-created_date', 500);
    const pending = records.filter((r: any) =>
      r.review_status !== 'reviewed' && r.data_class !== 'NON_PRODUCTION_EXAMPLE'
    );

    if (pending.length === 0) {
      return Response.json({
        success: true,
        status: 'NO_PENDING_RECORDS',
        message: 'All validation records have been reviewed.',
        batches_created: 0,
      });
    }

    // Group by source category for balanced sampling
    const byCategory: Record<string, any[]> = {};
    pending.forEach((r: any) => {
      const cat = r.source_category || 'government_portal';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(r);
    });

    const categories = Object.keys(byCategory);
    const totalBatches = Math.ceil(pending.length / BATCH_SIZE);
    const batches: any[] = [];

    // Round-robin across categories to build balanced batches
    // Take one record from each category in turn until batch is full
    const categoryQueues: Record<string, number> = {};
    categories.forEach(c => { categoryQueues[c] = 0; });

    for (let b = 0; b < totalBatches; b++) {
      const batchRecords: any[] = [];
      const batchSourceDist: Record<string, number> = {};
      const batchCatDist: Record<string, number> = {};

      // Fill this batch with round-robin across categories
      let added = 0;
      let round = 0;
      while (added < BATCH_SIZE && round < 100) {
        for (const cat of categories) {
          if (added >= BATCH_SIZE) break;
          const idx = categoryQueues[cat];
          if (idx < byCategory[cat].length) {
            const rec = byCategory[cat][idx];
            batchRecords.push(rec);
            const src = rec.source_name || 'Unknown';
            batchSourceDist[src] = (batchSourceDist[src] || 0) + 1;
            batchCatDist[cat] = (batchCatDist[cat] || 0) + 1;
            categoryQueues[cat]++;
            added++;
          }
        }
        round++;
      }

      if (batchRecords.length === 0) break;

      const batchId = `BATCH-${String(b + 1).padStart(3, '0')}`;
      batches.push({
        batch_id: batchId,
        record_ids: batchRecords.map(r => r.id),
        record_count: batchRecords.length,
        status: 'PENDING',
        source_distribution: JSON.stringify(batchSourceDist),
        category_distribution: JSON.stringify(batchCatDist),
        created_at: new Date().toISOString(),
        reviewed_count: 0,
        data_class: 'production',
      });
    }

    // Create batch records
    if (batches.length > 0) {
      await svc.entities.ReviewBatch.bulkCreate(batches);
    }

    return Response.json({
      success: true,
      status: 'BATCHES_CREATED',
      pending_records: pending.length,
      batches_created: batches.length,
      batch_size: BATCH_SIZE,
      category_distribution: categories.reduce((acc, cat) => {
        acc[cat] = byCategory[cat].length;
        return acc;
      }, {} as Record<string, number>),
      batches: batches.map(b => ({
        batch_id: b.batch_id,
        record_count: b.record_count,
        source_distribution: b.source_distribution,
        category_distribution: b.category_distribution,
      })),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Batch creation failed' }, { status: 500 });
  }
}