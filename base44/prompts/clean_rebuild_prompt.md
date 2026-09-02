# AUTOLEADS — Clean Rebuild Prompt

> **Copy this entire document into a new, empty Base44 app conversation.** It is fully self-contained. Do not ask for clarification — build exactly what is described, in the order given. The prior version of this app became unmaintainable; you are starting fresh.

---

## YOUR MISSION

Build **AUTOLEADS** — an autonomous preconstruction operating system for construction contractors — as a clean, production-grade application on the Base44 platform.

**The goal:** A mobile-first app that lets a construction business automatically discover leads, swipe through them Tinder-style, generate takeoffs and estimates, draft proposals, manage bids, send outreach, sign contracts, and collect payments — with zero manual data entry and zero fabricated data.

**You are on Base44.** Use entities, backend functions, workflows, connectors, React + Tailwind frontend, and the built-in SDK. Do not propose Kafka, Kubernetes, Temporal, or external infrastructure. Bridge platform limits with backend-function API calls where needed.

---

## WHAT AUTOLEADS IS

A preconstruction operating system that automates an 8-step pipeline:

1. **Lead Discovery** — Scrape government portals, federal APIs, permit data, news feeds, and email inboxes for construction opportunities.
2. **Qualification** — Verify and score leads against the contractor's trade, service area, and capacity. The signature UX is a **Tinder-style Lead Feed** where the user swipes right to pursue (advances pipeline stage) or left to skip (marks lost).
3. **Takeoff** — AI-powered quantity takeoff from project plans and specs.
4. **Estimating** — AI-powered cost estimation from takeoffs, pricing profiles, and material databases.
5. **Proposal** — AI-drafted proposal generation from estimates, scope systems, and contract templates.
6. **Submission** — Bid submission tracking, deadline management, follow-up automation.
7. **Contract** — Contract generation, e-signature, and execution.
8. **Payment** — Invoicing, Stripe payment collection, and revenue tracking.

The **8-step pipeline is the master navigation hub.** Every page maps to one of these 8 steps. The primary entry point is the **Lead Feed** (swipe interface), not a dashboard.

---

## DESIGN SYSTEM (Enforce Strictly)

### Brand
- **Primary accent:** `#f2df0d` (gold/yellow). Solid gold buttons with black text for all primary actions.
- **Text:** Black on light, white on dark.
- **Dark mode:** Enabled throughout (system preference + manual toggle).
- **Mobile-first:** Design for 374px viewport first, then scale up to desktop.
- **PWA:** Installable, home-screen support, offline service worker.
- **No beige/cream tones** — clean high-tech light grays only.
- **Icons:** lucide-react only, modern minimalist, black/gold schemes. Verify each icon exists before importing.
- **Typography:** Inter for body/headings, Oswald for brand wordmark.

### Color Tokens (`src/index.css`)
```
--brand: 46 100% 50%          /* the gold #f2df0d */
--brand-foreground: 0 0% 5%   /* black */
--brand-muted: 46 80% 40%
```
Define both `:root` (light) and `.dark` variants. Map all tokens in `tailwind.config.js`. Use token classes (`bg-primary`, `font-heading`) in JSX — never hardcoded hex values.

### Component Standards
- Every component is ≤50 lines and gets its own file. Break oversized pages into focused sub-components.
- Use shadcn/ui from `@/components/ui`. Use the `Image` component from `@/components/ui/image` for all content images — never plain `<img>`.
- Loading spinners and EmptyState components everywhere data is unavailable. Never hardcode mock data — bind to real Base44 entities.
- `card-3d` class for entity cards (subtle shadows, hover lift).
- 44px minimum touch targets on mobile form controls.

### Coding Rules
- ESM only — no `require()` or `module.exports`.
- `@/` alias imports only — never relative `src/` paths.
- Tailwind classes as literal strings — no dynamic class names (the build purges them).
- Let errors bubble up — no try/catch unless it's a user-facing form/auth flow.
- Hooks called only at component top level — never conditional, in loops, or in handlers.
- `cn` comes from `@/lib/utils`, `createPageUrl` from `@/utils`.

---

## NAVIGATION ARCHITECTURE

### Top Bar (desktop + mobile header)
- AutoLeads logo (left, links to `/auto-pipeline`)
- Desktop nav: Pipeline · Feed · Bids · Automate
- Right: Account menu, Notifications bell, Help, mobile menu toggle

### Mobile Bottom Tab Bar (5 items, fixed)
1. **Feed** → `/leads` (Radar icon) — the Lead Feed swipe interface
2. **Bids** → `/bids` (BriefcaseBusiness) — Bid Board
3. **Takeoff** → `/takeoff` (FileText) — Takeoff Workspace
4. **Proposals** → `/proposals` (FileText) — Proposals
5. **More** → opens PipelineMenu overlay (all other tools)

### PipelineMenu (mobile "More" overlay)
Full-screen accordion organized by the 8 pipeline steps. Each step expands to show its tool pages. Plus a "Hub Tools" section (Daily Autopilot, AI Command Center, Reports, Analytics, Notifications, Team, Settings, Admin, System Health, Help).

### Desktop Sidebar — AI Assistant Rail
A collapsible right-side rail with an AI chat assistant that can see the current page, answer questions, and navigate the user to any page. Collapsible to a thin gold bar.

---

## THE LEAD FEED (Signature Feature — Build This First)

This is the primary, addictive, mobile-first experience. Inspired by Tinder.

### Data Flow
- Fetches `Project` records, filtered to active pipeline stages (`qualification`, `takeoff`, `estimating`, `proposal`, `submitted`) that have a non-null `value`.
- Excludes already-swiped projects (tracked in local `Set` state: `pursuedIds`, `skippedIds`).
- Optional filters: state, trade (collapsible filter bar).

### SwipeCard Component
- Framer Motion draggable card. Drag right >120px = pursue. Drag left <−120px = skip.
- Card shows: project value (large, gold gradient header), authority, title, trade tag, jurisdiction tag, description (3-line clamp), bid due-date badge (color-coded by urgency), AI confidence bar (animated, color-coded).
- Glassmorphism "SKIP" / "PURSUE" labels fade in as you drag.
- Background card scales down slightly behind the top card.

### Swipe Actions
- **Pursue (swipe right or green button):** Advance the project to its next pipeline stage (qualification→takeoff→estimating→proposal→submitted→won). Increment pursued counter. Add to `pursuedIds`.
- **Skip (swipe left or red button):** Set project stage to `lost`. Increment skipped counter. Add `skippedValue` to running total. Add to `skippedIds`.
- **Detail (center Zap button):** Navigate to `/projects/:id` for full project detail.
- **Undo:** Toast appears after each swipe with an Undo button (3.5s auto-dismiss). Undo removes the ID from the swiped set and restores the previous stage.

### Money on the Table Component
A dashboard card above the card stack showing:
- **Skipped Value** — total $ of projects you skipped (the "money on the table")
- **Won** — total $ of projects in `won` stage
- **Pursued** — count of pursued projects
- **Pursuit Rate** — animated progress bar (pursued / total seen)

### Empty State
When no leads remain: animated pulsing radar icon, "You're all caught up", button to browse all leads.

---

## ENTITY MODEL

Every entity has built-in fields: `id`, `created_date`, `updated_date`, `created_by_id`. Every entity has `data_class` (enum: `production` | `NON_PRODUCTION_EXAMPLE`, default `production`) and `organization_id`. Every entity has RLS: create/read/update/delete allowed for the record owner OR admins (`$or: [{created_by_id: "{{user.id}}"}, {user_condition: {role: "admin"}}]`).

### Core Pipeline Entities
1. **Project** — title, description, specs, contract_info, project_type, jurisdiction, stage (qualification→takeoff→estimating→proposal→submitted→won→scheduled→in_progress→completed→lost, default qualification), value, bid_due_date, client_name, authority, source_id, source_url, address, trade, confidence, bidability_score, verification_status (unverified/verified/failed), verified_date. Required: title, description, source_url, jurisdiction, authority, trade, specs, contract_info, client_name.
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
26. **ActionItem** — title, category, priority (critical/high/medium/low), due_date, status (open/done/snoozed), linked_record_id, route.
27. **AgentTask** — title, description, category, priority, status (open/in_progress/done/snoozed/blocked), due_date, assigned_to, linked_record_id, linked_route, ai_prepared, requires_approval.
28. **AutomationConfig** — scrape_cadence (1h/4h/6h/12h/24h), auto_takeoff (auto/review/manual), auto_proposal, auto_outreach, notification_frequency (realtime/daily/weekly), autonomy_level (full_auto/semi_auto/manual).

### System Health Entities
29. **SystemScore** — overall_health_score, data_quality_score, pipeline_efficiency_score, security_score, ui_completeness_score, benchmark_rank, score_breakdown (JSON), open_gaps, run_phase.
30. **SystemGap** — title, category, severity (critical/high/medium/low), description, file_path, status (open/in_progress/fixed/wont_fix), fix_summary.
31. **Benchmark** — competitor_name, category, features[], pricing_model, ai_capabilities, market_position, differentiators, source_url, last_researched_date, autoleads_gap.

### Branding & Contract Entities
32. **BrandAsset** — name, type (logo/proposal_template), file_url, content, prompt, source (ai_generated/uploaded/authored), is_default.
33. **ContractTemplate** — trade, contract_type (commercial/government/residential/industrial/universal), title, content, terms, ai_generated, validation_status, validated_by_ai, validated_by_user, is_standard, source_url, version.
34. **Job** — Background job tracking.

### Built-in
- **User** — id, created_date, full_name, email, role (admin/user). Read-only. Users join via invites, not creation.

---

## PAGE MANIFEST (Routes)

### Public
- `/` — Marketing home (hero, platform modules, security, CTA)
- `/pricing` — Pricing tiers (Stripe products)
- `/login`, `/register`, `/forgot-password`, `/reset-password` — Auth (boilerplate exists, do not recreate)
- `/contractor-app/:slug` — Public contractor brochure share page
- `/esign/:documentId` — E-signature page
- `/privacy`, `/terms`, `/support` — Legal/help

### Onboarding (protected)
- `/onboarding` — Setup hub
- `/get-started` — Getting started
- `/auto-leads-setup`, `/auto-bids-setup`, `/auto-app-setup`, `/auto-pricing-setup`, `/auto-system-setup`, `/auto-payments-setup`, `/auto-contact-setup` — Phase setup wizards

### App (protected, inside ApprovedShell)
**Pipeline hub:** `/auto-pipeline`, `/pipeline-flow`, `/daily-autopilot`, `/opportunity-graph`, `/bidability`, `/bid-inbox`, `/takeoff-evidence`, `/pricing-memory`, `/bid-leveling`, `/communication-control`, `/outcome-learning`, `/source-health-center`

**Leads:** `/leads` (Lead Feed), `/leads/all` (Lead Discovery), `/leads/pipeline`, `/leads/new`, `/leads/:leadId` (Project Detail)

**Bids:** `/bids` (Bid Board), `/bids/:bidId`

**Takeoff:** `/takeoff`, `/takeoff/:takeoffId`, `/scope-systems`

**Estimates:** `/estimates`, `/estimates/:estimateId`, `/pricing-intelligence`, `/material-pricing`, `/price-books`

**Proposals:** `/proposals`, `/proposals/new`, `/proposals/:proposalId`, `/proposals/:proposalId/approval`, `/finished-proposals`, `/sent-bids`, `/proposal-approvals`, `/proposal-packages`

**Email:** `/email-workflows`, `/email-templates`, `/messages`, `/communication-control`, `/auto-contact`

**Outreach:** `/outreach`, `/follow-ups`, `/tasks`, `/outcome-learning`

**Contracts:** `/contracts`

**Payments:** `/invoices`

**Calendar:** `/calendar`, `/jobs`

**CRM:** `/contractors`, `/companies`, `/contacts`, `/company-database`

**Hub:** `/dashboard`, `/notifications`, `/ai-command-center`, `/reports`, `/analytics`, `/auto-teams`

**Scraping:** `/scrapers`, `/sources`, `/source-health`, `/dead-letters`

**Settings:** `/settings` and sub-pages (company, branding, service-areas, trades, pricing, proposals, notifications, outreach, ai-autonomy, team, integrations, billing, security, data-retention, audit)

**System:** `/admin`, `/system-health`, `/system-qa`, `/test-runner`

---

## BACKEND FUNCTIONS

### Scraping & Lead Generation
- `runAutoScrape` — Orchestrates all scrapers. Reads state/counties/trades filters. Returns `{ totalCreated, errors[] }`.
- `scrapeFederalAPIs` — SAM.gov, USAspending, Grants.gov. Incremental NAICS processing (5 per run, persist progress, resume on 429).
- `scrapePermits` — Socrata open-data portals for building permits (20+ US metros).
- `scrapeNewsFeeds` — Industry news for project announcements.
- `scrapeAgendas` — Planning commission agendas.
- `browserScrape` — Browserbase-powered scraping for JS-heavy government portals.
- `discoverSources` — Discovers new scrape sources.
- `verifyProject` — Verifies a project's data against its source URL.

### AI Pipeline
- `autoTakeoff` — AI-powered quantity takeoff from project specs.
- `autoProposals` — AI-drafted proposals from estimates. Batch processing.
- `autoFollowUp` — Auto-generates follow-up emails for unanswered proposals.
- `runFullPipeline` — End-to-end: verify → takeoff → estimate → proposal.
- `morningDigest` — Daily bid notification digest.

### Integrations (Connector-Backed)
- `gmailSync` / `gmailIngestBids` / `sendEmail` / `aiEmailResponse` — Gmail connector.
- `syncCalendar` / `scheduleJob` — Google Calendar connector.
- `driveRead` / `driveBrowse` / `driveBundle` / `driveChunk` / `scanDriveBids` — Google Drive connector.
- `hubspotSync` — HubSpot connector.

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
- `runRecursiveAudit` — Recursive audit with self-reflection and auto-fix. Runs up to 5 iterations until 100/100.
- `runBenchmarkResearch` — Competitor benchmark research.
- `runUserTest` — User-defined test execution.

### Shared Utilities
- `base44/shared/systemUtils.ts` — Entity list, gap creation, date helpers, web fetch.
- `base44/shared/internalAuth.ts` — Dual-mode auth (user session + service token).
- `base44/shared/scrapeUtils.ts` — Project creation, deduplication, enrichment, trade filtering.
- `base44/shared/scopeSystemsData.ts` — Scope system seed data.

---

## WORKFLOWS (Scheduled Automations)

1. **System Autopilot** — Every 2 hours: audit, benchmark, integrity, heal, UI audit.
2. **Auto Scrape Opportunities** — Every 6 hours: run auto scrape.
3. **Pipeline Advancement** — Every 4 hours: advance projects through stages.
4. **Full Pipeline Autopilot** — Every 4 hours: scrape → verify → takeoff → proposal.
5. **Auto Generate Proposals** — Every 6 hours: batch proposal generation.
6. **Morning Lead Digest** — Daily 6am ET: send lead digest notifications.
7. **Auto Follow-Up** — Daily 9am ET: generate follow-up emails.

All workflows authenticate via `INTERNAL_SERVICE_TOKEN` secret (passed as `_service_token` in the invoke payload). Never hardcode the token in workflow files — use the secret reference.

---

## CONNECTORS

### Authorized (Ready to Use)
- **Gmail** — `gmail.send`, `gmail.readonly`, email scopes. Supports webhooks (mailbox).
- **Google Calendar** — `calendar`, email scopes. Supports webhooks (events).
- **Google Drive** — `drive.readonly`, email scopes. Supports webhooks (changes, file events).

### Registered but Unauthorized (Surface to User, Don't Silently Fail)
- HubSpot, Google Sheets, Google Docs, Google Tasks, Supabase.

### Stripe
- Test mode (sandbox). Products: Free ($0), Starter ($100/mo), Pro ($149/mo), Growth ($200/mo), Professional ($400/mo), Business ($500/mo), Enterprise ($499/mo).
- Secrets: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
- Webhook endpoint: `https://autoleads.base44.app/functions/stripeWebhook`.
- Include `metadata[base44_app_id]` on all Stripe objects.
- Block checkout in iframes — alert user that checkout works only from the published app.

---

## ARCHITECTURE DECISIONS (Enforce These)

1. **State-only jurisdiction matching** — Never match by city or county name strings. Match by state code only to avoid format mismatches that cause data loss.
2. **Cross-source deduplication** — Normalized title + jurisdiction as a second dedup layer after source_url.
3. **Incremental NAICS processing** — 5 per run, persist progress, resume next run. 2s delay between requests.
4. **TTL caching for trade keywords** — 5-minute TTL, not module-level permanent cache.
5. **Separate ingest from enrich** — Always create the Project record with available data. Enrichment is best-effort, never blocks creation. Incomplete leads get `verification_status: "unverified"`.
6. **Confidence scoring, not hard rejection** — Leads that don't match trade keywords get a confidence penalty (0.5), not a rejection. Only reject if no trade/ScopeSystem is configured.
7. **Service token authentication** — All internal workflows use `_service_token` matching `INTERNAL_SERVICE_TOKEN` secret.
8. **Real data only** — Every lead must trace to a real, verifiable `source_url`. Never fabricate data with an LLM.
9. **Per-source error tracking** — Every scrape source tracks `error_count`, `last_error`, `last_run_date`, `last_success_date`.
10. **Multi-county and multi-trade selection** — Backend scraping functions accept arrays, not single values.
11. **Filter `NON_PRODUCTION_EXAMPLE`** from all production list views — add `data_class: "production"` to entity list/filter calls.
12. **No `autoEstimateValue` during scraping** — Only set `Project.value`. Estimates belong to the estimating step.

---

## BUILD ORDER

### Phase 1: Foundation (Do This First)
1. **Set up design tokens** in `src/index.css` and `tailwind.config.js` (gold brand, dark mode, Inter/Oswald fonts).
2. **Create the ApprovedShell** — top bar, mobile bottom tabs, desktop AI assistant rail, PipelineMenu overlay.
3. **Build the Lead Feed** (`/leads`) — SwipeCard, MoneyOnTable, swipe actions, undo, filters. This is the signature feature; it must work end-to-end with real Project data.
4. **Build the Bid Board** (`/bids`) — Kanban of projects by stage.
5. **Build Project Detail** (`/leads/:leadId`, `/projects/:projectId`) — full project view with all fields.

### Phase 2: Pipeline Workspaces
6. **Takeoff Workspace** (`/takeoff`) — list + detail of takeoffs, AI generation trigger.
7. **Estimate Workspace** (`/estimates`) — estimate builder from takeoffs.
8. **Proposal Builder** (`/proposals/new`) — AI proposal generation from estimates.
9. **Proposal Detail / Approval Desk** — review and approve proposals.
10. **Contracts** (`/contracts`) — contract generation and e-signature.
11. **Invoices** (`/invoices`) — invoicing with `PayInvoiceButton` (Stripe).

### Phase 3: Lead Generation
12. **Scraping page** (`/scrapers`) — trigger scrapes with state/county/trade filters, real loading state, error surfacing.
13. **Source Management** (`/sources`) — manage scrape sources, health metrics.
14. **Lead Discovery** (`/leads/all`) — browse all leads, square county cards, filter on `trade` field (not `authority`).
15. **Bid Inbox** (`/bid-inbox`) — process email bid invitations.

### Phase 4: Communication & CRM
16. **Email Workflows** (`/email-workflows`) — email templates, AI drafts, approval gating.
17. **Outreach Center** (`/outreach`) — follow-up tracking.
18. **Contact/Company Directories** — CRM browsing.
19. **Calendar Workspace** — Google Calendar integration.

### Phase 5: Automation & System Health
20. **Daily Autopilot** (`/daily-autopilot`) — prioritized daily action plan.
21. **AI Command Center** (`/ai-command-center`) — agent task management.
22. **System Health** (`/system-health`) — scores, gaps, recommendations, recursive audit trigger.
23. **All workflows** created and active.

### Phase 6: Settings & Onboarding
24. **Settings** — company profile, branding, service areas, trades, pricing, proposals, notifications, outreach, autonomy, team, integrations, billing, security.
25. **Onboarding wizards** — phase setup flows.
26. **Marketing home** (`/`) — landing page.

### Phase 7: Production Hardening
27. **Stripe checkout** — `PayInvoiceButton` wired, iframe block, `base44_app_id` metadata.
28. **PWA** — manifest, service worker, installable.
29. **Run recursive audit** — confirm 100/100.
30. **Verify all entities have RLS**, all workflows active, no horizontal overflow at 374px.

---

## ACCEPTANCE CRITERIA

### Lead Feed
- [ ] SwipeCard renders real Project data (value, title, trade, jurisdiction, due date, confidence)
- [ ] Swipe right advances the project to its next pipeline stage
- [ ] Swipe left marks the project `lost`
- [ ] Undo button restores the previous state within 3.5s
- [ ] Money on the Table shows skipped value, won value, pursued count, pursuit rate
- [ ] Filters (state, trade) work and reset the feed
- [ ] Empty state shows when no leads remain

### Design
- [ ] Gold `#f2df0d` primary accent throughout
- [ ] Dark mode works on every page
- [ ] No horizontal scroll overflow at 374px viewport
- [ ] Mobile bottom tab bar (Feed, Bids, Takeoff, Proposals, More)
- [ ] Desktop AI assistant rail (collapsible)
- [ ] PWA installable with offline support

### Data
- [ ] Every lead traces to a real `source_url` — no fabricated data
- [ ] No `NON_PRODUCTION_EXAMPLE` records in production views
- [ ] Scrape filters flow end-to-end (state, counties, trades)
- [ ] Cross-source deduplication prevents duplicates
- [ ] No leads hard-rejected for trade mismatch — confidence penalty instead
- [ ] No leads dropped when enrichment fails — persist as unverified

### Pipeline
- [ ] Projects advance automatically through stages via workflow
- [ ] Missing takeoffs and estimates generated automatically
- [ ] No page shows an empty state without an actionable next step

### Payments
- [ ] Stripe checkout works from the published app (not in iframe)
- [ ] `base44_app_id` metadata on all Stripe objects
- [ ] Invoice payment updates status to "paid" via webhook
- [ ] Test card `4242 4242 4242 4242` completes a full payment cycle

### Security
- [ ] All entities have RLS (owner OR admin for all 4 operations)
- [ ] No secrets hardcoded in source files
- [ ] Internal service token in secrets manager, not in workflow files

### System Health
- [ ] `runRecursiveAudit` returns 100/100 across all dimensions
- [ ] All 7 workflows active and running on schedule
- [ ] No open critical/high `SystemGap` records

---

## WHAT NOT TO DO

- Do not propose Kafka, Kubernetes, Temporal, or external infrastructure.
- Do not hardcode mock data in UI — bind to real Base44 entities.
- Do not fabricate leads with an LLM — every lead needs a real `source_url`.
- Do not use city-based jurisdiction matching for county-scoped scraping — state-only.
- Do not hard-reject leads when post-enrichment fields are missing — persist as unverified.
- Do not create `Estimate` records during scraping — only set `Project.value`.
- Do not rewrite `src/App.jsx` wholesale — edit surgically, preserve the platform scaffold.
- Do not recreate auth pages that already exist — edit in place.
- Do not use `require()` or `module.exports` — ESM only.
- Do not import `cn` from `@/utils` — it comes from `@/lib/utils`.
- Do not use JSX in `.js` files — only `.jsx`/`.tsx`.
- Do not call hooks conditionally, in loops, or inside handlers.
- Do not use dynamic Tailwind class names — the build purges them.
- Do not add unverified regional Socrata URLs — validate each returns rows before shipping.

---

## CONTEXT

- The user's primary market is Florida — start scraping there and expand.
- The Stripe account is in test mode (sandbox) — use test card `4242 4242 4242 4242`.
- Gmail, Google Calendar, and Google Drive connectors are authorized.
- HubSpot, Google Sheets, Google Docs, Google Tasks are registered but unauthorized — surface this, don't silently fail.
- The app publishes to iOS/Android from the same code — design responsively.
- The user's timezone is America/New_York.

**Begin with Phase 1. Build the Lead Feed first — it is the signature feature. Do not ask for clarification. If you hit a genuine blocker, note it and continue.**