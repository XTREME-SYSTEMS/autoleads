// Source intent classification for AUTOLEADS.
// Classifies sources by commercial intent to enforce the Hot Lead invariant:
// only ACTIVE_SOLICITATION sources may directly qualify as Hot Leads.
//
// Permit, planning, news, and award sources create intelligence/enrichment
// but NOT Hot Leads unless subsequently linked to real solicitation-level evidence.

export type SourceIntent =
  | 'ACTIVE_SOLICITATION'
  | 'PERMIT_INTELLIGENCE'
  | 'PLANNING_INTELLIGENCE'
  | 'NEWS_INTELLIGENCE'
  | 'AWARD_NOTICE'
  | 'PROCUREMENT_PORTAL'
  | 'UNKNOWN';

export interface SourceClassification {
  intent: SourceIntent;
  explanation: string;
}

// Classify a source based on its data_type, priority, name, and URL
export function classifySourceIntent(source: {
  data_type?: string;
  priority?: string;
  source_name?: string;
  url?: string;
}): SourceClassification {
  const dataType = (source.data_type || '').toLowerCase();
  const priority = (source.priority || '').toLowerCase();
  const name = (source.source_name || '').toLowerCase();
  const url = (source.url || '').toLowerCase();

  // Permit data → permit intelligence
  if (dataType === 'permit' || priority === 'permit' || name.includes('building permit')) {
    return { intent: 'PERMIT_INTELLIGENCE', explanation: 'Source provides building permit data — early-stage intelligence, not solicitation-level' };
  }

  // Planning data → planning intelligence
  if (dataType === 'planning' || name.includes('planning') || name.includes('agenda') || name.includes('commission meeting')) {
    return { intent: 'PLANNING_INTELLIGENCE', explanation: 'Source provides planning/agenda data — early-stage intelligence, not solicitation-level' };
  }

  // News data → news intelligence
  if (dataType === 'news' || name.includes('news')) {
    return { intent: 'NEWS_INTELLIGENCE', explanation: 'Source provides news data — intelligence/enrichment, not solicitation-level' };
  }

  // Award data → award notice
  if (dataType === 'award' || name.includes('award')) {
    return { intent: 'AWARD_NOTICE', explanation: 'Source provides award notices — post-bid intelligence, not active solicitation' };
  }

  // Active bid data → active solicitation (needs solicitation-level evidence check)
  if (dataType === 'active_bid' || priority.includes('procurement') || priority.includes('fdot') || name.includes('procurement') || name.includes('letting') || name.includes('solicitation') || name.includes('bid')) {
    return { intent: 'ACTIVE_SOLICITATION', explanation: 'Source provides active bid/solicitation data' };
  }

  // Procurement portal (generic homepage without specific listings)
  if (name.includes('portal') || url.includes('portal') || name.includes('marketplace')) {
    return { intent: 'PROCUREMENT_PORTAL', explanation: 'Source is a procurement portal — needs solicitation-level evidence to qualify' };
  }

  return { intent: 'UNKNOWN', explanation: 'Source intent could not be determined' };
}

// Check if a URL is a specific opportunity page vs a generic homepage
function isSpecificOpportunityUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname;
    // Homepage = root path or just "/"
    if (path === '/' || path === '') return false;
    // Has query params with IDs
    if (parsed.search && parsed.search.length > 1) return true;
    // Path segments
    const segments = path.split('/').filter(s => s.length > 0);
    // 2+ segments — likely a specific page (e.g., /bids/12345)
    if (segments.length >= 2) return true;
    // Single segment — check if it's a generic listing page
    if (segments.length === 1) {
      const seg = segments[0].toLowerCase();
      const genericListings = ['bids', 'opportunities', 'solicitations', 'procurement', 'contracts', 'letting-info', 'letting'];
      if (genericListings.includes(seg)) return false;
      return true; // single non-generic segment
    }
    return false;
  } catch {
    return false;
  }
}

// Check if a canonical opportunity has solicitation-level evidence.
// Required: title, authority, specific opportunity URL (not homepage),
// at least one solicitation number, retrieved timestamp.
export interface SolicitationEvidenceResult {
  passes: boolean;
  missing: string[];
}

export function hasSolicitationLevelEvidence(canonical: {
  title?: string;
  authority?: string;
  solicitation_number?: string;
  bid_number?: string;
  project_number?: string;
  first_seen_at?: string;
}, sourceRecords: { source_url?: string }[]): SolicitationEvidenceResult {
  const missing: string[] = [];

  if (!canonical.title) missing.push('solicitation title');
  if (!canonical.authority) missing.push('authority');

  // At least one solicitation number
  const hasSolicitationNumber = canonical.solicitation_number || canonical.bid_number || canonical.project_number;
  if (!hasSolicitationNumber) missing.push('bid/solicitation/proposal number');

  // Specific opportunity URL — not just a homepage
  const hasSpecificUrl = sourceRecords.some(r => r.source_url && isSpecificOpportunityUrl(r.source_url));
  if (!hasSpecificUrl) missing.push('specific opportunity URL');

  // Retrieved timestamp
  if (!canonical.first_seen_at) missing.push('retrieved timestamp');

  return {
    passes: missing.length === 0,
    missing,
  };
}