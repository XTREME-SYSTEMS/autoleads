// Comprehensive Florida residential lead-source catalog for epoxy flooring,
// concrete coatings, polished concrete, and decorative concrete.
// Exhaustively covers: all 67 county permit portals + property appraisers,
// major city permit portals, every Florida Craigslist region, Facebook groups,
// Reddit subs, contractor/flooring forums, home-service marketplaces, and
// industry association directories.
//
// Sources marked source_type "manual" require the cloud browser engine (JS-heavy
// social/classifieds/forum pages). "government_portal" permit portals are mostly
// scrapable via cloud browser too. "api" sources are Socrata/open-data endpoints.

import { DemandSource } from './floridaDemandSources.ts';

// ── Florida county permit portals (all 67 counties) ──
// Platforms: Accela (aca-prod.accela.com), CitizenServe (citizenserve.com),
// CityView, EnerGov (Tyler), and custom county sites.
const COUNTY_PERMIT_SOURCES: DemandSource[] = [
  { name: 'Alachua County Permits (CitizenServe)', url: 'https://www4.citizenserve.com/Portal/PortalController?Action=showHomePage&ctzPagePrefix=Portal_&installationID=318', source_type: 'government_portal', jurisdiction: 'Alachua County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Baker County Building Dept', url: 'https://www.bakercountyfl.org/building-department', source_type: 'government_portal', jurisdiction: 'Baker County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Bay County Building Permits', url: 'https://www.baycountyfl.gov/departments/building-permits', source_type: 'government_portal', jurisdiction: 'Bay County, FL', trades: 'building permits', priority: 'Medium', category: 'County Permits' },
  { name: 'Bradford County Building Dept', url: 'https://www.bradfordcountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Bradford County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Brevard County Permit Search', url: 'https://www.brevardfl.gov/PlanningAndDevelopment/BuildingPermits/PermitSearch', source_type: 'government_portal', jurisdiction: 'Brevard County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Broward County ePermits', url: 'https://www.broward.org/Permitting/Pages/Default.aspx', source_type: 'government_portal', jurisdiction: 'Broward County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Calhoun County Building Dept', url: 'https://www.calhounclerk.com/building-department', source_type: 'government_portal', jurisdiction: 'Calhoun County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Charlotte County Accela', url: 'https://aca-prod.accela.com/BOCC', source_type: 'government_portal', jurisdiction: 'Charlotte County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Citrus County Accela', url: 'https://aca-prod.accela.com/CITRUS/Default.aspx', source_type: 'government_portal', jurisdiction: 'Citrus County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Clay County Building Permits', url: 'https://www.claycountygov.com/departments/building-department', source_type: 'government_portal', jurisdiction: 'Clay County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Collier County Permit Portal', url: 'https://www.collier.gov/Business-Resources/Building-Permits-Construction/Permit-Portal', source_type: 'government_portal', jurisdiction: 'Collier County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Columbia County Building Dept', url: 'https://www.columbiacountyfla.com/building-department', source_type: 'government_portal', jurisdiction: 'Columbia County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'DeSoto County Building Permits', url: 'https://www.desotobocc.com/building-permits', source_type: 'government_portal', jurisdiction: 'DeSoto County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Dixie County Building Dept', url: 'https://www.dixiecountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Dixie County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Duval County / Jacksonville Permits', url: 'https://www.coj.net/departments/building-inspection', source_type: 'government_portal', jurisdiction: 'Duval County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Escambia County Building Permits', url: 'https://www.myescambia.com/our-services/building-permits', source_type: 'government_portal', jurisdiction: 'Escambia County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Flagler County Building Dept', url: 'https://www.flaglercounty.org/building-department', source_type: 'government_portal', jurisdiction: 'Flagler County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Franklin County Building Dept', url: 'https://www.franklincountyclerk.com/building-department', source_type: 'government_portal', jurisdiction: 'Franklin County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Gadsden County Building Dept', url: 'https://www.gadsdencountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Gadsden County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Gilchrist County Building Dept', url: 'https://www.gilchristcountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Gilchrist County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Glades County Building Dept', url: 'https://www.mygladescounty.com/building-department', source_type: 'government_portal', jurisdiction: 'Glades County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Gulf County Building Dept', url: 'https://www.gulfcountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Gulf County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Hamilton County Building Dept', url: 'https://www.hamiltoncountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Hamilton County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Hardee County Building Dept', url: 'https://www.hardeecountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Hardee County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Hendry County Building Dept', url: 'https://www.hendryfla.gov/building-department', source_type: 'government_portal', jurisdiction: 'Hendry County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Hernando County Building Division', url: 'https://pvweb.hernandopa-fl.us/', source_type: 'government_portal', jurisdiction: 'Hernando County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Highlands County Building Permits', url: 'https://www.hcbcc.org/building-permits', source_type: 'government_portal', jurisdiction: 'Highlands County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Hillsborough County Building Permits', url: 'https://hcfl.gov/businesses/development-services-records/building-permitting-records-searches', source_type: 'government_portal', jurisdiction: 'Hillsborough County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Holmes County Building Dept', url: 'https://www.holmescountyflorida.com/building-department', source_type: 'government_portal', jurisdiction: 'Holmes County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Indian River County Building Permits', url: 'https://www.ircgov.com/building-permits', source_type: 'government_portal', jurisdiction: 'Indian River County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Jackson County Building Dept', url: 'https://www.jacksoncountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Jackson County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Jefferson County Building Dept', url: 'https://www.jeffersoncountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Jefferson County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Lafayette County Building Dept', url: 'https://www.lafayettecountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Lafayette County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Lake County Building Permits', url: 'https://www.lakecountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Lake County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Lee County Accela', url: 'https://aca-prod.accela.com/LEECO/Default.aspx', source_type: 'government_portal', jurisdiction: 'Lee County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Leon County Building Permits', url: 'https://www.leoncountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Leon County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Levy County Building Dept', url: 'https://www.levycountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Levy County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Liberty County Building Dept', url: 'https://www.libertycountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Liberty County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Madison County Building Dept', url: 'https://www.madisoncountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Madison County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Manatee County Building Permits', url: 'https://www.mymanatee.org/building-permits', source_type: 'government_portal', jurisdiction: 'Manatee County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Marion County Building Permits', url: 'https://www.marioncountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Marion County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Martin County Building Permits', url: 'https://www.martincountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Martin County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Miami-Dade County Permits', url: 'https://www.miamidade.gov/permits/', source_type: 'government_portal', jurisdiction: 'Miami-Dade County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Monroe County Building Permits', url: 'https://www.monroecounty-fl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Monroe County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Nassau County Building Permits', url: 'https://www.nassaucountyfl.com/building-permits', source_type: 'government_portal', jurisdiction: 'Nassau County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Okaloosa County Building Permits', url: 'https://www.okaloosacountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Okaloosa County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Okeechobee County Building Dept', url: 'https://www.okeechobee countyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Okeechobee County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Orange County Permits & Licenses', url: 'https://www.orangecountyfl.net/permitslicenses.aspx', source_type: 'government_portal', jurisdiction: 'Orange County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Osceola County Building Permits', url: 'https://www.osceola.org/building-permits', source_type: 'government_portal', jurisdiction: 'Osceola County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Palm Beach County ePermits', url: 'https://www.pbcgov.com/pzb/permitting/', source_type: 'government_portal', jurisdiction: 'Palm Beach County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Pasco County Building Permits', url: 'https://www.pascocountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Pasco County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Pinellas County Building Permits', url: 'https://www.pinellascounty.org/building-permits', source_type: 'government_portal', jurisdiction: 'Pinellas County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Polk County Building Permits', url: 'https://www.polkcountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Polk County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Putnam County Building Dept', url: 'https://www.putnamcountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Putnam County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Santa Rosa County Building Permits', url: 'https://www.santarosa.fl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Santa Rosa County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Sarasota County Permit Search', url: 'https://building.scgov.net/', source_type: 'government_portal', jurisdiction: 'Sarasota County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Seminole County CitizenServe', url: 'https://www4.citizenserve.com/Portal/PortalController?Action=showHomePage&ctzPagePrefix=Portal_&installationID=441', source_type: 'government_portal', jurisdiction: 'Seminole County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'St. Johns County Building Permits', url: 'https://www.sjcfl.us/building-permits', source_type: 'government_portal', jurisdiction: 'St. Johns County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'St. Lucie County Building Permits', url: 'https://www.stlucieco.gov/building-permits', source_type: 'government_portal', jurisdiction: 'St. Lucie County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Sumter County Building Permits', url: 'https://www.sumtercountyfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Sumter County, FL', trades: 'building permits, residential', priority: 'Medium', category: 'County Permits' },
  { name: 'Suwannee County Building Dept', url: 'https://www.suwanneecountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Suwannee County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Taylor County Building Dept', url: 'https://www.taylorcountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Taylor County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Union County Building Dept', url: 'https://www.unioncountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Union County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Volusia County Building Permits', url: 'https://www.volusia.org/building-permits', source_type: 'government_portal', jurisdiction: 'Volusia County, FL', trades: 'building permits, residential', priority: 'High', category: 'County Permits' },
  { name: 'Wakulla County Building Dept', url: 'https://www.wakullacountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Wakulla County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Walton County Building Dept', url: 'https://www.waltoncountyfl.org/building-department', source_type: 'government_portal', jurisdiction: 'Walton County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
  { name: 'Washington County Building Dept', url: 'https://www.washingtoncountyfl.gov/building-department', source_type: 'government_portal', jurisdiction: 'Washington County, FL', trades: 'building permits', priority: 'Low', category: 'County Permits' },
];

// ── Florida county property appraisers (all 67 via FL DOR master index + major direct) ──
const PROPERTY_APPRAISER_SOURCES: DemandSource[] = [
  { name: 'FL DOR Property Appraiser Index (all 67 counties)', url: 'https://floridarevenue.com/property/Pages/LocalOfficials.aspx', source_type: 'government_portal', jurisdiction: 'Florida (all counties)', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Miami-Dade Property Appraiser', url: 'https://www.miamidadepa.gov/pa/real-estate/property-search.page', source_type: 'government_portal', jurisdiction: 'Miami-Dade County, FL', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Broward County Property Appraiser', url: 'https://bcpa.net/', source_type: 'government_portal', jurisdiction: 'Broward County, FL', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Hillsborough County Property Appraiser', url: 'https://www.hcpafl.org/', source_type: 'government_portal', jurisdiction: 'Hillsborough County, FL', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Palm Beach County Property Appraiser', url: 'https://www.pbcgov.com/papa/', source_type: 'government_portal', jurisdiction: 'Palm Beach County, FL', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Orange County Property Appraiser', url: 'https://www.ocpafl.org/', source_type: 'government_portal', jurisdiction: 'Orange County, FL', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Pinellas County Property Appraiser', url: 'https://www.pcpao.org/', source_type: 'government_portal', jurisdiction: 'Pinellas County, FL', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Lee County Property Appraiser', url: 'https://www.leepa.org/', source_type: 'government_portal', jurisdiction: 'Lee County, FL', trades: 'property records, owner lookup', priority: 'High', category: 'Property Appraisers' },
  { name: 'Polk County Property Appraiser', url: 'https://www.polkpa.org/', source_type: 'government_portal', jurisdiction: 'Polk County, FL', trades: 'property records, owner lookup', priority: 'Medium', category: 'Property Appraisers' },
  { name: 'Pasco County Property Appraiser', url: 'https://www.pascopropertyappraiser.com/', source_type: 'government_portal', jurisdiction: 'Pasco County, FL', trades: 'property records, owner lookup', priority: 'Medium', category: 'Property Appraisers' },
];

// ── Florida city permit portals (major + mid-size cities) ──
const CITY_PERMIT_SOURCES: DemandSource[] = [
  { name: 'City of Miami Permit Search', url: 'https://www.miami.gov/Permits-Construction/Permitting-Resources/View-Permit-HistoryPermit-Search', source_type: 'government_portal', jurisdiction: 'Miami, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Miami Beach Permits', url: 'https://www.miamibeachfl.gov/government/building-department/permits/', source_type: 'government_portal', jurisdiction: 'Miami Beach, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Tampa Accela', url: 'https://aca-prod.accela.com/tampa/Default.aspx', source_type: 'government_portal', jurisdiction: 'Tampa, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Orlando Permits', url: 'https://www.orlando.gov/Permits', source_type: 'government_portal', jurisdiction: 'Orlando, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Jacksonville Building Inspection', url: 'https://www.coj.net/departments/building-inspection', source_type: 'government_portal', jurisdiction: 'Jacksonville, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of St. Petersburg Permits', url: 'https://www.stpete.org/building/permits.php', source_type: 'government_portal', jurisdiction: 'St. Petersburg, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Fort Lauderdale Permits', url: 'https://www.fortlauderdale.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Fort Lauderdale, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Hialeah Permits', url: 'https://www.hialeahfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Hialeah, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Tallahassee Permits', url: 'https://www.talgov.com/epermits', source_type: 'government_portal', jurisdiction: 'Tallahassee, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Cape Coral Permits', url: 'https://www.capecoral.net/department/community_development/building.php', source_type: 'government_portal', jurisdiction: 'Cape Coral, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Port St. Lucie Permits', url: 'https://www.cityofpsl.com/building-permits', source_type: 'government_portal', jurisdiction: 'Port St. Lucie, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Pembroke Pines Permits', url: 'https://www.ppines.com/building-permits', source_type: 'government_portal', jurisdiction: 'Pembroke Pines, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Sarasota Permits', url: 'https://ftgportal.sarasotafl.gov/Permits/Search.aspx?microapp=c', source_type: 'government_portal', jurisdiction: 'Sarasota, FL', trades: 'building permits, residential', priority: 'High', category: 'City Permits' },
  { name: 'City of Lakeland Permits', url: 'https://www.lakelandgov.net/building-permits', source_type: 'government_portal', jurisdiction: 'Lakeland, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Clearwater Permits', url: 'https://www.clearwater-fl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Clearwater, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Gainesville Permits', url: 'https://www.cityofgainesville.org/building-permits', source_type: 'government_portal', jurisdiction: 'Gainesville, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Pensacola Permits', url: 'https://www.ci.pensacola.fl.us/building-permits', source_type: 'government_portal', jurisdiction: 'Pensacola, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Coral Springs Permits', url: 'https://www.coralsprings.org/building-permits', source_type: 'government_portal', jurisdiction: 'Coral Springs, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of West Palm Beach Permits', url: 'https://www.wpb.org/building-permits', source_type: 'government_portal', jurisdiction: 'West Palm Beach, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Palm Coast Permits', url: 'https://www.palmcoastgov.com/building-permits', source_type: 'government_portal', jurisdiction: 'Palm Coast, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Palm Bay Permits', url: 'https://www.palmbayflorida.org/building-permits', source_type: 'government_portal', jurisdiction: 'Palm Bay, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Naples Permits', url: 'https://www.naplesgov.com/building-permits', source_type: 'government_portal', jurisdiction: 'Naples, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Daytona Beach Permits', url: 'https://www.codb.us/building-permits', source_type: 'government_portal', jurisdiction: 'Daytona Beach, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Ocala Permits', url: 'https://www.ocalafl.org/building-permits', source_type: 'government_portal', jurisdiction: 'Ocala, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Boca Raton Permits', url: 'https://www.ci.boca-raton.fl.us/building-permits', source_type: 'government_portal', jurisdiction: 'Boca Raton, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Deltona Permits', url: 'https://www.ci.deltona.fl.us/building-permits', source_type: 'government_portal', jurisdiction: 'Deltona, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Plantation Permits', url: 'https://www.plantation.org/building-permits', source_type: 'government_portal', jurisdiction: 'Plantation, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Sunrise Permits', url: 'https://www.sunrisefl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Sunrise, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Hollywood Permits', url: 'https://www.hollywoodfl.org/building-permits', source_type: 'government_portal', jurisdiction: 'Hollywood, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Miramar Permits', url: 'https://www.miramarfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Miramar, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Pompano Beach Permits', url: 'https://pompanobeachfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Pompano Beach, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Coral Gables Permits', url: 'https://www.citybeautiful.net/building-permits', source_type: 'government_portal', jurisdiction: 'Coral Gables, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Davie Permits', url: 'https://www.davie-fl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Davie, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Wellington Permits', url: 'https://www.wellingtonfl.gov/building-permits', source_type: 'government_portal', jurisdiction: 'Wellington, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of North Port Permits', url: 'https://www.cityofnorthport.com/building-permits', source_type: 'government_portal', jurisdiction: 'North Port, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of Jupiter Permits', url: 'https://www.jupiter.fl.us/building-permits', source_type: 'government_portal', jurisdiction: 'Jupiter, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Kissimmee Permits', url: 'https://www.kissimmee.org/building-permits', source_type: 'government_portal', jurisdiction: 'Kissimmee, FL', trades: 'building permits, residential', priority: 'Medium', category: 'City Permits' },
  { name: 'City of St. Augustine Permits', url: 'https://www.ci.st-augustine.fl.us/building-permits', source_type: 'government_portal', jurisdiction: 'St. Augustine, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Fernandina Beach Permits (CityView)', url: 'https://www.fbfl.us/79/Permits', source_type: 'government_portal', jurisdiction: 'Fernandina Beach, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
  { name: 'City of Seminole Permits (CitizenServe)', url: 'https://www4.citizenserve.com/Portal/PortalController?Action=showHomePage&ctzPagePrefix=Portal_&installationID=441', source_type: 'government_portal', jurisdiction: 'Seminole, FL', trades: 'building permits, residential', priority: 'Low', category: 'City Permits' },
];

// ── Florida Socrata / open-data permit datasets ──
const OPEN_DATA_SOURCES: DemandSource[] = [
  { name: 'City of Miami Open Data - Building Permits', url: 'https://www.miami.gov/Maps-Data/Data-Explorer', source_type: 'api', jurisdiction: 'Miami, FL', trades: 'building permits (open data)', priority: 'High', category: 'Open Data' },
  { name: 'Miami-Dade County Open Data Hub (ArcGIS)', url: 'https://gis-mdc.opendata.arcgis.com/', source_type: 'api', jurisdiction: 'Miami-Dade County, FL', trades: 'building permits, GIS parcels', priority: 'High', category: 'Open Data' },
  { name: 'Florida Geospatial Open Data Portal', url: 'https://geodata.floridagio.gov/', source_type: 'api', jurisdiction: 'Florida (statewide)', trades: 'statewide parcels, GIS layers', priority: 'High', category: 'Open Data' },
  { name: 'Florida Open Permit Search Directory', url: 'https://1contractorsolutions.com/tools/open-permit-search/', source_type: 'aggregator', jurisdiction: 'Florida (all counties)', trades: 'open/expired permits lookup', priority: 'Medium', category: 'Open Data' },
  { name: 'Permit Hunt Florida Directory', url: 'https://permithunt.com/directory/state/florida', source_type: 'aggregator', jurisdiction: 'Florida (all counties)', trades: 'building department directory', priority: 'Medium', category: 'Open Data' },
];

// ── Florida Craigslist regions (all FL subdomains) ──
const CRAIGSLIST_SOURCES: DemandSource[] = [
  { name: 'Craigslist Miami', url: 'https://miami.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Miami, FL', trades: 'services, labor, epoxy, concrete', priority: 'High', category: 'Craigslist' },
  { name: 'Craigslist Fort Lauderdale', url: 'https://fortlauderdale.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Fort Lauderdale, FL', trades: 'services, labor, epoxy, concrete', priority: 'High', category: 'Craigslist' },
  { name: 'Craigslist Tampa Bay', url: 'https://tampa.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Tampa Bay, FL', trades: 'services, labor, epoxy, concrete', priority: 'High', category: 'Craigslist' },
  { name: 'Craigslist Orlando', url: 'https://orlando.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Orlando, FL', trades: 'services, labor, epoxy, concrete', priority: 'High', category: 'Craigslist' },
  { name: 'Craigslist Jacksonville', url: 'https://jacksonville.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Jacksonville, FL', trades: 'services, labor, epoxy, concrete', priority: 'High', category: 'Craigslist' },
  { name: 'Craigslist Sarasota-Bradenton', url: 'https://sarasota.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Sarasota-Bradenton, FL', trades: 'services, labor, epoxy, concrete', priority: 'Medium', category: 'Craigslist' },
  { name: 'Craigslist Space Coast', url: 'https://spacecoast.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Space Coast, FL', trades: 'services, labor, epoxy, concrete', priority: 'Medium', category: 'Craigslist' },
  { name: 'Craigslist Treasure Coast', url: 'https://treasure.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Treasure Coast, FL', trades: 'services, labor, epoxy, concrete', priority: 'Medium', category: 'Craigslist' },
  { name: 'Craigslist Gainesville', url: 'https://gainesville.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Gainesville, FL', trades: 'services, labor, epoxy, concrete', priority: 'Medium', category: 'Craigslist' },
  { name: 'Craigslist Tallahassee', url: 'https://tallahassee.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Tallahassee, FL', trades: 'services, labor, epoxy, concrete', priority: 'Medium', category: 'Craigslist' },
  { name: 'Craigslist Daytona Beach', url: 'https://daytona.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Daytona Beach, FL', trades: 'services, labor, epoxy, concrete', priority: 'Low', category: 'Craigslist' },
  { name: 'Craigslist Fort Myers', url: 'https://fortmyers.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Fort Myers, FL', trades: 'services, labor, epoxy, concrete', priority: 'Medium', category: 'Craigslist' },
  { name: 'Craigslist Keys', url: 'https://keys.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Florida Keys, FL', trades: 'services, labor, epoxy, concrete', priority: 'Low', category: 'Craigslist' },
  { name: 'Craigslist Lakeland', url: 'https://lakeland.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Lakeland, FL', trades: 'services, labor, epoxy, concrete', priority: 'Low', category: 'Craigslist' },
  { name: 'Craigslist Ocala', url: 'https://ocala.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Ocala, FL', trades: 'services, labor, epoxy, concrete', priority: 'Low', category: 'Craigslist' },
  { name: 'Craigslist Pensacola', url: 'https://pensacola.craigslist.org/search/?query=epoxy+concrete&sort=date', source_type: 'manual', jurisdiction: 'Pensacola, FL', trades: 'services, labor, epoxy, concrete', priority: 'Low', category: 'Craigslist' },
  { name: 'Craigslist Panama City', url: 'https://panamacity.craigslist.org/search/?query=epoxy+flooring&sort=date', source_type: 'manual', jurisdiction: 'Panama City, FL', trades: 'services, labor, epoxy, concrete', priority: 'Low', category: 'Craigslist' },
  { name: 'Craigslist Tallahassee Services', url: 'https://tallahassee.craigslist.org/search/svc?query=concrete+coating&sort=date', source_type: 'manual', jurisdiction: 'Tallahassee, FL', trades: 'services, concrete coating', priority: 'Low', category: 'Craigslist' },
];

// ── Facebook groups (epoxy/concrete/flooring + Florida contractor/homeowner) ──
const FACEBOOK_GROUP_SOURCES: DemandSource[] = [
  { name: 'FB: Concrete Polishing, Epoxy, Finishes, Repairs', url: 'https://www.facebook.com/groups/215471742333144/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete polishing, epoxy, finishes', priority: 'High', category: 'Facebook Groups' },
  { name: 'FB: Epoxy and Polished Concrete Professionals', url: 'https://www.facebook.com/groups/majesticrestoration/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'epoxy flooring, polished concrete', priority: 'High', category: 'Facebook Groups' },
  { name: 'FB: Tampa Bay Contractors', url: 'https://www.facebook.com/groups/4804599829567743/', source_type: 'manual', jurisdiction: 'Tampa Bay, FL', trades: 'general contractors, flooring, concrete', priority: 'High', category: 'Facebook Groups' },
  { name: 'FB: Florida Contractors - Licensed & Insured', url: 'https://www.facebook.com/groups/285954536479249/', source_type: 'manual', jurisdiction: 'Florida', trades: 'licensed contractors, concrete, flooring', priority: 'High', category: 'Facebook Groups' },
  { name: 'FB: Contractors of Fort Myers FL', url: 'https://www.facebook.com/groups/403870404289708/', source_type: 'manual', jurisdiction: 'Fort Myers, FL', trades: 'general contractors, remodeling', priority: 'Medium', category: 'Facebook Groups' },
  { name: 'FB: Contractors & Remodelings Ideas SW Florida', url: 'https://www.facebook.com/groups/450962039272874/', source_type: 'manual', jurisdiction: 'Southwest Florida', trades: 'remodeling, flooring, concrete', priority: 'Medium', category: 'Facebook Groups' },
  { name: 'FB: Homeowners looking for Contractors and Remodelers', url: 'https://www.facebook.com/groups/294353806230829/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'homeowner contractor requests, remodeling', priority: 'High', category: 'Facebook Groups' },
  { name: 'FB: The Villages FL Community Information', url: 'https://www.facebook.com/groups/thevillagesfloridacommunityinformation/', source_type: 'manual', jurisdiction: 'The Villages, FL', trades: 'home renovations, contractor recs', priority: 'Medium', category: 'Facebook Groups' },
  { name: 'FB: Panama City Beach Contractors', url: 'https://www.facebook.com/groups/2167285210059952/', source_type: 'manual', jurisdiction: 'Panama City Beach, FL', trades: 'flooring, tile, remodeling', priority: 'Low', category: 'Facebook Groups' },
  { name: 'FB: Central Florida Flooring Recommendations', url: 'https://www.facebook.com/groups/426863724115008/', source_type: 'manual', jurisdiction: 'Central Florida', trades: 'flooring, concrete, remodeling', priority: 'Medium', category: 'Facebook Groups' },
  { name: 'FB: Epoxy and Polish (leads group)', url: 'https://www.facebook.com/groups/bluecollarmillionaire/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'epoxy, polished concrete leads', priority: 'Medium', category: 'Facebook Groups' },
  { name: 'FB: Advanced Metallic Floors', url: 'https://www.facebook.com/groups/advancedmetallicfloors/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'metallic epoxy, decorative concrete', priority: 'Medium', category: 'Facebook Groups' },
  { name: 'Facebook Marketplace (Florida)', url: 'https://www.facebook.com/marketplace/', source_type: 'manual', jurisdiction: 'Florida', trades: 'services, materials, labor', priority: 'Medium', category: 'Facebook Groups' },
];

// ── Reddit (Florida city subs + trade subs) ──
const REDDIT_SOURCES: DemandSource[] = [
  { name: 'Reddit r/Flooring', url: 'https://www.reddit.com/r/Flooring/new/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'flooring, epoxy, concrete', priority: 'High', category: 'Reddit' },
  { name: 'Reddit r/Concrete', url: 'https://www.reddit.com/r/Concrete/new/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete, repair, resurfacing, polishing', priority: 'High', category: 'Reddit' },
  { name: 'Reddit r/Contractor', url: 'https://www.reddit.com/r/Contractor/new/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'contractor business, leads', priority: 'Medium', category: 'Reddit' },
  { name: 'Reddit r/AskContractors', url: 'https://www.reddit.com/r/AskContractors/new/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'homeowner questions, contractor hiring', priority: 'High', category: 'Reddit' },
  { name: 'Reddit r/HomeImprovement', url: 'https://www.reddit.com/r/HomeImprovement/new/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'home improvement, flooring, concrete', priority: 'High', category: 'Reddit' },
  { name: 'Reddit r/Miami', url: 'https://www.reddit.com/r/Miami/new/', source_type: 'manual', jurisdiction: 'Miami, FL', trades: 'home improvement, contractor recs', priority: 'High', category: 'Reddit' },
  { name: 'Reddit r/orlando', url: 'https://www.reddit.com/r/orlando/new/', source_type: 'manual', jurisdiction: 'Orlando, FL', trades: 'home improvement, contractor recs', priority: 'High', category: 'Reddit' },
  { name: 'Reddit r/tampa', url: 'https://www.reddit.com/r/tampa/new/', source_type: 'manual', jurisdiction: 'Tampa, FL', trades: 'home improvement, contractor recs', priority: 'High', category: 'Reddit' },
  { name: 'Reddit r/jacksonville', url: 'https://www.reddit.com/r/jacksonville/new/', source_type: 'manual', jurisdiction: 'Jacksonville, FL', trades: 'home improvement, contractor recs', priority: 'Medium', category: 'Reddit' },
  { name: 'Reddit r/florida', url: 'https://www.reddit.com/r/florida/new/', source_type: 'manual', jurisdiction: 'Florida', trades: 'home improvement, contractor recs', priority: 'Medium', category: 'Reddit' },
  { name: 'Reddit r/Sarasota', url: 'https://www.reddit.com/r/Sarasota/new/', source_type: 'manual', jurisdiction: 'Sarasota, FL', trades: 'home improvement, contractor recs', priority: 'Medium', category: 'Reddit' },
  { name: 'Reddit r/fortlauderdale', url: 'https://www.reddit.com/r/fortlauderdale/new/', source_type: 'manual', jurisdiction: 'Fort Lauderdale, FL', trades: 'home improvement, contractor recs', priority: 'Medium', category: 'Reddit' },
  { name: 'Reddit r/Pensacola', url: 'https://www.reddit.com/r/Pensacola/new/', source_type: 'manual', jurisdiction: 'Pensacola, FL', trades: 'home improvement, contractor recs', priority: 'Low', category: 'Reddit' },
  { name: 'Reddit r/Tallahassee', url: 'https://www.reddit.com/r/Tallahassee/new/', source_type: 'manual', jurisdiction: 'Tallahassee, FL', trades: 'home improvement, contractor recs', priority: 'Low', category: 'Reddit' },
];

// ── Contractor / flooring forums ──
const FORUM_SOURCES: DemandSource[] = [
  { name: 'Contractor Talk (Concrete/Epoxy)', url: 'https://www.contractortalk.com/forums/concrete.47/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete, epoxy, contractor discussions', priority: 'High', category: 'Forums' },
  { name: 'Flooring Forum (Concrete Flooring)', url: 'https://www.flooringforum.com/forums/concrete-flooring.15/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete flooring, polishing, crack repair', priority: 'Medium', category: 'Forums' },
  { name: 'DoItYourself Concrete Forum', url: 'https://www.doityourself.com/forum/bricks-masonry-cinder-block-paving-walking-stones-asphalt-concrete/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete, polishing, DIY questions', priority: 'Low', category: 'Forums' },
  { name: 'ChiefTalk (Polished Concrete)', url: 'https://chieftalk.chiefarchitect.com/forum/14-general-q-a/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'polished concrete, design', priority: 'Low', category: 'Forums' },
  { name: 'For Construction Pros (Concrete)', url: 'https://www.forconstructionpros.com/concrete/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete, polishing, bidding', priority: 'Medium', category: 'Forums' },
];

// ── Home-service marketplaces (Florida-scoped queries) ──
const MARKETPLACE_SOURCES: DemandSource[] = [
  { name: 'Angi (Flooring/Concrete - FL)', url: 'https://www.angi.com/category/flooring', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'flooring, epoxy, concrete, coatings', priority: 'High', category: 'Marketplaces' },
  { name: 'Thumbtack (Flooring - FL)', url: 'https://www.thumbtack.com/k/flooring-services/near-me/', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'flooring, epoxy, concrete, coatings', priority: 'High', category: 'Marketplaces' },
  { name: 'Houzz (Flooring Contractors - FL)', url: 'https://www.houzz.com/professionals/flooring-contractors', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'remodeling, flooring, decorative concrete', priority: 'High', category: 'Marketplaces' },
  { name: 'HomeAdvisor (Flooring - FL)', url: 'https://www.homeadvisor.com/category.Flooring.html', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'flooring, concrete, coatings', priority: 'Medium', category: 'Marketplaces' },
  { name: 'Bark (Flooring - FL)', url: 'https://www.bark.com/en/us/category/flooring/', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'flooring, concrete, coatings', priority: 'Low', category: 'Marketplaces' },
  { name: 'Nextdoor (Florida neighborhoods)', url: 'https://nextdoor.com/find-neighborhood/fl/', source_type: 'manual', jurisdiction: 'Florida neighborhoods', trades: 'contractor recs, home services', priority: 'High', category: 'Marketplaces' },
  { name: 'Yelp (Flooring - FL)', url: 'https://www.yelp.com/search?find_desc=flooring&find_loc=Florida', source_type: 'aggregator', jurisdiction: 'Florida', trades: 'flooring, epoxy, concrete', priority: 'Medium', category: 'Marketplaces' },
];

// ── Industry associations (member directories = referral + competitor graph) ──
const ASSOCIATION_SOURCES: DemandSource[] = [
  { name: 'ASCC Member Map', url: 'https://ascconline.org/membership/member-map', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete contractors', priority: 'Medium', category: 'Associations' },
  { name: 'FICAP Member Directory', url: 'https://members.ficap.org/directory', source_type: 'manual', jurisdiction: 'Florida', trades: 'concrete, associated products', priority: 'High', category: 'Associations' },
  { name: 'FCICA Commercial Flooring Resource Guide', url: 'https://members.fcica.com/commercialflooringresourceguide/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'commercial flooring, concrete systems', priority: 'Medium', category: 'Associations' },
  { name: 'CFA Member Directory', url: 'https://www.cfaconcretepros.org/find-a-member/', source_type: 'manual', jurisdiction: 'National (FL focus)', trades: 'concrete foundations, contractors', priority: 'Low', category: 'Associations' },
  { name: 'Florida Home Builders Association', url: 'https://fhba.com/', source_type: 'manual', jurisdiction: 'Florida', trades: 'home building, remodeling, flooring', priority: 'High', category: 'Associations' },
  { name: 'MyFloridaLicense Construction Industry', url: 'https://www2.myfloridalicense.com/construction-industry/', source_type: 'manual', jurisdiction: 'Florida', trades: 'licensed contractors, concrete, flooring', priority: 'High', category: 'Associations' },
  { name: 'Suncoast Builders Association Directory', url: 'https://business.suncoastba.org/list', source_type: 'manual', jurisdiction: 'Suncoast, FL', trades: 'builders, GC, flooring, concrete', priority: 'Medium', category: 'Associations' },
  { name: 'Tampa Bay Builders Association', url: 'https://members.tbba.net/list', source_type: 'manual', jurisdiction: 'Tampa Bay, FL', trades: 'builders, GC, subcontractors', priority: 'Medium', category: 'Associations' },
  { name: 'Builders Association of South Florida', url: 'https://business.basfonline.org/list', source_type: 'manual', jurisdiction: 'South Florida', trades: 'builders, GC, subcontractors', priority: 'Medium', category: 'Associations' },
];

// ── Real estate listings (value-add / fixer-upper / as-is = renovation demand) ──
const REAL_ESTATE_SOURCES: DemandSource[] = [
  { name: 'Zillow (Florida - fixer upper)', url: 'https://www.zillow.com/fl/?searchQueryState=%7B%22filterState%22%3A%7B%22isFixerUpper%22%3A%7B%7D%7D%7D', source_type: 'manual', jurisdiction: 'Florida', trades: 'fixer-upper, renovation demand', priority: 'Medium', category: 'Real Estate' },
  { name: 'Realtor.com (Florida - as-is)', url: 'https://www.realtor.com/realestateandhomes-search/Florida', source_type: 'manual', jurisdiction: 'Florida', trades: 'as-is listings, renovation demand', priority: 'Low', category: 'Real Estate' },
  { name: 'Redfin (Florida listings)', url: 'https://www.redfin.com/state/FL', source_type: 'manual', jurisdiction: 'Florida', trades: 'listings, renovation demand', priority: 'Low', category: 'Real Estate' },
  { name: 'BiggerPockets (FL markets)', url: 'https://www.biggerpockets.com/', source_type: 'manual', jurisdiction: 'Florida', trades: 'investor renovations, flips', priority: 'Medium', category: 'Real Estate' },
];

// Master export: all Florida residential sources
export const FLORIDA_RESIDENTIAL_SOURCES: DemandSource[] = [
  ...COUNTY_PERMIT_SOURCES,
  ...PROPERTY_APPRAISER_SOURCES,
  ...CITY_PERMIT_SOURCES,
  ...OPEN_DATA_SOURCES,
  ...CRAIGSLIST_SOURCES,
  ...FACEBOOK_GROUP_SOURCES,
  ...REDDIT_SOURCES,
  ...FORUM_SOURCES,
  ...MARKETPLACE_SOURCES,
  ...ASSOCIATION_SOURCES,
  ...REAL_ESTATE_SOURCES,
];

export const FLORIDA_RESIDENTIAL_CATEGORIES = [
  'County Permits', 'Property Appraisers', 'City Permits', 'Open Data',
  'Craigslist', 'Facebook Groups', 'Reddit', 'Forums', 'Marketplaces',
  'Associations', 'Real Estate',
];

// Epoxy / coating / polished concrete / decorative concrete keyword families
// used by the scraper to filter residential demand signals from noise.
export const RESIDENTIAL_TRADE_KEYWORDS = [
  'epoxy', 'epoxy flooring', 'garage floor', 'polyaspartic', 'urethane cement',
  'polished concrete', 'concrete polishing', 'concrete coating', 'concrete resurfacing',
  'concrete sealer', 'concrete stain', 'decorative concrete', 'stamped concrete',
  'metallic epoxy', 'flake floor', 'quartz floor', 'grind and seal',
  'concrete repair', 'cracked concrete', 'spalling', 'concrete leveling',
  'floor coating', 'floor finishing', 'flooring contractor', 'concrete contractor',
];