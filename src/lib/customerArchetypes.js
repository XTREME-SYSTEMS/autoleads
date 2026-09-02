// Frontend mirror of base44/shared/customerArchetypes.ts — provides the
// archetype metadata + classifier for UI display. The backend shared module
// is the source of truth; this mirrors the classification logic for the client.

export const ARCHETYPES = {
  homeowner_direct: {
    key: 'homeowner_direct', label: 'Homeowner — Direct Request', short: 'Direct Request',
    icon: '🏠', color: '#3b82f6',
    description: 'Homeowner submitted a service request on a marketplace (Angi, Thumbtack, HomeAdvisor). Actively shopping, comparing 3-5 contractors.',
    system: 'Speed-to-Lead Engine',
    targetResponseTime: '5 min',
  },
  homeowner_community: {
    key: 'homeowner_community', label: 'Homeowner — Community Referral', short: 'Community Referral',
    icon: '💬', color: '#8b5cf6',
    description: 'Homeowner asking neighbors/community for recommendations (Facebook Groups, Nextdoor, Reddit). Trusts peer opinions over ads.',
    system: 'Community Authority Engine',
    targetResponseTime: '24 hrs',
  },
  homeowner_budget: {
    key: 'homeowner_budget', label: 'Homeowner — Budget / Classifieds', short: 'Budget / Classifieds',
    icon: '🏷️', color: '#f59e0b',
    description: 'Price-first homeowner from Craigslist or Facebook Marketplace. Often DIY-curious, looking for cheapest option.',
    system: 'High-Volume Funnel',
    targetResponseTime: '1 hr',
  },
  permit_derived: {
    key: 'permit_derived', label: 'Permit-Derived Property Owner', short: 'Permit-Derived',
    icon: '📋', color: '#10b981',
    description: 'Property owner who already pulled a building permit — verified, funded project in motion. Flooring/coating scope often not yet assigned.',
    system: 'Permit Trigger Outreach',
    targetResponseTime: '24 hrs',
  },
  investor_flipper: {
    key: 'investor_flipper', label: 'Investor / Flipper', short: 'Investor / Flipper',
    icon: '🏗️', color: '#ec4899',
    description: 'Real estate investor, house flipper, or landlord buying value-add properties. Repeat buyer — win one and get 5-10 more.',
    system: 'Investor Relationship Pipeline',
    targetResponseTime: '24 hrs',
  },
  adjacent_trade: {
    key: 'adjacent_trade', label: 'Adjacent Trade / Referral Partner', short: 'Trade Partner',
    icon: '🤝', color: '#6366f1',
    description: 'GC, remodeler, builder, restoration contractor, or property manager who needs a reliable flooring/concrete sub.',
    system: 'Subcontractor Bid-Response Engine',
    targetResponseTime: '4 hrs',
  },
  commercial_gov_bid: {
    key: 'commercial_gov_bid', label: 'Commercial / Government Bid', short: 'Commercial / Gov Bid',
    icon: '🏛️', color: '#dc2626',
    description: 'Procurement officers, facility managers, project architects running formal bid processes. Documented, competitive, compliance-driven.',
    system: 'Full Bid-Response Engine',
    targetResponseTime: 'Before due date',
  },
  commercial_cre: {
    key: 'commercial_cre', label: 'Commercial Development / CRE', short: 'Dev / CRE',
    icon: '🏢', color: '#0891b2',
    description: 'Developers, property owners, tenant-improvement coordinators with announced or planned projects. Earlier in cycle than bid portals.',
    system: 'Developer Relationship Pipeline',
    targetResponseTime: '48 hrs',
  },
};

const SOURCE_PATTERNS = [
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
  { pattern: 'craigslist.org', archetype: 'homeowner_budget' },
  { pattern: 'facebook.com/marketplace', archetype: 'homeowner_budget' },
  { pattern: 'facebook.com/groups', archetype: 'homeowner_community' },
  { pattern: 'nextdoor.com', archetype: 'homeowner_community' },
  { pattern: 'reddit.com', archetype: 'homeowner_community' },
  { pattern: 'quora.com', archetype: 'homeowner_community' },
  { pattern: 'contractortalk.com', archetype: 'homeowner_community' },
  { pattern: 'flooringforum.com', archetype: 'homeowner_community' },
  { pattern: 'doityourself.com', archetype: 'homeowner_community' },
  { pattern: 'garagejournal.com', archetype: 'homeowner_community' },
  { pattern: 'diychatroom.com', archetype: 'homeowner_community' },
  { pattern: 'zillow.com', archetype: 'investor_flipper' },
  { pattern: 'realtor.com', archetype: 'investor_flipper' },
  { pattern: 'redfin.com', archetype: 'investor_flipper' },
  { pattern: 'biggerpockets.com', archetype: 'investor_flipper' },
  { pattern: 'auction.com', archetype: 'investor_flipper' },
  { pattern: 'accela.com', archetype: 'permit_derived' },
  { pattern: 'citizenserve.com', archetype: 'permit_derived' },
  { pattern: 'mygovernmentonline.org', archetype: 'permit_derived' },
  { pattern: 'permit', archetype: 'permit_derived' },
  { pattern: 'building-department', archetype: 'permit_derived' },
  { pattern: 'building-permit', archetype: 'permit_derived' },
  { pattern: 'permits', archetype: 'permit_derived' },
  { pattern: 'epermit', archetype: 'permit_derived' },
  { pattern: 'propertyappraiser', archetype: 'permit_derived' },
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
  { pattern: 'bizjournals.com', archetype: 'commercial_cre' },
  { pattern: 'tcrefl.com', archetype: 'commercial_cre' },
  { pattern: 'cfdc.org', archetype: 'commercial_cre' },
  { pattern: 'loopnet.com', archetype: 'commercial_cre' },
  { pattern: 'crexi.com', archetype: 'commercial_cre' },
  { pattern: 'commercialcafe.com', archetype: 'commercial_cre' },
  { pattern: 'construction.com', archetype: 'commercial_cre' },
  { pattern: 'constructconnect.com', archetype: 'commercial_cre' },
];

function heuristicClassify(project) {
  const pt = String(project.project_type || '').toLowerCase();
  const auth = String(project.authority || '').toLowerCase();
  const sid = String(project.source_id || '').toLowerCase();
  if (sid === 'social_scraper') return 'homeowner_community';
  if (pt === 'municipal' || pt === 'government' || pt.includes('federal') || pt.includes('state')) return 'commercial_gov_bid';
  if (auth.includes('procurement') || auth.includes('department') || auth.includes('district') || auth.includes('authority') || auth.includes('county') || auth.includes('city of')) return 'commercial_gov_bid';
  if (pt === 'commercial' || pt === 'industrial') return 'commercial_cre';
  if (pt === 'residential' || pt === 'renovation') return 'homeowner_community';
  return null;
}

export function classifyProject(project) {
  const url = String(project.source_url || '').toLowerCase();
  const auth = String(project.authority || '').toLowerCase();
  for (const { pattern, archetype } of SOURCE_PATTERNS) {
    if (url.includes(pattern) || auth.includes(pattern)) return archetype;
  }
  return heuristicClassify(project) || 'homeowner_community';
}

export function getArchetype(key) {
  return ARCHETYPES[key] || ARCHETYPES.homeowner_community;
}

export function getArchetypeForProject(project) {
  return getArchetype(project.customer_type || classifyProject(project));
}