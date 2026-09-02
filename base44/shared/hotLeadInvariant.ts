// Hot Lead Hard Invariant for AUTOLEADS.
// is_hot_lead may only be TRUE when ALL gates pass:
//   1. location qualifies (IN_SERVICE_AREA or MANUAL_OVERRIDE)
//   2. trade qualifies (PRIMARY_MATCH or SECONDARY_MATCH)
//   3. freshness qualifies (FRESH/AGING + OPEN/CLOSING_SOON/NO_DEADLINE)
//   4. not suppressed
//   5. production data (data_class !== NON_PRODUCTION_EXAMPLE)
//   6. source is not synthetic/test
//   7. tenant Project linkage valid if project_id exists (match.org_id === project.org_id)
//   8. commercial source intent = ACTIVE_SOLICITATION
//   9. solicitation-level evidence threshold passes
//
// If any gate fails: is_hot_lead = false.
// Zero Hot Leads is acceptable. Truth is more important than filling the queue.

import { isSyntheticSource } from './sourceSafety.ts';
import { classifySourceIntent, hasSolicitationLevelEvidence, SourceIntent } from './sourceIntent.ts';

export interface HotLeadEvaluationInput {
  match: {
    organization_id: string;
    project_id?: string;
    location_eligibility: string;
    trade_match: string;
    suppressed: boolean;
    freshness_status: string;
    data_class?: string;
  };
  canonical: {
    title?: string;
    authority?: string;
    solicitation_number?: string;
    bid_number?: string;
    project_number?: string;
    first_seen_at?: string;
    freshness_status?: string;
    deadline_status?: string;
    bid_due_date?: string;
    data_class?: string;
  };
  project?: {
    organization_id: string;
    data_class?: string;
  } | null;
  sourceRecords: { source_url?: string }[];
  source: {
    data_type?: string;
    priority?: string;
    source_name?: string;
    url?: string;
  } | null;
  sourceUrl?: string;
}

export interface HotLeadEvaluationResult {
  isHotLead: boolean;
  suppressed: boolean;
  suppressionReason: string;
  flags: string[];
  gates: {
    location: boolean;
    trade: boolean;
    freshness: boolean;
    notSuppressed: boolean;
    productionData: boolean;
    notSynthetic: boolean;
    validProjectLinkage: boolean;
    activeSolicitation: boolean;
    solicitationEvidence: boolean;
  };
}

export function evaluateHotLeadInvariant(input: HotLeadEvaluationInput): HotLeadEvaluationResult {
  const flags: string[] = [];
  const gates = {
    location: false,
    trade: false,
    freshness: false,
    notSuppressed: false,
    productionData: false,
    notSynthetic: false,
    validProjectLinkage: false,
    activeSolicitation: false,
    solicitationEvidence: false,
  };

  let suppressed = input.match.suppressed;
  let suppressionReason = '';

  const setSuppressed = (reason: string) => {
    if (!suppressed) {
      suppressed = true;
      suppressionReason = reason;
    }
  };

  // Gate 1: Location qualifies
  gates.location = input.match.location_eligibility === 'IN_SERVICE_AREA' || input.match.location_eligibility === 'MANUAL_OVERRIDE';
  if (!gates.location) {
    flags.push('LOCATION_FAIL');
    setSuppressed(`location not in service area (${input.match.location_eligibility})`);
  }

  // Gate 2: Trade qualifies
  gates.trade = input.match.trade_match === 'PRIMARY_MATCH' || input.match.trade_match === 'SECONDARY_MATCH';
  if (!gates.trade) {
    flags.push('TRADE_FAIL');
    setSuppressed(`trade does not qualify (${input.match.trade_match})`);
  }

  // Gate 3: Freshness qualifies
  const freshStatus = input.canonical.freshness_status || input.match.freshness_status;
  const deadlineStatus = input.canonical.deadline_status || '';
  const freshnessOk = ['FRESH', 'AGING'].includes(freshStatus || '') &&
    ['OPEN', 'CLOSING_SOON', 'NO_DEADLINE'].includes(deadlineStatus);
  gates.freshness = freshnessOk;
  if (!freshnessOk) {
    flags.push('FRESHNESS_FAIL');
    setSuppressed(`freshness does not qualify (${freshStatus}/${deadlineStatus || 'unknown'})`);
  }

  // Gate 4: Not suppressed
  gates.notSuppressed = !input.match.suppressed;
  if (!gates.notSuppressed) {
    flags.push('ALREADY_SUPPRESSED');
  }

  // Gate 5: Production data
  const matchDataClass = input.match.data_class || 'production';
  const canonicalDataClass = input.canonical.data_class || 'production';
  gates.productionData = matchDataClass !== 'NON_PRODUCTION_EXAMPLE' && canonicalDataClass !== 'NON_PRODUCTION_EXAMPLE';
  if (!gates.productionData) {
    flags.push('NON_PRODUCTION_DATA');
    setSuppressed('non-production data class');
  }

  // Gate 6: Source is not synthetic/test
  const urlToCheck = input.sourceUrl || (input.sourceRecords[0]?.source_url) || (input.source?.url) || '';
  const syntheticCheck = isSyntheticSource(urlToCheck);
  gates.notSynthetic = !syntheticCheck.isSynthetic;
  if (!gates.notSynthetic) {
    flags.push('SYNTHETIC_SOURCE');
    setSuppressed(`synthetic/non-production source: ${syntheticCheck.reason}`);
  }

  // Gate 7: Tenant Project linkage valid if project_id exists
  if (input.match.project_id) {
    if (!input.project) {
      gates.validProjectLinkage = false;
      flags.push('MATCH_PROJECT_ORG_MISMATCH');
      setSuppressed('project_id references non-existent project');
    } else if (input.project.organization_id !== input.match.organization_id) {
      gates.validProjectLinkage = false;
      flags.push('MATCH_PROJECT_ORG_MISMATCH');
      setSuppressed(`cross-org project reference: match org ${input.match.organization_id} != project org ${input.project.organization_id}`);
    } else {
      gates.validProjectLinkage = true;
    }
  } else {
    gates.validProjectLinkage = true;
  }

  // Gate 8: Commercial source intent = ACTIVE_SOLICITATION
  const sourceClassification = input.source
    ? classifySourceIntent(input.source)
    : { intent: 'UNKNOWN' as SourceIntent, explanation: 'no source classification' };
  gates.activeSolicitation = sourceClassification.intent === 'ACTIVE_SOLICITATION';
  if (!gates.activeSolicitation) {
    flags.push(`SOURCE_INTENT_${sourceClassification.intent}`);
    setSuppressed(`source intent is ${sourceClassification.intent}, not ACTIVE_SOLICITATION`);
  }

  // Gate 9: Solicitation-level evidence threshold passes
  const evidenceResult = hasSolicitationLevelEvidence(input.canonical, input.sourceRecords);
  gates.solicitationEvidence = evidenceResult.passes;
  if (!gates.solicitationEvidence) {
    flags.push('INSUFFICIENT_SOLICITATION_EVIDENCE');
    setSuppressed(`insufficient solicitation evidence: missing ${evidenceResult.missing.join(', ')}`);
  }

  // Hot Lead only if ALL gates pass
  const allGatesPass = Object.values(gates).every(g => g === true);
  const isHotLead = allGatesPass;

  return {
    isHotLead,
    suppressed,
    suppressionReason: suppressed ? suppressionReason : '',
    flags,
    gates,
  };
}