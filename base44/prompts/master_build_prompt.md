# AUTOLEADS Master Build Prompt v2 (Source Census Integrated)

## Objective
Transform AUTOLEADS into the definitive autonomous preconstruction operating system — real verified leads, AI takeoffs and bids, autonomous lead gen and bid creation and emailing, used by thousands to millions of construction businesses nationwide, matching the data coverage of ConstructConnect, PlanHub, Dodge, iSqFt, and BuildingConnected.

## Phase 0 — Source Census (ALREADY COMPLETED — 174 sources imported)
A national source census has been performed and 174 ScrapeSource records are now in the database. These are SEED records — all marked `unverified` and `NON_PRODUCTION_EXAMPLE`. They must be verified and promoted to production before use.

### What's in the census:
- **10 Federal sources** (verified from official documentation):
  - SAM.gov Contract Opportunities + SAM.gov Get Opportunities Public API v2 (https://api.sam.gov/opportunities/v2/search)
  - USAspending.gov + USAspending API v2 (https://api.usaspending.gov/)
  - GSA Forecast of Contracting Opportunities
  - Grants.gov Search + Grants.gov Search2 API (https://api.grants.gov/v1/api/search2)
  - Simpler.Grants.gov API (https://simpler.grants.gov/developers)
  - SBA SUBNet Subcontracting Opportunities
  - 2025 Census Government Units Listing
- **56 state/territory central procurement office seeds** (2 per state: official office + eProcurement portal)
  - e.g. AlabamaBuys, Cal eProcure, CTSource, eMMA, COMMBUYS, MissouriBUYS, eVA, WEBS, etc.
- **52 state/DC/PR DOT homepage seeds** (every state DOT)
- **Authoritative references used:** NASPO Procurement Website Directory, NASPO eProcurement Directory, FHWA State Transportation Websites, Census 2025 Government Units Listing

### What's NOT in the census yet (MUST BE BUILT):
- County, municipal, township, education board, special-district, authority sources (the 2025 Census Government Units ZIP was identified but not materialized — there are ~90,000 local government units in the US)
- Commercial / private project sources (ConstructConnect, Dodge, PlanHub, iSqFt, BuildingConnected data sources and APIs)
- Email-based bid ingestion sources
- Permit and planning department filings
- Tribal procurement sources
- American Samoa source has a mismatch and needs correction

## Phase 1 — Verify and Activate the 174 Seed Sources
For each of the 174 ScrapeSource records:
1. **Live-test the URL** — fetch it, confirm it loads, confirm it has bid/opportunity data.
2. **Classify the data format** — is it an API (JSON), HTML scrape, RSS feed, email digest, or PDF?
3. **Determine access requirements** — free, registration-required, paid, or API-key-required.
4. **Build a parser** — for HTML portals, write a dedicated parser that extracts: project title, due date, scope/trade, value, contact, and the direct project URL. For APIs, write an API client.
5. **Set parser_version** on the ScrapeSource record.
6. **Verify a sample record** — pull one real opportunity, create a Project record with a real source_url, and confirm verifyProject succeeds.
7. **Promote to production** — change data_class from NON_PRODUCTION_EXAMPLE to production, status from unverified to active, and assign a schedule_cron.
8. **Start with Florida** (or the user's primary market) — verify all FL sources first, then expand state by state.

### Priority order for activation:
1. **Federal APIs first** (SAM.gov API v2, USAspending API v2, Grants.gov Search2 API) — these are free, documented, structured, and nationwide. Build API clients immediately.
2. **State eProcurement portals** — these have the most construction bid volume. Build HTML parsers for the top 10 states by construction spend (CA, TX, FL, NY, IL, PA, OH, NC, GA, WA).
3. **State DOTs** — heavy civil/highway construction. Build parsers for the top 10 DOTs.
4. **Remaining states** — expand to all 56 jurisdictions.

## Phase 2 — Build the Missing Source Layers
### 2A. Local Government Census (county/municipal/special-district)
- Materialize the 2025 Census Government Units Listing (https://www.census.gov/data/datasets/2025/econ/gus/public-use-files.html) — it contains every county, municipality, township, and special district in the US (~90,000 units).
- For each unit, find its procurement/bid portal. Many use shared platforms (BidNet Direct, QuestCDN, IonWave, OpenGov, Bonfire) — build one parser per platform, not per portal.
- Prioritize: counties first (3,143), then cities (19,000+), then special districts (38,000+).

### 2B. Commercial Aggregator Integration
Research and integrate the top construction data platforms:
- **ConstructConnect** — identify their API, partnership/reseller program, pricing. Can AUTOLEADS license their data feed?
- **Dodge Data Network** — same: API, data licensing, pricing.
- **PlanHub** — free for subcontractors; identify their data sources and whether they offer an API or partnership.
- **iSqFt** — API access, pricing.
- **BuildingConnected (Autodesk)** — bid management; identify data sources.
- **BidNet Direct** — powers many state/local free public portals; identify their API.
- **GovWin (Deltek)** — government-focused; API and pricing.
- **Blue Book, Dodge Network, BidClerk** — additional sources.
- For each: document name, URL, API availability, pricing, partnership program, data format, and whether AUTOLEADS can integrate. If an API exists, build a client. If a partnership exists, pursue it.

### 2C. Email-Based Bid Ingestion
- Use the existing Gmail connector (already authorized) to parse incoming bid invitations.
- Build a parser that extracts from bid-invite emails: project name, due date, scope/trade, location, value, contact, and the direct link.
- Create Project records automatically from parsed emails.
- This is the highest-ROI source — contractors already receive qualified bid invites by email.

### 2D. Commercial / Private Project Sources
- Dodge and ConstructConnect private project leads (via API/licensing).
- Real estate development news: therealdeal.com, bizjournals, local business journals.
- Building permit data: city open data portals, BuildZoom, permit tracking services.
- AIA chapter project leads, AGC member project lists, ABC chapter leads.

## Phase 3 — Build the Daily-Habit Loop
1. Morning lead digest — 6am push notification: "N new bids matched your trade, total value $X."
2. Bid deadline countdown on the home screen.
3. "Money left on the table" — show dollar value of unpursued bids from last week.
4. Streaks / pipeline velocity — weekly comparison.
5. Real-time notifications for new matching bids.

## Phase 4 — AI Automation (the moat)
1. One-tap takeoff from uploaded plans (Drive + file upload → AI quantities).
2. Auto-drafted proposals ready to review (Approval Desk UX already built).
3. Auto-follow-up emails — "proposal sent 5 days ago, no reply, draft follow-up?"
4. Full pipeline autonomy: scrape → verify → takeoff → estimate → proposal → email.

## Phase 5 — Fix All Operational Gaps
1. Wire the 9 empty-page stubs to real data.
2. Re-enrich 22 projects missing critical fields using real sources.
3. Merge duplicate projects.
4. Fix the pipeline bottleneck — advance stuck projects.
5. Fix runDataIntegrity timeout — parallel URL batches.
6. Ensure self-heal runs on schedule.

## Phase 6 — Virality / Go-to-Market
1. "Powered by AUTOLEADS" footer on every contractor app share link and proposal.
2. Freemium tier — free lead digest, paid takeoffs + proposals.
3. Trade-specific landing pages.
4. Referral program.

## Execution Rules
- The 174 seed sources are REAL but UNVERIFIED. Verify each before activating — never activate an unverified source.
- Every lead must trace to a real, verifiable source_url. Never fabricate with an LLM.
- Federal APIs (SAM.gov, USAspending, Grants.gov) are the fastest path to nationwide coverage — build those clients first.
- For local government: build one parser per shared platform (BidNet, QuestCDN, IonWave, OpenGov), not per portal — there are 90,000+ units but only ~10 platforms.
- Log every recommendation as a Recommendation record with status tracking.
- Run self-audit after each phase to measure improvement.
- Prioritize by impact: verify+activate seeds → federal APIs → state portals → local census → commercial aggregators → email → daily habit → AI → virality.
- Start with the user's primary market (Florida) and expand outward.