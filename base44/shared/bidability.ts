// Bidability engine for AUTOLEADS.
// Produces an explainable 0-100 bidability score with factor breakdown.
// An opportunity must pass LOCATION + TRADE + FRESHNESS before bidability is scored.

import type { LocationResult } from './locationEligibility.ts';
import { isTradeEligible, type TradeMatchOutput } from './tradeMatcher.ts';
import { isHotLead, type FreshnessResult } from './freshness.ts';

// Location is eligible when it's in the service area or manually overridden.
function isLocationEligible(loc: LocationResult): boolean {
  return loc.eligibility === 'IN_SERVICE_AREA' || loc.eligibility === 'MANUAL_OVERRIDE';
}

export interface BidabilityFactors {
  location_fit: number;        // 0-20: IN_SERVICE_AREA=20, UNKNOWN=10, OUT=0
  trade_fit: number;           // 0-20: PRIMARY=20, SECONDARY=15, WEAK=5, NO=0, EXCLUDED=-20
  project_size: number;        // 0-15: based on value vs org bonding capacity
  deadline_urgency: number;     // 0-10: OPEN=5, CLOSING_SOON=10, OVERDUE=0, NO_DEADLINE=3
  plans_available: number;     // 0-10: has plans_url or plans documents
  specs_available: number;     // 0-10: has real specs
  contact_quality: number;      // 0-5: has contract_info with email/phone
  source_confidence: number;    // 0-5: based on verification_status and source type
  company_capacity: number;    // 0-5: based on bonding capacity vs project value
  relationship_history: number; // 0-5: prior awards with this authority
  margin_potential: number;    // 0-5: based on pricing profile margin
  freshness: number;           // 0-10: FRESH=10, AGING=7, STALE=3, EXPIRED=0
}

export interface BidabilityResult {
  score: number;               // 0-100
  factors: BidabilityFactors;
  eligible: boolean;            // true only when location + trade + freshness all qualify
  explanation: string;          // human-readable explanation
  top_reasons: string[];        // top 3 reasons for the score
  blockers: string[];           // reasons the opportunity is NOT eligible
}

export interface BidabilityInput {
  location: LocationResult;
  trade_match: TradeMatchOutput;
  freshness: FreshnessResult;
  project: {
    value?: number | null;
    bid_due_date?: string | null;
    plans_url?: string;
    documents?: { type: string }[];
    specs?: string;
    contract_info?: string;
    verification_status?: string;
    authority?: string;
    source_url?: string;
  };
  org: {
    bonding_capacity?: number | null;
    prior_awards?: number;
    margin_pct?: number | null;
  };
}

function clampScore(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function computeBidability(input: BidabilityInput): BidabilityResult {
  const factors: BidabilityFactors = {
    location_fit: 0,
    trade_fit: 0,
    project_size: 0,
    deadline_urgency: 0,
    plans_available: 0,
    specs_available: 0,
    contact_quality: 0,
    source_confidence: 0,
    company_capacity: 0,
    relationship_history: 0,
    margin_potential: 0,
    freshness: 0,
  };

  const blockers: string[] = [];

  // Location fit (0-20)
  if (input.location.eligibility === 'IN_SERVICE_AREA') factors.location_fit = 20;
  else if (input.location.eligibility === 'MANUAL_OVERRIDE') factors.location_fit = 15;
  else if (input.location.eligibility === 'UNKNOWN_LOCATION') factors.location_fit = 10;
  else if (input.location.eligibility === 'BORDER_MARKET') factors.location_fit = 12;
  else {
    factors.location_fit = 0;
    blockers.push('Project is outside your service area');
  }

  // Trade fit (0-20, can go negative for excluded)
  switch (input.trade_match.result) {
    case 'PRIMARY_MATCH': factors.trade_fit = 20; break;
    case 'SECONDARY_MATCH': factors.trade_fit = 15; break;
    case 'WEAK_MATCH': factors.trade_fit = 5; break;
    case 'NO_MATCH': factors.trade_fit = 0; blockers.push('Trade does not match your configured scopes'); break;
    case 'EXCLUDED_SCOPE': factors.trade_fit = -20; blockers.push(`Trade is in your excluded scopes: ${input.trade_match.explanation}`); break;
  }

  // Project size (0-15) — based on value vs bonding capacity
  const value = Number(input.project.value) || 0;
  const bonding = Number(input.org.bonding_capacity) || 0;
  if (value > 0 && bonding > 0) {
    if (value <= bonding * 0.5) factors.project_size = 15;
    else if (value <= bonding) factors.project_size = 10;
    else if (value <= bonding * 2) { factors.project_size = 3; blockers.push('Project value exceeds your bonding capacity'); }
    else { factors.project_size = 0; blockers.push('Project value far exceeds your bonding capacity'); }
  } else if (value > 0) {
    factors.project_size = 8; // Has value but no bonding capacity configured
  }

  // Deadline urgency (0-10)
  switch (input.freshness.deadline_status) {
    case 'OPEN': factors.deadline_urgency = 5; break;
    case 'CLOSING_SOON': factors.deadline_urgency = 10; break;
    case 'OVERDUE': factors.deadline_urgency = 0; blockers.push('Bid deadline has passed'); break;
    case 'NO_DEADLINE': factors.deadline_urgency = 3; break;
    case 'CLOSED': factors.deadline_urgency = 0; blockers.push('Opportunity is closed'); break;
  }

  // Plans available (0-10)
  const hasPlans = input.project.plans_url ||
    (Array.isArray(input.project.documents) && input.project.documents.some(d => d.type === 'plans'));
  if (hasPlans) factors.plans_available = 10;

  // Specs available (0-10)
  const realSpecs = input.project.specs && String(input.project.specs).trim() &&
    !String(input.project.specs).toLowerCase().startsWith('not available');
  if (realSpecs) factors.specs_available = 10;

  // Contact quality (0-5)
  const contactInfo = String(input.project.contract_info || '');
  if (contactInfo) {
    let contactScore = 2;
    if (/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/.test(contactInfo)) contactScore += 2;
    if (/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/.test(contactInfo)) contactScore += 1;
    factors.contact_quality = Math.min(5, contactScore);
  }

  // Source confidence (0-5)
  if (input.project.verification_status === 'verified') factors.source_confidence = 5;
  else if (input.project.verification_status === 'incomplete') factors.source_confidence = 3;
  else if (input.project.verification_status === 'unverified') factors.source_confidence = 2;
  else if (input.project.verification_status === 'failed') factors.source_confidence = 0;

  // Company capacity (0-5)
  if (bonding > 0 && value > 0 && value <= bonding) factors.company_capacity = 5;
  else if (bonding > 0 && value > 0 && value <= bonding * 1.5) factors.company_capacity = 2;

  // Relationship history (0-5)
  const priorAwards = Number(input.org.prior_awards) || 0;
  if (priorAwards > 0) factors.relationship_history = Math.min(5, priorAwards);

  // Margin potential (0-5)
  const margin = Number(input.org.margin_pct) || 0;
  if (margin >= 20) factors.margin_potential = 5;
  else if (margin >= 10) factors.margin_potential = 3;
  else if (margin > 0) factors.margin_potential = 1;

  // Freshness (0-10)
  switch (input.freshness.freshness_status) {
    case 'FRESH': factors.freshness = 10; break;
    case 'AGING': factors.freshness = 7; break;
    case 'STALE': factors.freshness = 3; blockers.push('Opportunity data is stale — re-verification needed'); break;
    case 'EXPIRED': factors.freshness = 0; blockers.push('Opportunity has expired'); break;
    case 'SOURCE_UNAVAILABLE': factors.freshness = 0; blockers.push('Source is unavailable'); break;
    case 'AWARDED': factors.freshness = 0; blockers.push('Opportunity has been awarded to another contractor'); break;
    case 'CANCELLED': factors.freshness = 0; blockers.push('Opportunity has been cancelled'); break;
    default: factors.freshness = 2;
  }

  // Compute total score
  const rawScore = Object.values(factors).reduce((sum, v) => sum + v, 0);
  const score = clampScore(Math.round(rawScore));

  // Determine eligibility
  const eligible = isLocationEligible(input.location) &&
    isTradeEligible(input.trade_match) &&
    isHotLead(input.freshness);

  // Build explanation
  const topReasons: string[] = [];
  const factorEntries = Object.entries(factors).sort((a, b) => b[1] - a[1]);
  for (const [name, val] of factorEntries.slice(0, 3)) {
    if (val > 0) topReasons.push(`${name.replace(/_/g, ' ')}: +${val}`);
  }

  const explanation = eligible
    ? `Bidability score ${score}/100. Top factors: ${topReasons.join(', ')}.`
    : `Not eligible. Blockers: ${blockers.join('; ')}`;

  return {
    score,
    factors,
    eligible,
    explanation,
    top_reasons: topReasons,
    blockers,
  };
}