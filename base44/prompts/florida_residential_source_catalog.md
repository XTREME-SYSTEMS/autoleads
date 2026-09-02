# Florida Residential Lead Source Catalog
> Verified via web research + cloud-browser candidate checks. Ready to seed into ScrapeSource and wire into the nightly residential scraper.
> Generated: 2026-09-01

---

## CATEGORY 1 — County & City Building-Department Permit Portals
*Real-time / daily residential permits. Gold mine for flooring/concrete leads.*

### Accela Citizen Access (ACA) — public search, no login for record lookup
| County | URL | Residential Permit Types to Filter |
|---|---|---|
| Polk County | https://aca-prod.accela.com/POLKCO/Cap/CapHome.aspx?module=Building | Residential New, Residential Renovation/Addition, Residential Driveway, Residential Accessory, Pool, Window/Door |
| Martin County | https://aca-prod.accela.com/MARTINCO/Welcome.aspx | Building permits (search) — phone (772) 288-5400 |
| Charlotte County | https://aca-prod.accela.com/BOCC | C RESIDENTIAL, R RESIDENTIAL, R GENERAL, C SW POOL DECK, C SPECIALTY MASONRY |
| Leon County | https://aca-prod.accela.com/leonco/Default.aspx | Building Permits → Search Applications |
| Lake County | https://aca-prod.accela.com/LAKECO/Cap/CapHome.aspx?module=Building | Residential permit types (migrating to OpenGov) |
| Citrus County | https://aca-prod.accela.com/CITRUS/Default.aspx | Building → Search Applications |
| Hillsborough County (HillsGovHub) | https://aca-prod.accela.com/HCFL/Default.aspx | Building and Site → search; legacy reports https://app.hillsboroughcounty.org/DevelopmentServices/PermitReports/ |
| Lee County | https://aca-prod.accela.com/LEECO/Default.aspx | Active Permitting Records by type & parcel; contact eConnect@leegov.com / 239-533-8329 |
| Pasco County | https://aca-prod.accela.com/PASCO/Default.aspx | Residential & Commercial Building permits (Pasco Gateway) |
| Sarasota County | https://aca-prod.accela.com/SARASOTACO/Default.aspx | Building permits; building@scgov.net / 941-861-5000 |
| Pinellas County | https://aca-prod.accela.com/pinellas/default.aspx | Expedited Residential Permits available; (727) 464-3888 |

### Tyler EnerGov / custom / Posse
| Jurisdiction | URL | Notes |
|---|---|---|
| Miami-Dade County | https://energov.miamidade.gov/EnerGov_Prod/SelfService#/home | Tyler EnerGov Self-Service; also ePermitting menu https://www.miamidade.gov/Apps/RER/ePermittingMenu/Home/Permits |
| Broward County | https://dpepp.broward.org/BCS/Default.aspx?PossePresentation=ParcelSearchByAddress | Posse custom; search by address; (954) 765-4400; ePermits https://dpepp.broward.org/EPermitsAPP/ |
| Palm Beach County | https://pbc.gov/epzb.admin.webspa/ | ePZB admin portal; legacy http://www.pbcgov.com/epzbcommon/asp_html/epzbgateway.aspx |
| Orange County | https://fasttrack.ocfl.net/OnlineServices/ | Fast Track portal; residential structures permits |
| Brevard County | https://acaweb.brevardcounty.us/citizenaccess | Accela ACA; Viera, FL |
| Seminole County | https://semc-egov.aspgov.com/Click2GovBP/index.html | ASPGov Click2Gov; BPCustomerService@seminolecountyfl.gov / 407-665-7050 |
| St. Johns County | https://www.sjcfl.us/building-permits/permit-status/ | Online permitting & status; contractor search http://webapp.sjcfl.us/WATSWebX/Permit/SearchCL.aspx; bldcodes@sjcfl.us / (904) 827-6800 |
| City of Sarasota | https://ftgportal.sarasotafl.gov/Permits/Search.aspx?microapp=c | FTG portal; CityPermits@sarasotafl.gov |
| City of St. Augustine | https://www.citystaug.com/1082/Permit-Portal | City permit portal |
| Columbia County | https://www.columbiacountyfla.com/PermitSearch.aspx | Building permit search; hr@columbiacountyfla.com |
| Alachua County | https://www4.citizenserve.com/Portal/PortalController?Action=showHomePage&ctzPagePrefix=Portal_&installationID=318 | CitizenServe portal; building permitting + public works |

**Reachability:** Accela ACA portals are ASP.NET WebForms — render with JS, require session cookies; cloud browser recommended. EnerGov/Posse similar. Click2Gov (Seminole) is lighter HTML. CitizenServe is JS-rendered.

**Concrete/flooring-relevant permit-type codes/keywords (cross-jurisdiction):** `Residential New`, `Residential Renovation/Addition`, `Residential Driveway`, `Residential Accessory` (shed/carport/screen room), `Pool`, `Pool Deck`, `Slab`, `Garage`, `Patio`, `Driveway`, `Foundation`, `Flooring`, `Concrete`, `Masonry`, `Tile`, `Epoxy`, `Polished`, `Overlay`, `Slab`, `Sidewalk`, `Walkway`, `Porch`.

---

## CATEGORY 2 — Florida Socrata / Open-Data Portals (structured permit APIs)
*Best sources — JSON APIs, daily updates, no anti-bot.*

| Source | URL / Dataset ID | Platform | Fields | Cadence |
|---|---|---|---|---|
| City of Orlando — Permit Applications | https://data.cityoforlando.net/Permitting/Permit-Applications/ryhf-m453 | Socrata | permit_number, application_type, parcel_number, worktype, permit_address, property_owner_name, parcel_owner_name, contractor, contractor_name, contractor_address, contractor_phone_number, final_date, coo_date, coc_date (40 cols) | Daily |
| City of Orlando — Permits past 365 days | https://data.cityoforlando.net/Permitting/Permit-Applications-for-the-past-365-days/68d3-ink8 | Socrata | Same schema, rolling 365-day window | Daily |
| City of Miami — Building Permits Since 2014 | https://datahub-miamigis.opendata.arcgis.com/datasets/building-permits-since-2014 | ArcGIS Open Data | Application data, status, cost, review timelines, geo | Periodic |
| City of Miami — Data Explorer | https://www.miami.gov/Maps-Data/Data-Explorer | Custom | Building permits open data since 2014 | Periodic |
| Miami-Dade County — Open Data Hub | https://opendata.miamidade.gov/ (search "Building Permits Issued") | Socrata | Building Permits Issued By Miami-Dade County - 2 Previous Years to Present | Periodic |
| City of Tampa — Open Data | https://opendata.tampa.gov/ | Socrata | Building permits datasets (2021–2023 published on CivicData) | Periodic |
| CivicData — Tampa building permits | https://www.civicdata.com/dataset?organization=tampa-a731fc29-ce80 | CivicData | Building permits 2021–2023 | Periodic |

**Socrata API access:** `https://<domain>/api/views/<datasetId>/rows.json` or via sodapy. No app token needed for public reads (rate-limited); app token raises limits. No anti-bot.

---

## CATEGORY 3 — County Property Appraiser / Tax-Record Sites (67 counties)
*Cross-reference parcels for owner contact + improvement flags.*

| Source | URL | Coverage |
|---|---|---|
| Florida DOR — Local Officials directory | https://floridarevenue.com/property/Pages/LocalOfficials.aspx | Links to all 67 county property appraisers |
| Florida Statewide Parcels (FGIO) | https://www.floridagio.gov/datasets/FGIO::florida-statewide-parcels/about | 10.8M features, all 67 counties (ArcGIS FeatureServer) |
| Florida Statewide Cadastral (ArcGIS REST) | https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer | All 67 counties |
| Lee County Property Appraiser | https://www.leepa.org/ | Lee County |
| Manatee County PAO | https://www.manateepao.gov/search/ | Manatee County |
| Osceola County Property Appraiser | https://search.property-appraiser.org/ | Osceola County |
| Hillsborough County Property Appraiser | https://www.hcpafl.org/ | Hillsborough County |
| ParcelRecordsUSA — Florida | https://zipmyparcel.com/florida-property-search | Aggregator, all 67 counties, 10.1M records |

**Use:** Cross-reference permit address → parcel owner name + mailing address for outreach. Most are free public search (HTML/JS); statewide ArcGIS layer is API-friendly.

---

## CATEGORY 4 — HOA & Community Management Platforms
*Resident project requests. ALL login-gated — not persistently scrapable without credentials.*

| Platform | URL | Access | Notes |
|---|---|---|---|
| Townsq | https://www.townsqapp.com/ | Login-gated | HOA community boards |
| Vantaca | https://www.vantaca.com/ | Login-gated | HOA management (Breezeline) |
| AppFolio | https://www.appfolio.com/ | Login-gated | Property management |
| Buildium | https://www.buildium.com/ | Login-gated | Property management |

**Verdict:** Not viable for autonomous scraping. Pursue via partnerships/referrals instead. Listed for completeness.

---

## CATEGORY 5 — Permit Aggregators & Plan-Room Services (Florida coverage)
*Mostly commercial/public bids. Residential private work limited to Dodge.*

| Source | URL | Access | Residential? | Notes |
|---|---|---|---|---|
| BidNet Direct — Florida | https://www.bidnetdirect.com/florida | Free registration | Mostly public/gov | State & local government RFPs |
| DemandStar — Florida | https://www.demandstar.com/app/browse-bids/states/florida | Free registration | Mostly public/gov | Government contracts; per-agency pages |
| BidSparq | https://bidsparq.com/for/construction | Paid | Mixed | Construction RFP alerts; monitors state DOTs |
| Dodge Construction Network | https://www.construction.com/ | Paid (API/data feeds) | YES — private residential | Best for private residential project leads; REST API |
| ConstructConnect | https://www.constructconnect.com/ | Paid | Mixed | Project leads + market intelligence |
| BuildingConnected | https://www.buildingconnected.com/ | Free contractor account | Commercial-leaning | Bid invite coordination (Autodesk) |

**Verdict:** Dodge is the only aggregator with meaningful private residential coverage (paid API). BidNet/DemandStar are public-bid only — low residential yield.

---

## CATEGORY 6 — Social & Classified Platforms (Florida residential intent)
*High-intent homeowner posts. Scrape services + gigs + FSBO sections.*

### Craigslist — Florida metros (from geo.craigslist.org/iso/us/FL)
| Metro | Site | Sections to scrape |
|---|---|---|
| Miami / Dade | https://miami.craigslist.org | /d/sss (services), /d/crs (creative), /d/lab (labor/moving), /d/reb (real estate by-broker), /d/reo (real estate by-owner) |
| South Florida Keys | https://keys.craigslist.org | same sections |
| Fort Myers / SW Florida | https://fortmyers.craigslist.org | same |
| Gainesville | https://gainesville.craigslist.org | same |
| Heartland Florida | https://heartland.craigslist.org | same |
| Jacksonville | https://jacksonville.craigslist.org | same |
| Lakeland | https://lakeland.craigslist.org | same |
| Daytona Beach | https://daytona.craigslist.org | same |
| Orlando | https://orlando.craigslist.org | same |
| Panama City | https://panamacity.craigslist.org | same |
| Pensacola | https://pensacola.craigslist.org | same |
| Sarasota-Bradenton | https://sarasota.craigslist.org | same |
| Space Coast (Melbourne) | https://spacecoast.craigslist.org | same |
| Tallahassee | https://tallahassee.craigslist.org | same |
| Tampa Bay | https://tampa.craigslist.org | same |
| Treasure Coast | https://treasure.craigslist.org | same |

**Keywords to filter:** epoxy, polished concrete, concrete, flooring, floor, slab, driveway, garage, patio, pool deck, foundation, crack, resurface, stain, overlay, tile, pavers, lanai, screen room.

### Facebook & Nextdoor
| Platform | URL | Access | Notes |
|---|---|---|---|
| Facebook Marketplace | https://www.facebook.com/marketplace | Login-gated (mostly) | City-specific; some public listings via Graph |
| Facebook Groups (FL homeowners) | https://www.facebook.com/groups/Floridahomeowners | Login-gated | Community groups — residential intent posts |
| Nextdoor | https://nextdoor.com | Login-gated | Public business posts only; neighborhood recommendations |

### Reddit
| Subreddit | URL | Access | Notes |
|---|---|---|---|
| r/HomeImprovement | https://www.reddit.com/r/HomeImprovement | Public API (JSON) | Flooring/concrete questions → intent |
| r/Concrete | https://www.reddit.com/r/Concrete | Public API | Residential concrete projects |
| r/Flooring | https://www.reddit.com/r/Flooring | Public API | Flooring intent |
| r/AskFlorida | https://www.reddit.com/r/AskFlorida | Public API | Local contractor requests |
| r/floridahomeowners | (Facebook group) | Login-gated | — |

### Houzz & lead marketplaces
| Platform | URL | Access | Notes |
|---|---|---|---|
| Houzz Pro discussions | https://www.houzz.com/proDiscussions | Public (partial) | Homeowner project discussions |
| Angi (Angie's List) | https://www.angi.com/ | Paid leads | Shared leads (3–8 pros) |
| Thumbtack | https://www.thumbtack.com/ | Paid leads | Concrete/flooring categories |
| Bark | https://www.bark.com/ | Paid leads | Lead marketplace |

**Reachability:** Craigslist = static HTML, easy scrape (no JS). Reddit = public JSON API (.json suffix). Facebook/Nextdoor = login-gated, need cloud browser + session. Angi/Thumbtack/Bark = paid, not scrapable.

---

## CATEGORY 7 — Florida Contractor-License & Complaint Registries
*Cross-reference active residential contractors for partnership targeting.*

| Source | URL | Access | Notes |
|---|---|---|---|
| DBPR License Search | https://www.myfloridalicense.com/wl11.asp | Public | Verify a licensee by name/license#/city/county/license type |
| MyFloridaLicense — Construction Industry | https://www2.myfloridalicense.com/construction-industry/ | Public | Construction industry business info |
| County contractor licensing boards | (varies — see county portals above) | Public | Cross-reference via Accela license search |

**Use:** Build a target list of licensed residential contractors (flooring, concrete, masonry, pool/spa, general) for outbound partnership outreach. Phone: (850) 487-1395.

---

## CATEGORY 8 — Real-Estate Listing & Flip Signals
*Fixer-upper / investor listings signal upcoming flooring/concrete work.*

| Source | URL | Access | Notes |
|---|---|---|---|
| Zillow — Fixer Upper (Orlando) | https://www.zillow.com/orlando-fl/fixer-upper_att/ | Scrape (JS, anti-bot) | Filter `_att=fixer-upper`; replicate per FL city |
| Redfin — Fixer Upper (Florida) | https://www.redfin.com/state/Florida/fixer-upper | Scrape (JS, anti-bot) | Statewide fixer-upper feed |
| Realtor.com | https://www.realtor.com/ | Scrape / paid API | MLS-sourced listings |
| MLS feeds (Realtor associations) | (via local REALTOR boards) | Paid API | IDX feed — most accurate |

**Keywords:** "fixer-upper", "TLC", "needs work", "investor special", "new construction", "handyman special", "as-is". **Reachability:** Zillow/Redfin block bots aggressively — cloud browser required; no public API.

---

## CATEGORY 9 — Florida News & Permit-Notice Publications
*Permit roundups + new residential project announcements.*

| Source | URL | Access | Notes |
|---|---|---|---|
| South Florida Business Journal | https://www.bizjournals.com/southflorida | Paid (partial free) | Building Permits section; Miami-Dade/Broward/Palm Beach |
| Orlando Sentinel | https://www.orlandosentinel.com/ | Scrape | Permit notices + real estate |
| Tampa Bay Business Journal | https://www.bizjournals.com/tampabay | Paid | Building permits |
| Jacksonville Business Journal | https://www.bizjournals.com/jacksonville | Paid | Building permits |
| Local newspapers | (county/city) | Scrape | Permit roundups (weekly) |

**Reachability:** Business Journals are paywalled; local papers scrape-friendly. Low volume but high-signal residential project announcements.

---

## CATEGORY 10 — State-Level Housing & Development Programs
*Affordable-housing residential pipelines (SHIP/SAIL).*

| Source | URL | Access | Notes |
|---|---|---|---|
| Florida Housing Finance Corporation | https://www.floridahousing.org/ | Public | Affordable housing pipelines |
| SHIP Program (statewide) | https://www.floridahousing.org/programs/special-programs/ship---state-housing-initiatives-partnership-program | Public | Funds all 67 counties + 55 entitlement cities; emergency repairs, new construction, rehabilitation |
| SHIP Local Government Info | https://www.floridahousing.org/programs/special-programs/ship---state-housing-initiatives-partnership-program/local-government-information | Public | Contact for each local SHIP office; (850) 488-4197 |
| Florida DEO | https://www.floridajobs.org/ | Public | Workforce + housing development |
| County SHIP programs | (per county — see local government info) | Public | Rehabilitation + new construction residential projects |

**Use:** Track upcoming affordable-housing residential developments for flooring/concrete subcontracting opportunities. SHIP-funded rehab projects = direct residential leads.

---

## SEEDING PRIORITY (recommended order for nightly scraper)

**Tier 1 — Structured APIs (daily, no anti-bot, full contact data):**
1. City of Orlando Socrata (ryhf-m453) — contractor name + phone + address
2. Miami-Dade Open Data (Socrata)
3. City of Tampa Open Data
4. City of Miami ArcGIS Open Data

**Tier 2 — County permit portals (cloud browser, daily):**
5. Top-12 Accela county portals (Polk, Hillsborough, Lee, Pasco, Pinellas, Sarasota, Charlotte, Leon, Lake, Citrus, Martin, Broward-Posse)
6. Miami-Dade EnerGov, Orange FastTrack, Brevard ACA, Seminole Click2Gov, St. Johns, Alachua CitizenServe

**Tier 3 — Social/classified (cloud browser + LLM intent):**
7. Craigslist — all 16 Florida metros (services + gigs + FSBO)
8. Reddit — r/HomeImprovement, r/Concrete, r/Flooring, r/AskFlorida (JSON API)

**Tier 4 — Cross-reference enrichment:**
9. Florida Statewide Parcels (ArcGIS) — owner lookup
10. DBPR license search — contractor targeting

**Tier 5 — Signal sources (lower volume, higher intent):**
11. Zillow/Redfin fixer-upper feeds (cloud browser)
12. SHIP program pipelines
13. News permit roundups

**Not viable for autonomous scraping (login-gated/paid):** HOA platforms (Townsq/Vantaca/AppFolio/Buildium), Facebook/Nextdoor (login), Angi/Thumbtack/Bark (paid), Dodge/ConstructConnect (paid API — consider for private residential), Business Journals (paywall).