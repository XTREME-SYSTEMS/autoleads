// Florida-first demand-intelligence source catalog.
// Organized by the Construction AI Growth OS workbook categories.
// Each entry: { name, url, source_type, jurisdiction, trades, priority, category }
// source_type must be one of: government_portal | aggregator | api | email | manual
// "manual" = social/community/directory/news sources that require cloud-browser or human review.

export interface DemandSource {
  name: string;
  url: string;
  source_type: 'government_portal' | 'aggregator' | 'api' | 'email' | 'manual';
  jurisdiction: string;
  trades: string;
  priority: 'High' | 'Medium' | 'Low';
  category: string;
}

export const DEMAND_SOURCES: DemandSource[] = [
  // ── Home-Service Marketplaces (national, Florida-scoped queries) ──
  { name: 'Angi', url: 'https://www.angi.com/', source_type: 'aggregator', jurisdiction: 'National (FL focus)', trades: 'flooring, epoxy, concrete, coatings', priority: 'High', category: 'Home Services' },
  { name: 'Thumbtack', url: 'https://www.thumbtack.com/', source_type: 'aggregator', jurisdiction: 'National (FL focus)', trades: 'flooring, epoxy, concrete, coatings', priority: 'High', category: 'Home Services' },
  { name: 'Houzz', url: 'https://www.houzz.com/', source_type: 'aggregator', jurisdiction: 'National (FL focus)', trades: 'remodeling, flooring, decorative concrete', priority: 'High', category: 'Home Services' },
  { name: 'HomeAdvisor', url: 'https://www.homeadvisor.com/', source_type: 'aggregator', jurisdiction: 'National (FL focus)', trades: 'flooring, concrete, coatings', priority: 'Medium', category: 'Home Services' },
  { name: 'Bark', url: 'https://www.bark.com/', source_type: 'aggregator', jurisdiction: 'National (FL focus)', trades: 'flooring, concrete, coatings', priority: 'Medium', category: 'Home Services' },
  { name: 'Craigslist (Florida cities)', url: 'https://www.craigslist.org/about/sites#US', source_type: 'manual', jurisdiction: 'Florida', trades: 'services, labor, materials', priority: 'Medium', category: 'Classifieds' },

  // ── Social & Community (cloud-browser required) ──
  { name: 'Reddit r/Flooring', url: 'https://www.reddit.com/r/Flooring/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'flooring, epoxy, concrete', priority: 'High', category: 'Social/Community' },
  { name: 'Reddit r/orlando', url: 'https://www.reddit.com/r/orlando/', source_type: 'manual', jurisdiction: 'Orlando, FL', trades: 'home improvement, contractor recommendations', priority: 'High', category: 'Social/Community' },
  { name: 'Reddit r/Miami', url: 'https://www.reddit.com/r/Miami/', source_type: 'manual', jurisdiction: 'Miami, FL', trades: 'home improvement, contractor recommendations', priority: 'High', category: 'Social/Community' },
  { name: 'Reddit r/florida', url: 'https://www.reddit.com/r/florida/', source_type: 'manual', jurisdiction: 'Florida', trades: 'home improvement, contractor recommendations', priority: 'Medium', category: 'Social/Community' },
  { name: 'Reddit r/Concrete', url: 'https://www.reddit.com/r/Concrete/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete, repair, resurfacing', priority: 'Medium', category: 'Social/Community' },
  { name: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace/', source_type: 'manual', jurisdiction: 'Florida', trades: 'services, materials', priority: 'Medium', category: 'Social/Community' },
  { name: 'Nextdoor', url: 'https://nextdoor.com/', source_type: 'manual', jurisdiction: 'Florida neighborhoods', trades: 'contractor recommendations, home services', priority: 'High', category: 'Social/Community' },
  { name: 'Quora (Flooring/Concrete)', url: 'https://www.quora.com/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'flooring, concrete, epoxy', priority: 'Low', category: 'Social/Community' },
  { name: 'LinkedIn (FL construction)', url: 'https://www.linkedin.com/', source_type: 'manual', jurisdiction: 'Florida', trades: 'commercial construction, GC, subcontracting', priority: 'Medium', category: 'Social/Community' },

  // ── Florida State Procurement ──
  { name: 'FL DMS Current Bid Opportunities', url: 'https://www.dms.myflorida.com/business_operations/state_purchasing/office_of_supplier_development_osd/vendor_resources/current_bid_opportunities', source_type: 'government_portal', jurisdiction: 'Florida (State)', trades: 'all construction trades', priority: 'High', category: 'Government Procurement' },
  { name: 'MyFloridaMarketplace Vendor Portal', url: 'https://vendor.myfloridamarketplace.com/', source_type: 'government_portal', jurisdiction: 'Florida (State)', trades: 'all state contracts', priority: 'High', category: 'Government Procurement' },
  { name: 'FDOT Procurement (letting)', url: 'https://www.fdot.gov/contractsletting', source_type: 'government_portal', jurisdiction: 'Florida (State)', trades: 'transportation, concrete, paving', priority: 'High', category: 'Government Procurement' },

  // ── Florida County Procurement ──
  { name: 'Orange County OrangeBids', url: 'https://apps.ocfl.net/orangebids/bidopen.asp', source_type: 'government_portal', jurisdiction: 'Orange County, FL', trades: 'all construction trades', priority: 'High', category: 'County Procurement' },
  { name: 'Hillsborough County Procurement', url: 'https://www.hillsboroughcounty.org/doing-business-with/bids/', source_type: 'government_portal', jurisdiction: 'Hillsborough County, FL', trades: 'all construction trades', priority: 'High', category: 'County Procurement' },
  { name: 'Miami-Dade Procurement', url: 'https://www.miamidade.gov/procurement/bids-solicitations/', source_type: 'government_portal', jurisdiction: 'Miami-Dade County, FL', trades: 'all construction trades', priority: 'High', category: 'County Procurement' },
  { name: 'Broward County Procurement', url: 'https://www.broward.org/Procurement/Pages/Default.aspx', source_type: 'government_portal', jurisdiction: 'Broward County, FL', trades: 'all construction trades', priority: 'High', category: 'County Procurement' },
  { name: 'Palm Beach County Procurement', url: 'https://discover.pbcgov.org/purchasing/', source_type: 'government_portal', jurisdiction: 'Palm Beach County, FL', trades: 'all construction trades', priority: 'High', category: 'County Procurement' },
  { name: 'Liberty County Bids', url: 'https://libertycountyfl.org/clerk-to-the-board/bids-rfp-frqs/', source_type: 'government_portal', jurisdiction: 'Liberty County, FL', trades: 'all construction trades', priority: 'Low', category: 'County Procurement' },

  // ── Florida City Procurement ──
  { name: 'City of South Miami Bids', url: 'https://www.somifl.gov/Bids.aspx', source_type: 'government_portal', jurisdiction: 'South Miami, FL', trades: 'all construction trades', priority: 'Medium', category: 'City Procurement' },
  { name: 'City of Margate Bids', url: 'https://www.margatefl.com/Bids.aspx', source_type: 'government_portal', jurisdiction: 'Margate, FL', trades: 'all construction trades', priority: 'Medium', category: 'City Procurement' },
  { name: 'City of Orlando Procurement', url: 'https://www.orlando.gov/Business/Procurement', source_type: 'government_portal', jurisdiction: 'Orlando, FL', trades: 'all construction trades', priority: 'High', category: 'City Procurement' },
  { name: 'City of Jacksonville Procurement', url: 'https://www.coj.net/departments/procurement', source_type: 'government_portal', jurisdiction: 'Jacksonville, FL', trades: 'all construction trades', priority: 'High', category: 'City Procurement' },
  { name: 'City of Tampa Procurement', url: 'https://www.tampa.gov/procurement', source_type: 'government_portal', jurisdiction: 'Tampa, FL', trades: 'all construction trades', priority: 'High', category: 'City Procurement' },

  // ── Florida Bid Aggregators / Plan Rooms ──
  { name: 'BidNet Direct Florida', url: 'https://www.bidnetdirect.com/florida', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'all construction trades', priority: 'High', category: 'Bid Aggregators' },
  { name: 'DemandStar Florida', url: 'https://www.demandstar.com/app/agencies/Florida', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'all construction trades', priority: 'High', category: 'Bid Aggregators' },
  { name: 'ConstructionBidSource Florida', url: 'https://www.constructionbidsource.com/state/florida', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'all construction trades', priority: 'High', category: 'Bid Aggregators' },
  { name: 'FloridaBids Network', url: 'https://www.floridabids.net/', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'all construction trades', priority: 'Medium', category: 'Bid Aggregators' },
  { name: 'Dodge Construction Network', url: 'https://www.construction.com/', source_type: 'aggregator', jurisdiction: 'National (FL focus)', trades: 'commercial construction intelligence', priority: 'Medium', category: 'Bid Aggregators' },
  { name: 'ConstructConnect', url: 'https://www.constructconnect.com/', source_type: 'aggregator', jurisdiction: 'National (FL focus)', trades: 'commercial construction bids', priority: 'Medium', category: 'Bid Aggregators' },

  // ── Florida Building Permits / Planning ──
  { name: 'Accela Citizen Access (FL counties)', url: 'https://aca-prod.accela.com/BOCC/Cap/CapHome.aspx?module=Building', source_type: 'government_portal', jurisdiction: 'Multiple FL counties', trades: 'building permits', priority: 'High', category: 'Permits/Planning' },
  { name: 'Hillsborough County Building Permits', url: 'https://hcfl.gov/businesses/development-services-records/building-permitting-records-searches', source_type: 'government_portal', jurisdiction: 'Hillsborough County, FL', trades: 'building permits', priority: 'High', category: 'Permits/Planning' },
  { name: 'Brevard County Permit Search', url: 'https://www.brevardfl.gov/PlanningAndDevelopment/BuildingPermits/PermitSearch', source_type: 'government_portal', jurisdiction: 'Brevard County, FL', trades: 'building permits', priority: 'Medium', category: 'Permits/Planning' },
  { name: 'Orange County Permits & Licenses', url: 'https://www.orangecountyfl.net/permitslicenses.aspx', source_type: 'government_portal', jurisdiction: 'Orange County, FL', trades: 'building permits', priority: 'High', category: 'Permits/Planning' },
  { name: 'City of Miami Permit Search', url: 'https://www.miami.gov/Permits-Construction/Permitting-Resources/View-Permit-HistoryPermit-Search', source_type: 'government_portal', jurisdiction: 'Miami, FL', trades: 'building permits', priority: 'High', category: 'Permits/Planning' },
  { name: 'Hernando County Building Division', url: 'https://pvweb.hernandopa-fl.us/', source_type: 'government_portal', jurisdiction: 'Hernando County, FL', trades: 'building permits', priority: 'Medium', category: 'Permits/Planning' },

  // ── Florida Contractor / Builder Associations (member directories = referral graph) ──
  { name: 'Florida Home Builders Association', url: 'https://fhba.com/', source_type: 'manual', jurisdiction: 'Florida', trades: 'home building, remodeling, flooring', priority: 'High', category: 'Associations' },
  { name: 'ABC Florida East Coast', url: 'https://abceastflorida.com/', source_type: 'manual', jurisdiction: 'East Florida', trades: 'commercial construction', priority: 'High', category: 'Associations' },
  { name: 'Tampa Bay Builders Association', url: 'https://members.tbba.net/list', source_type: 'manual', jurisdiction: 'Tampa Bay, FL', trades: 'builders, GC, subcontractors', priority: 'High', category: 'Associations' },
  { name: 'Builders Association of South Florida', url: 'https://business.basfonline.org/list', source_type: 'manual', jurisdiction: 'South Florida', trades: 'builders, GC, subcontractors', priority: 'High', category: 'Associations' },
  { name: 'Suncoast Builders Association', url: 'https://business.suncoastba.org/list', source_type: 'manual', jurisdiction: 'Suncoast, FL', trades: 'builders, GC, subcontractors', priority: 'Medium', category: 'Associations' },
  { name: 'Builders Association of North Central Florida', url: 'https://members.bancf.com/list', source_type: 'manual', jurisdiction: 'North Central Florida', trades: 'builders, GC, subcontractors', priority: 'Medium', category: 'Associations' },

  // ── Florida School District / University Procurement ──
  { name: 'UF Procurement Schedule of Bids', url: 'https://procurement.ufl.edu/vendors/schedule-of-bids/', source_type: 'government_portal', jurisdiction: 'Gainesville, FL', trades: 'all construction trades', priority: 'High', category: 'Schools/Universities' },
  { name: 'Palm Beach County School District Solicitations', url: 'https://www.palmbeachschools.org/doing-business-with-the-district/construction-vendorssuppliers/currentfuture-solicitations', source_type: 'government_portal', jurisdiction: 'Palm Beach County, FL', trades: 'all construction trades', priority: 'High', category: 'Schools/Universities' },
  { name: 'Leon County Schools Construction Bids', url: 'https://www.leonschools.net/construction-facilities-bid-opportu', source_type: 'government_portal', jurisdiction: 'Leon County, FL', trades: 'all construction trades', priority: 'Medium', category: 'Schools/Universities' },
  { name: 'Bay District Schools Bids', url: 'https://www.bay.k12.fl.us/page/bids', source_type: 'government_portal', jurisdiction: 'Bay County, FL', trades: 'all construction trades', priority: 'Medium', category: 'Schools/Universities' },
  { name: 'DeSoto County School Bids', url: 'https://www.desotoschools.com/departments/purchasing/bids', source_type: 'government_portal', jurisdiction: 'DeSoto County, FL', trades: 'all construction trades', priority: 'Low', category: 'Schools/Universities' },
  { name: 'School District of Martin County (DemandStar)', url: 'https://www.demandstar.com/app/agencies/florida/school-district-of-martin-county-florida', source_type: 'government_portal', jurisdiction: 'Martin County, FL', trades: 'all construction trades', priority: 'Medium', category: 'Schools/Universities' },

  // ── Florida Airport / Transit Procurement ──
  { name: 'Miami International Airport Bids', url: 'https://www.miami-airport.com/bids.asp', source_type: 'government_portal', jurisdiction: 'Miami, FL', trades: 'airport construction, flooring, coatings', priority: 'High', category: 'Airports/Transit' },
  { name: 'Melbourne Airport Authority (DemandStar)', url: 'https://www.demandstar.com/app/agencies/Florida/City-of-Melbourne-Airport-Authority', source_type: 'government_portal', jurisdiction: 'Melbourne, FL', trades: 'airport construction', priority: 'Medium', category: 'Airports/Transit' },
  { name: 'Titusville Cocoa Airport Authority', url: 'https://www.floridabids.net/government-agencies/brevard/titusville-cocoa-airport-authority-543/', source_type: 'aggregator', jurisdiction: 'Brevard County, FL', trades: 'airport construction', priority: 'Low', category: 'Airports/Transit' },

  // ── Florida Commercial Real Estate / Development News ──
  { name: 'South Florida Business Journal CRE', url: 'https://www.bizjournals.com/southflorida/news/commercial-real-estate', source_type: 'manual', jurisdiction: 'South Florida', trades: 'commercial development, renovations', priority: 'High', category: 'Commercial RE/News' },
  { name: 'TCRE News', url: 'https://tcrefl.com/news/', source_type: 'manual', jurisdiction: 'Southwest Florida', trades: 'commercial development', priority: 'Medium', category: 'Commercial RE/News' },
  { name: 'Central Florida Development Council Projects', url: 'https://www.cfdc.org/do-business-here/featured-projects/', source_type: 'manual', jurisdiction: 'Central Florida', trades: 'economic development, construction', priority: 'Medium', category: 'Commercial RE/News' },

  // ── Federal Procurement APIs (Florida-relevant) ──
  { name: 'SAM.gov Opportunities', url: 'https://sam.gov/content/opportunities', source_type: 'api', jurisdiction: 'Federal (FL focus)', trades: 'all federal construction', priority: 'High', category: 'Federal APIs' },
  { name: 'USAspending.gov', url: 'https://www.usaspending.gov/', source_type: 'api', jurisdiction: 'Federal (FL focus)', trades: 'federal contract awards', priority: 'Medium', category: 'Federal APIs' },
  { name: 'Grants.gov', url: 'https://www.grants.gov/', source_type: 'api', jurisdiction: 'Federal (FL focus)', trades: 'federal grants', priority: 'Low', category: 'Federal APIs' },
];

export const DEMAND_SOURCE_CATEGORIES = [
  'Home Services', 'Classifieds', 'Social/Community', 'Government Procurement',
  'County Procurement', 'City Procurement', 'Bid Aggregators', 'Permits/Planning',
  'Associations', 'Schools/Universities', 'Airports/Transit', 'Commercial RE/News', 'Federal APIs',
];