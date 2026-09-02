// Canonical opportunity engine for AUTOLEADS.
// Generates deterministic fingerprints for dedup and identity matching.
//
// Architecture:
//   CanonicalOpportunity       — factual public opportunity intelligence (global)
//   OpportunitySourceRecord    — provenance (global, links source → canonical)
//   OrganizationOpportunityMatch — private tenant-specific match data
//
// Fingerprint states:
//   CANONICAL           — confirmed unique opportunity
//   DISTINCT            — confirmed different from existing
//   POSSIBLE_DUPLICATE  — similar but not confirmed (do NOT hard merge)
//   CONFIRMED_DUPLICATE — confirmed duplicate of existing canonical

export type FingerprintState =
  | 'CANONICAL'
  | 'DISTINCT'
  | 'POSSIBLE_DUPLICATE'
  | 'CONFIRMED_DUPLICATE';

export interface FingerprintInput {
  solicitation_number?: string;
  bid_number?: string;
  project_number?: string;
  authority?: string;
  title?: string;
  address?: string;
  city?: string;
  county?: string;
  state?: string;
  zip?: string;
  deadline?: string;
  source_identifier?: string;
}

export interface CanonicalFingerprint {
  fingerprint: string;
  strong_key: string;   // high-confidence identifier (solicitation/bid/project number + authority)
  title_key: string;    // normalized title for fuzzy matching
  location_key: string; // normalized location for disambiguation
  state: FingerprintState;
}

// Normalize a string for fingerprinting: lowercase, remove punctuation, collapse spaces
function fpNormalize(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

// Generate a deterministic fingerprint from available identifiers.
// Priority: solicitation_number > bid_number > project_number > (authority + title + location)
export function generateFingerprint(input: FingerprintInput): CanonicalFingerprint {
  // Strong key: solicitation/bid/project number + authority
  const strongId = (input.solicitation_number || input.bid_number || input.project_number || '').trim();
  const authority = fpNormalize(input.authority || '');
  const strongKey = strongId ? `${authority}:${strongId.toLowerCase()}` : '';

  // Title key: normalized title
  const titleKey = fpNormalize(input.title || '');

  // Location key: city + state + zip (normalized)
  const locationParts = [input.city, input.state, input.zip].filter(Boolean).map(p => fpNormalize(String(p)));
  const locationKey = locationParts.join(':');

  // Full fingerprint: combine all available signals
  // If we have a strong key, it dominates. Otherwise, title + location + authority.
  let fingerprint: string;
  if (strongKey) {
    fingerprint = `S:${strongKey}`;
  } else {
    fingerprint = `T:${titleKey}|L:${locationKey}|A:${authority}`;
  }

  return {
    fingerprint,
    strong_key: strongKey,
    title_key: titleKey,
    location_key: locationKey,
    state: 'CANONICAL', // initial state — comparison will update this
  };
}

// Compare two fingerprints to determine if they represent the same opportunity.
// Returns the match state.
export function compareFingerprints(
  existing: CanonicalFingerprint,
  candidate: CanonicalFingerprint
): FingerprintState {
  // Strong key match (solicitation/bid/project number + authority) → confirmed duplicate
  if (existing.strong_key && candidate.strong_key) {
    if (existing.strong_key === candidate.strong_key) {
      return 'CONFIRMED_DUPLICATE';
    }
    // Different strong keys → distinct (different solicitation numbers)
    return 'DISTINCT';
  }

  // No strong keys — use title + location fuzzy matching (with stemming)
  const titleSimilarity = jaccardSimilarity(existing.title_key, candidate.title_key);
  const sameLocation = existing.location_key === candidate.location_key && existing.location_key !== '';

  // High similarity + same location → possible duplicate
  if (titleSimilarity >= 0.6 && sameLocation) {
    return 'POSSIBLE_DUPLICATE';
  }

  // Everything else → distinct
  // (Medium similarity 0.3-0.6 was returning POSSIBLE_DUPLICATE, which over-merged
  //  permit records sharing a permit type but at different addresses.)
  return 'DISTINCT';
}

// Simple word stemming: normalize plurals and common suffixes so that
// "flooring" ~ "floor", "renovations" ~ "renovation", etc.
function stem(word: string): string {
  return word
    .replace(/(ing|ings)$/g, '')
    .replace(/(s|es)$/g, '')
    .replace(/(ation|ations)$/g, 'at')
    .replace(/(tion|tions)$/g, 't');
}

// Jaccard similarity on stemmed word sets
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean).map(stem));
  const setB = new Set(b.split(' ').filter(Boolean).map(stem));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union > 0 ? intersection / union : 0;
}

// Adversarial dedup test cases — used by the regression test function.
export const DEDUP_TEST_CASES = [
  {
    name: 'Same bid number, different URLs → ONE canonical',
    a: { title: 'City Hall Flooring Renovation', solicitation_number: 'BID-2024-001', authority: 'City of Miami', source_url: 'https://a.com/1' },
    b: { title: 'City Hall Flooring Renovation', solicitation_number: 'BID-2024-001', authority: 'City of Miami', source_url: 'https://b.com/1' },
    expected: 'CONFIRMED_DUPLICATE' as FingerprintState,
  },
  {
    name: 'Same title, different city, different solicitation → DISTINCT',
    a: { title: 'Flooring Renovation', solicitation_number: 'BID-001', authority: 'City of Miami', city: 'Miami', state: 'FL' },
    b: { title: 'Flooring Renovation', solicitation_number: 'BID-002', authority: 'City of Orlando', city: 'Orlando', state: 'FL' },
    expected: 'DISTINCT' as FingerprintState,
  },
  {
    name: 'Title variations, same bid number → ONE canonical',
    a: { title: 'City Hall Flooring Renovation', solicitation_number: 'BID-2024-001', authority: 'City of Miami' },
    b: { title: 'City Hall Floor Renovations', solicitation_number: 'BID-2024-001', authority: 'City of Miami' },
    expected: 'CONFIRMED_DUPLICATE' as FingerprintState,
  },
  {
    name: 'Different title, different solicitation → DISTINCT',
    a: { title: 'Flooring Renovation - City Hall', solicitation_number: 'BID-001', authority: 'City of Miami' },
    b: { title: 'Roof Replacement - City Hall', solicitation_number: 'BID-002', authority: 'City of Miami' },
    expected: 'DISTINCT' as FingerprintState,
  },
  {
    name: 'Same authority + project number, different portal mirrors → ONE canonical',
    a: { title: 'City Hall Flooring Renovation', project_number: 'PROJ-100', authority: 'City of Miami', source_identifier: 'portal-a' },
    b: { title: 'City Hall Flooring Renovation', project_number: 'PROJ-100', authority: 'City of Miami', source_identifier: 'portal-b' },
    expected: 'CONFIRMED_DUPLICATE' as FingerprintState,
  },
  {
    name: 'Similar titles, no solicitation, same location → POSSIBLE_DUPLICATE (no hard merge)',
    a: { title: 'City Hall Flooring Renovation', city: 'Miami', state: 'FL' },
    b: { title: 'City Hall Floor Renovations', city: 'Miami', state: 'FL' },
    expected: 'POSSIBLE_DUPLICATE' as FingerprintState,
  },
];

// Run the adversarial dedup test suite. Returns pass/fail per case.
export function runDedupTests(): { name: string; passed: boolean; expected: FingerprintState; actual: FingerprintState }[] {
  return DEDUP_TEST_CASES.map(tc => {
    const fpA = generateFingerprint(tc.a);
    const fpB = generateFingerprint(tc.b);
    const actual = compareFingerprints(fpA, fpB);
    return {
      name: tc.name,
      passed: actual === tc.expected,
      expected: tc.expected,
      actual,
    };
  });
}