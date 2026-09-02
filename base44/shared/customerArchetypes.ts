// =============================================================================
// Customer Archetype Engine — classifies every lead/project into one of 8
// customer archetypes based on its source, then maps each archetype to a
// specific handling system (response time, outreach sequence, proposal
// template, validation gates, pipeline, positioning).
//
// The core insight: a $3K Craigslist garage-floor homeowner and a $250K FDOT
// bridge-deck government bid need completely different handling. The customer
// TYPE drives which pipeline the lead enters, not just the project type.
//
// Consumed by: classifyCustomerType (backend), LeadFeed (UI badge), and future
// pipeline-routing / outreach-dispatch logic.
// =============================================================================

export type ArchetypeKey =
  | 'homeowner_direct'
  | 'homeowner_community'
  | 'homeowner_budget'
  | 'permit_derived'
  | 'investor_flipper'
  | 'adjacent_trade'
  | 'commercial_gov_bid'
  | 'commercial_cre';

export interface ArchetypeConfig {
  key: ArchetypeKey;
  label: string;
  short: string;
  icon: string;
  color: string; // hex for UI badge
  description: string;
  dealProfile: { avgLow: number; avgHigh: number; cycleDays: string; volume: 'High' | 'Medium' | 'Low' };
  mindset: string;
  system: string;
  handling: {
    targetResponseTime: string;
    outreachSequence: string;
    proposalTemplate: string;
    validationGates: string[];
    pipeline: string;
    positioning: string;
  };
}

export const ARCHETYPES: Record<ArchetypeKey, ArchetypeConfig> = {
  homeowner_direct: {
    key: 'homeowner_direct',
    label: 'Homeowner — Direct Request',
    short: 'Direct Request',
    icon: '🏠',
    color: '#3b82f6',
    description: 'Homeowner submitted a service request on a marketplace (Angi, Thumbtack, HomeAdvisor). Actively shopping, comparing 3-5 contractors.',
    dealProfile: { avgLow: 2000, avgHigh: 15000, cycleDays: '1-3 days', volume: 'High' },
    mindset: 'I have a problem, I want it fixed, who is available and how much?',
    system: 'Speed-to-Lead Engine',
    handling: {
      targetResponseTime: '5 minutes',
      outreachSequence: 'speed_to_lead',
      proposalTemplate: 'quick_quote',
      validationGates: ['lead_intake'],
      pipeline: 'fast_track',
      positioning: 'Fast response, fair price, available now',
    },
  },
  homeowner_community: {
    key: 'homeowner_community',
    label: 'Homeowner — Community Referral',
    short: 'Community Referral',
    icon: '💬',
    color: '#8b5cf6',
    description: 'Homeowner asking neighbors/community for recommendations (Facebook Groups, Nextdoor, Reddit). Trusts peer opinions over ads.',
    dealProfile: { avgLow: 3000, avgHigh: 25000, cycleDays: '1-3 weeks', volume: 'Medium' },
    mindset: 'I want someone trustworthy, not necessarily the cheapest',
    system: 'Community Authority Engine',
    handling: {
      targetResponseTime: '24 hours',
      outreachSequence: 'community_nurture',
      proposalTemplate: 'relationship_quote',
      validationGates: ['lead_intake'],
      pipeline: 'relationship_track',
      positioning: 'Trusted local expert, proven reviews, quality work',
    },
  },
  homeowner_budget: {
    key: 'homeowner_budget',
    label: 'Homeowner — Budget / Classifieds',
    short: 'Budget / Classifieds',
    icon: '🏷️',
    color: '#f59e0b',
    description: 'Price-first homeowner from Craigslist or Facebook Marketplace. Often DIY-curious, looking for cheapest option.',
    dealProfile: { avgLow: 1000, avgHigh: 8000, cycleDays: 'Days', volume: 'High' },
    mindset: 'What is the cheapest way to get this done?',
    system: 'High-Volume Funnel',
    handling: {
      targetResponseTime: '1 hour',
      outreachSequence: 'tiered_quote',
      proposalTemplate: 'budget_packages',
      validationGates: ['lead_intake'],
      pipeline: 'volume_funnel',
      positioning: 'Budget/mid/premium packages, fair price, fast turnaround',
    },
  },
  permit_derived: {
    key: 'permit_derived',
    label: 'Permit-Derived Property Owner',
    short: 'Permit-Derived',
    icon: '📋',
    color: '#10b981',
    description: 'Property owner who already pulled a building permit — verified, funded project in motion. Flooring/coating scope often not yet assigned.',
    dealProfile: { avgLow: 10000, avgHigh: 100000, cycleDays: '1-2 weeks', volume: 'Medium' },
    mindset: 'I am already doing this project, I need someone for the floor scope',
    system: 'Permit Trigger Outreach System',
    handling: {
      targetResponseTime: '24 hours',
      outreachSequence: 'permit_trigger',
      proposalTemplate: 'scope_specific',
      validationGates: ['lead_intake', 'prepared_takeoff'],
      pipeline: 'permit_outreach_track',
      positioning: 'We saw your permit at [address], we specialize in [scope]',
    },
  },
  investor_flipper: {
    key: 'investor_flipper',
    label: 'Investor / Flipper',
    short: 'Investor / Flipper',
    icon: '🏗️',
    color: '#ec4899',
    description: 'Real estate investor, house flipper, or landlord buying value-add properties. Repeat buyer — win one and get 5-10 more.',
    dealProfile: { avgLow: 15000, avgHigh: 50000, cycleDays: 'Flip schedule', volume: 'Medium' },
    mindset: 'I need this done fast and right so I can list/sell. Can you be my go-to floor guy?',
    system: 'Investor Relationship Pipeline',
    handling: {
      targetResponseTime: '24 hours',
      outreachSequence: 'investor_intro',
      proposalTemplate: 'flip_ready_package',
      validationGates: ['lead_intake'],
      pipeline: 'investor_relationship_track',
      positioning: 'Flip-ready flooring package, fast turnaround, volume pricing',
    },
  },
  adjacent_trade: {
    key: 'adjacent_trade',
    label: 'Adjacent Trade / Referral Partner',
    short: 'Trade Partner',
    icon: '🤝',
    color: '#6366f1',
    description: 'GC, remodeler, builder, restoration contractor, or property manager who needs a reliable flooring/concrete sub. They have the end customer.',
    dealProfile: { avgLow: 10000, avgHigh: 75000, cycleDays: 'Ongoing', volume: 'Medium' },
    mindset: 'I need a sub I can trust to show up, do good work, and not make me look bad',
    system: 'Subcontractor Bid-Response Engine',
    handling: {
      targetResponseTime: '4 hours',
      outreachSequence: 'contractor_intro',
      proposalTemplate: 'subcontractor_bid',
      validationGates: ['lead_intake', 'prepared_takeoff', 'bid_package'],
      pipeline: 'subcontractor_track',
      positioning: 'We make you look good — reliable sub, fast turnaround, quality work',
    },
  },
  commercial_gov_bid: {
    key: 'commercial_gov_bid',
    label: 'Commercial / Government Bid',
    short: 'Commercial / Gov Bid',
    icon: '🏛️',
    color: '#dc2626',
    description: 'Procurement officers, facility managers, project architects running formal bid processes. Documented, competitive, compliance-driven.',
    dealProfile: { avgLow: 50000, avgHigh: 500000, cycleDays: '3-8 weeks', volume: 'Low' },
    mindset: 'I need compliant bids from qualified contractors by the due date',
    system: 'Full Bid-Response Engine',
    handling: {
      targetResponseTime: 'Before due date',
      outreachSequence: 'bid_response',
      proposalTemplate: 'formal_bid_package',
      validationGates: ['lead_intake', 'prepared_takeoff', 'bid_package'],
      pipeline: 'full_pipeline',
      positioning: 'Compliant, qualified, complete bid package delivered on time',
    },
  },
  commercial_cre: {
    key: 'commercial_cre',
    label: 'Commercial Development / CRE',
    short: 'Dev / CRE',
    icon: '🏢',
    color: '#0891b2',
    description: 'Developers, property owners, tenant-improvement coordinators with announced or planned projects. Earlier in cycle than bid portals.',
    dealProfile: { avgLow: 50000, avgHigh: 250000, cycleDays: '1-3 months', volume: 'Low' },
    mindset: 'I am planning a project, I am building my shortlist of contractors',
    system: 'Developer Relationship Pipeline',
    handling: {
      targetResponseTime: '48 hours',
      outreachSequence: 'developer_intro',
      proposalTemplate: 'capability_brief',
      validationGates: ['lead_intake'],
      pipeline: 'developer_relationship_track',
      positioning: 'We saw your project announcement, we want to be on your shortlist',
    },
  },
};

// ── Source URL → Archetype mapping ──
// Ordered by specificity — first match wins. Each entry is a hostname substring
// or URL fragment that uniquely identifies the source platform.
const SOURCE_PATTERNS: { pattern: string; archetype: ArchetypeKey }[] = [
  // 1. Homeowner — Direct Request (marketplaces)
  { pattern: 'angi.com', archetype: 'homeowner_direct' },
  { pattern: 'thumbtack.com', archetype: 'homeowner_direct' },
  { pattern: 'homeadvisor.com', archetype: 'homeowner_direct' },
  { pattern: 'houzz.com', archetype: 'homeowner_direct' },
  { pattern: 'bark.com', archetype: 'homeowner_direct' },
  { pattern: 'yelp.com', archetype: 'homeowner_direct' },
  { pattern: 'porch.com', archetype: 'homeowner_direct' },
  { pattern: 'taskrabbit.com', archetype: 'homeowner_direct' },
  { pattern: 'networx.com', archetype: 'homeowner_direct' },
  { pattern: 'promatcher.com', archetype: 'homeowner_direct' },
  { pattern: 'homeguide.com', archetype: 'homeowner_direct' },
  { pattern: 'buildzoom.com', archetype: 'homeowner_direct' },

  // 3. Homeowner — Budget / Classifieds (check before community — FB marketplace vs groups)
  { pattern: 'craigslist.org', archetype: 'homeowner_budget' },
  { pattern: 'facebook.com/marketplace', archetype: 'homeowner_budget' },

  // 2. Homeowner — Community Referral
  { pattern: 'facebook.com/groups', archetype: 'homeowner_community' },
  { pattern: 'nextdoor.com', archetype: 'homeowner_community' },
  { pattern: 'reddit.com', archetype: 'homeowner_community' },
  { pattern: 'quora.com', archetype: 'homeowner_community' },
  { pattern: 'contractortalk.com', archetype: 'homeowner_community' },
  { pattern: 'flooringforum.com', archetype: 'homeowner_community' },
  { pattern: 'doityourself.com', archetype: 'homeowner_community' },
  { pattern: 'garagejournal.com', archetype: 'homeowner_community' },
  { pattern: 'diychatroom.com', archetype: 'homeowner_community' },

  // 5. Investor / Flipper
  { pattern: 'zillow.com', archetype: 'investor_flipper' },
  { pattern: 'realtor.com', archetype: 'investor_flipper' },
  { pattern: 'redfin.com', archetype: 'investor_flipper' },
  { pattern: 'biggerpockets.com', archetype: 'investor_flipper' },
  { pattern: 'auction.com', archetype: 'investor_flipper' },

  // 4. Permit-Derived (county/city permit portals, property appraisers, open data)
  { pattern: 'accela.com', archetype: 'permit_derived' },
  { pattern: 'citizenserve.com', archetype: 'permit_derived' },
  { pattern: 'mygovernmentonline.org', archetype: 'permit_derived' },
  { pattern: 'permit', archetype: 'permit_derived' },
  { pattern: 'building-department', archetype: 'permit_derived' },
  { pattern: 'building-permit', archetype: 'permit_derived' },
  { pattern: 'permits', archetype: 'permit_derived' },
  { pattern: 'epermit', archetype: 'permit_derived' },
  { pattern: 'propertyappraiser', archetype: 'permit_derived' },
  { pattern: 'pa.gov', archetype: 'permit_derived' }, // property appraiser domains
  { pattern: 'papa', archetype: 'permit_derived' },
  { pattern: 'pcpao.org', archetype: 'permit_derived' },
  { pattern: 'hcpafl.org', archetype: 'permit_derived' },
  { pattern: 'ocpafl.org', archetype: 'permit_derived' },
  { pattern: 'leepa.org', archetype: 'permit_derived' },
  { pattern: 'polkpa.org', archetype: 'permit_derived' },
  { pattern: 'pascopropertyappraiser', archetype: 'permit_derived' },
  { pattern: 'bcpa.net', archetype: 'permit_derived' },
  { pattern: 'miamidadepa.gov', archetype: 'permit_derived' },
  { pattern: 'floridarevenue.com/property', archetype: 'permit_derived' },
  { pattern: 'opendata', archetype: 'permit_derived' },
  { pattern: 'socrata', archetype: 'permit_derived' },
  { pattern: 'arcgis.com', archetype: 'permit_derived' },
  { pattern: 'geodata.floridagio', archetype: 'permit_derived' },
  { pattern: 'permithunt.com', archetype: 'permit_derived' },
  { pattern: '1contractorsolutions.com', archetype: 'permit_derived' },

  // 6. Adjacent Trade / Referral Partner (associations, licensing boards, directories)
  { pattern: 'myfloridalicense.com', archetype: 'adjacent_trade' },
  { pattern: 'fhba.com', archetype: 'adjacent_trade' },
  { pattern: 'ascconline.org', archetype: 'adjacent_trade' },
  { pattern: 'ficap.org', archetype: 'adjacent_trade' },
  { pattern: 'fcica.com', archetype: 'adjacent_trade' },
  { pattern: 'cfaconcretepros.org', archetype: 'adjacent_trade' },
  { pattern: 'abceastflorida.com', archetype: 'adjacent_trade' },
  { pattern: 'tbba.net', archetype: 'adjacent_trade' },
  { pattern: 'basfonline.org', archetype: 'adjacent_trade' },
  { pattern: 'suncoastba.org', archetype: 'adjacent_trade' },
  { pattern: 'bancf.com', archetype: 'adjacent_trade' },
  { pattern: 'nrmca.org', archetype: 'adjacent_trade' },
  { pattern: 'agc.org', archetype: 'adjacent_trade' },
  { pattern: 'abc.org', archetype: 'adjacent_trade' },

  // 7. Commercial / Government Bid (procurement portals, bid aggregators, federal APIs)
  { pattern: 'dms.myflorida.com', archetype: 'commercial_gov_bid' },
  { pattern: 'myfloridamarketplace.com', archetype: 'commercial_gov_bid' },
  { pattern: 'fdot.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'bidnetdirect.com', archetype: 'commercial_gov_bid' },
  { pattern: 'demandstar.com', archetype: 'commercial_gov_bid' },
  { pattern: 'constructionbidsource.com', archetype: 'commercial_gov_bid' },
  { pattern: 'floridabids.net', archetype: 'commercial_gov_bid' },
  { pattern: 'procurement', archetype: 'commercial_gov_bid' },
  { pattern: 'purchasing', archetype: 'commercial_gov_bid' },
  { pattern: 'bids', archetype: 'commercial_gov_bid' },
  { pattern: 'solicitation', archetype: 'commercial_gov_bid' },
  { pattern: 'doing-business', archetype: 'commercial_gov_bid' },
  { pattern: 'coj.net', archetype: 'commercial_gov_bid' },
  { pattern: 'orlando.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'tampa.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'miami.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'miamidade.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'broward.org', archetype: 'commercial_gov_bid' },
  { pattern: 'pbcgov.com', archetype: 'commercial_gov_bid' },
  { pattern: 'orangecountyfl.net', archetype: 'commercial_gov_bid' },
  { pattern: 'hillsboroughcounty.org', archetype: 'commercial_gov_bid' },
  { pattern: 'hcfl.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'ocfl.net', archetype: 'commercial_gov_bid' },
  { pattern: 'sam.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'usaspending.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'grants.gov', archetype: 'commercial_gov_bid' },
  { pattern: 'procurement.ufl.edu', archetype: 'commercial_gov_bid' },
  { pattern: 'palmbeachschools.org', archetype: 'commercial_gov_bid' },
  { pattern: 'leonschools.net', archetype: 'commercial_gov_bid' },
  { pattern: 'bay.k12.fl.us', archetype: 'commercial_gov_bid' },
  { pattern: 'desotoschools.com', archetype: 'commercial_gov_bid' },
  { pattern: 'k12.fl.us', archetype: 'commercial_gov_bid' },
  { pattern: 'miami-airport.com', archetype: 'commercial_gov_bid' },
  { pattern: 'melbourneairport', archetype: 'commercial_gov_bid' },
  { pattern: 'fly', archetype: 'commercial_gov_bid' }, // airport domains

  // 8. Commercial Development / CRE (news, CRE listings, Dodge)
  { pattern: 'bizjournals.com', archetype: 'commercial_cre' },
  { pattern: 'tcrefl.com', archetype: 'commercial_cre' },
  { pattern: 'cfdc.org', archetype: 'commercial_cre' },
  { pattern: 'loopnet.com', archetype: 'commercial_cre' },
  { pattern: 'crexi.com', archetype: 'commercial_cre' },
  { pattern: 'commercialcafe.com', archetype: 'commercial_cre' },
  { pattern: 'construction.com', archetype: 'commercial_cre' },
  { pattern: 'constructconnect.com', archetype: 'commercial_cre' },
];

// ── Heuristic fallbacks when source URL doesn't match ──
// Uses project_type, authority, and source_id to infer the archetype.
function heuristicClassify(project: any): ArchetypeKey | null {
  const pt = String(project.project_type || '').toLowerCase();
  const auth = String(project.authority || '').toLowerCase();
  const sid = String(project.source_id || '').toLowerCase();

  // Social scraper leads
  if (sid === 'social_scraper') {
    if (pt === 'residential') return 'homeowner_community';
    return 'homeowner_community';
  }

  // Government / formal bid signals
  if (pt === 'municipal' || pt === 'government' || pt.includes('federal') || pt.includes('state')) return 'commercial_gov_bid';
  if (auth.includes('procurement') || auth.includes('department') || auth.includes('district') || auth.includes('authority') || auth.includes('county') || auth.includes('city of')) return 'commercial_gov_bid';

  // Commercial
  if (pt === 'commercial' || pt === 'industrial') return 'commercial_cre';

  // Residential
  if (pt === 'residential' || pt === 'renovation') return 'homeowner_community';

  return null;
}

// ── Main classifier ──
export function classifyProject(project: any): ArchetypeKey {
  const url = String(project.source_url || '').toLowerCase();
  const auth = String(project.authority || '').toLowerCase();

  // 1. Match source URL patterns
  for (const { pattern, archetype } of SOURCE_PATTERNS) {
    if (url.includes(pattern) || auth.includes(pattern)) return archetype;
  }

  // 2. Heuristic fallback
  const heuristic = heuristicClassify(project);
  if (heuristic) return heuristic;

  // 3. Default — treat unknown as community referral (safest low-pressure handling)
  return 'homeowner_community';
}

export function getArchetype(key: ArchetypeKey): ArchetypeConfig {
  return ARCHETYPES[key] || ARCHETYPES.homeowner_community;
}

export function getArchetypeList(): ArchetypeConfig[] {
  return Object.values(ARCHETYPES);
}