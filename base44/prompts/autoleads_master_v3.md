# AUTOLEADS — MASTER BUILD PROMPT v3
## The Autonomous Nationwide Preconstruction Operating System

---

## MISSION

Transform AUTOLEADS into the definitive autonomous preconstruction operating system that discovers, verifies, and acts on EVERY construction project opportunity in the United States — federal, state, county, city, and private — using only free public data sources, Browserbase cloud scraping, and AI automation. The platform must run autonomously end-to-end: discover leads → verify projects → generate takeoffs → draft estimates → build proposals → send bids → follow up — with zero manual intervention in full-auto mode. The app must be addictive: users open it every morning because it has already done their work for them.

---

## WHAT'S ALREADY BUILT (DO NOT RECREATE)

- 174 ScrapeSource records imported (10 federal, 112 state, 52 DOT) — all `unverified` + `NON_PRODUCTION_EXAMPLE`
- 22 entities with owner-or-admin RLS (Project, Estimate, Takeoff, Proposal, Contact, CompanyProfile, PricingProfile, Material, ScrapeSource, AutomationConfig, EmailTemplate, BrandAsset, ContractorApp, ProjectImage, ProposalPackage, Message, Notification, AgentTask, SystemGap, SystemScore, Benchmark, Recommendation)
- Backend functions: runAutoScrape, runFullPipeline, autoTakeoff, autoProposals, verifyProject, runDataIntegrity, runAutoHeal, runSystemAudit, runUiAudit, runBenchmarkResearch, discoverSources, sendEmail, syncCalendar, gmailSync, driveBrowse, driveRead, driveChunk, driveBundle, contractorAppShare
- Workflows: Full Pipeline Autopilot (every 4h), System Autopilot (every 2h), Auto Scrape Opportunities, Auto Generate Proposals
- System Agent (system_agent.jsonc) with full entity + function access
- System QA Agent (system_qa.jsonc) for autonomous testing
- Secrets configured: BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID, SAM_GOV_API_KEY
- Connectors: Google Drive (authorized), Gmail (app-user), Google Calendar (app-user), Google Sheets, Google Docs, Google Tasks, HubSpot, Supabase
- 18 Recommendation records tracking the roadmap
- System Health dashboard with self-scoring, benchmarking, gap tracking, and self-healing
- Admin Control Center at /admin
- Onboarding hub with 6 setup phases

---

## PHASE 1: VERIFY AND ACTIVATE THE 174 IMPORTED SOURCES

### 1A: Federal APIs (No scraping needed — structured JSON)

Build a `scrapeFederalAPIs` backend function that calls these free APIs using the SAM_GOV_API_KEY secret:

1. **SAM.gov Opportunities API v2** — `https://api.sam.gov/opportunities/v2/search`
   - Use SAM_GOV_API_KEY from process.env
   - Pull all posted/active opportunities
   - Map to Project entity: title, description, contract_info, bid_due_date, jurisdiction="Federal", source_url, authority, value
   - Filter for construction-related NAICS codes (23xxxx series)

2. **USAspending.gov API** — `https://api.usaspending.gov/api/v2/search/spending_by_award/`
   - No key needed
   - Pull construction awards (NAICS 23xxxx)
   - Map to Project entity with award data

3. **Grants.gov Search2 API** — `https://api.grants.gov/v1/api/search2`
   - No key needed
   - Pull construction-related grants
   - Map to Project entity

4. **Simpler.Grants.gov API** — `https://api.simpler.grants.gov/v1/opportunities`
   - No key needed
   - Pull all construction opportunities

For each API result: create a Project record with verification_status="verified", data_class="production", source_id = the ScrapeSource record ID, source_url = the direct opportunity URL. Deduplicate by source_url + title. Set confidence based on data completeness.

### 1B: State Portal Scraping (Browserbase)

Build a `browserScrape` backend function that:
- Takes a ScrapeSource URL + parser_type as input
- Launches a Browserbase session using BROWSERBASE_API_KEY + BROWSERBASE_PROJECT_ID
- Navigates to the portal, waits for JS render
- Extracts bid listing data (title, due date, agency, value, detail URL)
- For each bid: navigates to detail page, extracts full scope, contact info, documents list
- Downloads publicly available plans/specs via the UploadFile integration (store file_url on Project)
- Returns structured Project records

Wire `browserScrape` into `runAutoScrape` — replace the LLM-generation approach with real browser scraping.

Build parsers for the top 10 state eProcurement portals first (by construction spend):
1. Florida — MyFloridaMarketPlace
2. California — Cal eProcure
3. Texas — Texas SmartBuy
4. New York — NYS OGS Marketplace
5. Illinois — BidBuy
6. Pennsylvania — eMarketplace
7. Ohio — Ohio Procurement
8. North Carolina — eProcurement
9. Georgia — Team Georgia Marketplace
10. Washington — WEBS

Each parser sets `parser_version` on the ScrapeSource record (e.g. "florida-mfm-v1") and updates status to "active" on success.

### 1C: State DOT Scraping (Browserbase)

Build DOT parsers for the top 10 state DOTs:
1. Florida DOT — FDOT Bid Letting
2. Texas DOT — TxDOT Letting
3. California DOT — Caltrans
4. North Carolina DOT — NCDOT
5. Georgia DOT — GDOT
6. Pennsylvania DOT — PennDOT
7. Ohio DOT — ODOT
8. Michigan DOT — MDOT
9. Washington DOT — WSDOT
10. Virginia DOT — VDOT

DOT portals often have RSS or structured letting pages — check for RSS first (no Browserbase needed), fall back to Browserbase for JS-rendered pages.

### 1D: Verify and Promote

For each of the 174 sources:
1. Live-test the URL (HTTP 200 check)
2. Classify format: API / RSS / HTML / PDF / Email
3. Build or assign the appropriate parser
4. Pull one sample batch
5. Run verifyProject on each result
6. If verification succeeds: update ScrapeSource status to "active", set parser_version, set last_success_date, set records_retrieved count, set data_class to "production"
7. If verification fails: log error, set status to "error", increment error_count, create a SystemGap record
8. Assign a cron schedule based on source_type (federal APIs: 1h, state portals: 4h, DOTs: 4h)

---

## PHASE 2: BUILD THE FREE PRIVATE PROJECT PIPELINE

### 2A: Building Permits via Socrata (THE #1 FREE PRIVATE SOURCE)

Build a `scrapePermits` backend function that hits Socrata open data APIs for the top 50 metro areas. Socrata uses a standard API pattern: `https://[city].opendatasoft.com/api/records/v1.0/search/?dataset=[dataset_id]&q=construction`

Top 50 metros to cover:
New York, Los Angeles, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, San Jose, Austin, Jacksonville, Fort Worth, Columbus, Charlotte, Indianapolis, San Francisco, Seattle, Denver, Washington DC, Boston, El Paso, Detroit, Nashville, Memphis, Portland, Oklahoma City, Las Vegas, Louisville, Baltimore, Milwaukee, Albuquerque, Tucson, Fresno, Sacramento, Kansas City, Mesa, Atlanta, Omaha, Colorado Springs, Raleigh, Miami, Long Beach, Virginia Beach, Oakland, Minneapolis, Tulsa, Arlington, Tampa, New Orleans.

For each metro:
1. Find the building permits dataset (search the city's open data portal)
2. Query for commercial permits (permit type = commercial, valuation > $50,000)
3. Map to Project entity: title = "Permit: [type] at [address]", description = scope of work, value = permit valuation, address = permit address, jurisdiction = city, client_name = contractor/developer, source_url = permit URL, project_type = "commercial", stage = "qualification", verification_status = "verified"
4. Deduplicate by source_url + address
5. Set confidence based on data completeness (value + contractor + scope = high)

This gives you private commercial projects BEFORE they go to bid — with contractor and architect info included. This is the Dodge alternative.

### 2B: Planning Commission Agendas (Early-Stage Intel)

Build a `scrapePlanningAgendas` backend function using Browserbase:
- Target the top 50 city planning commission agenda pages
- Browserbase loads the page (often PDF), extracts text
- LLM (InvokeLLM with add_context_from_internet=false) parses the agenda for:
  - Project name
  - Developer/applicant name
  - Architect (if listed)
  - Project description/scope
  - Address
  - Estimated value (if mentioned)
  - Hearing date
- Create Project records with stage="qualification", project_type from scope, confidence=70 (earlier stage = less certain)

### 2C: Construction News RSS Aggregator

Build a `scrapeNewsFeeds` backend function:
- Pull RSS from 20+ construction/real estate publications:
  - ENR (Engineering News Record) — multiple category feeds
  - Bisnow — market-specific feeds
  - Commercial Observer
  - CoStar (free articles)
  - American City Business Journals — top 20 city feeds
  - Construction Dive
  - GlobeSt
  - Multi-Housing News
  - Hotel Business
  - Retail Dive
- For each article: LLM extracts project announcements (name, location, value, developer, GC, architect, scope)
- Create Project records with source="news", confidence=60, stage="qualification"
- Deduplicate by project name + location

### 2D: State Economic Development Press Releases

Build a `scrapeEconDev` backend function using Browserbase:
- All 50 state economic development offices have press release pages
- Browserbase scrapes them
- LLM extracts major project announcements (factories, data centers, HQ relocations, distribution centers)
- These are the BIGGEST private projects — often $50M-$1B+
- Create Project records with confidence=80 (official announcement), project_type from scope

### 2E: Shared Local Government Platforms (5 Parsers = 3,500 Agencies)

Build Browserbase parsers for the 5 shared procurement platforms:

1. **BidNet Direct** — 1,500+ agencies. Scrape public bid listings (no login needed for browse). URL pattern: `https://www.bidnetdirect.com/[state]/[agency]`
2. **QuestCDN** — 800+ DOT/local agencies. RSS available at `https://www.questcdn.com/Customer/ProjectListing`. Parse RSS first, Browserbase for detail pages.
3. **IonWave** — 500+ agencies. HTML scraping via Browserbase. URL pattern: `https://www.ionwave.net/BidList.aspx`
4. **OpenGov** — 400+ agencies. API available for some, Browserbase for others.
5. **Bonfire** — 300+ agencies. HTML scraping via Browserbase. URL pattern: `https://[agency].bonfirehub.com`

Each parser:
- Iterates through all agencies on that platform
- Extracts bid listings
- Navigates to detail pages for full scope + documents
- Downloads publicly available plans via UploadFile
- Creates Project records with source_id = the platform ScrapeSource, jurisdiction = the agency location

### 2F: City/County Direct Bid Pages (Top 200 Metros)

For the top 200 metros not covered by shared platforms:
1. Use the Census Government Units listing to find each city/county procurement URL
2. Build a generic Browserbase scraper that:
   - Navigates to the "Bids" or "Procurement" page
   - Extracts listing data
   - Navigates to detail pages
   - Downloads plans if publicly available
3. Create ScrapeSource records for each (source_type="government_portal", jurisdiction=city/county)
4. Run the scraper on a 4h cron

---

## PHASE 3: CONNECT THE AI AUTOMATION PIPELINE (FULL AUTONOMY)

### 3A: Auto-Discovery → Auto-Verification

When any scraper creates a new Project:
1. Set stage="qualification", verification_status="unverified"
2. Trigger verifyProject automatically (via workflow entity trigger on Project create)
3. verifyProject scrapes the source_url with Browserbase, extracts full details via LLM
4. Update Project with verified data, set verification_status="verified", verified_date=now
5. If verification fails 3x: set verification_status="failed", create SystemGap

### 3B: Auto-Verification → Auto-Takeoff

When a Project is verified:
1. If project has plans/specs (file_url exists): trigger autoTakeoff
2. autoTakeoff uses InvokeLLM with file_urls to analyze plans
3. Extract: quantities, materials, labor hours, equipment needs
4. Create Takeoff record linked to Project
5. Advance Project stage to "takeoff"
6. If no plans available: skip takeoff, advance to "estimating" with LLM-estimated scope

### 3C: Auto-Takeoff → Auto-Estimate

When Takeoff is complete:
1. Pull the organization's PricingProfile (labor rates, material costs, margins)
2. Calculate: labor_total, material_total, equipment_total, overhead_total
3. Apply mandatory_margin_pct
4. Create Estimate record linked to Project + Takeoff
5. Advance Project stage to "estimating"

### 3D: Auto-Estimate → Auto-Proposal

When Estimate is approved (or in full-auto mode, immediately):
1. Pull the organization's ProposalPackage (company highlights, insurance, job history)
2. Pull CompanyProfile (name, logo, license, bonding)
3. Generate proposal HTML via InvokeLLM using estimate + takeoff + company data
4. Create Proposal record with status="internal_review" (or "draft" in full-auto)
5. Advance Project stage to "proposal"

### 3E: Auto-Proposal → Auto-Outreach

When Proposal is ready:
1. If AutomationConfig.auto_outreach = "auto": send immediately
2. If "review": create AgentTask for user approval
3. If "manual": just notify
4. Send via the appropriate channel (email via sendEmail, or log for manual send)
5. Create Message record (direction="outbound", status="sent")
6. Advance Project stage to "submitted"

### 3F: Auto-Follow-Up

After proposal is sent:
1. Schedule follow-up based on bid_due_date (3 days before deadline if not heard back)
2. Generate follow-up email via InvokeLLM using EmailTemplate
3. If auto_outreach = "auto": send automatically
4. Create Message record for follow-up

### 3G: Full Pipeline Workflow

Update the "Full Pipeline Autopilot" workflow to run every 4 hours and:
1. Run all scrapers (federal APIs, state portals, permits, news, econ dev)
2. Verify all new projects
3. Run takeoff on all verified projects with plans
4. Generate estimates for all takeoffs
5. Generate proposals for all estimates
6. Send outreach for all proposals (based on autonomy level)
7. Send follow-ups for all submitted proposals
8. Update all Project stages
9. Log a SystemScore record with pipeline metrics

---

## PHASE 4: THE ADDICTIVE DAILY-HABIT LOOP

### 4A: Morning Lead Digest (6 AM Local Time)

Build a `morningDigest` backend function + scheduled workflow:
- Runs at 6 AM user local time
- Pulls all new Projects created in the last 24 hours
- Groups by: new leads, bids due today, bids due this week, proposals ready to approve
- Generates a digest email via sendEmail (to registered user)
- Creates a Notification record for each category
- The email subject: "🌅 [N] new leads waiting — [M] bids due this week"
- The email body: scannable bullet list with direct links to each project

### 4B: Bid Deadline Countdown

On the Dashboard:
- "Bids Due Today" card — red if any, with countdown timer
- "Bids Due This Week" card — amber
- Click any → go to the project with one-tap proposal generation

### 4C: "Money Left on the Table" Widget

Build a `moneyOnTable` calculation:
- Sum the value of all Projects in stage="submitted" that are past their bid_due_date with no response
- Show on Dashboard: "$[X] in bids awaiting response"
- This creates urgency — users check back to see if they won

### 4D: Streaks & Velocity

Track and display:
- Days in a row the user has logged in
- Leads reviewed this week
- Proposals sent this week
- Win rate (proposals sent vs. won)
- Show as a "This Week" stat bar on the Dashboard

### 4E: Real-Time Matching Notifications

When a new Project is created that matches the user's trade + service area:
- Create a high-priority Notification immediately
- If notification_frequency = "realtime": send email immediately
- The notification: "🎯 New match: [Project title] in [City] — bid due [date]"

### 4F: Smart Suggestions (What to do next)

On the Dashboard, an "AI suggests" panel:
- "You have 3 bids due this week — review them now"
- "5 new leads match your trade — review and take action"
- "2 proposals are waiting for approval — approve to send"
- "You haven't followed up on [Project] in 5 days"
- Each suggestion is a deep link to the action

### 4G: Win/Loss Tracking + Outcome Learning

When a Project moves to "won" or "lost":
- Record the outcome (won/lost, winning bid amount if known)
- Feed into OutcomeLearning page
- Use to improve future bidability scores and pricing
- Show win rate on Dashboard

---

## PHASE 5: PROVIDE USERS EXACTLY WHAT THEY NEED, WHEN THEY NEED IT

### 5A: Role-Based Dashboard

The Dashboard should adapt to what the user needs at that moment:
- **New user (no setup):** Show onboarding progress, "Finish setup to start getting leads"
- **Setup complete, no leads yet:** "Running first scrape — check back in 1 hour" + show source count
- **Leads available, no proposals:** "Review [N] leads and generate proposals"
- **Proposals ready:** "Approve [N] proposals to send them"
- **Bids submitted:** "Track [N] bids — [M] awaiting response"
- **Won projects:** "Congratulations — [N] projects won this month"

### 5B: Contextual AI Assistant

The persistent AI assistant panel should:
- Know the user's current state (setup progress, lead count, pending actions)
- Proactively suggest the next best action
- Answer questions about specific projects ("What's the status of [project]?")
- Generate emails/proposals on demand ("Draft a follow-up to [client]")
- Navigate the user to the right page ("Take me to my pending proposals")

### 5C: Trade-Specific Experience

Based on the user's trade (from CompanyProfile):
- Filter leads to only show relevant trades
- Customize takeoff templates for the trade
- Customize proposal templates for the trade
- Show trade-specific pricing intelligence
- Trade-specific landing pages for SEO (e.g. "/concrete-contractors", "/electrical-contractors")

### 5D: Service-Area-Aware Filtering

Based on the user's service areas (from ServiceAreaSettings):
- Only show projects in their service area
- Prioritize nearby projects
- Show distance/driver time to each project
- Alert when a project is just outside their area but high-value

---

## PHASE 6: IMPLEMENT ALL RECOMMENDATIONS

Implement all 18 tracked Recommendations in the Recommendation entity:
1. Replace AI-generated scraping with real-source government parsing
2. Build dedicated HTML parsers for top 20 jurisdictions
3. Integrate commercial aggregator API (or free alternatives per Phase 2)
4. Implement Gmail bid-invite ingestion pipeline
5. Build morning lead-digest push notifications
6. Wire 9 currently stubbed pages to live data
7. Optimize runDataIntegrity for parallel execution
8. Build building permits Socrata pipeline
9. Build construction news RSS aggregator
10. Build planning commission agenda scraper
11. Build state economic development press release scraper
12. Build 5 shared-platform parsers (BidNet, QuestCDN, IonWave, OpenGov, Bonfire)
13. Connect full pipeline autonomy (discovery → verification → takeoff → estimate → proposal → outreach)
14. Implement addictive daily-habit loop (streaks, digests, countdowns)
15. Implement role-based adaptive dashboard
16. Implement trade-specific experience
17. Implement service-area-aware filtering
18. Implement win/loss outcome learning

For each: update the Recommendation status to "in_progress" when starting, "done" when complete.

---

## PHASE 7: VIRALITY & GROWTH

### 7A: "Powered by AUTOLEADS" Footer

Every proposal generated includes a footer: "Generated with AUTOLEADS — The Autonomous Preconstruction OS" with a link to the landing page.

### 7B: Freemium Tier

- Free: 10 leads/month, manual takeoff, basic proposals
- Pro ($99/mo): Unlimited leads, AI takeoff, AI proposals, email automation
- Enterprise ($499/mo): Full autonomy, team seats, API access, white-label

### 7C: Trade-Specific Landing Pages

Build SEO landing pages for every trade:
- /concrete-contractors
- /electrical-contractors
- /plumbing-contractors
- /hvac-contractors
- /roofing-contractors
- /flooring-contractors
- /painting-contractors
- /drywall-contractors
- /excavation-contractors
- /paving-contractors
Each page: trade-specific value prop, trade-specific leads preview, trade-specific pricing intel.

### 7D: Referral Program

- "Invite a contractor, both get 1 month free"
- Track referrals via a Referral entity
- Show referral stats on Dashboard

### 7E: Public Lead Feed (SEO + Virality)

- A public page showing a sample of current public bids (no login needed)
- Drives SEO traffic
- "Sign up to see full details + get AI takeoff + auto-proposal"
- This is how PlanHub and BidNet get their SEO traffic

---

## EXECUTION RULES

1. **Never fabricate data.** Every Project must trace to a real, verifiable source_url. If a source can't be scraped, log it and move on — don't fill gaps with LLM-generated content.

2. **Browserbase for JS-rendered pages only.** Use direct API calls (Socrata, SAM.gov, RSS) when available — they're faster, cheaper, and more reliable than browser scraping.

3. **One parser per platform, not per portal.** Shared platforms (BidNet, QuestCDN, IonWave, OpenGov, Bonfire) cover thousands of agencies with one parser each.

4. **Verify before activating.** Every source must be live-tested and verified before being marked "active" and "production."

5. **Deduplicate aggressively.** No duplicate Projects by source_url + title. Check before creating.

6. **Autonomy levels respected.** AutomationConfig.autonomy_level controls whether actions are auto/review/manual. Never auto-send in "manual" mode.

7. **Log everything.** Every scraper run updates ScrapeSource (last_run_date, records_retrieved, error_count). Every system action creates a SystemScore or SystemGap record.

8. **Self-heal.** The System Autopilot workflow runs every 2h: audit, benchmark, integrity check, heal. Fix gaps automatically when possible.

9. **User-first.** Every feature must answer: "Does this help the user win more bids with less effort?" If not, don't build it.

10. **Start with Florida.** Prove the full pipeline on one state (federal APIs + FL state portal + FL DOT + FL permits + FL planning agendas) before scaling to all 50.

---

## BUILD ORDER (EXECUTE IN THIS SEQUENCE)

### Sprint 1: Real Data Foundation
1. Build `scrapeFederalAPIs` (SAM.gov + USAspending + Grants.gov) — immediate federal leads
2. Build `browserScrape` — Browserbase integration for JS portals
3. Wire `browserScrape` into `runAutoScrape` (replace LLM generation)
4. Build Florida state portal parser + Florida DOT parser
5. Verify and promote the 10 federal + 2 Florida sources to "active" + "production"
6. Test: confirm real Projects appear in the Leads page

### Sprint 2: Private Project Pipeline
7. Build `scrapePermits` — Socrata for top 50 metros
8. Build `scrapeNewsFeeds` — RSS aggregator for 20 publications
9. Build `scrapePlanningAgendas` — top 50 city planning commissions
10. Build `scrapeEconDev` — all 50 state economic development offices

### Sprint 3: Local Government Coverage
11. Build BidNet Direct parser
12. Build QuestCDN parser
13. Build IonWave parser
14. Build OpenGov parser
15. Build Bonfire parser
16. Build top 200 metro direct bid page scrapers

### Sprint 4: Full Pipeline Autonomy
17. Wire auto-discovery → auto-verification (entity trigger)
18. Wire auto-verification → auto-takeoff
19. Wire auto-takeoff → auto-estimate
20. Wire auto-estimate → auto-proposal
21. Wire auto-proposal → auto-outreach
22. Wire auto-follow-up
23. Update Full Pipeline Autopilot workflow to run all scrapers + full pipeline every 4h

### Sprint 5: Addictive Daily Habit
24. Build `morningDigest` + scheduled workflow (6 AM)
25. Build bid deadline countdown on Dashboard
26. Build "money on the table" widget
27. Build streaks & velocity tracking
28. Build real-time matching notifications
29. Build smart suggestions panel
30. Build win/loss outcome learning

### Sprint 6: Personalization
31. Build role-based adaptive Dashboard
32. Enhance contextual AI assistant with proactive suggestions
33. Build trade-specific filtering + templates
34. Build service-area-aware filtering + distance

### Sprint 7: Scale to All 50 States
35. Build parsers for remaining 40 state portals
36. Build parsers for remaining 42 DOTs
37. Run all scrapers on schedule
38. Monitor and fix errors via System Health

### Sprint 8: Virality
39. Add "Powered by AUTOLEADS" footer to proposals
40. Build freemium tier + billing
41. Build trade-specific landing pages
42. Build referral program
43. Build public lead feed page

### Sprint 9: Self-Heal & Optimize
44. Run full system audit
45. Fix all open SystemGaps
46. Optimize runDataIntegrity for parallel execution
47. Wire all 9 stubbed pages to live data
48. Final benchmark against competitors

---

## SUCCESS METRICS

- **Data coverage:** 100% of federal opportunities, 100% of state portals, 100% of DOTs, top 50 metros for permits, 5 shared local platforms, 20 news feeds, 50 planning commissions, 50 econ dev offices
- **Data quality:** 100% of Projects have a real source_url, 90%+ verification rate, 0 fabricated records
- **Autonomy:** Full pipeline runs every 4h with zero manual intervention in full-auto mode
- **User engagement:** Daily active usage driven by morning digest + deadline countdown + smart suggestions
- **System health:** Overall score >85, 0 critical gaps, self-healing operational
- **Virality:** "Powered by AUTOLEADS" on every proposal, freemium tier live, trade landing pages indexed

---

## START HERE

Begin with Sprint 1, Step 1: Build the `scrapeFederalAPIs` backend function using the SAM_GOV_API_KEY secret. This is the fastest path to real, verified leads — no scraping needed, just API calls. Then build `browserScrape` and prove the pattern on Florida. Then scale.