// =============================================================================
// Residential & Social Lead Scraping — Taxonomy, Intent Vocabulary, Query
// Generation, Lead Scoring, and Extraction Schema.
//
// This is the single structured source of truth for the residential demand-
// intelligence engine. Consumed by scrapeSocialLeads (and future residential
// crawlers) so discovery logic lives in one place instead of hardcoded in
// prompts. Encode the "detect underlying PROJECT INTENT, not just the keyword
// epoxy" philosophy here.
// =============================================================================

// ---- 1. SERVICE SCOPE (every scope/trade in the epoxy + concrete industry) ----
export const RESIDENTIAL_SERVICES = [
  // Epoxy / resinous / coatings
  'epoxy flooring', 'epoxy floor coating', 'garage floor epoxy', 'garage floor coating',
  'metallic epoxy', 'flake floor', 'quartz floor', 'polyaspartic', 'polyurea', 'urethane floor',
  'resin floor', 'resinous flooring', 'industrial floor coating', 'commercial floor coating',
  'warehouse flooring', 'concrete coating', 'concrete sealer', 'floor coating', 'floor resurfacing',
  // Decorative concrete
  'decorative concrete', 'stamped concrete', 'stained concrete', 'acid stain', 'concrete stain',
  'concrete dye', 'decorative overlay', 'concrete overlay', 'microtopping', 'skim coat concrete',
  'concrete resurfacing', 'exposed aggregate', 'concrete restoration', 'architectural concrete',
  // Polished concrete
  'polished concrete', 'concrete polishing', 'diamond polishing', 'concrete grinding',
  'concrete floor polishing', 'terrazzo restoration', 'terrazzo polishing', 'concrete densification',
  // Countertops
  'concrete countertop', 'epoxy countertop', 'epoxy resin countertop', 'countertop resurfacing',
  'countertop refinishing', 'outdoor kitchen countertop', 'commercial countertop',
  // Repair / restoration / outdoor
  'concrete repair', 'concrete sealing', 'concrete waterproofing',
  'pool deck coating', 'patio coating', 'driveway coating', 'walkway resurfacing',
];

// ---- 2. SOURCE TAXONOMY (source classes + access method + priority) ----
export type SourceClass = {
  class: string;
  platforms: string[];
  access: 'browser' | 'web_search' | 'api' | 'restricted';
  priority: 'high' | 'medium' | 'low';
  notes?: string;
};

export const SOURCE_TAXONOMY: SourceClass[] = [
  { class: 'homeowner_marketplace', platforms: ['Angi', 'HomeAdvisor', 'Thumbtack', 'Houzz', 'Porch', 'Bark', 'TaskRabbit', 'Yelp'], access: 'web_search', priority: 'high', notes: 'Service-request marketplaces' },
  { class: 'classifieds', platforms: ['Craigslist', 'Facebook Marketplace', 'local classifieds'], access: 'browser', priority: 'high' },
  { class: 'social_groups', platforms: ['Facebook Groups', 'Nextdoor', 'Reddit', 'Quora', 'Discord'], access: 'browser', priority: 'high', notes: 'Conversations & recommendations' },
  { class: 'forums', platforms: ['ContractorTalk', 'DIYChatroom', 'Houzz Discussions', 'Fine Homebuilding', 'JLC', 'Garage Journal', 'Home Improvement Stack Exchange', 'DIY Stack Exchange'], access: 'web_search', priority: 'medium' },
  { class: 'real_estate', platforms: ['Zillow', 'Realtor.com', 'Redfin', 'LoopNet', 'Crexi', 'CommercialCafe', 'Auction.com'], access: 'web_search', priority: 'medium', notes: 'Value-add / renovation listings' },
  { class: 'public_records', platforms: ['building permits', 'renovation permits', 'planning applications', 'code enforcement', 'property transfers', 'foreclosures'], access: 'web_search', priority: 'medium' },
  { class: 'contractor_directories', platforms: ['Google Maps', 'BBB', 'BuildZoom', 'HomeGuide', 'chamber directories', 'trade association directories'], access: 'web_search', priority: 'low', notes: 'Discovery of adjacent-trade partners' },
  { class: 'associations', platforms: ['ACI', 'NRMCA', 'AGC', 'ABC', 'CSI', 'BOMA', 'IFMA', 'IREM', 'NAIOP', 'NAR', 'CCIM'], access: 'web_search', priority: 'low', notes: 'Member/vendor directories' },
];

// ---- 3. INTENT VOCABULARY ----
export const REQUEST_VERBS = ['need', 'want', 'looking for', 'searching for', 'trying to find', 'recommend', 'recommendation', 'referral', 'know anyone', 'who does', 'who can', 'can anyone recommend', 'hire', 'hiring', 'quote', 'estimate', 'pricing', 'price', 'cost', 'how much', 'bid', 'contractor', 'subcontractor', 'vendor'];
export const PROJECT_VERBS = ['renovating', 'remodeling', 'building', 'rebuilding', 'replacing', 'resurfacing', 'refinishing', 'upgrading', 'updating', 'converting', 'expanding', 'opening', 'moving', 'buying', 'purchasing', 'acquired', 'leasing', 'developing', 'tenant improvement', 'build-out', 'value-add', 'redevelopment'];
export const PROBLEM_VERBS = ['cracked', 'peeling', 'flaking', 'chipping', 'stained', 'damaged', 'worn', 'ugly', 'dusty', 'slippery', 'broken', 'deteriorating', 'spalling', 'uneven', 'old', 'failed', 'water damage', 'oil stained'];

// ---- 4. PROPERTY TYPES ----
export const PROPERTY_TYPES = ['single-family', 'multi-family', 'apartment', 'condo', 'townhome', 'garage', 'basement', 'pool deck', 'patio', 'driveway', 'outdoor kitchen', 'restaurant', 'bar', 'hotel', 'motel', 'retail', 'office', 'medical', 'dental', 'gym', 'warehouse', 'distribution center', 'manufacturing', 'automotive', 'dealership', 'church', 'school', 'university', 'hospital', 'clinic', 'government', 'municipal', 'airport', 'parking garage', 'self-storage', 'food processing', 'brewery', 'commercial kitchen', 'showroom', 'senior living', 'student housing', 'mixed-use'];

const COMMERCIAL_PROPERTY_TYPES = ['restaurant', 'bar', 'hotel', 'motel', 'retail', 'office', 'medical', 'dental', 'gym', 'warehouse', 'distribution center', 'manufacturing', 'automotive', 'dealership', 'church', 'school', 'university', 'hospital', 'clinic', 'government', 'municipal', 'airport', 'parking garage', 'self-storage', 'food processing', 'brewery', 'commercial kitchen', 'showroom', 'senior living', 'student housing', 'mixed-use', 'multi-family', 'apartment', 'condo'];

// ---- 5. ADJACENT TRADES (referral network — find them BEFORE the customer) ----
export const ADJACENT_TRADES = ['general contractor', 'remodeler', 'builder', 'homebuilder', 'architect', 'interior designer', 'kitchen designer', 'bathroom designer', 'landscape designer', 'structural engineer', 'civil engineer', 'concrete contractor', 'flooring contractor', 'tile contractor', 'hardwood contractor', 'carpet contractor', 'restoration contractor', 'water mitigation', 'fire restoration', 'mold remediation', 'roofing', 'painter', 'drywall', 'plumber', 'HVAC', 'electrician', 'cabinet company', 'countertop company', 'pool contractor', 'landscape contractor', 'garage builder', 'real-estate agent', 'commercial broker', 'property manager', 'facility manager', 'building engineer', 'maintenance company', 'janitorial', 'developer', 'investor', 'house flipper', 'apartment owner', 'hotel operator', 'restaurant operator'];

// ---- 6. LEAD CATEGORIES ----
export const LEAD_CATEGORIES = ['VERY_HOT', 'HOT', 'WARM', 'PARTNER', 'PROJECT', 'PROPERTY', 'SIGNAL'] as const;

// ---- 7. LEAD SCORING (0-100) ----
export const LEAD_SCORE_WEIGHTS = {
  explicit_request: 30, explicit_service: 25, location_identified: 20, timeframe_identified: 15,
  project_size_identified: 15, commercial_property: 15, decision_maker_identified: 15,
  recent_activity: 10, evidence_photos: 10, budget_discussion: 10, permit_evidence: 10,
  urgency: 10, referral_opportunity: 10,
  irrelevant: -30, duplicate: -25, outside_service_area: -20, old_inactive: -20,
  diy_only: -20, spam: -20, inaccessible: -30, prohibited: -50,
};

export function scoreResidentialLead(lead: any): number {
  let s = 0;
  if (lead.intent === 'explicit_request') s += LEAD_SCORE_WEIGHTS.explicit_request;
  if (lead.service) s += LEAD_SCORE_WEIGHTS.explicit_service;
  if (lead.city || lead.state) s += LEAD_SCORE_WEIGHTS.location_identified;
  if (lead.timeframe) s += LEAD_SCORE_WEIGHTS.timeframe_identified;
  if (lead.project_size) s += LEAD_SCORE_WEIGHTS.project_size_identified;
  if (lead.property_type && COMMERCIAL_PROPERTY_TYPES.includes(lead.property_type)) s += LEAD_SCORE_WEIGHTS.commercial_property;
  if (lead.decision_maker_role) s += LEAD_SCORE_WEIGHTS.decision_maker_identified;
  if (lead.urgency === 'high') s += LEAD_SCORE_WEIGHTS.urgency;
  if (lead.budget) s += LEAD_SCORE_WEIGHTS.budget_discussion;
  if (lead.referral_partner) s += LEAD_SCORE_WEIGHTS.referral_opportunity;
  if (lead.diy_only) s += LEAD_SCORE_WEIGHTS.diy_only;
  if (lead.outside_service_area) s += LEAD_SCORE_WEIGHTS.outside_service_area;
  return Math.max(0, Math.min(100, s));
}

// ---- 8. INTENT PHRASES (natural-language problem/request phrasings) ----
// People who need epoxy rarely say "epoxy." These phrases catch indirect intent.
export const INTENT_PHRASES = {
  request: [
    'need someone to', 'looking for someone to', 'can anyone recommend',
    'who does', 'who can', 'does anyone know', 'need a contractor',
    'need a quote', 'need an estimate', 'any recommendations for',
    'searching for someone to', 'trying to find someone to', 'looking to hire',
  ],
  problem: [
    'ugly garage floor', 'cracked garage floor', 'cracked concrete',
    'spalling concrete', 'damaged concrete', 'peeling floor', 'flaking floor',
    'stained concrete', 'oil stained garage', 'dusty garage floor',
    'worn concrete', 'old concrete', 'slippery concrete', 'uneven concrete',
    'failed epoxy', 'failed coating', 'peeling epoxy', 'chipped concrete',
    'concrete dust', 'deteriorating concrete', 'water damaged floor',
    'damaged driveway', 'damaged pool deck', 'damaged patio',
  ],
  project: [
    'redo my garage floor', 'fix my garage floor', 'make my garage floor look better',
    'resurface my pool deck', 'redo our pool deck', 'fix cracked driveway',
    'redo the basement floor', 'waterproof the basement floor',
    'remodel the restaurant', 'renovate the warehouse', 'redo the warehouse floor',
    'finish the man cave', 'finish the garage gym', 'build an outdoor kitchen',
    'redo the patio', 'resurface the driveway', 'polish the concrete',
    'concrete countertop', 'epoxy countertop',
  ],
  property: [
    'just bought', 'recently purchased', 'new ownership', 'value-add property',
    'needs renovation', 'as-is', 'redevelopment', 'shell space',
    'tenant improvement', 'vacant building', 'fixer upper', 'value add',
  ],
};

// ---- 9. QUERY GENERATION (service x phrase x geography) ----
export function buildQueryFamilies(services: string[], locations: string[]): string[] {
  const intents = ['looking for', 'recommend', 'need', 'quote', 'estimate', 'contractor', 'bid', 'renovation', 'remodel'];
  const phrases = [...INTENT_PHRASES.request.slice(0, 5), ...INTENT_PHRASES.problem.slice(0, 8)];
  const out: string[] = [];
  for (const svc of services) {
    for (const loc of locations) {
      for (const intent of intents) out.push(`"${svc}" ${intent} ${loc}`);
      for (const ph of phrases) out.push(`"${svc}" ${ph} ${loc}`);
    }
  }
  return out;
}

// ---- 10. BROWSER SEARCH TARGETS (search engines as a lead source) ----
// The cloud browser issues Google/Bing searches built from intent phrases —
// this recursively discovers posts across every indexed site (forums, FB,
// Reddit, classifieds, real estate, public records) — plus direct Craigslist
// and Reddit hits.
export type BrowserTarget = { platform: string; source_class: string; url: string };

export function buildBrowserTargets(services: string[], locations: string[], max = 18): BrowserTarget[] {
  const out: BrowserTarget[] = [];
  const add = (platform: string, source_class: string, url: string) => out.push({ platform, source_class, url });
  const phrases = [...INTENT_PHRASES.request.slice(0, 4), ...INTENT_PHRASES.problem.slice(0, 6)];
  for (const loc of locations) {
    const clCity = loc.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const svc of services.slice(0, 6)) {
      if (clCity && clCity.length > 2) add('craigslist', 'classifieds', `https://${clCity}.craigslist.org/search/?query=${encodeURIComponent(svc)}&sort=date`);
      add('reddit', 'social_groups', `https://www.reddit.com/search/?q=${encodeURIComponent(svc + ' ' + loc)}&sort=new`);
    }
    for (const svc of services.slice(0, 4)) {
      for (const ph of phrases.slice(0, 4)) {
        const q = `"${svc}" ${ph} ${loc}`;
        add('google', 'search_engine', `https://www.google.com/search?q=${encodeURIComponent(q)}`);
        add('bing', 'search_engine', `https://www.bing.com/search?q=${encodeURIComponent(q)}`);
      }
    }
  }
  const seen = new Set<string>();
  return out.filter((t) => (seen.has(t.url) ? false : (seen.add(t.url), true))).slice(0, max);
}

// ---- 11. EXTRACTION SCHEMA (rich intent-classified lead record) ----
export const RESIDENTIAL_LEAD_SCHEMA = {
  type: 'object',
  properties: {
    leads: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string', description: 'What they want done / the problem' },
          intent: { type: 'string', enum: ['explicit_request', 'project_announcement', 'problem', 'partner', 'property', 'signal'] },
          lead_category: { type: 'string', enum: [...LEAD_CATEGORIES] },
          service: { type: 'string', description: 'Detected service scope' },
          secondary_services: { type: 'array', items: { type: 'string' } },
          property_type: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          timeframe: { type: 'string' },
          urgency: { type: 'string', enum: ['high', 'medium', 'low', 'unknown'] },
          budget: { type: 'string' },
          project_size: { type: 'string' },
          decision_maker_role: { type: 'string' },
          company: { type: 'string' },
          contact_info: { type: 'string' },
          source_url: { type: 'string' },
          source_platform: { type: 'string' },
          source_class: { type: 'string' },
          posted_date: { type: 'string' },
          evidence_excerpt: { type: 'string', description: 'Verbatim public text excerpt proving intent' },
          referral_partner: { type: 'boolean' },
          diy_only: { type: 'boolean' },
          confidence: { type: 'number' },
        },
      },
    },
  },
};

// ---- 12. FLORIDA BUILDING DEPARTMENTS (permit sources — specs may mention
// epoxy / decorative concrete / polished concrete) ----
export const FL_COUNTIES = ['Alachua','Baker','Bay','Bradford','Brevard','Broward','Calhoun','Charlotte','Citrus','Clay','Collier','Columbia','DeSoto','Dixie','Duval','Escambia','Flagler','Franklin','Gadsden','Gilchrist','Glades','Gulf','Hamilton','Hardee','Hendry','Hernando','Highlands','Hillsborough','Holmes','Indian River','Jackson','Jefferson','Lafayette','Lake','Lee','Leon','Levy','Liberty','Madison','Manatee','Marion','Martin','Miami-Dade','Monroe','Nassau','Okaloosa','Okeechobee','Orange','Osceola','Palm Beach','Pasco','Pinellas','Polk','Putnam','St. Johns','St. Lucie','Santa Rosa','Sarasota','Seminole','Sumter','Suwannee','Taylor','Union','Volusia','Wakulla','Walton','Washington'];

// Major cities by state — expands residential social scraping beyond a single city.
export const MAJOR_CITIES_BY_STATE: Record<string, string[]> = {
  FL: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg', 'Tallahassee', 'Fort Myers', 'Naples', 'Sarasota', 'West Palm Beach', 'Gainesville'],
  GA: ['Atlanta', 'Savannah', 'Augusta', 'Columbus'],
  TX: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
  CA: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'],
  NY: ['New York', 'Buffalo', 'Rochester', 'Albany'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Winston-Salem'],
  SC: ['Charleston', 'Columbia', 'Greenville'],
  AL: ['Birmingham', 'Montgomery', 'Mobile', 'Huntsville'],
};

// Common FL permit-platform URL patterns the browser can search per county.
export const FL_PERMIT_PLATFORMS = [
  { platform: 'Accela CitizenAccess', url_pattern: 'https://www.accela.com/citizenaccess' },
  { platform: 'Broward ePermits', url_pattern: 'https://www.broward.org/epermits' },
  { platform: 'Miami-Dade Compass', url_pattern: 'https://www.miamidade.gov/permits' },
  { platform: 'Palm Beach PBC ePermitting', url_pattern: 'https://www.pbc.gov/permitting' },
  { platform: 'Orange County FastTrack', url_pattern: 'https://fasttrack.ocfl.net' },
  { platform: 'Hillsborough HCFL Permits', url_pattern: 'https://www.hillsboroughcounty.org/permits' },
  { platform: 'MyGovernmentOnline', url_pattern: 'https://www.mygovernmentonline.org' },
];

// ---- 13. SOCIAL MEDIA & FORUM SEED LIST ----
export const SOCIAL_PLATFORMS = ['Facebook','Facebook Groups','Facebook Marketplace','Instagram','Threads','X','TikTok','Pinterest','YouTube','LinkedIn','Reddit','Quora','Nextdoor','Discord','Telegram','Meetup','Alignable','Mastodon','Bluesky'];

export const HOME_SERVICE_FORUMS = ['ContractorTalk','DIYChatroom','Houzz Discussions','Fine Homebuilding','JLC Online','Garage Journal','Home Improvement Stack Exchange','DIY Stack Exchange','Flooring Forum','Concrete Forum','Reddit r/HomeImprovement','Reddit r/Concrete','Reddit r/Flooring','Reddit r/Remodel','Reddit r/RealEstate','Reddit r/Landlord','Reddit r/PropertyManagement'];

export const HOMEOWNER_SERVICE_SITES = ['Angi','HomeAdvisor','Thumbtack','Houzz','Porch','Bark','TaskRabbit','Yelp','Google Business Profiles','Google Maps','BBB','BuildZoom','HomeGuide','Networx','ProMatcher'];

// Shared intent-classification brief injected into every extraction prompt.
export const INTENT_BRIEF = `INTENT CLASSIFICATION — detect underlying PROJECT INTENT, not just the keyword "epoxy".
Request verbs: ${REQUEST_VERBS.join(', ')}.
Project verbs: ${PROJECT_VERBS.join(', ')}.
Problem verbs: ${PROBLEM_VERBS.join(', ')}.
Someone saying "how do I make my garage floor look better?" is an epoxy/coating lead. "Our restaurant floor is impossible to keep clean" is a commercial flooring lead. "We just bought an old warehouse" is a future flooring/concrete opportunity. "Who can resurface a pool deck?" is a direct decorative-concrete opportunity.
INDIRECT INTENT PHRASES to search for: ${INTENT_PHRASES.problem.join(' | ')} · ${INTENT_PHRASES.project.join(' | ')}.
PROPERTY TYPES: ${PROPERTY_TYPES.join(', ')}.
ADJACENT TRADES (referral partners, not end customers): ${ADJACENT_TRADES.join(', ')} — flag these with referral_partner=true.
SOURCE CLASSES: ${SOURCE_TAXONOMY.map((s) => s.class).join(', ')}.
Only return posts you ACTUALLY found online — never invent any field. Ignore posts that are contractors advertising their OWN services. Mark DIY-only questions (homeowner asking how to do it themselves) with diy_only=true. Set lead_category: VERY_HOT = request + location + timeframe; HOT = explicit request; WARM = project announcement or problem; PARTNER = adjacent trade seeking a sub; PROJECT = construction opportunity; PROPERTY = potential buyer; SIGNAL = weak indicator.`;