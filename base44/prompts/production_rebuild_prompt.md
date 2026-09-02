# AUTOLEADS — Production-Ready Rebuild Prompt (Exhaustive)

> **Copy this entire document into a new Base44 agent conversation.** It is self-contained: system context, architecture, known issues, build order, and acceptance criteria. The agent should not need to ask you anything to begin.

---

## YOUR MISSION

You are rebuilding AUTOLEADS — an autonomous preconstruction operating system for construction contractors — into a **production-ready, enterprise-grade application** on the Base44 platform. A prior version exists and is functional (100/100 audit score), but it has architectural debt, security issues, incomplete integrations, and UX gaps that must be resolved for production launch.

**Your goal:** A system that thousands of construction businesses can use daily to automatically discover leads, generate takeoffs and estimates, draft proposals, manage bids, send outreach, sign contracts, and collect payments — with zero manual data entry and zero fabricated data.

**You are building on Base44.** Do not propose Kafka, Kubernetes, Temporal, or external infrastructure. Work within the platform's capabilities: entities, backend functions, workflows, connectors, React frontend, and the built-in SDK. Maximize what the platform can do; bridge its limits with external API calls from backend functions where necessary.

---

## SYSTEM CONTEXT

### What AUTOLEADS Is
A preconstruction operating system that automates the 8-step pipeline:
1. **Lead Discovery** — scrape government portals, federal APIs, permit data, news feeds, and email inboxes for construction opportunities
2. **Qualification** — verify and score leads against the contractor's trade, service area, and capacity
3. **Takeoff** — AI-powered quantity takeoff from project plans and specs
4. **Estimating** — AI-powered cost estimation from takeoffs, pricing profiles, and material databases
5. **Proposal** — AI-drafted proposal generation from estimates, scope systems, and contract templates
6. **Submission** — bid submission tracking, deadline management, follow-up automation
7. **Contract** — contract generation, e-signature, and execution
8. **Payment** — invoicing, Stripe payment collection, and revenue tracking

### The 8-Step Pipeline (Master Navigation Hub)
Every page in the app maps to one of these 8 steps. The navigation is organized around this pipeline. Do not deviate from this structure.

### Brand & Design
- **Primary accent:** `#f2df0d` (gold/yellow)
- **Text:** Black on light, white on dark
- **Dark mode:** Enabled throughout (system preference + toggle)
- **Mobile-first:** Designed for 374px viewport first, scales to desktop
- **PWA:** Installable, home-screen support, offline service worker
- **Buttons:** Solid gold with black text for primary actions
- **Cards:** `card-3d` class with subtle shadows
- **Typography:** Inter for body/headings, Oswald for brand
- **No beige/cream tones** — clean high-tech light grays
- **Icons:** lucide-react, modern minimalist, black/gold schemes

### Color Tokens (src/index.css)
- `--brand: 46 100% 50%` (the gold)
- `--brand-foreground: 0 0% 5%` (black)
- `--brand-muted: 46 80% 40%`
- Light and dark mode both defined
- Tailwind config maps all tokens

---

## ENTITY MODEL (34 Entities)

Every entity has built-in fields: `id`, `created_date`, `updated_date`, `created_by_id`. Every entity has `data_class` (enum: `production` | `NON_PRODUCTION_EXAMPLE`, default `production`) and `organization_id`. Every entity has RLS: create/read/update/delete allowed for the record owner OR admins.

### Core Pipeline Entities
1. **Project** — The central entity. Fields: title, description, specs, contract_info, project_type, jurisdiction, stage (qualification→takeoff→estimating→proposal→submitted→won→scheduled→in_progress→completed→lost), value, bid_due_date, client_name, authority, source_id, source_url, address, trade, confidence, bidability_score, verification_status (unverified/verified/failed), verified_date. Required: title, description, source_url, jurisdiction, authority, trade, specs, contract_info, client_name.
2. **Takeoff** — project_id, scope, system_code, document_id, sheet, page, scale, calibrated, measurement_formula, raw_quantity, waste_factor, final_quantity, unit, spec_evidence, addendum_evidence, model_version, prompt_version, confidence, reviewer_decision (pending/approved/rejected), approval_state.
3. **Estimate** — project_id, title, status (draft/in_review/approved/rejected), labor_total, material_total, equipment_total, overhead_total, subtotal, margin_pct, margin_total, grand_total, takeoff_ids[], version, approved_by, approved_date.
4. **Proposal** — project_id, title, content, status, version, sent_date, approved_by, approved_date, total_value.
5. **ProposalPackage** — Bundled proposal assets.
6. **SignedContract** — Executed contracts.
7. **EsignDocument** — project_id, proposal_id, contract_id, title, document_type, status (draft/sent/viewed/signed/declined/expired), signers[], file_url, content, expires_date.
8. **Invoice** — project_id, contract_id, invoice_number, status (draft/sent/paid/partial/overdue/void), line_items[], subtotal, tax, total, balance_due, due_date, paid_date.
9. **Payment** — Payment records.
10. **PaymentPreference** — Tenant payment settings.

### Lead Generation Entities
11. **ScrapeSource** — name, url, source_type (government_portal/aggregator/email/api/manual), jurisdiction, target_cities[], trades, status (active/paused/error/unverified), last_run_date, last_success_date, records_retrieved, error_count, last_error, schedule_cron, parser_version, confidence.
12. **BidInvitation** — subject, sender, received_date, matched_project_id, deadline, status (needs_match/needs_review/assigned/duplicate/declined), assigned_to, source_id, confidence.
13. **Opportunity** — Extended opportunity tracking.
14. **PipelineEvent** — Event log for pipeline state changes.
15. **ProjectImage** — Images attached to projects.

### CRM Entities
16. **CompanyProfile** — name, trade, website, phone, email, address, city, state, zip, employees, trucks, equipment_setups, license_number, bonding_capacity, relationship_strength, prior_awards, source_id, confidence.
17. **Contact** — full_name, title, company_id, company_name, email, phone, role (owner/architect/engineer/gc/subcontractor/supplier/other), relationship_strength, last_contact_date, source_id, confidence.
18. **ContractorApp** — Public-facing contractor brochure app. company_name, logo_url, tagline, about, primary_color, secondary_color, layout_style, hero_image_url, share_slug, is_published, brochure_html, business_card_html, services[], benefits[], contact_phone, contact_email, website.

### Pricing & Scope Entities
19. **ScopeSystem** — code, name, scope, description, aliases[], specifications, materials[] (material, unit, coverage), unit, price_low, price_high, tags[].
20. **PricingProfile** — Pricing configurations.
21. **Material** — Material database.
22. **Recommendation** — AI-generated recommendations with status tracking.

### Communication Entities
23. **EmailTemplate** — name, subject, body, purpose (follow_up/outreach/bid_response/introduction/reminder/thank_you/custom), ai_generated, approval_status (pending/approved/rejected), trigger_description, auto_send.
24. **Message** — Communication records.
25. **Notification** — In-app notifications.

### Automation & Task Entities
26. **ActionItem** — title, category (opportunity_review/bid_inbox/takeoff_review/proposal_approval/source_health/follow_up), priority (critical/high/medium/low), due_date, status (open/done/snoozed), linked_record_id, route.
27. **AgentTask** — title, description, category, priority, status (open/in_progress/done/snoozed/blocked), due_date, assigned_to, linked_record_id, linked_route, ai_prepared, requires_approval.
28. **AutomationConfig** — scrape_cadence (1h/4h/6h/12h/24h), auto_takeoff (auto/review/manual), auto_proposal, auto_outreach, notification_frequency (realtime/daily/weekly), autonomy_level (full_auto/semi_auto/manual).

### System Health Entities
29. **SystemScore** — overall_health_score, data_quality_score, pipeline_efficiency_score, security_score, ui_completeness_score, benchmark_rank, score_breakdown (JSON), open_gaps, run_phase (audit/benchmark/integrity/heal/ui_audit).
30. **SystemGap** — title, category (stub_page/broken_navigation/data_integrity/missing_workflow/non_functional_ui/security/performance/other), severity (critical/high/medium/low), description, file_path, status (open/in_progress/fixed/wont_fix), fix_summary.
31. **Benchmark** — competitor_name, category (construction_os/ai_takeoff/ai_bidding), features[], pricing_model, ai_capabilities, market_position, differentiators, source_url, last_researched_date, autoleads_gap.

### Branding & Contract Entities
32. **BrandAsset** — name, type (logo/proposal_template), file_url, content, prompt, source (ai_generated/uploaded/authored), is_default.
33. **ContractTemplate** — trade, contract_type (commercial/government/residential/industrial/universal), title, content, terms, ai_generated, validation_status (pending/validated/rejected/needs_review), validated_by_ai, validated_by_user, is_standard, source_url, version.
34. **Job** — Background job tracking.

### Built-in
- **User** — id, created_date, full_name, email, role (admin/user). Read-only. Users join via invites, not creation.

---

## BACKEND FUNCTIONS (Existing — Reuse, Don't Duplicate)

### Scraping & Lead Generation
- `runAutoScrape` — Orchestrates all scrapers (federal, permits, news, agendas, portals). Reads state/counties/trades filters.
- `scrapeFederalAPIs` — SAM.gov, USAspending, Grants.gov. Incremental NAICS processing.
- `scrapePermits` — Socrata open-data portals for building permits.
- `scrapeNewsFeeds` — Industry news for project announcements.
- `scrapeAgendas` — Planning commission agendas.
- `browserScrape` — Browserbase-powered scraping for government portals.
- `discoverSources` — Discovers new scrape sources.
- `verifyProject` — Verifies a project's data against its source URL.

### AI Pipeline
- `autoTakeoff` — AI-powered quantity takeoff from project specs.
- `autoProposals` — AI-drafted proposals from estimates. Batch processing.
- `autoFollowUp` — Auto-generates follow-up emails for unanswered proposals.
- `runFullPipeline` — End-to-end pipeline: verify → takeoff → estimate → proposal.
- `morningDigest` — Daily bid notification digest.

### Integrations (Connector-Backed)
- `gmailSync` / `gmailIngestBids` / `sendEmail` / `aiEmailResponse` — Gmail connector (authorized).
- `syncCalendar` / `scheduleJob` — Google Calendar connector (authorized).
- `driveRead` / `driveBrowse` / `driveBundle` / `driveChunk` / `scanDriveBids` — Google Drive connector (authorized).
- `hubspotSync` — HubSpot connector (registered, unauthorized).

### Contracts & Payments
- `generateContract` — AI contract generation from templates.
- `projectContract` — Project-specific contract management.
- `esignFlow` — E-signature workflow.
- `createInvoiceForProject` — Invoice creation.
- `createPaymentIntent` — Stripe payment intent creation.
- `stripeWebhook` — Stripe webhook handler.
- `getStripeConfig` — Returns Stripe publishable key to frontend.

### System Health
- `runSystemAudit` — Scores the system across 5 dimensions.
- `runDataIntegrity` — Cleans orphaned records, enriches missing fields.
- `runAutoHeal` — Fixes detected issues automatically.
- `runUiAudit` — Audits UI completeness.
- `runRecursiveAudit` — 44-test recursive audit with self-reflection and auto-fix. Runs up to 5 iterations until 100/100.
- `runBenchmarkResearch` — Competitor benchmark research.
- `runUserTest` — User-defined test execution.

### Shared Utilities
- `base44/shared/systemUtils.ts` — Entity list, gap creation, date helpers, web fetch.
- `base44/shared/internalAuth.ts` — Dual-mode auth (user session + service token).
- `base44/shared/scrapeUtils.ts` — Project creation, deduplication, enrichment, trade filtering.
- `base44/shared/scopeSystemsData.ts` — Scope system seed data.

---

## WORKFLOWS (Existing — Scheduled Automations)

1. **System Autopilot** — Every 2 hours: audit, benchmark, integrity, heal, UI audit.
2. **Auto Scrape Opportunities** — Every 6 hours: run auto scrape.
3. **Pipeline Advancement** — Every 4 hours: advance projects through stages.
4. **Full Pipeline Autopilot** — Every 4 hours: scrape → verify → takeoff → proposal.
5. **Auto Generate Proposals** — Every 6 hours: batch proposal generation.
6. **Morning Lead Digest** — Daily 6am ET: send lead digest notifications.
7. **Auto Follow-Up** — Daily 9am ET: generate follow-up emails.

All workflows authenticate via `INTERNAL_SERVICE_TOKEN` secret (passed as `_service_token` in the invoke payload).

---

## CONNECTORS

### Authorized (Ready to Use)
- **Gmail** — `gmail.send`, `gmail.readonly`, email scopes. Supports webhooks (mailbox).
- **Google Calendar** — `calendar`, email scopes. Supports webhooks (events).
- **Google Drive** — `drive.readonly`, email scopes. Supports webhooks (changes, file events).

### Registered but Unauthorized (Need User Connection)
- HubSpot, Google Sheets, Google Docs, Google Tasks, Supabase.

### Stripe
- Test mode (sandbox). Products configured: Free, Starter ($100), Pro ($149), Growth ($200), Professional ($400), Business ($500), Enterprise ($499).
- Secrets: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Webhook endpoint: `https://autoleads.base44.app/functions/stripeWebhook`.
- Account is **unclaimed** — user must claim in Dashboard → Integrations before live payments.

---

## KNOWN ISSUES (Must Fix Before Production)

### Security
1. **Internal service token is hardcoded in all workflow JSONC files.** It's a literal string that matches the `INTERNAL_SERVICE_TOKEN` secret. Anyone with repo access has full service-role access. Rotate the token and update all workflows.
2. No per-tenant encryption keys (platform limitation — document as known).
3. No SOC2/compliance certifications (platform limitation — document as roadmap).

### Data Integrity
4. Scrape filters (state/counties/trades) from the UI have field-name mismatches with the backend — state filtering is broken, county filtering is silently dropped.
5. Trade-relevance filter hard-rejects federal/aggregator leads that don't mention niche trade keywords. This is the root cause of "federal scrapers returning zero leads."
6. Post-enrichment mandatory gate drops leads when LLM calls fail (timeout, rate limit). Real leads vanish with no log.
7. No cross-source deduplication — same project from 3 sources creates 3 records.
8. Trade keyword cache never invalidates — stale filters after company profile changes.
9. `autoEstimateValue` creates broken Estimate records during scraping (math is wrong, collides with real estimating step).
10. `data_class: NON_PRODUCTION_EXAMPLE` records are not filtered out of production list views.

### Scraping
11. SAM.gov quota exhaustion with no progress persistence — NAICS loop breaks on 429 and restarts from zero.
12. Grants.gov API endpoint is likely wrong (404s silently).
13. Socrata permit coverage is only 4 cities — not national. Need top 20-30 metros.
14. `runAutoScrape` swallows all errors — users see "0 leads" with no reason.
15. 174 seed sources are `unverified` and `NON_PRODUCTION_EXAMPLE` — must be verified and promoted to production.

### UI/UX
16. Mobile horizontal overflow on LeadDiscovery and ProjectDetail (374px viewport).
17. LeadDiscovery trade filter matches against `authority` field instead of `trade` field.
18. PipelineFlow "Get Leads" is fire-and-forget with blind setTimeout refreshes — no real loading state.
19. Stripe payment flow is dead code — no frontend calls `createPaymentIntent`. Need a Pay button component.
20. Unauthorized connectors silently fail — no user signal that sync isn't working.

### Pipeline
21. Projects get stuck in qualification stage — no automated advancement.
22. Missing takeoffs and estimates for projects — data gaps in the pipeline.
23. No "Needs Enrichment" queue for incomplete leads.

---

## ARCHITECTURE DECISIONS (Enforce These)

1. **State-only jurisdiction matching** — Never match by city or county name strings. Match by state code only to avoid format mismatches that cause data loss.
2. **Cross-source deduplication** — Use normalized title + jurisdiction as a second dedup layer after source_url.
3. **Incremental NAICS processing** — Never loop all NAICS codes in one run. Process 5 per run, persist progress, resume next run.
4. **TTL caching for trade keywords** — 5-minute TTL, not module-level permanent cache.
5. **Separate ingest from enrich** — Always create the Project record with available data. Enrichment is best-effort, never blocks creation.
6. **Confidence scoring, not hard rejection** — Leads that don't match trade keywords get a confidence penalty (0.5), not a rejection. Only reject if no trade/ScopeSystem is configured.
7. **Service token authentication** — All internal workflows use `_service_token` matching `INTERNAL_SERVICE_TOKEN` secret.
8. **Real data only** — Every lead must trace to a real, verifiable `source_url`. Never fabricate data with an LLM.
9. **Per-source error tracking** — Every scrape source tracks `error_count`, `last_error`, `last_run_date`, `last_success_date`.
10. **Multi-county and multi-trade selection** — Backend scraping functions accept arrays, not single values.
11. **Square county cards** — Lead discovery displays results as square cards grouped by county showing lead counts.
12. **Native select for county** — Not chip-based multi-select. Use a dropdown for improved mobile interaction.

---

## DESIGN PREFERENCES (Enforce These)

1. **Dark mode** throughout (system preference + toggle).
2. **PWA** with mobile installation and home screen support.
3. **`#f2df0d`** as the primary brand accent.
4. **Real-time data bindings** to Base44 entities — never hardcode mock placeholders.
5. **Loading spinners** and EmptyState components when data is unavailable.
6. **No beige/cream** — clean high-tech light grays.
7. **Modern minimalist icons** — black and gold schemes, lucide-react only.
8. **8-step pipeline** as the master hub for all navigation and UI organization.
9. **Scrape filters** — state, multi-select county, multi-select trade inputs.
10. **Scraping results** — square cards grouped by county showing lead counts.
11. **Solid gold buttons** with black text for primary actions.
12. **Mobile-first** — 374px viewport first, then scale up.

---

## BUILD ORDER (Execute In This Sequence)

### Phase 1: Security & Data Integrity Fixes (Critical)
1. **Rotate the internal service token.** Generate a new 32+ char random token. Update `INTERNAL_SERVICE_TOKEN` secret. Replace the literal in all `base44/workflows/*.jsonc` files.
2. **Fix scrape filter field names.** Backend reads `body.stateCode || body.state`, `body.counties`, `body.trades`. Pass counties to `scrapePermits` and `browserScrape`. Filter sources by jurisdiction.
3. **Replace trade-relevance hard reject with confidence penalty.** Non-matching leads get `confidence: 0.5` and are still created. Only reject if no trade/ScopeSystem configured.
4. **Remove post-enrichment mandatory gate.** Always create Project records with available data. Enrichment is best-effort. Incomplete leads get `verification_status: "unverified"`.
5. **Add cross-source deduplication.** After source_url dedup, check normalized title + jurisdiction. Skip if match exists.
6. **Fix `autoEstimateValue`** — remove Estimate creation during scraping. Only set `Project.value`. Estimates belong to the estimating step.
7. **Add TTL to trade keyword cache** — 5-minute expiry, not permanent.
8. **Filter `NON_PRODUCTION_EXAMPLE` from all list views** — add `data_class: "production"` to all entity list/filter calls in pipeline pages.

### Phase 2: Scraping Reliability (High)
9. **Fix SAM.gov quota handling** — persist NAICS index on 429, resume next run. Reduce to 5 NAICS per run. Add 2s delay between requests.
10. **Fix Grants.gov endpoint** — test live, switch to correct API URL if 404.
11. **Expand Socrata permit coverage** — add top 20 US metros by construction volume (NYC, LA, Houston, Phoenix, Dallas, Miami, Atlanta, Denver, Boston, etc.).
12. **Surface scrape errors to UI** — `runAutoScrape` returns `errors[]` array. Frontend shows toast with count and first error.
13. **Verify and activate the 174 seed sources** — start with Florida, expand state by state. Live-test each URL, classify format, build parser, verify sample record, promote to production.

### Phase 3: UI/UX Fixes (High)
14. **Fix mobile horizontal overflow** — `break-words`, `min-w-0`, `overflow-hidden` on LeadDiscovery and ProjectDetail. Wrap tables in `overflow-x-auto`.
15. **Fix LeadDiscovery trade filter** — filter on `o.trade` (fallback `o.title`), not `o.authority`.
16. **Replace fire-and-forget scrape with real loading state** — `await` the invoke, show spinner, subscribe to Project create events for incremental refresh.
17. **Build `PayInvoiceButton` component** — calls `createPaymentIntent`, mounts Stripe Elements, confirms payment. Add to Invoices page for unpaid invoices.
18. **Surface connector authorization status** — when a connector-backed function fails, return `{ blocker: "CONNECTOR_NOT_AUTHORIZED", connector: "hubspot" }`. UI shows "Reconnect" prompt.

### Phase 4: Pipeline Automation (Medium)
19. **Automate pipeline advancement** — workflow moves qualified projects to takeoff → estimating → proposal based on completeness.
20. **Generate missing takeoffs and estimates** — batch function that finds projects missing takeoffs/estimates and generates them.
21. **Build "Needs Enrichment" queue** — UI page showing projects with null value/specs/bid_due_date. One-click enrich button.
22. **Wire all empty page stubs to real data** — no page should show "coming soon" or empty state without an action.

### Phase 5: Production Hardening (Medium)
23. **Verify Stripe webhook endpoint** — confirm URL is `https://autoleads.base44.app/functions/stripeWebhook`. Test with test card `4242 4242 4242 4242`.
24. **Add `base44_app_id` metadata** to all Stripe checkout sessions, payment links, and subscriptions.
25. **Block checkout in iframe** — frontend checks if running in iframe, alerts user that checkout works only from published app.
26. **Run recursive audit** — invoke `runRecursiveAudit` and confirm 100/100 across all 7 dimensions (data quality, pipeline, security, UI, user experience, completeness, orphans/gaps).
27. **Verify all 34 entities** have RLS configured (owner OR admin for all 4 operations).
28. **Verify all workflows** are active and running on schedule.

### Phase 6: Go-to-Market Readiness (Low)
29. **"Powered by AUTOLEADS" footer** on every contractor app share link and proposal.
30. **Freemium tier** — free lead digest, paid takeoffs + proposals. Configure Stripe products for each tier.
31. **Trade-specific landing pages** — SEO-optimized pages for each construction trade.
32. **Referral program** — track referrals, reward advocates.

---

## ACCEPTANCE CRITERIA (Production-Ready Means ALL of These)

### Security
- [ ] Internal service token is rotated and not committed to any synced repo
- [ ] All 34 entities have RLS (owner OR admin for create/read/update/delete)
- [ ] No secrets are hardcoded in source files (only in secrets manager)
- [ ] Stripe webhook endpoint is verified and signing secret is stored

### Data Integrity
- [ ] Scrape filters (state, counties, trades) flow end-to-end from UI to scraper
- [ ] No leads are hard-rejected for trade mismatch — they get a confidence penalty
- [ ] No leads are dropped when enrichment fails — they persist as "unverified"
- [ ] Cross-source deduplication prevents duplicate projects
- [ ] Trade keyword cache has a 5-minute TTL
- [ ] No `NON_PRODUCTION_EXAMPLE` records appear in production list views
- [ ] `autoEstimateValue` does not create Estimate records during scraping

### Scraping
- [ ] SAM.gov scraper persists NAICS progress and resumes on 429
- [ ] Grants.gov endpoint is verified and returns real data
- [ ] Socrata permit coverage includes 20+ US metros
- [ ] `runAutoScrape` returns an `errors[]` array surfaced in the UI
- [ ] At least 50 of the 174 seed sources are verified and promoted to production

### UI/UX
- [ ] No horizontal scroll overflow on any page at 374px viewport
- [ ] LeadDiscovery trade filter uses the `trade` field, not `authority`
- [ ] Scrape actions show a real loading state, not fire-and-forget
- [ ] `PayInvoiceButton` is wired and functional on the Invoices page
- [ ] Connector authorization failures show a "Reconnect" prompt in the UI
- [ ] Dark mode works on every page
- [ ] PWA is installable with offline support

### Pipeline
- [ ] Projects advance automatically from qualification → takeoff → estimating → proposal
- [ ] Missing takeoffs and estimates are generated automatically
- [ ] "Needs Enrichment" queue exists and is functional
- [ ] No page shows an empty state without an actionable next step

### Payments
- [ ] Stripe checkout works from the published app (not in iframe)
- [ ] `base44_app_id` metadata is on all Stripe objects
- [ ] Invoice payment updates invoice status to "paid" via webhook
- [ ] Test card `4242 4242 4242 4242` completes a full payment cycle

### System Health
- [ ] `runRecursiveAudit` returns 100/100 across all 7 dimensions
- [ ] All 7 workflows are active and running on schedule
- [ ] No open `SystemGap` records with severity "critical" or "high"
- [ ] `SystemScore` trend shows stable 90+ over the last 10 runs

---

## EXECUTION RULES

1. **Work in the build order above.** Do not skip phases. Complete each phase before moving to the next.
2. **After each numbered fix, verify it.** Read the changed file, run a test, or invoke the function. Do not mark complete without verification.
3. **Do not add new features.** Fix what's listed. If you see an adjacent issue, note it as a `SystemGap` record and continue.
4. **Do not refactor untouched code.** Make surgical changes. Only refactor when the fix can't land cleanly.
5. **Use `find_replace` for edits, `write_file` for new files.** Never rewrite an entire file for a small change.
6. **Every new component gets its own file.** Components should be 50 lines or less. Break oversized pages into focused components.
7. **Use `@/` alias imports** — never relative `src/` paths.
8. **Use lucide-react icons only** — verify the icon exists before importing.
9. **Use Tailwind literal class strings** — no dynamic class names (the build purges them).
10. **Use the `Image` component from `@/components/ui/image`** for all content images — never plain `<img>`.
11. **Let errors bubble up** — no try/catch unless it's a user-facing form/auth flow.
12. **Run `runRecursiveAudit` after completing all phases** to confirm 100/100.
13. **If a fix is blocked** (e.g., Stripe endpoint can't be verified), say so explicitly, note it as a `SystemGap`, and move to the next.
14. **Never fabricate data.** Every lead must trace to a real `source_url`. Every entity record must come from a real source or user action.
15. **Log every recommendation as a `Recommendation` record** with status tracking.
16. **Run a self-audit after each phase** to measure improvement.

---

## WHAT NOT TO DO

- Do not propose Kafka, Kubernetes, Temporal, or external infrastructure — you are on Base44.
- Do not create new entities unless the data model requires it — reuse the 34 existing entities.
- Do not create duplicate backend functions — reuse the 40+ existing functions.
- Do not hardcode mock data in UI templates — bind to real Base44 entities.
- Do not add unverified regional Socrata URLs — validate each returns rows before shipping.
- Do not use city-based jurisdiction matching for county-scoped scraping — use state-only.
- Do not add hard constraints that silence leads when post-enrichment fields are missing.
- Do not inline SVG logos — use the branded PNG assets.
- Do not rewrite `src/App.jsx` wholesale — edit surgically, preserve the platform scaffold.
- Do not remove or rewrite auth routes that already exist.
- Do not create parallel versions of auth pages — edit in place.
- Do not use `require()` or `module.exports` — this is ESM only.
- Do not import `cn` from `@/utils` — it comes from `@/lib/utils`.
- Do not use JSX in `.js` files — only `.jsx`/`.tsx`.
- Do not call hooks conditionally, in loops, or inside handlers.

---

## FINAL VERIFICATION

After completing all phases, run this end-to-end test:

1. **Invoke `runAutoScrape`** with `{ stateCode: "FL", counties: [], trades: [] }` — confirm `totalCreated > 0` and no errors.
2. **Invoke `runRecursiveAudit`** — confirm 100/100 across all 7 dimensions.
3. **Invoke `runFullPipeline`** — confirm projects advance through stages.
4. **Invoke `createPaymentIntent`** with a test invoice — confirm it returns a `client_secret`.
5. **Read every changed file** — confirm no syntax errors, no missing imports.
6. **Check `SystemScore`** — confirm the latest record shows 90+ overall.
7. **Check `SystemGap`** — confirm no open critical or high-severity gaps remain.

If all 7 checks pass, the system is production-ready. Report the final score, the list of fixes applied, and any remaining blockers (e.g., Stripe account claim, connector authorization) that require user action.

---

## CONTEXT FOR THE AGENT

- The app is currently at 100/100 audit score but has architectural debt.
- 174 seed sources are in the database but unverified.
- The user's primary market is Florida — start there and expand.
- The Stripe account is in test mode (sandbox) — use test card `4242 4242 4242 4242`.
- Gmail, Google Calendar, and Google Drive connectors are authorized and ready.
- HubSpot, Google Sheets, Google Docs, Google Tasks are registered but unauthorized — surface this to the user, don't silently fail.
- The app is a PWA — maintain offline support and installability.
- The app publishes to iOS/Android from the same code — design responsively.
- The user's timezone is America/New_York.
- The current date is 2026-08-15.

**Begin with Phase 1, Fix 1. Do not ask for clarification — the prompt is exhaustive. If you hit a genuine blocker, note it and continue.**