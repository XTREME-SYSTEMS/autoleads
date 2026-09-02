// Canonical location eligibility engine for AUTOLEADS.
// Enforces the organization's service area as a system-wide invariant.
//
// Result codes:
//   IN_SERVICE_AREA       — geography confirmed within the org's service area
//   OUT_OF_SERVICE_AREA   — geography confirmed outside the org's service area
//   UNKNOWN_LOCATION      — geography could not be verified from available data
//   BORDER_MARKET         — near a service-area boundary (reserved for radius matching)
//   MANUAL_OVERRIDE       — user explicitly pursued an out-of-area project
//
// This is the single source of truth. Every ingestion, pipeline, feed, digest,
// notification, and automation layer must call isOpportunityInServiceArea().

export type LocationEligibility =
  | 'IN_SERVICE_AREA'
  | 'OUT_OF_SERVICE_AREA'
  | 'UNKNOWN_LOCATION'
  | 'BORDER_MARKET'
  | 'MANUAL_OVERRIDE';

export interface LocationResult {
  eligibility: LocationEligibility;
  explanation: string;
  normalizedState?: string;
  detectedState?: string;
  confidence: number;
}

// Canonical US state name ↔ code mapping. Used to normalize jurisdiction strings.
export const US_STATES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
  MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire',
  NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York', NC: 'North Carolina',
  ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota', TN: 'Tennessee',
  TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
  WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
  PR: 'Puerto Rico', VI: 'US Virgin Islands', GU: 'Guam', AS: 'American Samoa',
};

// Reverse map: state name → code
export const STATE_NAME_TO_CODE: Record<string, string> = Object.entries(US_STATES).reduce(
  (acc, [code, name]) => { acc[name.toLowerCase()] = code; return acc; },
  {} as Record<string, string>
);

// Detect a US state from a free-text jurisdiction/address string.
// Returns the 2-letter state code, or '' if none found.
export function detectState(text: string): string {
  if (!text) return '';
  const upper = text.toUpperCase();

  // 1. Match ", XX" or ",XX" patterns (city, state)
  const commaMatch = upper.match(/,\s*([A-Z]{2})\b/);
  if (commaMatch) {
    const code = commaMatch[1];
    if (US_STATES[code]) return code;
  }

  // 2. Match standalone 2-letter state codes bounded by word boundaries
  const codeMatch = upper.match(/\b([A-Z]{2})\b/g);
  if (codeMatch) {
    for (const c of codeMatch) {
      if (US_STATES[c]) return c;
    }
  }

  // 3. Match full state names (case-insensitive)
  const lower = text.toLowerCase();
  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (lower.includes(name)) return code;
  }

  return '';
}

// Normalize a service-area specification to a set of uppercase state codes.
// Accepts: "FL", "Florida", "FL,TX", ["FL","TX"], "FL; GA", etc.
export function normalizeServiceAreaStates(input: any): string[] {
  if (!input) return [];
  let arr: string[];
  if (Array.isArray(input)) arr = input;
  else arr = String(input).split(/[,;]/).map(s => s.trim()).filter(Boolean);

  const codes: string[] = [];
  for (const item of arr) {
    const upper = String(item).toUpperCase().trim();
    if (US_STATES[upper]) { codes.push(upper); continue; }
    const fromName = STATE_NAME_TO_CODE[String(item).toLowerCase().trim()];
    if (fromName) codes.push(fromName);
  }
  return [...new Set(codes)];
}

// The canonical eligibility check. Call this from every ingestion and pipeline path.
//
// serviceAreaStates: array of uppercase 2-letter state codes the org is authorized to work in.
// jurisdiction: the opportunity's jurisdiction string (e.g. "Miami, FL", "Austin, TX", "Federal")
// address: optional full address for additional state detection
// manualOverride: set true only when a user explicitly pursued an out-of-area project
export function isOpportunityInServiceArea(
  serviceAreaStates: string[],
  jurisdiction: string,
  address?: string,
  manualOverride = false
): LocationResult {
  const states = (serviceAreaStates || []).map(s => String(s).toUpperCase()).filter(Boolean);

  if (manualOverride) {
    return {
      eligibility: 'MANUAL_OVERRIDE',
      explanation: 'User explicitly pursued this out-of-area project. Service area not expanded.',
      normalizedState: states[0] || '',
      detectedState: detectState(`${jurisdiction} ${address || ''}`),
      confidence: 1.0,
    };
  }

  if (states.length === 0) {
    return {
      eligibility: 'UNKNOWN_LOCATION',
      explanation: 'Organization has no service-area state configured. Cannot verify eligibility.',
      normalizedState: '',
      detectedState: detectState(`${jurisdiction} ${address || ''}`),
      confidence: 0,
    };
  }

  const combined = `${jurisdiction || ''} ${address || ''}`;
  const detected = detectState(combined);

  // Federal / National / unparseable jurisdiction → UNKNOWN unless place of performance is detectable
  const jurisLower = String(jurisdiction || '').toLowerCase().trim();
  const isFederal = jurisLower === 'federal' || jurisLower.includes('federal');
  const isNational = jurisLower === 'national' || jurisLower.includes('national');

  if (!detected) {
    if (isFederal || isNational) {
      return {
        eligibility: 'UNKNOWN_LOCATION',
        explanation: 'Federal/national opportunity — place of performance not verified. Must be confirmed before ranking.',
        normalizedState: states[0],
        detectedState: '',
        confidence: 0.3,
      };
    }
    return {
      eligibility: 'UNKNOWN_LOCATION',
      explanation: 'Could not detect a US state from jurisdiction or address. Location unverified.',
      normalizedState: states[0],
      detectedState: '',
      confidence: 0.2,
    };
  }

  // State detected — check against service area
  if (states.includes(detected)) {
    return {
      eligibility: 'IN_SERVICE_AREA',
      explanation: `Project located in ${US_STATES[detected]} (${detected}), within the organization's service area.`,
      normalizedState: states[0],
      detectedState: detected,
      confidence: 0.98,
    };
  }

  return {
    eligibility: 'OUT_OF_SERVICE_AREA',
    explanation: `Project located in ${US_STATES[detected]} (${detected}), outside the organization's service area (${states.join(', ')}).`,
    normalizedState: states[0],
    detectedState: detected,
    confidence: 0.95,
  };
}

// Convenience: returns true only when the opportunity is confirmed in the service area.
// UNKNOWN_LOCATION and OUT_OF_SERVICE_AREA both return false — they must NOT be treated as eligible.
export function isEligible(result: LocationResult): boolean {
  return result.eligibility === 'IN_SERVICE_AREA' || result.eligibility === 'MANUAL_OVERRIDE';
}