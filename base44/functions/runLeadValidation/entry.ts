// Lead Validation Engine
// Calculates precision, false-positive rate, and fidelity metrics from
// LeadValidationRecord entries. Does NOT fabricate corpus data — it processes
// whatever real reviewed records exist and reports the metrics.
//
// When 600+ reviewed records exist, this produces production-grade precision metrics.
// Until then, it reports the current state and what's needed.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const records = await svc.entities.LeadValidationRecord.list(500).catch(() => []);
    const total = (records || []).length;

    if (total === 0) {
      return Response.json({
        success: true,
        status: 'NO_CORPUS',
        message: 'No validation records found. The validation engine is ready — populate LeadValidationRecord with 500 active + 100 negative reviewed records to generate precision metrics.',
        targets: {
          active_opportunities: 500,
          known_negatives: 100,
          total_needed: 600,
        },
        metrics: null,
      });
    }

    // UNREVIEWED != NEGATIVE — only reviewed records contribute to metrics
    const reviewed = records.filter((r: any) => r.review_status === 'reviewed');
    const pending = records.filter((r: any) => r.review_status !== 'reviewed');
    const reviewedCount = reviewed.length;

    // From reviewed records only:
    const activeOps = reviewed.filter((r: any) => r.ground_truth_classification === 'active_opportunity');
    const nonOps = reviewed.filter((r: any) => r.ground_truth_classification !== 'active_opportunity' && r.ground_truth_classification !== 'pending_review');
    const duplicates = reviewed.filter((r: any) => r.ground_truth_classification === 'duplicate');

    // Precision: of reviewed records the system classified as active_opportunity, how many actually are?
    const systemActive = reviewed.filter((r: any) => r.system_classification === 'active_opportunity');
    const truePositives = systemActive.filter((r: any) => r.ground_truth_classification === 'active_opportunity');
    const falsePositives = systemActive.filter((r: any) => r.ground_truth_classification !== 'active_opportunity' && r.ground_truth_classification !== 'pending_review');
    const precision = systemActive.length > 0 ? (truePositives.length / systemActive.length) * 100 : 0;
    const falsePositiveRate = systemActive.length > 0 ? (falsePositives.length / systemActive.length) * 100 : 0;

    // Fidelity metrics (reviewed only)
    const deadlineFidelity = reviewed.filter((r: any) => r.deadline_fidelity === true).length;
    const valueFidelity = reviewed.filter((r: any) => r.value_fidelity === true).length;
    const locationFidelity = reviewed.filter((r: any) => r.location_fidelity === true).length;
    const tradeRelevance = reviewed.filter((r: any) => r.trade_relevance === true).length;
    const provenanceComplete = records.filter((r: any) => r.source_provenance_complete === true).length;

    // Duplicate suppression (reviewed only)
    const duplicateSuppression = duplicates.filter((r: any) => r.system_classification === 'duplicate').length;
    const duplicateSuppressionRate = duplicates.length > 0 ? (duplicateSuppression / duplicates.length) * 100 : 100;

    // Classification accuracy (reviewed only)
    const classificationMatches = reviewed.filter((r: any) => r.classification_match === true).length;
    const classificationAccuracy = reviewedCount > 0 ? (classificationMatches / reviewedCount) * 100 : 0;

    const metrics = {
      total_records: total,
      pending_review: pending.length,
      reviewed_records: reviewedCount,
      active_opportunities: activeOps.length,
      known_negatives: nonOps.length,
      duplicates: duplicates.length,
      precision: reviewedCount > 0 ? Math.round(precision * 100) / 100 : null,
      false_positive_rate: reviewedCount > 0 ? Math.round(falsePositiveRate * 100) / 100 : null,
      classification_accuracy: reviewedCount > 0 ? Math.round(classificationAccuracy * 100) / 100 : null,
      deadline_fidelity: reviewedCount > 0 ? Math.round((deadlineFidelity / reviewedCount) * 100 * 100) / 100 : null,
      value_fidelity: reviewedCount > 0 ? Math.round((valueFidelity / reviewedCount) * 100 * 100) / 100 : null,
      location_fidelity: reviewedCount > 0 ? Math.round((locationFidelity / reviewedCount) * 100 * 100) / 100 : null,
      trade_relevance: reviewedCount > 0 ? Math.round((tradeRelevance / reviewedCount) * 100 * 100) / 100 : null,
      source_provenance: total > 0 ? Math.round((provenanceComplete / total) * 100 * 100) / 100 : 0,
      duplicate_suppression: reviewedCount > 0 ? Math.round(duplicateSuppressionRate * 100) / 100 : null,
    };

    // Check targets
    const targets = {
      precision: { target: 95, actual: metrics.precision, pass: metrics.precision !== null && metrics.precision >= 95 },
      false_positive_rate: { target: 2, actual: metrics.false_positive_rate, pass: metrics.false_positive_rate !== null && metrics.false_positive_rate <= 2 },
      deadline_fidelity: { target: 99, actual: metrics.deadline_fidelity, pass: metrics.deadline_fidelity !== null && metrics.deadline_fidelity >= 99 },
      value_fidelity: { target: 98, actual: metrics.value_fidelity, pass: metrics.value_fidelity !== null && metrics.value_fidelity >= 98 },
      source_provenance: { target: 100, actual: metrics.source_provenance, pass: metrics.source_provenance >= 100 },
      duplicate_suppression: { target: 99, actual: metrics.duplicate_suppression, pass: metrics.duplicate_suppression !== null && metrics.duplicate_suppression >= 99 },
    };

    const allTargetsPass = Object.values(targets).every((t: any) => t.pass);
    const corpusComplete = total >= 600;

    return Response.json({
      success: true,
      status: corpusComplete ? 'CORPUS_COMPLETE' : 'CORPUS_PARTIAL',
      corpus_size: total,
      corpus_needed: 600,
      metrics,
      targets,
      all_targets_pass: allTargetsPass,
      corpus_complete: corpusComplete,
      verdict: corpusComplete && allTargetsPass ? 'PASS' : 'UNVERIFIED (corpus incomplete or targets not met)',
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Lead validation failed' }, { status: 500 });
  }
}