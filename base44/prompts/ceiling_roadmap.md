# AUTOLEADS Ceiling Capability Roadmap — A to Z

**Goal:** Reach 100% ceiling capability — the system is production-ready, nationwide, autonomous, self-healing, monetized, and scalable to millions of construction businesses.

**Current baseline (audited 2026-08-05):**
- 248 sources (55 active, 193 unverified)
- 361 projects (355 verified, 6 failed)
- 113 system gaps (102 fixed, 11 open)
- 30 backend functions
- 8 OAuth connectors authorized
- Stripe: test mode, unclaimed, no products

---

## A. Source Infrastructure — The Data Engine

### A1. Federal API Clients
- [ ] Fix SAM.gov API quota (exhausted until 2026-08-05) — request quota increase or rotate keys
- [ ] Fix Grants.gov API (403 Forbidden) — update headers, user-agent, API version
- [ ] Fix USAspending API (525 SSL error) — retry with TLS 1.3, fallback to Browserbase
- [ ] Build Simpler.Grants.gov API client
- [ ] Build SBA SUBNet API client
- [ ] Build GSA Forecast API client
- [ ] Build USAspending Award API client (full award details)
- [ ] Add automated quota/rate-limit handling with exponential backoff
- [ ] Add API key rotation logic

### A2. State eProcurement Parsers (top 10 by construction spend)
- [ ] California — Cal eProcure parser
- [ ] Texas — Texas SmartBuy parser
- [ ] Florida — Florida Purchasing parser (priority — user's primary market)
- [ ] New York — NY OGS parser
- [ ] Illinois — Illinois Procurement parser
- [ ] Pennsylvania — eMarketplace parser
- [ ] Ohio — Ohio Procurement parser
- [ ] North Carolina — NC eProcurement parser
- [ ] Georgia — Georgia Teamworks parser
- [ ] Washington — WEBS parser
- [ ] Remaining 46 jurisdictions

### A3. State DOT Parsers (top 10)
- [ ] Caltrans (CA)
- [ ] TxDOT (TX)
- [ ] FDOT (FL) — priority
- [ ] NYSDOT (NY)
- [ ] IDOT (IL)
- [ ] PennDOT (PA)
- [ ] ODOT (OH)
- [ ] NCDOT (NC)
- [ ] GDOT (GA)
- [ ] WSDOT (WA)
- [ ] Remaining 42 DOTs

### A4. Shared-Platform Parsers (one parser per platform, not per portal)
- [ ] BidNet Direct parser (powers hundreds of state/local portals)
- [ ] QuestCDN parser (utility/heavy civil)
- [ ] IonWave parser
- [ ] OpenGov parser
- [ ] Bonfire parser
- [ ] DemandStar parser
- [ ] PlanetBids parser
- [ ] ProcureWare parser
- [ ] BidSync parser

### A5. Local Government Census
- [ ] Download & materialize 2025 Census Government Units ZIP (~90,000 units)
- [ ] Build county procurement portal finder (3,143 counties)
- [ ] Build city procurement portal finder (19,000+ cities)
- [ ] Build special-district portal finder (38,000+ districts)
- [ ] Build township portal finder
- [ ] Build education board portal finder
- [ ] Build tribal procurement source coverage
- [ ] Fix American Samoa source mismatch

### A6. Commercial Aggregator Integrations
- [ ] ConstructConnect — research API, pricing, partnership; build client if available
- [ ] Dodge Data Network — research API, licensing; build client
- [ ] PlanHub — research API (free for subs); build client
- [ ] iSqFt — research API, pricing; build client
- [ ] BuildingConnected (Autodesk) — research API; build client
- [ ] BidNet Direct — build API client
- [ ] GovWin (Deltek) — research API, pricing; build client
- [ ] Blue Book — research data feed
- [ ] BidClerk — research data feed
- [ ] Dodge Network — research data feed

### A7. Email-Based Bid Ingestion
- [ ] Enhance gmailIngestBids parser (project name, due date, scope, location, value, contact, link)
- [ ] Build bid-invite email classifier (vs. newsletters, spam)
- [ ] Auto-create Project records from parsed emails
- [ ] Deduplicate against existing projects
- [ ] Build email-to-project linking (traceability)

### A8. Permit & Planning Sources
- [ ] Build city open-data permit scrapers (top 50 cities)
- [ ] Build BuildZoom integration
- [ ] Build permit tracking service integration
- [ ] Build planning department filing scrapers

### A9. Private Project & News Sources
- [ ] TheRealDeal.com scraper
- [ ] BizJournals scraper
- [ ] Local business journal scrapers
- [ ] AIA chapter project leads
- [ ] AGC member project lists
- [ ] ABC chapter leads
- [ ] Real estate development news feeds

### A10. Source Operations
- [ ] Assign schedule_cron to every active source
- [ ] Build source health monitoring (uptime, error rate, record yield)
- [ ] Build automated source rotation (pause failing, retry after cooldown)
- [ ] Build parser versioning & auto-update mechanism
- [ ] Build source confidence scoring

---

## B. Data Quality & Integrity

- [ ] Re-enrich all projects missing critical fields (specs, contract_info, value, bid_due_date)
- [ ] Merge duplicate projects (same source_url or title + jurisdiction)
- [ ] Fix pipeline bottleneck — advance stuck projects (111 in qualification, 114 in proposal)
- [ ] Fix runDataIntegrity timeout — parallel URL batches
- [ ] Fix discoverSources timeout (37s) — paginate, cache, or split
- [ ] Ensure self-heal runs on schedule (cron workflow)
- [ ] Build automated deduplication (fingerprint = title + jurisdiction + due_date)
- [ ] Build confidence scoring on all projects (source reliability × field completeness)
- [ ] Build bidability scoring on all projects (trade match × value × deadline × competition)
- [ ] Verify 100% of projects have real source_urls (currently 355/361)
- [ ] Fix 6 failed-verification projects
- [ ] Build data freshness tracking (last_verified_date per project)

---

## C. AI Automation Pipeline

### C1. Takeoff
- [ ] Enhance autoTakeoff — multi-file plan upload
- [ ] Build takeoff accuracy validation (compare AI quantities to manual)
- [ ] Build takeoff evidence capture (page references, area highlights)
- [ ] Build takeoff template library per trade
- [ ] Build takeoff versioning & comparison

### C2. Estimating
- [ ] Enhance estimate generation with real pricing profiles
- [ ] Build estimate accuracy validation
- [ ] Build estimate versioning
- [ ] Build material/labor/overhead breakdown
- [ ] Build margin enforcement (mandatory + preferred)

### C3. Proposals
- [ ] Enhance autoProposals with company profile & proposal package
- [ ] Build proposal quality scoring (completeness, competitiveness, clarity)
- [ ] Build proposal branding/logo integration in document preview
- [ ] Build proposal versioning & comparison
- [ ] Build proposal A/B testing (variant generation)

### C4. Follow-ups
- [ ] Enhance autoFollowUp — 3/7/14 day escalating schedule
- [ ] Build follow-up response detection (stop following up after reply)
- [ ] Build follow-up tone variation (formal → urgent)

### C5. Full Pipeline
- [ ] Enhance runFullPipeline — end-to-end autonomy
- [ ] Build pipeline stage gating (human approval at key checkpoints)
- [ ] Build pipeline rollback (undo a stage advancement)
- [ ] Build pipeline parallelism (process multiple projects concurrently)

### C6. Email & Communication
- [ ] Enhance aiEmailResponse — autonomous contractor reply handling
- [ ] Build email sentiment analysis
- [ ] Build email intent classification (question, objection, acceptance, rejection)
- [ ] Build response template matching
- [ ] Build response validation (accuracy, tone, completeness)

### C7. Contracts & E-Sign
- [ ] Enhance generateContract — trade-specific templates
- [ ] Enhance esignFlow — multi-signer, multi-document
- [ ] Build contract validation (legal compliance check)
- [ ] Build signature tracking (viewed, signed, declined, expired)
- [ ] Build automated reminder for unsigned documents

---

## D. Daily-Habit Loop & Engagement

- [ ] Morning lead digest — 6am push: "N new bids matched your trade, total value $X"
- [ ] Bid deadline countdown on home screen
- [ ] "Money left on the table" — dollar value of unpursued bids from last week
- [ ] Streaks / pipeline velocity — weekly comparison
- [ ] Real-time notifications for new matching bids
- [ ] Weekly performance report (bids won, value, win rate)
- [ ] Mobile push notifications (iOS/Android)
- [ ] Email digest delivery (for users not logged in)
- [ ] In-app notification center (already built — verify real-time updates)
- [ ] Notification preferences per user (email, push, in-app, SMS)

---

## E. User Experience & UI

- [ ] Wire all empty page stubs to real data
- [ ] Calendar page — full implementation (events, scheduling, bid due dates)
- [ ] TakeoffWorkspace — live data (not static)
- [ ] Geo pricing table — mobile responsiveness optimization
- [ ] Dashboard — full-reload UX optimization (incremental updates, not full reload)
- [ ] Global error boundaries on all routes
- [ ] Automated test suite (unit + integration + e2e)
- [ ] Proposal document — branding/logo integration in preview
- [ ] Mobile WebView optimization (iOS/Android) — touch targets, safe areas, no scroll bounce
- [ ] RTL language support (Arabic, Hebrew)
- [ ] Dark mode consistency across all pages
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Performance optimization (lazy loading, code splitting, image optimization)
- [ ] Offline mode (cache last-seen data for offline viewing)
- [ ] Deep linking (open specific project/proposal from URL)

---

## F. Integrations & Connectors

### F1. Google Workspace
- [ ] Gmail — fix OAuth scopes, full bidirectional sync
- [ ] Google Calendar — fix redirect_uri_mismatch, full event sync
- [ ] Google Drive — full file access, plan upload
- [ ] Google Sheets — data export/import
- [ ] Google Docs — document generation (proposals, contracts)
- [ ] Google Tasks — task sync

### F2. CRM
- [ ] HubSpot — full lead/deal sync
- [ ] Salesforce — lead sync (if requested)
- [ ] Zoho CRM — lead sync (if requested)

### F3. Payments
- [ ] Stripe — claim account, configure products & prices
- [ ] Stripe — checkout flow (deposit, milestone, full)
- [ ] Stripe — subscription management (freemium tiers)
- [ ] Stripe — webhook handling (payment succeeded, refunded)
- [ ] Stripe — invoice generation
- [ ] Stripe — usage limits & billing

### F4. Communication
- [ ] WhatsApp — agent channel
- [ ] Telegram — agent channel
- [ ] Slack — notification channel
- [ ] Microsoft Teams — notification channel
- [ ] Microsoft Outlook — email/calendar alternative

### F5. Accounting
- [ ] QuickBooks — invoice sync
- [ ] FreshBooks — invoice sync
- [ ] Xero — invoice sync

---

## G. Security & Compliance

- [ ] RLS on all entities (organization-level isolation) — verify every entity
- [ ] Public Privacy Policy page (exists — verify completeness)
- [ ] Public Terms of Service page (exists — verify completeness)
- [ ] Data retention policies (auto-delete after N days)
- [ ] Audit log (exists — verify all actions logged)
- [ ] Security settings page (exists — verify 2FA, password policy)
- [ ] User role management (admin, user, viewer, estimator)
- [ ] API key management (rotate, revoke)
- [ ] GDPR compliance (right to access, delete, export)
- [ ] CCPA compliance (opt-out of data sale)
- [ ] SOC 2 readiness (logging, access controls, encryption)
- [ ] Penetration test
- [ ] Vulnerability scanning

---

## H. Virality & Go-to-Market

- [ ] "Powered by AUTOLEADS" footer on every proposal document
- [ ] "Powered by AUTOLEADS" footer on every contractor app share link
- [ ] "Powered by AUTOLEADS" footer on every e-sign document
- [ ] Freemium tier — free lead digest, paid takeoffs + proposals
- [ ] Trade-specific landing pages (epoxy flooring, concrete polishing, etc.)
- [ ] Referral program (invite contractor, get free month)
- [ ] Stripe products: Free, Pro, Enterprise
- [ ] Stripe checkout flow
- [ ] Subscription management (upgrade, downgrade, cancel)
- [ ] Usage limits per tier (leads/month, takeoffs/month, proposals/month)
- [ ] Marketing site SEO optimization
- [ ] Blog/content marketing engine
- [ ] Social media automation
- [ ] Email marketing campaigns
- [ ] Partner/affiliate program

---

## I. System Health & Monitoring

- [ ] System health dashboard (exists — verify real-time metrics)
- [ ] Source health center (exists — verify per-source uptime)
- [ ] Dead letter queue (exists — verify auto-retry)
- [ ] Job status monitoring (exists — verify all jobs tracked)
- [ ] Error tracking & alerting (Slack/email on critical errors)
- [ ] Performance metrics (API response times, page load times)
- [ ] Uptime monitoring (external ping service)
- [ ] Cost tracking (API credits, LLM tokens, scrape costs)
- [ ] Alerting thresholds (error rate > X%, uptime < Y%)
- [ ] Incident response runbook

---

## J. Analytics & Intelligence

- [ ] Pricing intelligence — geo pricing (city/county/state/region/national)
- [ ] Winning bid history tracking
- [ ] Winning bid intelligence (AI analysis of past wins)
- [ ] Future outlook (price trend prediction)
- [ ] Outcome learning — win/loss analysis
- [ ] Benchmark research — competitor analysis (exists — keep updated)
- [ ] Opportunity graph — relationship mapping
- [ ] Bidability scoring (exists — verify accuracy)
- [ ] Predictive analytics (win probability per bid)
- [ ] Market trend analysis (construction spend by region)
- [ ] ROI tracking (cost per lead, cost per win, revenue per bid)
- [ ] Custom report builder
- [ ] Export to CSV/PDF/Excel

---

## K. Mobile & Native

- [ ] iOS WebView deployment (TestFlight)
- [ ] Android WebView deployment (Play Store)
- [ ] Push notifications (APNs, FCM)
- [ ] Offline mode (cache last-seen data)
- [ ] Native sharing (share proposal via iMessage, WhatsApp)
- [ ] Deep linking (universal links)
- [ ] Biometric auth (Face ID, fingerprint)
- [ ] Camera integration (upload plan photos)
- [ ] Native file picker
- [ ] App store optimization (ASO)

---

## L. Scalability

- [ ] Multi-tenant architecture (organization-level data isolation)
- [ ] User invitation system (invite by email, assign role)
- [ ] Team roles & permissions (RBAC)
- [ ] Bulk operations (bulk create, update, delete)
- [ ] API rate limiting (per user, per org)
- [ ] Caching strategy (Redis or equivalent)
- [ ] Database indexing (optimize slow queries)
- [ ] CDN for static assets
- [ ] Horizontal scaling (serverless functions)
- [ ] Load testing
- [ ] Stress testing
- [ ] Database sharding (if needed at scale)

---

## M. Documentation & Knowledge

- [ ] User documentation (help center)
- [ ] API documentation (if exposing API)
- [ ] Admin documentation
- [ ] Onboarding guides (per role)
- [ ] Video tutorials
- [ ] FAQ page
- [ ] Changelog
- [ ] System architecture documentation
- [ ] Data dictionary
- [ ] Runbooks (for each automated workflow)

---

## Completion Criteria (100% Ceiling)

A phase is "100% ceiling" when ALL of the following are true:
1. Every checkbox above is ✅
2. System audit score ≥ 95/100
3. Zero open SystemGap records
4. Zero unverified ScrapeSource records
5. 100% of projects have real source_urls
6. All automated workflows running on schedule
7. All connectors authorized and syncing
8. Stripe live with real payments
9. Mobile apps published to App Store + Play Store
10. Uptime ≥ 99.9%
11. Page load time < 2s
12. Zero critical security vulnerabilities
13. All tests passing
14. Documentation complete