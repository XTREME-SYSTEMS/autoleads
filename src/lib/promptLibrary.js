// AUTOLEADS Prompt Library — comprehensive prompt collection that invokes the AI
// to audit, fix, validate, test, optimize, and harden the entire system to its
// maximum technological capability. Each prompt is a detailed instruction set
// designed to drive the AI through a complete systematic process.
//
// Categories:
// 1. Deep Forensic Audit
// 2. Fix & Optimize to Maximum
// 3. Validate & Test (100-score, 3x pass)
// 4. Source Research & Enrichment
// 5. Cloud Browser Maximum Capability
// 6. Self-Management & AI Team
// 7. Production Readiness & Hardening
// 8. Capability Gap Analysis

export const PROMPT_CATEGORIES = [
  // ─────────────────────────────────────────────────────────────────────
  // 1. DEEP FORENSIC AUDIT
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'forensic_audit',
    label: 'Deep Forensic Audit',
    icon: '🔍',
    color: '#dc2626',
    description: 'Prompts that invoke a complete forensic audit of every system layer — entities, functions, pages, workflows, sources, security, and performance.',
    prompts: [
      {
        id: 'full_system_forensic_audit',
        title: 'Full System Forensic Audit',
        description: 'Audit every layer of AUTOLEADS — entities, backend functions, pages, workflows, integrations, security, data integrity, and performance. Produce a scored report with every gap, flaw, and issue documented.',
        invokeFn: 'runSystemAudit',
        prompt: `You are the AUTOLEADS Forensic Auditor. Execute a complete, exhaustive forensic audit of the entire AUTOLEADS preconstruction operating system. Leave no file, no entity, no function, no page, no workflow, no source, no integration unexamined.

PHASE 1 — ENTITY AUDIT:
- Read every entity schema in base44/entities/. For each: verify field types are correct, required fields make sense, RLS rules are properly configured (not too loose, not too tight), enum values are complete, no orphaned fields, no missing indexes on frequently-filtered fields.
- Check every entity has data_class field for production/non-production separation.
- Verify organization_id scoping is consistent across all org-scoped entities.

PHASE 2 — BACKEND FUNCTION AUDIT:
- Read every function in base44/functions/. For each: verify authentication is correct, org scoping is applied, error handling is present, no hardcoded secrets, no SQL injection vectors, proper use of the SDK, no circular dependencies.
- Identify functions that are duplicated, dead, or broken.
- Check every function that calls external APIs handles timeouts, retries, and failures gracefully.

PHASE 3 — PAGE & UI AUDIT:
- Read every page in src/pages/. For each: verify it loads data from real entities (not hardcoded), has loading states, has empty states, handles errors, is responsive (mobile + desktop), uses the design system tokens.
- Identify pages with broken imports, missing routes, or dead navigation.
- Verify every button works, every form submits, every flow completes end-to-end.

PHASE 4 — WORKFLOW AUDIT:
- Read every workflow in base44/workflows/. For each: verify triggers are correct, steps are valid, no infinite loops, no dead-end branches, proper error handling.
- Check scheduled workflows have correct cron expressions.

PHASE 5 — INTEGRATION AUDIT:
- Verify all connectors are authorized and have correct scopes.
- Check all secrets are set and not expired.
- Verify Stripe integration is properly configured (webhooks, products, checkout).

PHASE 6 — SECURITY AUDIT:
- Verify RLS on every entity prevents cross-tenant data access.
- Check for any admin-only operations exposed to regular users.
- Verify no secrets are exposed in frontend code.
- Check all API endpoints require authentication.

PHASE 7 — DATA INTEGRITY AUDIT:
- Run runDataIntegrity to check for orphaned records, duplicates, stale data.
- Verify all Project records have required fields populated.
- Check for records with null/empty critical fields.

OUTPUT: For each phase, produce a score (0-100), a list of every issue found (with severity: critical/high/medium/low), and the exact fix needed. Create SystemFlag records for every critical and high issue. Create SystemGap records for every capability gap. Update SystemScore with the overall audit results. Do not skip anything. Do not approximate. Be exhaustive.`,
      },
      {
        id: 'entity_data_integrity_audit',
        title: 'Entity & Data Integrity Audit',
        description: 'Deep audit of every entity record — find orphans, duplicates, nulls, stale data, schema violations.',
        invokeFn: 'runDataIntegrity',
        prompt: `You are the AUTOLEADS Data Integrity Auditor. Audit every entity in the database for data quality issues.

For each entity (Project, Contractor, Proposal, Takeoff, Estimate, ScrapeSource, Organization, etc.):
1. List all records and check every required field is populated (not null, not empty string).
2. Find duplicate records (same title + source_url, same company_name + email, etc.) and merge or flag them.
3. Find orphaned records (project_id pointing to deleted projects, organization_id pointing to deleted orgs).
4. Find stale records (created_date > 90 days ago with no updated_date, status still 'pending' or 'unverified').
5. Find records with invalid enum values (status not in allowed enum, stage not in allowed stages).
6. Find records with invalid dates (bid_due_date in the past, created_date in the future).
7. Verify every org-scoped record has a valid organization_id.

For each issue found: create a SystemFlag with the exact record ID, the issue, and the fix needed. Run the autoCleanSystem function to fix what can be auto-fixed. Report the before/after counts for each issue type. Score data integrity 0-100.`,
      },
      {
        id: 'source_health_coverage_audit',
        title: 'Source Health & Coverage Audit',
        description: 'Audit every scrape source for reachability, data yield, and geographic coverage across all 50 states.',
        invokeFn: 'runStateCoverageAudit',
        prompt: `You are the AUTOLEADS Source Health Auditor. Audit every ScrapeSource for health, reachability, and data yield.

1. List every ScrapeSource. For each: check status (active/error/unverified), last_success_date, error_count, last_error.
2. Identify all sources in 'error' status — for each, determine the root cause (DNS failure, 403 blocked, timeout, parser failure, auth required, URL changed).
3. Identify all sources in 'unverified' status — these have never been validated.
4. Check geographic coverage: for each of the 50 states, count how many active sources exist. Flag any state with 0 active sources as 'uncovered'.
5. Check source category distribution: active_bid, permit, planning, news, agenda, federal_api. Flag any category with 0 sources.
6. For each error source: attempt to re-verify it. If it fails 3 times, mark it for pruning.
7. Update StateCoverage records for all 50 states with current source counts and coverage status.
8. Create SystemFlags for uncovered states, failing sources, and category gaps.
9. Run scoreSourceQuality to compute quality scores for all sources.

Produce a coverage map (50 states × 7 categories) and identify the top 10 weakest coverage areas that need new sources.`,
      },
      {
        id: 'security_rls_audit',
        title: 'Security & Row-Level Security Audit',
        description: 'Audit every entity RLS rule, every API endpoint, and every frontend route for security gaps.',
        prompt: `You are the AUTOLEADS Security Auditor. Audit the entire system for security vulnerabilities.

1. Read every entity schema. For each, examine the RLS rules:
   - Can a regular user read other organizations' data? (should not)
   - Can a regular user create records in another org? (should not)
   - Can a regular user delete other users' records? (should not)
   - Are admin-only entities (SystemFlag, StateCoverage, PromoCode, ApiKey) properly restricted?
   - Is the User entity properly secured?

2. Read every backend function. For each:
   - Does it authenticate the request? (no unauthenticated access to sensitive data)
   - Does it scope queries by organization_id? (no cross-tenant data leaks)
   - Does it use the service role only when necessary? (not for user-facing operations)
   - Are secrets read safely? (no process.env wholesale access)

3. Read every page route in App.jsx. For each:
   - Are admin pages gated behind ProtectedRoute + role check?
   - Are auth pages (login, register, reset) public?
   - Is there any route that should be protected but isn't?

4. Check for exposed secrets in frontend code (src/ files should never contain API keys).

5. Verify the Stripe webhook endpoint validates signatures.

Create a SystemFlag for every security issue found. Score security 0-100. Fix every critical issue immediately.`,
      },
      {
        id: 'ui_ux_audit',
        title: 'UI/UX & Page Completeness Audit',
        description: 'Audit every page for completeness, loading states, empty states, responsiveness, and design consistency.',
        invokeFn: 'runUiAudit',
        prompt: `You are the AUTOLEADS UI/UX Auditor. Audit every page in src/pages/ for completeness and quality.

For each page:
1. Does it have a loading state (spinner/skeleton) while data loads?
2. Does it have an empty state (EmptyState component) when no data exists?
3. Does it handle errors (try/catch with user-facing error message)?
4. Is it responsive (mobile-first, works on desktop)?
5. Does it use the design system tokens (bg-background, text-foreground, font-heading, etc.)?
6. Does it use the brand color (#f2df0d / --brand) consistently?
7. Are all buttons functional (no dead buttons)?
8. Are all forms complete (submit works, validation present)?
9. Are all navigation links valid (no 404s)?
10. Does it use the Image component for content images (not plain <img>)?
11. Are icons from lucide-react only (no nonexistent icons)?
12. Is dark mode supported?

Score each page 0-100. List every page that scores below 80 with specific issues. Fix every page that has broken imports, missing loading states, or dead buttons. The goal is every page at 100.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 2. FIX & OPTIMIZE TO MAXIMUM
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'fix_optimize',
    label: 'Fix & Optimize to Maximum',
    icon: '⚡',
    color: '#f59e0b',
    description: 'Prompts that invoke systematic fixing and optimization of every system component to its maximum technological capability.',
    prompts: [
      {
        id: 'fix_all_system_gaps',
        title: 'Fix All System Gaps',
        description: 'Systematically fix every gap, flaw, and issue identified in the forensic audit.',
        invokeFn: 'runAutoHeal',
        prompt: `You are the AUTOLEADS Auto-Heal Engine. Fix every gap, flaw, and issue identified in the forensic audit, SystemGap records, and SystemFlag records.

PROCESS:
1. Read all SystemGap records with status 'open'. For each gap:
   - Read the gap description and recommended fix.
   - Implement the fix (create the missing feature, fix the broken code, add the missing validation).
   - Update the gap status to 'fixed' with the fix description.
   - Log what was fixed.

2. Read all SystemFlag records with status 'open' and auto_fix_available=true. For each flag:
   - Execute the auto-fix action.
   - Update the flag status to 'fixed'.
   - Log the fix result.

3. Read all SystemFlag records with status 'open' and auto_fix_available=false. For each:
   - Determine if a manual fix is possible and implement it.
   - If not fixable, mark as 'unfixable' with explanation.

4. After all fixes: re-run the system audit to verify the fixes worked.
5. Compare pre-fix and post-fix scores. Report the delta.

Do not skip any gap or flag. Fix every single one. If a fix requires creating a new entity, function, or page, create it. If a fix requires modifying existing code, modify it. The goal is zero open gaps and zero open flags.`,
      },
      {
        id: 'optimize_every_page',
        title: 'Optimize Every Page to Maximum Capability',
        description: 'Go through every page and optimize it to its maximum technological capability — features, UX, performance, data richness.',
        prompt: `You are the AUTOLEADS Page Optimization Engine. Go through every page in src/pages/ and optimize it to its maximum technological capability.

For each page:
1. Read the current implementation.
2. Identify what the page SHOULD do at maximum capability (research similar features in Procore, Buildertrend, ConstructConnect, Dodge Construction Network, PlanGrid, BidClerk).
3. Add missing features that would make the page world-class:
   - Real-time data updates (entity subscriptions)
   - Advanced filtering and search
   - Bulk operations
   - Export/print capabilities
   - Keyboard shortcuts (for power users)
   - Inline editing
   - Drag-and-drop where appropriate
   - Charts and visualizations (recharts)
   - Mobile-optimized layouts
   - Dark mode support
   - Accessibility (ARIA labels, keyboard nav, screen reader)
4. Ensure every data display is bound to real entity data (no hardcoded mock data).
5. Ensure every action persists to the database (no local-only state for important data).
6. Optimize performance: lazy load heavy components, paginate large lists, debounce search inputs.
7. Add loading skeletons, empty states, and error boundaries.

Work through every page systematically. Do not move to the next page until the current one is at maximum capability. Log what was added to each page.`,
      },
      {
        id: 'optimize_every_function',
        title: 'Optimize Every Backend Function',
        description: 'Optimize every backend function for reliability, performance, error handling, and maximum data extraction.',
        prompt: `You are the AUTOLEADS Backend Optimization Engine. Go through every backend function in base44/functions/ and optimize it.

For each function:
1. Read the current implementation.
2. Verify authentication and authorization are correct.
3. Add proper error handling (try/catch with meaningful error messages).
4. Add timeout handling for external API calls (AbortSignal.timeout).
5. Add retry logic for transient failures (3 retries with exponential backoff).
6. Verify org scoping is applied to all entity operations.
7. Optimize database queries (use filter with specific queries, not list-all-then-filter).
8. Add proper logging (console.log for debugging, console.error for failures).
9. Verify secrets are read safely (by name, not wholesale process.env).
10. Remove dead code, unused imports, and duplicate logic.
11. Extract shared logic to base44/shared/ modules.
12. Add input validation for all request body parameters.

For scraping functions specifically:
- Ensure they use the cloud browser engine for JS-heavy sites.
- Fall back to direct HTTP for simple sites.
- Handle CAPTCHAs gracefully (log and skip, don't crash).
- Rate-limit requests to avoid being blocked.
- Extract maximum data (title, description, specs, contacts, dates, values, documents).

Test every function after optimization using test_backend_function.`,
      },
      {
        id: 'optimize_scraping_system',
        title: 'Optimize Scraping System to Maximum',
        description: 'Optimize every scraping source, parser, and pipeline to extract maximum data with zero failures.',
        invokeFn: 'runAutoScrape',
        prompt: `You are the AUTOLEADS Scraping Optimization Engine. Optimize the entire scraping system to extract maximum data from every source with zero failures.

1. AUDIT CURRENT SCRAPING:
   - Read every scraper function (scrapePermits, scrapeSocialLeads, scrapeFdots, scrapeFederalAPIs, scrapeAgendas, scrapeNewsFeeds, scrapeContractors, runAutoScrape, browserScrape).
   - For each: identify what data it extracts, what it misses, what fails.

2. OPTIMIZE EACH SCRAPER:
   - Ensure each scraper uses the cloud browser engine for JS-heavy sites.
   - Add direct HTTP fallback for simple sites.
   - Extract ALL available fields from each source (not just title and URL — get specs, contacts, dates, values, documents, plans URLs, addenda URLs).
   - Add proper deduplication (check by source_url + title before creating).
   - Add source template detection (bid_invitation, rfp, rfq, permit_notice, addendum).
   - Translate raw HTML to readable markdown using the source translator.
   - Generate clean PDF documents from translated sources.

3. OPTIMIZE SOURCE COVERAGE:
   - Ensure all 50 states have at least 5 active sources each.
   - Ensure all 7 source categories (active_bid, permit, planning, news, agenda, federal_api, social) have sources.
   - Add missing sources for uncovered states and categories.
   - Prune sources that fail 3+ times.

4. OPTIMIZE DATA ENRICHMENT:
   - After scraping, enrich each project with: location eligibility, trade matching, customer type classification, bidability score, validation completeness.
   - Extract square footage and floor finish from specs when available.
   - Link to plans, addenda, and bid forms.

5. ZERO FAILURE TOLERANCE:
   - Every source must either return data or be marked with a specific error.
   - No null results without explanation.
   - No ambiguous data — if a field can't be extracted, mark it as 'unknown' not null.

The goal: every source returns maximum data, every project is fully enriched, zero unexplained failures.`,
      },
      {
        id: 'optimize_ai_pipeline',
        title: 'Optimize AI Pipeline to Maximum',
        description: 'Optimize the entire AI pipeline — takeoff, estimate, proposal, validation, critic review — to maximum intelligence and accuracy.',
        invokeFn: 'runFullPipeline',
        prompt: `You are the AUTOLEADS AI Pipeline Optimization Engine. Optimize the entire AI-driven pipeline to maximum intelligence and accuracy.

PIPELINE STAGES TO OPTIMIZE:
1. LEAD INTAKE → Qualification: Ensure every new lead is classified (customer_type), scored (bidability_score), validated (verification_status), and enriched (location_eligibility, trade match).

2. TAKEOFF → Measurement: Ensure the autoTakeoff function extracts maximum measurements from project documents (square footage, linear feet, area breakdown by room/zone, floor finish type, substrate condition, edge type, cove base, drains, control joints).

3. ESTIMATE → Pricing: Ensure the autoProposals function generates accurate estimates using the PricingProfile (labor rates, material costs, overhead, margin), scope pricing tiers (low/mid/high), and winning bid intelligence.

4. PROPOSAL → Bid Package: Ensure proposals include: cover letter, scope of work, line items with quantities and unit prices, total value, terms and conditions, project timeline, warranty info, company profile, logo.

5. VALIDATION → Triple Validation: Ensure tripleValidateTakeoff runs three independent validation passes (structural, dimensional, scope) and the critic review (runCriticReview) adversarially challenges every measurement.

6. SUBMISSION → Delivery: Ensure submitProposal delivers via the correct channel (email, portal, manual) and tracks delivery confirmation.

For each stage:
- Read the current implementation.
- Identify what data is being extracted/generated vs. what COULD be extracted/generated.
- Add missing intelligence (more fields, better extraction, richer output).
- Add the adversarial critic review at each stage.
- Ensure every output is validated before passing to the next stage.

The goal: the pipeline produces world-class takeoffs, estimates, and proposals that win bids.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 3. VALIDATE & TEST
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'validate_test',
    label: 'Validate & Test (100-Score, 3x Pass)',
    icon: '✅',
    color: '#10b981',
    description: 'Prompts that invoke comprehensive validation and testing until every category scores 100 and passes end-to-end 3 times.',
    prompts: [
      {
        id: 'validate_every_entity_flow',
        title: 'Validate Every Entity & Flow',
        description: 'Validate every entity CRUD operation and every user flow end-to-end.',
        invokeFn: 'validationGate',
        prompt: `You are the AUTOLEADS Validation Engine. Validate every entity and every user flow end-to-end.

ENTITY VALIDATION (for each entity):
1. Create a test record → verify it appears in list → verify it can be read by ID → verify it can be updated → verify the update persists → verify it can be deleted → verify it's gone from list.
2. Verify RLS: create as user A in org A → verify user B in org B cannot read/update/delete it.
3. Verify required fields: try creating without required fields → verify it fails with proper error.
4. Verify enum validation: try creating with invalid enum value → verify it fails.

FLOW VALIDATION (for each user flow):
1. Lead Discovery Flow: scrape → intake → qualify → classify → enrich → display in LeadFeed.
2. Takeoff Flow: project → autoTakeoff → validate → review → approve.
3. Estimate Flow: approved takeoff → autoEstimate → pricing intelligence → review.
4. Proposal Flow: estimate → autoProposals → validate → review → approve → submit.
5. Outreach Flow: contractor → intro email → follow-up 1 → follow-up 2 → follow-up 3 → response tracking.
6. Onboarding Flow: register → OTP → verify → onboarding wizard → setup → dashboard.
7. Admin Flow: login → admin portal → run audit → fix flags → manage promos → invite team.

For each flow: execute it step by step. If any step fails, document the failure and fix it. Do not move on until every step passes.

Create ValidationLog records for each validation gate (lead_intake, prepared_takeoff, bid_package). Score each gate 0-100.`,
      },
      {
        id: 'run_full_test_suite',
        title: 'Run Full Test Suite with Scores',
        description: 'Run every test in the system and score every category. Work until all categories are 100.',
        invokeFn: 'runSystemTest',
        prompt: `You are the AUTOLEADS Test Suite Runner. Run every test in the system and score every category.

TEST CATEGORIES (score each 0-100):
1. ENTITY CRUD (20 tests): Create, read, update, delete for every entity with RLS verification.
2. AUTHENTICATION (10 tests): Login, register, OTP, forgot password, reset password, logout, session persistence, role checks.
3. SCRAPING (15 tests): Each scraper returns data, deduplication works, enrichment works, no null results.
4. AI PIPELINE (15 tests): Takeoff extraction, estimate calculation, proposal generation, validation gates, critic review.
5. WORKFLOWS (10 tests): Each workflow triggers correctly, steps execute in order, no infinite loops.
6. INTEGRATIONS (10 tests): Stripe checkout, Gmail send/read, Calendar sync, Drive upload, Sheets sync.
7. UI PAGES (20 tests): Each page loads, displays real data, forms submit, navigation works, responsive.
8. SECURITY (10 tests): RLS isolation, admin-only access, secret safety, API auth.
9. PERFORMANCE (10 tests): Page load times, API response times, large list handling, concurrent operations.
10. DATA INTEGRITY (10 tests): No orphans, no duplicates, no nulls in required fields, no stale data.

For each test:
- Run it using test_backend_function or exec_tool.
- Record the result (pass/fail) and score.
- If fail: diagnose the root cause, fix it, re-run.
- Continue until every test passes.

Create a test results report with the score for each category. The goal: every category at 100.`,
      },
      {
        id: 'e2e_production_readiness_3x',
        title: 'End-to-End Production Readiness Test (3x Pass)',
        description: 'Run the complete end-to-end system test 3 consecutive times. All must pass with 100 score in every category. Zero failures tolerated.',
        invokeFn: 'runRegressionTests',
        prompt: `You are the AUTOLEADS Production Readiness Certifier. Run the complete end-to-end system test 3 consecutive times. All 3 runs must pass with 100 score in every category. Zero failures tolerated.

RUN 1 — COLD START:
- Start from a clean state (no cached data).
- Execute the full pipeline: scrape → intake → qualify → takeoff → estimate → proposal → validate → submit.
- Run every test category.
- Record scores. If any category < 100, fix the issue and re-run that category until 100.

RUN 2 — WARM STATE:
- With data from Run 1 present, execute the full pipeline again on NEW data.
- Verify no interference from existing data (no false duplicates, no stale data affecting new leads).
- Run every test category.
- Record scores. If any category < 100, fix and re-run.

RUN 3 — STRESS STATE:
- Execute the full pipeline with high volume (100+ projects, 50+ sources, 20+ proposals).
- Verify performance doesn't degrade.
- Run every test category.
- Record scores. If any category < 100, fix and re-run.

CERTIFICATION CRITERIA:
- All 3 runs must score 100 in every category.
- No critical or high-severity issues remain.
- No open SystemGaps.
- No open SystemFlags.
- All workflows active and functioning.
- All integrations authorized and working.
- All pages loading with real data.

If any run fails: document the failure, fix the root cause, and restart from Run 1. Do not certify until all 3 consecutive runs pass at 100.

Produce a Production Readiness Certificate with the 3 run results, signed scores, and a launch-ready declaration.`,
      },
      {
        id: 'continuous_test_until_100',
        title: 'Continuous Test Until 100 in Every Category',
        description: 'Continuously run tests, fix failures, and re-run until every category is at 100 with proof.',
        prompt: `You are the AUTOLEADS Continuous Test Engine. Run tests continuously, fix every failure, and re-run until every category is at 100.

LOOP:
1. Run the full test suite (all 10 categories, all 130 tests).
2. For each failing test:
   a. Read the test failure details.
   b. Read the source code that governs the failing behavior.
   c. Diagnose the root cause.
   d. Fix the code.
   e. Re-run the specific test.
   f. If it passes, move to the next failure. If it fails again, re-read more widely and try a different fix.
3. After all failures are fixed, re-run the full suite.
4. If any test fails again (regression), fix it.
5. Continue until the full suite passes with 100 in every category.

RULES:
- Never mark a test as passed without running it.
- Never skip a failing test.
- Never suppress an error to make a test pass.
- Fix the root cause, not the symptom.
- If a test is wrong (testing for incorrect behavior), fix the test, not the system.
- Log every fix applied.

When all 130 tests pass at 100: produce a test report with the score for each category, the number of fixes applied, and the list of tests that were fixed. Store this as a SystemScore record.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 4. SOURCE RESEARCH & ENRICHMENT
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'source_research',
    label: 'Source Research & Enrichment',
    icon: '🌐',
    color: '#3b82f6',
    description: 'Prompts that invoke research of every possible lead source and enrichment of the system with maximum information for takeoffs and bids.',
    prompts: [
      {
        id: 'research_every_source',
        title: 'Research Every Possible Lead Source',
        description: 'Research and catalog every possible construction lead source — government portals, permit databases, aggregators, social platforms, and marketplaces — for all 50 states.',
        invokeFn: 'discoverNorthAmericaSources',
        prompt: `You are the AUTOLEADS Source Research Engine. Research and catalog every possible construction lead source for all 50 US states.

RESEARCH TARGETS:
1. GOVERNMENT PROCUREMENT PORTALS (per state):
   - State procurement offices (e.g., myfloridamarketplace.com, emars.com, bidsync.com)
   - Department of Transportation (e.g., fdot.gov, dot.state.tx.us)
   - County procurement portals (every county in every state)
   - City procurement portals (every major city)
   - School district procurement
   - University procurement
   - Airport authority procurement
   - Port authority procurement
   - Transit authority procurement
   - Water/wastewater district procurement
   - Housing authority procurement

2. PERMIT DATABASES (per state):
   - County building permit portals (every county)
   - City building permit portals (every major city)
   - Property appraiser databases (owner lookup)
   - Open data portals (Socrata, ArcGIS, open data)
   - Permit aggregation services

3. FEDERAL APIs:
   - SAM.gov (federal opportunities)
   - USAspending.gov (federal spending)
   - Grants.gov (federal grants)
   - FedBizOpps / beta.SAM.gov
   - DOD procurement
   - GSA schedules
   - Army Corps of Engineers

4. AGGREGATORS & PRIVATE PLATFORMS:
   - ConstructConnect, Dodge Construction Network, BidClerk, BuildingConnected
   - PlanHub, iSqFt, Dodge PlanRoom
   - BidNetDirect, DemandStar
   - GovernmentBids, BidPrime

5. SOCIAL & COMMUNITY:
   - Craigslist (all US subdomains)
   - Facebook Marketplace + Groups
   - Reddit (r/DIY, r/HomeImprovement, r/Construction, r/Concrete, r/Flooring)
   - Nextdoor
   - HomeAdvisor, Angi, Thumbtack, Houzz, Porch
   - ContractorTalk, FlooringForum, GarageJournal

6. COMMERCIAL REAL ESTATE:
   - LoopNet, Crexi, CommercialCafe
   - CoStar, Crexi
   - BizJournals construction news
   - CRE development announcements

For each source found:
- Record: name, URL, source_type, jurisdiction, trades, priority, category.
- Add to the appropriate shared sources file (floridaDemandSources, universalLeadSources, northAmericaCoverage).
- Create ScrapeSource records for new sources.
- Validate reachability using the cloud browser engine.

The goal: 500+ sources covering all 50 states, all source categories, with zero gaps in geographic or category coverage.`,
      },
      {
        id: 'enrich_all_sources_max_data',
        title: 'Enrich All Sources to Maximum Data',
        description: 'For every source, research how to extract maximum information — every field, every document, every contact — and implement the extraction.',
        prompt: `You are the AUTOLEADS Source Enrichment Engine. For every ScrapeSource, research how to extract maximum information and implement the extraction.

For each source:
1. Visit the source URL using the cloud browser engine.
2. Analyze the page structure: what data is available? (title, description, specs, contacts, dates, values, documents, plans, addenda, bid forms)
3. Identify the extraction strategy:
   - Is there an API? (Socrata, ArcGIS, REST endpoints)
   - Is there structured data? (JSON-LD, microdata, tables)
   - Is there a document download? (PDF plans, specs, addenda)
   - Is there a planholder portal? (requires registration)
4. Implement the extraction:
   - Add field-level extraction (not just title + URL — get EVERY available field).
   - Download and store document links (plans, specs, addenda, bid forms).
   - Extract contact information (name, email, phone, address).
   - Extract project details (value, square footage, timeline, location).
   - Extract trade/scope information (floor finish, substrate, area).
5. Translate raw HTML to readable markdown using the source translator.
6. Generate clean PDF documents from translated sources.
7. Enrich each project with:
   - Location eligibility (IN_SERVICE_AREA, OUT_OF_SERVICE_AREA, etc.)
   - Trade matching (does this project match the org's trade?)
   - Customer type classification (8 archetypes)
   - Bidability score (0-100)
   - Validation completeness (0-100)
   - Validation gaps (missing fields list)

The goal: every source yields maximum data. Every project has all available fields populated. Zero null critical fields. Zero ambiguous extractions.`,
      },
      {
        id: 'fill_all_takeoff_categories',
        title: 'Fill All Takeoff Data Categories Equally',
        description: 'Ensure all takeoff data categories are equally filled with the data needed for sound takeoffs and bid proposals.',
        invokeFn: 'autoTakeoff',
        prompt: `You are the AUTOLEADS Takeoff Data Enrichment Engine. Ensure all takeoff data categories are equally filled with the data needed for sound takeoffs and bid proposals.

TAKEOFF DATA CATEGORIES (ensure each is fully populated for every project):
1. AREA MEASUREMENTS:
   - Total square footage
   - Room/zone breakdown (each room's area)
   - Linear feet (walls, edges, transitions)
   - Wall surface area (if vertical coating)
   - Stair square footage (if applicable)

2. FLOOR FINISH SPECIFICATIONS:
   - Finish type (epoxy, polished concrete, VCT, LVT, polyaspartic, urethane cement)
   - Number of coats
   - Color/pigment
   - Decorative elements (flakes, metallic, quartz)

3. SUBSTRATE CONDITIONS:
   - Existing floor type (concrete, wood, tile, VCT)
   - Surface condition (smooth, damaged, cracked, contaminated)
   - Moisture test results
   - Surface preparation needed (grind, shot blast, scarify)

4. EDGE & TRANSITION DETAILS:
   - Cove base linear feet
   - Transition strips
   - Control joints
   - Expansion joints
   - Drains and penetrations

5. PROJECT LOGISTICS:
   - Access constraints (hours, parking, elevator)
   - Equipment needs (grinders, mixers, ventilation)
   - Material delivery requirements
   - Schedule constraints

6. PRICING INPUTS:
   - Material costs (from Material entity / supplier pricing)
   - Labor rates (from PricingProfile)
   - Equipment costs
   - Overhead allocation
   - Margin target

For each project with a takeoff:
- Read the current takeoff data.
- Identify which categories have data and which are empty.
- For empty categories: attempt to extract the data from project documents (specs, plans, source HTML).
- If the data isn't available in documents: use the LLM to infer from available context.
- If truly unknown: mark as 'unknown' with explanation (not null).
- Update the takeoff with all extracted/inferred data.
- Recalculate the estimate with the enriched data.

The goal: every takeoff has all 6 categories populated. Zero empty critical fields. Sound estimates based on complete data.`,
      },
      {
        id: 'maximize_bid_proposal_intelligence',
        title: 'Maximize Bid Proposal Intelligence',
        description: 'Enrich the system with maximum intelligence for bid proposals — winning bid history, competitor analysis, pricing intelligence.',
        invokeFn: 'runBenchmarkResearch',
        prompt: `You are the AUTOLEADS Bid Intelligence Engine. Enrich the system with maximum intelligence for bid proposals.

1. WINNING BID HISTORY:
   - Research recent winning bid prices for each scope (epoxy, polished concrete, VCT, LVT, urethane cement) in each geographic area (city, county, state, region, national).
   - Use InvokeLLM with add_context_from_internet to search for published bid results.
   - Store winning bid data in PricingProfile.winning_bid_history.
   - Update scope_pricing_tiers with low/mid/high based on winning bids from the last 3 months.

2. COMPETITOR ANALYSIS:
   - Research competitors in the service area (other flooring/concrete contractors).
   - Identify their pricing, specialties, project history, strengths/weaknesses.
   - Store competitor intelligence in the PricingProfile.

3. MARKET PRICING INTELLIGENCE:
   - Research current material prices from suppliers (Sherwin-Williams, Rust-Oleum, Tennant, Stonhard, Key Resin).
   - Update Material entity with current pricing.
   - Research labor rates by region (BLS data, RSMeans).
   - Update PricingProfile.labor_hourly_rate and labor_weekly_cost.

4. COST FACTOR ANALYSIS:
   - For each scope, analyze cost factors: travel, per diem, overnight, material, labor, overtime, tools, misc.
   - Store cost breakdown in scope_pricing_tiers.cost_breakdown.
   - Generate pricing_tiers_explanation with AI-generated guidance.

5. FUTURE OUTLOOK:
   - Research market trends (material shortages, labor availability, demand forecasts).
   - Store in PricingProfile.future_outlook.
   - Generate financial_intelligence summary.

6. PROPOSAL ENRICHMENT:
   - For each proposal: add competitive positioning (why we win, what differentiates us).
   - Add value engineering suggestions (alternative materials/methods that save money).
   - Add risk assessment (potential issues, mitigation strategies).
   - Add project timeline with milestones.

The goal: every proposal is backed by real market intelligence, winning bid data, and competitive analysis. The user has maximum information to make sound pricing decisions.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 5. CLOUD BROWSER MAXIMUM CAPABILITY
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'cloud_browser',
    label: 'Cloud Browser Maximum Capability',
    icon: '🖥️',
    color: '#8b5cf6',
    description: 'Prompts that invoke maximum utilization of the cloud browser engine for data extraction with zero failures.',
    prompts: [
      {
        id: 'cloud_browser_max_utilization',
        title: 'Cloud Browser Maximum Utilization',
        description: 'Ensure the cloud browser engine is used at its maximum capability to extract maximum data from all sources with zero ambiguity, null, or failures.',
        prompt: `You are the AUTOLEADS Cloud Browser Optimization Engine. Ensure the cloud browser engine is used at its maximum capability.

1. VERIFY ENGINE HEALTH:
   - Check BROWSER_ENGINE_URL and BROWSER_ENGINE_API_KEY secrets are set.
   - Test session creation: POST to /sessions — verify a session ID is returned.
   - Test navigation: create a session, navigate to a test URL, verify content is extracted.
   - Test cleanup: delete the session, verify it's gone.
   - If any step fails: diagnose and fix the engine configuration.

2. MAXIMIZE EXTRACTION CAPABILITY:
   - For every scraper that handles JS-heavy sites (social media, forums, modern portals):
     a. Use cloudBrowserExtract to navigate and extract full page text.
     b. Scroll to load lazy content (infinite scroll feeds on Reddit, Facebook, Craigslist).
     c. Wait for dynamic content to render.
     d. Extract ALL text content (not just the first page).
     e. Handle CAPTCHAs: detect, log, and skip (don't crash).
     f. Handle login walls: detect, mark source as 'auth_required', skip.
   - For every scraper that handles simple sites (static HTML, APIs):
     a. Use direct HTTP fetch (faster, more efficient).
     b. Fall back to cloud browser only if direct fetch fails.

3. ZERO FAILURE TOLERANCE:
   - Every source must either return data or be marked with a specific error.
   - No null results without explanation.
   - No ambiguous data — if a field can't be extracted, mark it as 'unknown' not null.
   - If a source fails 3 times: quarantine it and create a SystemFlag.
   - If a source is auth-required: mark it and create a SystemFlag for manual credential setup.

4. SESSION MANAGEMENT:
   - Create a session per scrape (don't reuse sessions across sources).
   - Always clean up sessions after extraction (DELETE /sessions/:id).
   - Set reasonable timeouts (30s for session creation, 90s for extraction).
   - Handle session limits gracefully (if max sessions reached, wait and retry).

5. CONTENT EXTRACTION QUALITY:
   - Extract the full readable text (not just meta tags).
   - Preserve structure (headings, lists, tables) in the extracted content.
   - Extract links (document downloads, planholder portals, addenda).
   - Extract images (logos, project photos) and store URLs.
   - Extract forms (bid forms, registration forms) and their field names.

6. MONITORING:
   - Log every cloud browser session: URL, session ID, content length, time taken, success/failure.
   - Track success rate per source. If a source's success rate drops below 80%, investigate.
   - Track average extraction time. If it exceeds 30s, optimize.

The goal: the cloud browser engine is the primary extraction tool for JS-heavy sites. Zero unexplained failures. Maximum data extraction from every source. No null or ambiguous results tolerated.`,
      },
      {
        id: 'cloud_browser_source_verification',
        title: 'Cloud Browser Source Verification Sweep',
        description: 'Use the cloud browser to verify every unverified source and validate all active sources are still returning data.',
        invokeFn: 'seedDemandSources',
        prompt: `You are the AUTOLEADS Source Verification Engine. Use the cloud browser to verify every source.

1. VERIFICATION SWEEP:
   - Get all ScrapeSource records with status 'unverified'.
   - For each: use cloudBrowserExtract to navigate to the source URL.
   - If content is extracted (length > 100 chars): mark as 'active', record last_success_date.
   - If extraction fails: try direct HTTP fetch as fallback.
   - If both fail: mark as 'error', record the error, increment error_count.
   - If error_count reaches 3: mark for pruning.

2. ACTIVE SOURCE VALIDATION:
   - Get all ScrapeSource records with status 'active'.
   - For each: re-verify using cloudBrowserExtract.
   - If a previously active source now fails: mark as 'error', create a SystemFlag.
   - If a source has been active but returning 0 data for 7+ days: investigate.

3. AUTH-REQUIRED DETECTION:
   - If the cloud browser detects a login wall: mark source as 'auth_required'.
   - Create a SystemFlag with fix_description: 'Register for an account at [URL] and add credentials to Secrets.'
   - Do not retry auth-required sources automatically.

4. PARSER VALIDATION:
   - For each active source: verify the parser can extract at least title and description.
   - If the parser returns empty: mark as 'parser_error', create a SystemFlag.

5. REPORT:
   - Total sources, active, error, unverified, auth_required counts.
   - Success rate percentage.
   - List of newly verified sources.
   - List of newly failed sources.
   - List of auth-required sources needing manual setup.

The goal: zero unverified sources. Every source is either active, error (with specific cause), or auth_required (with manual setup instructions).`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 6. SELF-MANAGEMENT & AI TEAM
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'self_management',
    label: 'Self-Management & AI Team',
    icon: '🤖',
    color: '#6366f1',
    description: 'Prompts that invoke self-management systems, self-enhancement loops, and an AI team that continuously monitors for optimum performance.',
    prompts: [
      {
        id: 'deploy_ai_monitoring_team',
        title: 'Deploy AI Monitoring Team',
        description: 'Deploy a team of AI agents that continuously monitor the system for optimum performance — each with a specific domain.',
        prompt: `You are the AUTOLEADS AI Team Deployer. Deploy a team of AI agents that continuously monitor the system.

AI TEAM ROSTER (create or verify each agent in base44/agents/):

1. SYSTEM_QA AGENT (system_qa.jsonc):
   - Monitors: system health scores, data gaps, system flags.
   - Triggers: when SystemScore drops below 80, when new SystemGap or SystemFlag is created.
   - Actions: run system audit, auto-heal, re-score.
   - Schedule: every 6 hours.

2. QA_MONITOR AGENT (qa_monitor.jsonc):
   - Monitors: validation gates, takeoff quality, proposal completeness.
   - Triggers: when a validation gate fails, when a takeoff has low completeness.
   - Actions: run validation, flag issues, trigger re-validation.
   - Schedule: every 2 hours.

3. OPS_COMMANDER AGENT (ops_commander.jsonc):
   - Monitors: scraping operations, source health, pipeline throughput.
   - Triggers: when sources fail, when pipeline stalls, when throughput drops.
   - Actions: restart failed sources, re-run pipeline, optimize scraping.
   - Schedule: every hour.

4. EXPERT_APPROVAL_PROXY AGENT (expert_approval_proxy.jsonc):
   - Monitors: proposals awaiting approval, bid packages ready for review.
   - Triggers: when a proposal enters 'internal_review' or 'send_pending'.
   - Actions: review proposal, validate completeness, approve or flag for human review.
   - Schedule: on-demand (triggered by pipeline events).

5. SYSTEM_AGENT (system_agent.jsonc):
   - Monitors: overall system state, all entities, all workflows.
   - Triggers: on any critical system event.
   - Actions: coordinate other agents, escalate to human, run full cycle.
   - Schedule: continuous.

For each agent:
- Verify the agent config file exists and is properly configured.
- Verify the agent has the necessary entity and function permissions.
- Verify the agent's conversation UI is accessible.
- Set up workflows that trigger each agent on its schedule.
- Test each agent by invoking it with a test message.

The goal: a fully autonomous AI team that monitors every aspect of the system 24/7 and takes corrective action without human intervention.`,
      },
      {
        id: 'self_enhancement_system',
        title: 'Self-Enhancement System',
        description: 'A self-enhancement loop where the system continuously identifies its own weaknesses and improves itself.',
        invokeFn: 'selfReflect',
        prompt: `You are the AUTOLEADS Self-Enhancement Engine. Implement a continuous self-enhancement loop.

SELF-ENHANCEMENT LOOP (run every cycle):
1. SELF-REFLECTION:
   - Run selfReflect to analyze the last pipeline run.
   - Identify what went well, what failed, what was suboptimal.
   - Generate an LLM analysis of system performance.

2. GAP IDENTIFICATION:
   - Compare current system capabilities against the maximum possible capabilities.
   - Identify features that similar systems (Procore, Buildertrend, ConstructConnect) have that AUTOLEADS doesn't.
   - Create SystemGap records for each identified gap.

3. SELF-IMPROVEMENT:
   - For each gap that can be auto-fixed: implement the improvement.
   - For each gap requiring human input: create an ActionItem for the user.
   - Log every improvement made.

4. PERFORMANCE OPTIMIZATION:
   - Identify slow pages, slow functions, slow queries.
   - Optimize them (add indexes, reduce query scope, add caching, lazy load).
   - Measure before/after performance.

5. QUALITY ENHANCEMENT:
   - Identify pages with low UX quality (missing loading states, poor mobile, no dark mode).
   - Enhance them.
   - Identify functions with poor error handling.
   - Improve them.

6. CAPABILITY EXPANSION:
   - Identify new data sources that could be added.
   - Identify new integrations that would benefit the user.
   - Identify new AI capabilities (better extraction, smarter scoring, richer proposals).
   - Implement the most impactful ones.

7. LEARNING:
   - Track bid outcomes (won/lost) and learn from them.
   - Update pricing intelligence based on won/lost bids.
   - Update source quality scores based on lead conversion rates.
   - Store learnings in OutcomeLearning.

Create a SelfReflectionLog record for each cycle with pre-scores, post-scores, issues identified, fixes applied, and the LLM analysis. The goal: the system gets better every cycle without human intervention.`,
      },
      {
        id: 'continuous_optimization_loop',
        title: 'Continuous Optimization Loop',
        description: 'A never-ending optimization loop that keeps the system at maximum capability at all times.',
        prompt: `You are the AUTOLEADS Continuous Optimization Engine. Run a never-ending optimization loop.

LOOP (repeat indefinitely):
1. AUDIT: Run a full system audit (runSystemAudit). Score every category.
2. IDENTIFY: Find the lowest-scoring category.
3. FIX: Focus all effort on raising that category's score.
4. VERIFY: Re-run the audit for that category. Confirm improvement.
5. REPEAT: Move to the next lowest-scoring category.
6. ESCALATE: When all categories are at 90+, focus on:
   - Adding new capabilities (research similar systems, implement missing features).
   - Enhancing existing capabilities (more data, better UX, faster performance).
   - Hardening security (penetration testing, edge case handling).
   - Expanding coverage (more sources, more states, more trades).
7. MONITOR: After all categories are at 100:
   - Run the audit every hour.
   - If any category drops below 100, immediately fix it.
   - Log every fluctuation.

RULES:
- Never stop optimizing. There is always something to improve.
- Never accept a score below 100. If it drops, fix it immediately.
- Never skip a category. Every category matters.
- Document every optimization. Create a changelog.
- When you discover a new best practice, implement it across the entire system.

The goal: the system is always at 100 in every category, always improving, always expanding. Zero stagnation tolerated.`,
      },
      {
        id: 'self_healing_pipeline',
        title: 'Self-Healing Pipeline',
        description: 'A self-healing system that detects failures and automatically repairs them without human intervention.',
        invokeFn: 'runAutoHeal',
        prompt: `You are the AUTOLEADS Self-Healing Engine. Implement automatic failure detection and repair.

SELF-HEALING TRIGGERS:
1. SOURCE FAILURE: When a scrape source fails:
   - Auto-detect (error_count > 0, last_error present).
   - Auto-fix: re-verify the source, update the URL if changed, update the parser if the page structure changed.
   - If unfixable: quarantine and create a SystemFlag.

2. PIPELINE STALL: When the pipeline stops producing output:
   - Auto-detect (no new projects in 24 hours, no new takeoffs in 48 hours).
   - Auto-fix: restart the pipeline from the stalled stage.
   - If restall persists: diagnose the root cause and fix it.

3. DATA CORRUPTION: When data integrity issues are detected:
   - Auto-detect (orphaned records, duplicate records, null required fields).
   - Auto-fix: merge duplicates, delete orphans, fill nulls with inferred values.
   - Log every fix.

4. PERFORMANCE DEGRADATION: When performance drops:
   - Auto-detect (page load > 3s, API response > 2s).
   - Auto-fix: optimize queries, add caching, reduce payload.
   - Measure before/after.

5. SECURITY BREACH: When a security issue is detected:
   - Auto-detect (unauthorized access attempt, RLS failure).
   - Auto-fix: tighten RLS, revoke access, audit affected records.
   - Alert the admin immediately.

6. INTEGRATION FAILURE: When an integration stops working:
   - Auto-detect (Stripe webhook failure, Gmail sync error, Calendar sync error).
   - Auto-fix: re-authorize, update tokens, retry.
   - If unfixable: create a SystemFlag and alert.

For each healing action:
- Log the trigger, diagnosis, fix applied, and result.
- Create a SelfReflectionLog record summarizing the healing cycle.
- Update SystemScore with the post-healing scores.

The goal: the system heals itself. Zero human intervention needed for routine failures. Every failure is detected, diagnosed, and fixed automatically.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 7. PRODUCTION READINESS & HARDENING
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'production_readiness',
    label: 'Production Readiness & Hardening',
    icon: '🚀',
    color: '#0891b2',
    description: 'Prompts that invoke hardening until the system is fully production-ready with zero gaps, flaws, or issues.',
    prompts: [
      {
        id: 'zero_gaps_production_hardening',
        title: 'Zero Gaps Production Hardening',
        description: 'Harden the system until there are zero gaps, zero flaws, and zero issues. Fully production and launch ready.',
        prompt: `You are the AUTOLEADS Production Hardening Engine. Harden the system until it is fully production-ready with zero gaps, flaws, or issues.

HARDENING CHECKLIST (every item must pass):

1. ENTITIES: Every entity has proper RLS, every field has validation, every enum is complete, no orphaned fields.

2. FUNCTIONS: Every function has auth, error handling, timeout handling, org scoping, input validation. No hardcoded secrets. No dead code.

3. PAGES: Every page loads with real data, has loading/empty/error states, is responsive, uses design tokens, works in dark mode. No broken imports. No dead buttons.

4. WORKFLOWS: Every workflow has correct triggers, valid steps, no infinite loops, proper error handling. All scheduled workflows have correct cron expressions.

5. INTEGRATIONS: All connectors authorized with correct scopes. All secrets set. Stripe webhooks registered and validating. Gmail, Calendar, Drive, Sheets all working.

6. SECURITY: RLS prevents cross-tenant access. Admin-only operations restricted. No secrets in frontend. All API endpoints authenticated. Security scan passes.

7. PERFORMANCE: Pages load < 3s. API responses < 2s. Large lists paginated. Heavy components lazy-loaded. No memory leaks.

8. DATA: No orphaned records. No duplicates. No null required fields. No stale data. All records properly scoped.

9. SCRAPING: All sources verified. Zero unverified sources. Active sources returning data. Error sources diagnosed. Auth-required sources flagged.

10. AI PIPELINE: Takeoff extraction complete. Estimate calculation accurate. Proposal generation complete. Validation gates passing. Critic review functioning.

11. TESTING: All 130 tests passing at 100. 3 consecutive end-to-end runs pass. No regressions.

12. MONITORING: AI team deployed and monitoring. Self-reflection running. Self-healing active. Continuous optimization loop running.

For each checklist item:
- Audit the current state.
- If not passing: fix it.
- Re-verify.
- If still not passing: escalate and try a different approach.
- Do not move to the next item until the current one passes.

When all 12 items pass: declare the system PRODUCTION READY. Create a final SystemScore with all categories at 100. Generate a launch readiness certificate.`,
      },
      {
        id: 'launch_readiness_certification',
        title: 'Launch Readiness Certification',
        description: 'Final certification that the system is ready for production launch with proof of every category at 100.',
        prompt: `You are the AUTOLEADS Launch Readiness Certifier. Certify that the system is ready for production launch.

CERTIFICATION PROCESS:
1. Run the full system audit (runSystemAudit). Record all scores.
2. Run the full test suite (runSystemTest). Record all test results.
3. Run the data integrity check (runDataIntegrity). Record all issues.
4. Run the security audit. Record all findings.
5. Run the UI audit (runUiAudit). Record all page scores.
6. Run the source coverage audit (runStateCoverageAudit). Record all coverage.
7. Run 3 consecutive end-to-end tests. All must pass at 100.

CERTIFICATION CRITERIA (all must be met):
- [ ] SystemScore overall_health_score = 100
- [ ] All 10 test categories at 100
- [ ] Zero open SystemGaps
- [ ] Zero open SystemFlags
- [ ] Zero unverified ScrapeSources
- [ ] All 50 states have coverage
- [ ] All 7 source categories have sources
- [ ] All pages load with real data
- [ ] All workflows active and functioning
- [ ] All integrations authorized and working
- [ ] 3 consecutive E2E tests pass at 100
- [ ] Security scan passes
- [ ] No critical or high-severity issues
- [ ] AI team deployed and monitoring
- [ ] Self-healing active
- [ ] Cloud browser engine healthy and extracting data

If any criterion is not met: fix it and re-verify. Do not certify until ALL criteria are met.

OUTPUT: A Launch Readiness Certificate with:
- Date of certification
- All scores (system, tests, coverage, security, UI)
- Proof of 3 E2E passes
- List of all criteria met (with checkmarks)
- Any remaining notes or recommendations
- A declaration: "AUTOLEADS is certified PRODUCTION READY for launch."

Store the certificate as a SystemScore record. Send a copy to jeremy@xtremepolishingsystems.com.`,
      },
      {
        id: 'continuous_hardening_until_perfect',
        title: 'Continuous Hardening Until Perfect',
        description: 'Continuously harden the system until it is at maximum capability with zero issues, then maintain that state.',
        prompt: `You are the AUTOLEADS Continuous Hardening Engine. Harden the system until it is perfect, then maintain that state.

PHASE 1 — HARDEN (until all scores are 100):
- Run the full system audit.
- Find the lowest-scoring area.
- Focus all effort on hardening that area:
  - Fix every bug.
  - Add every missing feature.
  - Optimize every slow path.
  - Secure every vulnerability.
  - Test every flow.
- Re-audit. If the score improved, move to the next lowest area. If not, try a different approach.
- Continue until every area is at 100.

PHASE 2 — VERIFY (3 consecutive passes):
- Run the full E2E test 3 times.
- All 3 must pass at 100 in every category.
- If any run fails: fix the failure, restart from Run 1.
- Do not proceed to Phase 3 until 3 consecutive passes.

PHASE 3 — MAINTAIN (indefinitely):
- Run the audit every hour.
- If any score drops below 100: immediately fix it.
- Monitor for new issues (new sources failing, new data gaps, new security concerns).
- When new issues appear: fix them immediately.
- When new capabilities become available (new sources, new integrations, new AI models): evaluate and implement.
- Log every action in a changelog.

PHASE 4 — ENHANCE (when stable):
- Research similar systems for new features.
- Implement the most impactful missing features.
- Optimize what's already working (faster, richer, smarter).
- Expand coverage (more states, more sources, more trades).
- Deepen intelligence (better extraction, smarter scoring, richer proposals).

RULES:
- Zero tolerance for scores below 100.
- Zero tolerance for open issues.
- Zero tolerance for stagnation.
- Every issue is fixed immediately.
- Every improvement is implemented immediately.
- The system is always at maximum capability.

The goal: a system that is always perfect, always improving, always at the cutting edge of what's technologically possible.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────
  // 8. CAPABILITY GAP ANALYSIS
  // ─────────────────────────────────────────────────────────────────────
  {
    id: 'capability_gap',
    label: 'Capability Gap Analysis',
    icon: '📊',
    color: '#ec4899',
    description: 'Prompts that invoke a complete analysis of system capabilities — what exists, what is missing, and all gaps.',
    prompts: [
      {
        id: 'list_all_capabilities',
        title: 'List Every System Capability',
        description: 'Enumerate every single capability the system currently has — entities, functions, pages, workflows, integrations, AI features.',
        prompt: `You are the AUTOLEADS Capability Enumerator. List every single capability the system currently has.

CATEGORIZE ALL CAPABILITIES:

1. DATA ENTITIES (list every entity with its purpose):
   - Read every file in base44/entities/. For each, record: name, purpose, field count, RLS status.

2. BACKEND FUNCTIONS (list every function with its purpose):
   - Read every file in base44/functions/. For each, record: name, purpose, auth type, integrations used.

3. PAGES (list every page with its purpose):
   - Read every file in src/pages/. For each, record: name, route, purpose, data sources.

4. WORKFLOWS (list every workflow with its trigger):
   - Read every file in base44/workflows/. For each, record: name, trigger, steps, schedule.

5. INTEGRATIONS (list every connected service):
   - List all authorized connectors (Gmail, Calendar, Drive, Sheets, Stripe).
   - List all secrets-based integrations (SAM.gov, BrowserBase, cloud browser engine).

6. AI CAPABILITIES (list every AI-driven feature):
   - LLM-powered extraction, classification, scoring, proposal generation, critic review, self-reflection.

7. SCRAPING CAPABILITIES (list every scraper):
   - Permits, social, FDOT, federal APIs, agendas, news, contractors, browser.

8. AUTOMATION CAPABILITIES (list every automated workflow):
   - Nightly source validation, daily autopilot, full pipeline, self-reflection, critic sweep, email alerts, push notifications.

9. SECURITY CAPABILITIES:
   - RLS, admin roles, access levels, API keys, audit logs.

10. BUSINESS CAPABILITIES:
   - Lead discovery, qualification, takeoff, estimating, proposal generation, bid submission, outreach, scheduling, invoicing, payments, change orders, contracts, e-signatures.

For each capability: record its current status (fully functional, partially functional, broken, not implemented) and a completeness score (0-100).

Store the complete capability list as a structured report. This becomes the baseline for gap analysis.`,
      },
      {
        id: 'list_missing_capabilities',
        title: 'List Every Missing Capability',
        description: 'Research similar systems (Procore, Buildertrend, ConstructConnect, Dodge) and list every capability AUTOLEADS should have but does not.',
        prompt: `You are the AUTOLEADS Gap Analyst. Research similar systems and list every capability AUTOLEADS should have but does not.

BENCHMARK AGAINST:
- Procore (enterprise construction management)
- Buildertrend (residential/commercial PM)
- ConstructConnect (preconstruction + bid management)
- Dodge Construction Network (project intelligence + leads)
- PlanGrid (document management + field collaboration)
- BidClerk (lead discovery)
- BuildingConnected (bid management + prequalification)
- CoConstruct (residential client communication)
- JobTread (estimating + project management)
- RedTeam (commercial contracting)

RESEARCH EACH SYSTEM'S CAPABILITIES:
Use InvokeLLM with add_context_from_internet to research each system's feature list.

For each capability that similar systems have:
1. Record the capability name and description.
2. Determine if AUTOLEADS has it (fully, partially, or not at all).
3. If missing or partial: create a SystemGap record with:
   - gap_description: what's missing
   - recommended_fix: how to implement it
   - priority: critical/high/medium/low
   - benchmark_source: which system has this

CATEGORIES TO ANALYZE:
1. PROJECT MANAGEMENT: scheduling, Gantt charts, critical path, resource allocation, daily logs, RFIs, submittals, transmittals, punch lists, change orders, time tracking.
2. FINANCIAL: job costing, budget tracking, purchase orders, invoicing, progress billing, lien waivers, payroll integration, QuickBooks sync.
3. DOCUMENT MANAGEMENT: plan versioning, sheet comparison, markup/redlining, mobile document access, offline mode, OCR.
4. COLLABORATION: team chat, file sharing, comment threads, @mentions, task assignment, notification center.
5. FIELD: mobile forms, photo capture, GPS check-in, daily reports, safety inspections, equipment tracking.
6. CLIENT PORTAL: project timeline sharing, selection management, change order approvals, payment portal, document sharing.
7. ESTIMATING: assembly-based estimating, unit cost databases, RSMeans integration, what-if scenarios, historical cost tracking.
8. BID MANAGEMENT: bid calendar, bid leveling, competitor tracking, win/loss analysis, bid history, prequalification.
9. LEAD INTELLIGENCE: project discovery, market analysis, competitor intelligence, geographic coverage, early-stage planning alerts.
10. INTEGRATIONS: accounting (QuickBooks, Sage), CRM (HubSpot, Salesforce), scheduling (Microsoft Project, Primavera), document (Box, Dropbox), communication (Slack, Teams).
11. REPORTING: custom dashboards, scheduled reports, KPI tracking, financial reports, project status reports.
12. AI/ML: automated takeoff, cost prediction, risk assessment, schedule optimization, document analysis, bid recommendations.

For each missing capability: assess the effort to implement (low/medium/high) and the impact on the user (low/medium/high). Prioritize by impact × effort ratio.

The goal: a complete list of every capability AUTOLEADS should have, with prioritized implementation recommendations.`,
      },
      {
        id: 'list_all_gaps_issues',
        title: 'List All Gaps, Problems & Inefficiencies',
        description: 'List every gap, problem, inefficiency, and issue in the current system with severity and fix recommendations.',
        prompt: `You are the AUTOLEADS Issue Enumerator. List every gap, problem, inefficiency, and issue in the current system.

SOURCES OF ISSUES:
1. SystemGap records (all open gaps).
2. SystemFlag records (all open flags).
3. Forensic audit findings (from the last runSystemAudit).
4. Data integrity issues (from the last runDataIntegrity).
5. Source health issues (failing sources, uncovered states).
6. UI/UX issues (from the last runUiAudit).
7. Security issues (from the security audit).
8. Performance issues (slow pages, slow functions).
9. Integration issues (failing connectors, expired tokens).
10. Known issues (from the project's known_issues list).

For each issue:
- Record: title, description, severity (critical/high/medium/low), category, root cause, recommended fix, effort estimate.
- Create or update SystemFlag/SystemGap records.
- Group by category and severity.

CATEGORIES:
- DATA GAPS: missing data, incomplete records, null fields.
- FUNCTIONAL GAPS: missing features, broken features, partial features.
- PERFORMANCE: slow pages, slow functions, slow queries, memory leaks.
- SECURITY: RLS gaps, auth gaps, secret exposure, injection risks.
- UI/UX: missing loading states, poor mobile, no dark mode, broken navigation.
- INTEGRATION: failing connectors, expired tokens, missing webhooks.
- SCRAPING: failing sources, uncovered areas, parser errors, auth-required sources.
- AI: poor extraction quality, low confidence scores, missing intelligence.
- WORKFLOW: broken workflows, incorrect schedules, infinite loops.
- BUSINESS LOGIC: incorrect calculations, missing validations, edge cases.

Produce a prioritized issue list sorted by severity (critical first, then high, then medium, then low). For each issue, include the exact fix needed and the estimated effort. This becomes the work backlog for the auto-heal engine.`,
      },
    ],
  },
];

// Flatten all prompts for easy access
export const ALL_PROMPTS = PROMPT_CATEGORIES.flatMap(cat =>
  cat.prompts.map(p => ({ ...p, category: cat.id, categoryLabel: cat.label, categoryIcon: cat.icon, categoryColor: cat.color }))
);

export const PROMPT_COUNT = ALL_PROMPTS.length;
export const CATEGORY_COUNT = PROMPT_CATEGORIES.length;