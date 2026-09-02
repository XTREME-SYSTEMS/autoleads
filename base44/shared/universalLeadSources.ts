// Universal lead-source catalog — every source category that can yield
// contact information for people/entities who may want concrete, epoxy,
// polishing, or coating work completed. These are NOT bid invitations —
// they are contact-discovery sources (directories, posting sites, associations,
// facility managers, property managers, HOAs, investors, restoration networks, etc.)
//
// Leads from these sources only have contact info (no specs/plans), so they
// require the specialized "Free Project Cost Evaluation" introduction email
// (see freeEvaluationOutreach.ts + sendFreeEvaluationOutreach function).

import { DemandSource } from './floridaDemandSources.ts';

// ── Homeowner / "need work done" posting sites ──
const HOMEOWNER_POSTING_SOURCES: DemandSource[] = [
  { name: 'Angi (Flooring/Concrete)', url: 'https://www.angi.com/category/flooring', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring, epoxy, concrete, coatings', priority: 'High', category: 'Homeowner Posting Sites' },
  { name: 'Thumbtack (Flooring)', url: 'https://www.thumbtack.com/k/flooring-services/near-me/', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring, epoxy, concrete', priority: 'High', category: 'Homeowner Posting Sites' },
  { name: 'HomeAdvisor (Flooring)', url: 'https://www.homeadvisor.com/category.Flooring.html', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring, concrete, coatings', priority: 'High', category: 'Homeowner Posting Sites' },
  { name: 'Houzz (Flooring Pros)', url: 'https://www.houzz.com/professionals/flooring-contractors', source_type: 'aggregator', jurisdiction: 'National', trades: 'remodeling, flooring, decorative concrete', priority: 'High', category: 'Homeowner Posting Sites' },
  { name: 'Porch.com (Pros)', url: 'https://porch.com/pros', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring, siding, concrete', priority: 'Medium', category: 'Homeowner Posting Sites' },
  { name: 'Bark (Flooring)', url: 'https://www.bark.com/en/us/category/flooring/', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring, concrete, coatings', priority: 'Low', category: 'Homeowner Posting Sites' },
  { name: 'Nextdoor (Find Pros)', url: 'https://nextdoor.com/find-neighborhood/', source_type: 'manual', jurisdiction: 'National (neighborhoods)', trades: 'contractor recs, home services', priority: 'High', category: 'Homeowner Posting Sites' },
  { name: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace/', source_type: 'manual', jurisdiction: 'National', trades: 'services, materials, labor', priority: 'Medium', category: 'Homeowner Posting Sites' },
  { name: 'OfferUp (Services)', url: 'https://offerup.com/', source_type: 'manual', jurisdiction: 'National', trades: 'services, labor, materials', priority: 'Low', category: 'Homeowner Posting Sites' },
];

// ── Property management company directories ──
const PROPERTY_MGMT_SOURCES: DemandSource[] = [
  { name: 'NARPM Property Manager Search', url: 'https://www.narpm.org/find/property-managers/', source_type: 'aggregator', jurisdiction: 'National', trades: 'residential property managers', priority: 'High', category: 'Property Management' },
  { name: 'PropertyManagerDirectory.com', url: 'https://www.propertymanagerdirectory.com/', source_type: 'aggregator', jurisdiction: 'National', trades: 'commercial + residential property managers', priority: 'High', category: 'Property Management' },
  { name: 'AllPropertyManagement.com', url: 'https://www.allpropertymanagement.com/property-management/states/', source_type: 'aggregator', jurisdiction: 'National', trades: 'property management companies by state', priority: 'High', category: 'Property Management' },
  { name: 'Apartments.com PMC Directory', url: 'https://www.apartments.com/pmc/us/', source_type: 'aggregator', jurisdiction: 'National', trades: 'apartment property management companies', priority: 'High', category: 'Property Management' },
  { name: 'IREM Member Directory', url: 'https://www.irem.org/membership/find-a-member', source_type: 'aggregator', jurisdiction: 'National', trades: 'certified property managers (CPM)', priority: 'Medium', category: 'Property Management' },
];

// ── HOA directories ──
const HOA_SOURCES: DemandSource[] = [
  { name: 'HOPB HOA Directory', url: 'https://www.hopb.co/homeowners-association-hoa-directory', source_type: 'aggregator', jurisdiction: 'National', trades: 'HOAs by state', priority: 'High', category: 'HOA Directories' },
  { name: 'HOA-USA Directory', url: 'https://hoa-usa.com/directories/', source_type: 'aggregator', jurisdiction: 'National', trades: 'HOA management companies + vendors', priority: 'High', category: 'HOA Directories' },
  { name: 'HOAManagement.com Search', url: 'https://www.hoamanagement.com/hoa-resource-search/', source_type: 'aggregator', jurisdiction: 'National (city-level)', trades: 'association management companies', priority: 'High', category: 'HOA Directories' },
];

// ── Real estate investor platforms ──
const INVESTOR_SOURCES: DemandSource[] = [
  { name: 'BiggerPockets Forums', url: 'https://www.biggerpockets.com/forums', source_type: 'manual', jurisdiction: 'National', trades: 'real estate investors, fix-and-flip, contractors', priority: 'High', category: 'Real Estate Investors' },
  { name: 'BiggerPockets Marketplace', url: 'https://www.biggerpockets.com/marketplace', source_type: 'manual', jurisdiction: 'National', trades: 'contractor networking, investor deals', priority: 'Medium', category: 'Real Estate Investors' },
  { name: 'Zillow (Fixer-Upper)', url: 'https://www.zillow.com/', source_type: 'manual', jurisdiction: 'National', trades: 'fixer-upper listings, renovation demand', priority: 'Medium', category: 'Real Estate Investors' },
  { name: 'Realtor.com', url: 'https://www.realtor.com/', source_type: 'manual', jurisdiction: 'National', trades: 'as-is listings, renovation demand', priority: 'Low', category: 'Real Estate Investors' },
  { name: 'Redfin', url: 'https://www.redfin.com/', source_type: 'manual', jurisdiction: 'National', trades: 'listings, renovation demand', priority: 'Low', category: 'Real Estate Investors' },
];

// ── Insurance restoration networks (referral partners) ──
const RESTORATION_SOURCES: DemandSource[] = [
  { name: 'Servpro Franchise Locator', url: 'https://www.servpro.com/franchise-ownership', source_type: 'manual', jurisdiction: 'National', trades: 'water/fire restoration franchises (referral partners)', priority: 'High', category: 'Restoration Networks' },
  { name: 'ServiceMaster Restore Locator', url: 'https://franchise.servicemasterrestore.com/', source_type: 'manual', jurisdiction: 'National', trades: 'restoration franchises (referral partners)', priority: 'High', category: 'Restoration Networks' },
  { name: 'Contractor Connection (Insurance)', url: 'https://home.contractorconnection.com/', source_type: 'aggregator', jurisdiction: 'National', trades: 'insurance restoration contractor network', priority: 'Medium', category: 'Restoration Networks' },
  { name: 'Yelp Water Damage Restoration', url: 'https://www.yelp.com/search?find_desc=water+damage+restoration', source_type: 'aggregator', jurisdiction: 'National', trades: 'restoration companies (referral partners)', priority: 'Medium', category: 'Restoration Networks' },
  { name: 'RIA (Restoration Industry Association)', url: 'https://www.restorationindustry.org/', source_type: 'manual', jurisdiction: 'National', trades: 'restoration professionals member directory', priority: 'Medium', category: 'Restoration Networks' },
];

// ── Commercial real estate listings (tenant improvement / renovation demand) ──
const CRE_SOURCES: DemandSource[] = [
  { name: 'LoopNet', url: 'https://www.loopnet.com/', source_type: 'manual', jurisdiction: 'National', trades: 'commercial RE for lease/sale (TI/renovation demand)', priority: 'Medium', category: 'Commercial Real Estate' },
  { name: 'Crexi', url: 'https://www.crexi.com/', source_type: 'manual', jurisdiction: 'National', trades: 'commercial RE for lease/sale', priority: 'Medium', category: 'Commercial Real Estate' },
  { name: 'TotalCommercial', url: 'https://www.totalcommercial.com/', source_type: 'manual', jurisdiction: 'National', trades: 'commercial RE listings', priority: 'Low', category: 'Commercial Real Estate' },
  { name: 'CoStar', url: 'https://www.costar.com/', source_type: 'manual', jurisdiction: 'National', trades: 'commercial RE intelligence', priority: 'Low', category: 'Commercial Real Estate' },
];

// ── Contractor licensing boards (all 50 states — find licensed contractors) ──
const LICENSING_BOARD_SOURCES: DemandSource[] = [
  { name: 'Harbor Compliance 50-State Licensing Boards', url: 'https://www.harborcompliance.com/filing-authority/construction-licensing-boards', source_type: 'aggregator', jurisdiction: 'National (all 50 states)', trades: 'all licensed contractors', priority: 'High', category: 'Contractor Licensing Boards' },
  { name: 'CA CSLB License Search', url: 'https://www.cslb.ca.gov/onlineservices/checklicenseII/checklicense.aspx', source_type: 'government_portal', jurisdiction: 'California', trades: 'licensed contractors', priority: 'High', category: 'Contractor Licensing Boards' },
  { name: 'LA State Licensing Board Contractor Search', url: 'https://lslbc.gov/contractor-search/', source_type: 'government_portal', jurisdiction: 'Louisiana', trades: 'licensed contractors', priority: 'Medium', category: 'Contractor Licensing Boards' },
  { name: 'SC LLR Contractor Lookup', url: 'https://verify.llronline.com/LicLookup/Contractors/Contractor.aspx', source_type: 'government_portal', jurisdiction: 'South Carolina', trades: 'licensed contractors', priority: 'Medium', category: 'Contractor Licensing Boards' },
  { name: 'WA L&I Verify Contractor', url: 'https://www.lni.wa.gov/licensing-permits/contractors/hiring-a-contractor/verify-contractor-tradesperson-business', source_type: 'government_portal', jurisdiction: 'Washington', trades: 'licensed contractors, tradespersons', priority: 'Medium', category: 'Contractor Licensing Boards' },
  { name: 'FindADUPros License Lookup (50 states)', url: 'https://findadupros.com/contractor-license-lookup-tool/', source_type: 'aggregator', jurisdiction: 'National (all 50 states)', trades: 'licensed contractors', priority: 'High', category: 'Contractor Licensing Boards' },
  { name: 'U-Bidit 50-State License Verify', url: 'https://u-bidit.com/verify-contractors-licenses-in-all-50-states', source_type: 'aggregator', jurisdiction: 'National (all 50 states)', trades: 'licensed contractors', priority: 'Medium', category: 'Contractor Licensing Boards' },
];

// ── Home builder associations (member directories = GCs, remodelers, subcontractors) ──
const BUILDER_ASSOCIATION_SOURCES: DemandSource[] = [
  { name: 'NAHB Associations Directory (600+ HBAs)', url: 'https://www.nahb.org/nahb-community/nahb-directories/associations-directory', source_type: 'aggregator', jurisdiction: 'National (600+ state/local)', trades: 'home builders, remodelers, subcontractors', priority: 'High', category: 'Builder Associations' },
  { name: 'NAHB Professionals with Credentials', url: 'https://www.nahb.org/nahb-community/nahb-directories/professionals-with-home-building-credentials-directory', source_type: 'aggregator', jurisdiction: 'National', trades: 'credentialed home building professionals', priority: 'Medium', category: 'Builder Associations' },
  { name: 'ABC National Member Directory', url: 'https://www.abc.org/', source_type: 'manual', jurisdiction: 'National', trades: 'commercial construction contractors', priority: 'Medium', category: 'Builder Associations' },
  { name: 'AGC Member Directory', url: 'https://www.agc.org/', source_type: 'manual', jurisdiction: 'National', trades: 'general contractors, commercial construction', priority: 'Medium', category: 'Builder Associations' },
];

// ── Material supplier directories (they know who is buying) ──
const SUPPLIER_SOURCES: DemandSource[] = [
  { name: 'Contractor Supply Exchange', url: 'https://contractorsupplyexchange.com/', source_type: 'aggregator', jurisdiction: 'National', trades: 'construction materials marketplace', priority: 'Low', category: 'Material Suppliers' },
  { name: 'FCICA Commercial Flooring Resource Guide', url: 'https://members.fcica.com/commercialflooringresourceguide', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring contractors, distributors, manufacturers', priority: 'Medium', category: 'Material Suppliers' },
  { name: 'MMC Materials (Concrete Supplier)', url: 'https://www.mmcmaterials.com/', source_type: 'manual', jurisdiction: 'Southeast US', trades: 'concrete supplier (contractor accounts)', priority: 'Low', category: 'Material Suppliers' },
  { name: 'USA Builders Depot', url: 'https://usabuildersdepot.com/', source_type: 'manual', jurisdiction: 'National', trades: 'construction materials supplier', priority: 'Low', category: 'Material Suppliers' },
];

// ── Architect / interior designer directories ──
const DESIGN_SOURCES: DemandSource[] = [
  { name: 'ASID Design Finder', url: 'https://designfinder.asid.org/', source_type: 'aggregator', jurisdiction: 'National', trades: 'interior designers (project specifiers)', priority: 'Medium', category: 'Architects/Designers' },
  { name: 'AD PRO Directory', url: 'https://www.architecturaldigest.com/adpro/directory', source_type: 'aggregator', jurisdiction: 'National', trades: 'interior designers, architects', priority: 'Low', category: 'Architects/Designers' },
  { name: 'AIA Architect Finder', url: 'https://www.aia.org/', source_type: 'aggregator', jurisdiction: 'National', trades: 'architects (commercial + residential)', priority: 'Medium', category: 'Architects/Designers' },
];

// ── Facility management associations (commercial building managers) ──
const FACILITY_MGMT_SOURCES: DemandSource[] = [
  { name: 'IFMA (Facility Management Association)', url: 'https://www.ifma.org/', source_type: 'manual', jurisdiction: 'National', trades: 'facility managers (commercial buildings)', priority: 'High', category: 'Facility Management' },
  { name: 'BOMA (Building Owners & Managers)', url: 'https://boma.org/', source_type: 'manual', jurisdiction: 'National', trades: 'commercial building owners/managers', priority: 'High', category: 'Facility Management' },
  { name: 'FacilitiesNet', url: 'https://www.facilitiesnet.com/', source_type: 'manual', jurisdiction: 'National', trades: 'facility management professionals', priority: 'Medium', category: 'Facility Management' },
];

// ── Government housing / community development programs ──
const HOUSING_PROGRAM_SOURCES: DemandSource[] = [
  { name: 'HUD CDBG Program', url: 'https://www.hud.gov/hud-partners/community-cdbg', source_type: 'government_portal', jurisdiction: 'National', trades: 'community development block grants (renovation)', priority: 'Medium', category: 'Housing Programs' },
  { name: 'Florida SHIP Program', url: 'https://www.floridahousing.org/programs/special-programs/ship---state-housing-initiatives-partnership-program', source_type: 'government_portal', jurisdiction: 'Florida', trades: 'state housing initiatives (rehabilitation)', priority: 'Medium', category: 'Housing Programs' },
  { name: 'HUD Exchange (Funding Opportunities)', url: 'https://www.hudexchange.info/', source_type: 'government_portal', jurisdiction: 'National', trades: 'HUD funding programs, grants', priority: 'Low', category: 'Housing Programs' },
  { name: 'National Council of State Housing Agencies', url: 'https://www.ncsha.org/', source_type: 'aggregator', jurisdiction: 'National (all states)', trades: 'state housing finance agencies', priority: 'Medium', category: 'Housing Programs' },
];

// ── BBB directories (accredited contractors) ──
const BBB_SOURCES: DemandSource[] = [
  { name: 'BBB Flooring Contractors (National)', url: 'https://www.bbb.org/us/category/flooring-contractors', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring contractors (accredited)', priority: 'High', category: 'BBB Directories' },
  { name: 'BBB Concrete Contractors', url: 'https://www.bbb.org/near-me/concrete-contractors', source_type: 'aggregator', jurisdiction: 'National', trades: 'concrete contractors (accredited)', priority: 'High', category: 'BBB Directories' },
  { name: 'BBB Business Search', url: 'https://www.bbb.org/search', source_type: 'aggregator', jurisdiction: 'National', trades: 'all accredited businesses', priority: 'Medium', category: 'BBB Directories' },
];

// ── Review sites (contractor profiles = contact info) ──
const REVIEW_SOURCES: DemandSource[] = [
  { name: 'Yelp Flooring Search', url: 'https://www.yelp.com/search?find_desc=flooring', source_type: 'aggregator', jurisdiction: 'National', trades: 'flooring companies (contact info)', priority: 'High', category: 'Review Sites' },
  { name: 'Yelp Concrete Search', url: 'https://www.yelp.com/search?find_desc=concrete', source_type: 'aggregator', jurisdiction: 'National', trades: 'concrete companies (contact info)', priority: 'High', category: 'Review Sites' },
  { name: 'Google Business Flooring', url: 'https://www.google.com/search?q=flooring+contractor', source_type: 'manual', jurisdiction: 'National', trades: 'flooring contractors (Google Business)', priority: 'High', category: 'Review Sites' },
  { name: 'Google Maps Concrete Contractors', url: 'https://www.google.com/maps/search/concrete+contractor', source_type: 'manual', jurisdiction: 'National', trades: 'concrete contractors (maps)', priority: 'High', category: 'Review Sites' },
];

// ── Contractor/flooring forums (where people post looking for work or help) ──
const FORUM_SOURCES: DemandSource[] = [
  { name: 'Contractor Talk (Concrete/Epoxy)', url: 'https://www.contractortalk.com/forums/concrete.47/', source_type: 'manual', jurisdiction: 'National', trades: 'concrete, epoxy, contractor discussions', priority: 'Medium', category: 'Contractor Forums' },
  { name: 'Flooring Forum', url: 'https://www.flooringforum.com/', source_type: 'manual', jurisdiction: 'National', trades: 'flooring, concrete, polishing', priority: 'Low', category: 'Contractor Forums' },
  { name: 'Reddit r/HomeImprovement', url: 'https://www.reddit.com/r/HomeImprovement/new/', source_type: 'manual', jurisdiction: 'National', trades: 'homeowner questions, contractor hiring', priority: 'High', category: 'Contractor Forums' },
  { name: 'Reddit r/AskContractors', url: 'https://www.reddit.com/r/AskContractors/new/', source_type: 'manual', jurisdiction: 'National', trades: 'homeowner questions, contractor hiring', priority: 'High', category: 'Contractor Forums' },
  { name: 'Reddit r/Contractor', url: 'https://www.reddit.com/r/Contractor/new/', source_type: 'manual', jurisdiction: 'National', trades: 'contractor business, leads', priority: 'Medium', category: 'Contractor Forums' },
  { name: 'Reddit r/Flooring', url: 'https://www.reddit.com/r/Flooring/new/', source_type: 'manual', jurisdiction: 'National', trades: 'flooring, epoxy, concrete', priority: 'Medium', category: 'Contractor Forums' },
  { name: 'Reddit r/Concrete', url: 'https://www.reddit.com/r/Concrete/new/', source_type: 'manual', jurisdiction: 'National', trades: 'concrete, repair, resurfacing', priority: 'Medium', category: 'Contractor Forums' },
];

// Master export: all universal contact-discovery sources
export const UNIVERSAL_LEAD_SOURCES: DemandSource[] = [
  ...HOMEOWNER_POSTING_SOURCES,
  ...PROPERTY_MGMT_SOURCES,
  ...HOA_SOURCES,
  ...INVESTOR_SOURCES,
  ...RESTORATION_SOURCES,
  ...CRE_SOURCES,
  ...LICENSING_BOARD_SOURCES,
  ...BUILDER_ASSOCIATION_SOURCES,
  ...SUPPLIER_SOURCES,
  ...DESIGN_SOURCES,
  ...FACILITY_MGMT_SOURCES,
  ...HOUSING_PROGRAM_SOURCES,
  ...BBB_SOURCES,
  ...REVIEW_SOURCES,
  ...FORUM_SOURCES,
];

export const UNIVERSAL_LEAD_CATEGORIES = [
  'Homeowner Posting Sites', 'Property Management', 'HOA Directories',
  'Real Estate Investors', 'Restoration Networks', 'Commercial Real Estate',
  'Contractor Licensing Boards', 'Builder Associations', 'Material Suppliers',
  'Architects/Designers', 'Facility Management', 'Housing Programs',
  'BBB Directories', 'Review Sites', 'Contractor Forums',
];

// Lead-type classification: which sources yield direct homeowner demand signals
// (people posting "I need work done") vs. B2B referral/partner contacts
// (contractors, property managers, facility managers, etc.)
export const DIRECT_DEMAND_SOURCES = [
  'Homeowner Posting Sites', 'HOA Directories', 'Real Estate Investors',
  'Contractor Forums', 'Review Sites',
];

export const B2B_REFERRAL_SOURCES = [
  'Property Management', 'Restoration Networks', 'Commercial Real Estate',
  'Contractor Licensing Boards', 'Builder Associations', 'Material Suppliers',
  'Architects/Designers', 'Facility Management', 'Housing Programs',
  'BBB Directories',
];