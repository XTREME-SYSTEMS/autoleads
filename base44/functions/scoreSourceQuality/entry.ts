// Source Quality Scoring Engine
// Computes per-source quality metrics from reviewed LeadValidationRecord entries.
// Does NOT fabricate data — it processes whatever real reviewed records exist.
//
// Metrics per source:
//   precision_score     — accepted / (accepted + false_positives)
//   freshness_score      — % of records with FRESH freshness status
//   deadline_accuracy    — % of records with verified correct deadlines
//   value_accuracy       — % of records with verified correct published values
//   document_completeness — % of records with complete documents
//   contact_completeness — % of records with complete contact info
//   quality_score        — 0-100 composite weighted by reviewed evidence
//
// Only reviewed records contribute to quality scores (UNREVIEWED != NEGATIVE).

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;

    // Fetch all validation records and existing source scores
    const [records, existingScores, sources] = await Promise.all([
      svc.entities.LeadValidationRecord.list(500).catch(() => []),
      svc.entities.SourceQualityScore.list(500).catch(() => []),
      svc.entities.ScrapeSource.list(500).catch(() => []),
    ]);

    const prodRecords = (records || []).filter((r: any) => r.data_class !== 'NON_PRODUCTION_EXAMPLE');
    const reviewed = prodRecords.filter((r: any) => r.review_status === 'reviewed');

    if (reviewed.length === 0) {
      return Response.json({
        success: true,
        status: 'NO_REVIEWED_RECORDS',
        message: 'No reviewed validation records found. Source quality scoring requires human-reviewed records.',
        sources_scored: 0,
      });
    }

    // Group reviewed records by source_name
    const bySource: Record<string, any[]> = {};
    reviewed.forEach((r: any) => {
      const src = r.source_name || 'Unknown';
      if (!bySource[src]) bySource[src] = [];
      bySource[src].push(r);
    });

    // Compute quality metrics per source
    const sourceMetrics: any[] = [];
    const upserts: any[] = [];

    for (const [sourceName, recs] of Object.entries(bySource)) {
      const total = recs.length;
      const accepted = recs.filter((r: any) => r.ground_truth_classification === 'active_opportunity').length;
      const rejected = recs.filter((r: any) =>
        r.ground_truth_classification === 'not_an_opportunity' ||
        r.ground_truth_classification === 'out_of_scope'
      ).length;
      const falsePositives = recs.filter((r: any) =>
        r.system_classification === 'active_opportunity' &&
        r.ground_truth_classification !== 'active_opportunity' &&
        r.ground_truth_classification !== 'pending_review'
      ).length;
      const duplicates = recs.filter((r: any) => r.ground_truth_classification === 'duplicate').length;

      const deadlineCorrect = recs.filter((r: any) => r.deadline_fidelity === true).length;
      const valueCorrect = recs.filter((r: any) => r.value_fidelity === true).length;
      const locationCorrect = recs.filter((r: any) => r.location_fidelity === true).length;
      const tradeCorrect = recs.filter((r: any) => r.trade_relevance === true).length;
      const provenanceComplete = recs.filter((r: any) => r.source_provenance_complete === true).length;

      const precision = accepted + falsePositives > 0
        ? (accepted / (accepted + falsePositives)) * 100 : 0;
      const deadlineAccuracy = total > 0 ? (deadlineCorrect / total) * 100 : 0;
      const valueAccuracy = total > 0 ? (valueCorrect / total) * 100 : 0;
      const locationAccuracy = total > 0 ? (locationCorrect / total) * 100 : 0;
      const tradeAccuracy = total > 0 ? (tradeCorrect / total) * 100 : 0;
      const provenanceScore = total > 0 ? (provenanceComplete / total) * 100 : 0;

      // Composite quality score: weighted average of precision, fidelity, provenance
      const qualityScore = Math.round(
        (precision * 0.35) +
        (deadlineAccuracy * 0.15) +
        (valueAccuracy * 0.10) +
        (locationAccuracy * 0.10) +
        (tradeAccuracy * 0.10) +
        (provenanceScore * 0.20)
      );

      // Find source metadata
      const sourceMeta = (sources || []).find((s: any) => s.name === sourceName);
      const sourceCategory = recs[0]?.source_category || sourceMeta?.source_type || 'government_portal';
      const jurisdiction = sourceMeta?.jurisdiction || recs[0]?.detected_state || '';

      const metrics = {
        source_name: sourceName,
        source_id: sourceMeta?.id || '',
        source_category: sourceCategory,
        jurisdiction,
        records_contributed: total,
        records_accepted: accepted,
        records_rejected: rejected,
        false_positives: falsePositives,
        duplicate_contribution: duplicates,
        precision_score: Math.round(precision * 100) / 100,
        deadline_accuracy: Math.round(deadlineAccuracy * 100) / 100,
        value_accuracy: Math.round(valueAccuracy * 100) / 100,
        location_accuracy: Math.round(locationAccuracy * 100) / 100,
        trade_accuracy: Math.round(tradeAccuracy * 100) / 100,
        provenance_score: Math.round(provenanceScore * 100) / 100,
        quality_score: qualityScore,
        last_scored_at: new Date().toISOString(),
      };

      sourceMetrics.push(metrics);

      // Upsert into SourceQualityScore entity
      const existing = (existingScores || []).find((s: any) =>
        s.source_name === sourceName && s.data_class !== 'NON_PRODUCTION_EXAMPLE'
      );

      if (existing) {
        upserts.push({
          id: existing.id,
          ...metrics,
          organization_id: existing.organization_id || '',
        });
      } else {
        upserts.push({
          ...metrics,
          organization_id: '',
        });
      }
    }

    // Execute upserts
    const toUpdate = upserts.filter(u => u.id);
    const toCreate = upserts.filter(u => !u.id);

    if (toUpdate.length > 0) {
      await svc.entities.SourceQualityScore.bulkUpdate(toUpdate);
    }
    if (toCreate.length > 0) {
      await svc.entities.SourceQualityScore.bulkCreate(toCreate);
    }

    // Rank sources by quality score
    const ranked = sourceMetrics.sort((a, b) => b.quality_score - a.quality_score);

    return Response.json({
      success: true,
      status: 'SCORED',
      sources_scored: sourceMetrics.length,
      reviewed_records: reviewed.length,
      source_rankings: ranked.map((s, i) => ({
        rank: i + 1,
        source_name: s.source_name,
        quality_score: s.quality_score,
        precision: s.precision_score,
        records: s.records_contributed,
        accepted: s.records_accepted,
        false_positives: s.false_positives,
      })),
      upserts: { updated: toUpdate.length, created: toCreate.length },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Source quality scoring failed' }, { status: 500 });
  }
}