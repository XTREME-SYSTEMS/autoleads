# AUTOLEADS — Deep Forensic Audit (2026-08-14)

End-to-end audit across data layer, scrape pipeline, AI pipeline, payments, workflows, security, and mobile UX. Each finding is scored **CRITICAL / HIGH / MEDIUM / LOW** with the root cause and the exact file.

---

## CRITICAL

### C1. Internal service token leaked in plaintext across all workflows
**Files:** `base44/workflows/Full Pipeline Autopilot.jsonc`, `Auto Scrape Opportunities.jsonc`, `System Autopilot.jsonc`, `Pipeline Advancement.jsonc`, `Morning Lead Digest.jsonc`, `Auto Follow-Up.jsonc`, `Auto Generate Proposals.jsonc`
**Root cause:** Every workflow hardcodes `"_service_token": "autoleads-internal-svc-2026-xK9mPzR7wQ"` as a literal string. This token is the same value stored in the `INTERNAL_SERVICE_TOKEN` secret. Anyone who reads the source (GitHub sync, repo export) can call **any** backend function as the service role — full bypass of RLS and auth.
**Impact:** Complete privilege escalation. An attacker with the token can create/delete/update every entity record as service role.
**Fix:** Rotate `INTERNAL_SERVICE_TOKEN` immediately. Workflows cannot read secrets at runtime, so the token must be a literal — but it must (a) be rotated to a new random value, (b) never be committed to a synced repo, and (c) `internalAuth.ts` should additionally validate the request origin / a per-workflow nonce. Long-term: add a platform-level "workflow caller" auth mode that doesn't require a shared literal.

### C2. Scrape filters from the UI never reach the scraper
**Files:** `src/pages/PipelineFlow.jsx` (sends `{ stateCode, counties, trades }`), `base44/functions/runAutoScrape/entry.ts` (reads `body.state` and `body.trades`)
**Root cause:** Field-name mismatch. The frontend sends `stateCode` and `counties`; the backend reads `state` and ignores `counties` entirely. State filtering is broken, county filtering is silently dropped.
**Impact:** "Scrape exactly what you want" is a lie — every scrape pulls everything regardless of the user's state/county/trade selection.
**Fix:** Align the contract: backend reads `body.stateCode || body.state`, `body.counties`, `body.trades`. Pass `counties` to `scrapePermits` and `browserScrape`. Filter Socrata sources by state. Filter portal sources by county jurisdiction.

### C3. Trade-relevance filter silently rejects nearly all real leads
**File:** `base44/shared/scrapeUtils.ts` → `createProject()` lines 357–362
**Root cause:** `loadTradeKeywords()` builds a keyword set from the company's trade + ScopeSystem aliases (e.g. `["epoxy", "flooring", "flake"]`). Every non-permit lead is then rejected unless its title/description/specs contain one of those niche keywords. Federal opportunities (SAM.gov, USAspending, Grants.gov) are tagged `trade: "general construction"` and describe buildings, not epoxy — so they all fail the filter.
**Impact:** This is the **root cause of "federal portal scrapers returning zero leads."** The data is fetched, then dropped at ingestion.
**Fix:** Invert the logic. Don't reject leads that don't mention the niche trade — instead **score** them and let them through with a lower confidence. Only reject when the company has explicitly chosen an exclusive-trade mode. Permits already bypass this; extend the same bypass to federal/aggregator leads, or replace the hard reject with a confidence penalty.

### C4. Post-enrichment mandatory gate drops leads when the LLM call fails
**File:** `base44/shared/scrapeUtils.ts` → `createProject()` lines 408–413, `MANDATORY_POST_ENRICHMENT_FIELDS`
**Root cause:** After enrichment, leads missing `value`, `specs`, or `bid_due_date` are hard-rejected. Enrichment depends on a live LLM call (`enrichLeadData`) and a second LLM call (`autoEstimateValue`). If either hits a rate limit, timeout, or returns empty JSON, the lead is silently dropped with no record, no log, no retry.
**Impact:** Intermittent "0 leads" results with zero visibility. The harder the LLM is hammered in parallel, the more leads vanish — a self-defeating design.
**Fix:** Separate "ingest" from "enrich." Always create the Project record with whatever data the source provided (even if `value`/`specs` are null), set `verification_status: "unverified"`, and queue enrichment as a follow-up. Surface incomplete leads in a "Needs Enrichment" queue instead of deleting them. Never let an LLM timeout delete a real lead.

---

## HIGH

### H1. autoProposals fails intermittently under parallel load
**File:** `base44/functions/autoProposals/entry.ts`
**Root cause:** Loops over candidates calling `InvokeLLM` sequentially with no retry, no backoff, and a bare `catch { skipped++ }`. One LLM 429 or timeout skips the project entirely. The known "proposal template generation failing intermittently during parallel LLM processing" is this.
**Fix:** Add retry-with-backoff (2 retries, 1s/3s) around `InvokeLLM`. Process in small sequential batches (not fire-and-forget). Log failures to a `SystemGap` record so they're visible.

### H2. autoEstimateValue produces mathematically broken Estimate records
**File:** `base44/shared/scrapeUtils.ts` lines 231–237
**Root cause:** The overhead/margin split math is wrong: `subtotal = total / (1+margin/100) / (1+overhead/100)` then `overhead_total = total/(1+margin/100) - subtotal` — this double-divides and the parts don't sum to `total`. It also creates an Estimate during scraping that collides with the Estimate created later by the real takeoff flow.
**Fix:** Remove Estimate creation from `autoEstimateValue` entirely — scraping should only set `Project.value`. Estimates belong to the takeoff/estimating step. If a placeholder estimate is needed, compute it cleanly: `subtotal = total / (1 + (margin+overhead)/100)`.

### H3. Stripe payment flow is dead code
**Files:** `base44/functions/createPaymentIntent/entry.ts` (works), `base44/functions/stripeWebhook/entry.ts` (works), but no frontend page calls `createPaymentIntent`. The Step 7 "Take Payment" button in `PipelineFlow.jsx` just navigates to `/invoices`.
**Root cause:** The backend is complete (intent creation + webhook signature verification + invoice reconciliation), but no UI wires a "Pay Now" button to `createPaymentIntent` + Stripe.js `confirmCardPayment`. The Stripe account is also unclaimed (sandbox).
**Fix:** Add a `PayInvoiceButton` component that calls `createPaymentIntent`, mounts Stripe Elements with the `client_secret`, and confirms. Also: the webhook is registered but confirm the endpoint URL is the published host (`https://autoleads.base44.app/functions/stripeWebhook`), not a preview host. Direct the user to claim the Stripe account in Dashboard → Integrations before going live.

### H4. Mobile horizontal overflow on LeadDiscovery and ProjectDetail
**Files:** `src/pages/LeadDiscovery.jsx`, `src/pages/ProjectDetail.jsx`
**Root cause:** Known issue, unfixed. Long unbroken strings (URLs, permit numbers, jurisdiction names) in cards push width past the 374px viewport. The `Page` wrapper applies `overflow-x-hidden` but inner cards with `whitespace` or wide grids still overflow.
**Fix:** Add `break-words` / `break-all` to long-text spans, `min-w-0` to flex children, and `overflow-hidden` to card containers. Audit `ProjectDetail.jsx` for fixed-width tables and wrap them in `overflow-x-auto` containers.

### H5. Unauthorized connectors silently break sync functions
**Files:** `hubspotSync`, `gmailSync`, `gmailIngestBids`, `sendEmail`, `syncCalendar` all require app-user connectors. HubSpot, Google Sheets, Docs, Tasks are registered but **unauthorized**.
**Root cause:** The functions catch connector failures with `catch {}` and return empty/success. Users get no signal that sync isn't working.
**Fix:** When a connector-backed function can't get a valid connection, return a structured `{ error, blocker: "CONNECTOR_NOT_AUTHORIZED", connector: "hubspot" }` and surface it in the UI as a "Reconnect HubSpot" prompt.

---

## MEDIUM

### M1. SAM.gov quota exhaustion with no progress persistence
**File:** `base44/functions/scrapeFederalAPIs/entry.ts` lines 33–44
**Root cause:** Loops 10 NAICS codes; on HTTP 429 it `break`s and loses all progress. Next run starts over from NAICS 0. The daily quota is exhausted before all codes are covered.
**Fix:** Persist the last-processed NAICS index in the ScrapeSource record (or a config entity) and resume from there next run. Add exponential backoff on 429. Reduce to 5 NAICS per run to stay under quota.

### M2. Grants.gov API endpoint is likely wrong
**File:** `base44/functions/scrapeFederalAPIs/entry.ts` line 140
**Root cause:** `https://api.grants.gov/v1/api/search2` — the live Grants.gov API is `https://www.grants.gov/api/v1/opportunities` (POST search). The current URL likely 404s silently.
**Fix:** Verify the endpoint with a live test; switch to the correct API or remove the source.

### M3. Trade keyword cache never invalidates
**File:** `base44/shared/scrapeUtils.ts` line 9, `_tradeKeywordsCache`
**Root cause:** Module-level cache populated once per cold start. When the user edits their company trade or ScopeSystems, the filter keeps using stale keywords until the function redeploys.
**Fix:** Cache with a TTL (e.g. 5 min) keyed on a timestamp, or invalidate on CompanyProfile/ScopeSystem update via a workflow.

### M4. No cross-source deduplication
**File:** `base44/shared/scrapeUtils.ts` → `createProject()` dedups only by `source_url`
**Root cause:** The same physical project can arrive from SAM.gov (one URL) and a Socrata permit (different URL) and a news feed (different URL). All three pass the `source_url` dedup and create three Project records.
**Fix:** Add a normalized-title + jurisdiction dedup (`normalizeTitle(title) + jurisdiction`) as a second dedup layer before create.

### M5. Socrata permit coverage is only 4 cities — not national
**File:** `base44/functions/scrapePermits/entry.ts` — only Chicago, Austin, Seattle, Orlando
**Root cause:** The "national" claim is unsupported. 4 cities ≠ national.
**Fix:** Add the top 20–30 US metros by construction volume (NYC, LA, Houston, Phoenix, Dallas, Miami, Atlanta, Denver, Boston, etc.). Validate each endpoint returns rows before shipping.

### M6. runAutoScrape swallows all errors; users see "0 leads" with no reason
**File:** `base44/functions/runAutoScrape/entry.ts` — every sub-call wrapped in `try {} catch {}`
**Root cause:** No error aggregation surfaced to the UI. The toast just says "Scrape complete" even when every source failed.
**Fix:** Return a structured `errors[]` array and surface the count + first error in the toast. Log each failure to a `ScrapeSource.last_error`.

---

## LOW

### L1. LeadDiscovery trade filter matches against `authority` instead of `trade`
**File:** `src/pages/LeadDiscovery.jsx` line 69: `if (trade && o.authority && !o.authority.toLowerCase().includes(trade.toLowerCase()))`
**Root cause:** Filters trade by the `authority` field (the issuing office), not the project's `trade` field. Most leads will never match.
**Fix:** Filter on `o.trade` (and fall back to `o.title`), not `o.authority`.

### L2. PipelineFlow "Get Leads" in LeadDiscovery fires-and-forgets with a 15s/45s blind refresh
**File:** `src/pages/LeadDiscovery.jsx` lines 20–30
**Root cause:** `base44.functions.invoke('runAutoScrape', {}).catch(()=>{})` is fire-and-forget; two `setTimeout` refreshes guess when it's done. If the scrape takes 90s, the user sees stale data and thinks it failed.
**Fix:** `await` the invoke (with a loading state) or subscribe to Project create events to refresh incrementally.

### L3. `data_class: "NON_PRODUCTION_EXAMPLE"` defaults exist but no UI filters them out
**Root cause:** Every entity has the enum but list views don't exclude non-production records. If any example data is seeded, it shows in production lists.
**Fix:** Add `data_class: "production"` to all list/filter calls in the pipeline pages, or enforce it in RLS.

---

# MASTER FIX PROMPT

Copy-paste the block below into a new conversation (or reuse here) to force a complete, ordered fix of everything above. It is written to be self-contained and prescriptive.

---

```
You are continuing work on the AUTOLEADS preconstruction operating system. A full forensic audit has already been completed. Your job is to fix every finding below IN ORDER, completely, with no stubs and no skipped steps. Do not add new features. Do not refactor untouched code. Fix exactly what is listed, verify each fix, and move to the next.

Work in this exact order. After each numbered fix, run a test or read the changed file to confirm before moving on.

## FIX 1 — Rotate the leaked internal service token (CRITICAL C1)
1. The literal string "autoleads-internal-svc-2026-xK9mPzR7wQ" is hardcoded as `_service_token` in every workflow JSONC under base44/workflows/. This is the same value as the INTERNAL_SERVICE_TOKEN secret — a full privilege-escalation leak.
2. Generate a new random token value (32+ chars).
3. Update the `INTERNAL_SERVICE_TOKEN` secret to the new value via set_secrets.
4. Replace every literal `_service_token` value in all base44/workflows/*.jsonc files with the new token.
5. Confirm `base44/shared/internalAuth.ts` still compares against `secrets.get('INTERNAL_SERVICE_TOKEN')` — no code change needed there.

## FIX 2 — Wire scrape filters end-to-end (CRITICAL C2)
1. In base44/functions/runAutoScrape/entry.ts: read `const stateFilter = (body.stateCode || body.state || '').toUpperCase();` and `const counties = body.counties || [];` and `const trades = body.trades || [];`.
2. Pass `counties` into scrapePermits and browserScrape invocations. Pass `trades` (the full array, not just [0]) to browserScrape.
3. In scrapePermits: filter SOCRATA_SOURCES by state (already done) AND by county — match the source.jurisdiction against the selected counties list; if counties is non-empty, only scrape sources whose jurisdiction contains a selected county.
4. In runAutoScrape: filter portalSources by county jurisdiction when counties is non-empty.
5. In src/pages/PipelineFlow.jsx: confirm scrapeFilters sends { stateCode, counties, trades } — it already does. Verify the runAction payload passes scrapeFilters (it does via the third arg).

## FIX 3 — Stop the trade filter from killing real leads (CRITICAL C3)
1. In base44/shared/scrapeUtils.ts createProject(): the trade-relevance block (lines ~357-362) currently hard-rejects leads whose text doesn't contain a company trade keyword.
2. Replace the hard reject with a confidence penalty: if no trade keyword matches, set confidence to 0.5 (instead of rejecting) and still create the project. Only hard-reject if the company has NO trade set AND no ScopeSystems (i.e. no filter configured at all → allow all).
3. Keep the permit bypass (project_type === 'permit') as-is.
4. This single change will unblock federal + aggregator leads.

## FIX 4 — Stop dropping leads when enrichment fails (CRITICAL C4)
1. In base44/shared/scrapeUtils.ts createProject(): remove the post-enrichment mandatory gate that rejects leads missing value/specs/bid_due_date.
2. Instead: always create the Project record with whatever data exists. If value is null, set verification_status to "unverified" and stage to "qualification". If specs is missing, leave it empty (the UI already shows a placeholder).
3. Keep enrichment as a best-effort enhancement — wrap in try/catch (already is) but never let its failure prevent creation.
4. The LeadDiscovery page already filters to leads with a value — that's fine, but now incomplete leads persist in the DB and can be enriched later instead of being deleted.

## FIX 5 — Fix autoProposals intermittent failures (HIGH H1)
1. In base44/functions/autoProposals/entry.ts: wrap the InvokeLLM call in a retry helper: 2 retries with 1s then 3s backoff on any error.
2. On final failure, create a SystemGap record (category: "data_integrity", severity: "high", title: `Proposal generation failed for ${proj.title}`) instead of silently skipping.
3. Process candidates sequentially (already sequential) — do not parallelize.

## FIX 6 — Remove broken Estimate creation from autoEstimateValue (HIGH H2)
1. In base44/shared/scrapeUtils.ts autoEstimateValue(): delete both Estimate.create blocks (the LLM-fallback one ~lines 227-238 and the system-identified one ~lines 301-317).
2. The function should ONLY return a number (the estimated value). Estimate records are created by the takeoff/estimating step, not during scraping.
3. Keep the value computation logic; just remove the entity creation.

## FIX 7 — Fix LeadDiscovery trade filter + trade field (LOW L1, MEDIUM)
1. In src/pages/LeadDiscovery.jsx line 69: change `o.authority` to `o.trade` (with fallback to o.title). The filter should match the project's trade, not the issuing authority.

## FIX 8 — Fix mobile horizontal overflow (HIGH H4)
1. In src/pages/LeadDiscovery.jsx: add `break-words min-w-0` to the RecordCard title and meta text containers. Add `overflow-hidden` to the card wrapper.
2. Read src/pages/ProjectDetail.jsx. Find any element wider than the viewport (tables, pre blocks, long URLs, flex rows without min-w-0). Wrap tables in `overflow-x-auto`, add `break-words` to long text, `min-w-0` to flex children. Add `overflow-x-hidden` to the page root if missing.

## FIX 9 — Surface scrape errors to the user (MEDIUM M6)
1. In base44/functions/runAutoScrape/entry.ts: collect errors from each sub-scrape (federal, permits, news, agendas, portals) into an `errors` array.
2. Return `errors` in the response JSON.
3. In src/pages/PipelineFlow.jsx runAction(): when the response includes errors, show a toast with the count and first error message.

## FIX 10 — Fix SAM.gov quota handling (MEDIUM M1)
1. In base44/functions/scrapeFederalAPIs/entry.ts scrapeSamGov(): on HTTP 429, break the NAICS loop AND persist the current NAICS index on the SAM.gov ScrapeSource record (in parser_version or a custom field) so the next run resumes there.
2. Reduce the default NAICS slice from 10 to 5 per run.
3. Add a 2-second delay between NAICS requests to avoid rate-limiting.

## FIX 11 — Fix Grants.gov endpoint (MEDIUM M2)
1. In base44/functions/scrapeFederalAPIs/entry.ts scrapeGrantsGov(): test the current URL `https://api.grants.gov/v1/api/search2` with a live fetch. If it returns an error, switch to `https://www.grants.gov/api/v1/opportunities` with a POST body `{ keyword: "construction", status: "posted", rows: 100 }` and adjust the response parsing to match the real schema.

## FIX 12 — Add cross-source deduplication (MEDIUM M4)
1. In base44/shared/scrapeUtils.ts createProject(): after the source_url dedup, add a second dedup using normalizeTitle(title) + jurisdiction. Query Project.filter({ jurisdiction }) and check the normalized title set. If a match exists, return { created: false, reason: 'duplicate title+jurisdiction' }.

## FIX 13 — Invalidate the trade keyword cache (MEDIUM M3)
1. In base44/shared/scrapeUtils.ts: replace the module-level `_tradeKeywordsCache` with a { value, ts } object. In loadTradeKeywords, if the cache is older than 5 minutes, re-fetch. Otherwise return cached.

## FIX 14 — Verify the Stripe webhook endpoint + add a Pay button (HIGH H3)
1. Use exec_tool to list Stripe webhook endpoints. Confirm the endpoint URL is `https://autoleads.base44.app/functions/stripeWebhook` (not a preview host). If missing, create it and store the signing secret in STRIPE_WEBHOOK_SECRET.
2. Create a component src/components/autoleads/PayInvoiceButton.jsx that: takes an invoiceId + projectId, calls base44.functions.invoke('createPaymentIntent', { project_id, invoice_id }), loads Stripe.js with the STRIPE_PUBLISHABLE_KEY, mounts a PaymentElement with the returned client_secret, and confirms payment.
3. Add this button to the Invoices page (src/pages/Invoices.jsx) for invoices with status !== 'paid'.
4. Tell the user to claim the Stripe account in Dashboard → Integrations before going live.

After completing all 14 fixes, run a single end-to-end test: invoke runAutoScrape with { stateCode: "FL", counties: [], trades: [] } and confirm it returns totalCreated > 0 and no errors. Then read every changed file once to confirm no syntax errors.

Do not skip any fix. Do not mark a fix complete without verifying it. If a fix is blocked (e.g. Stripe endpoint can't be verified), say so explicitly and move to the next, then return.
```

---

This audit + prompt is the complete deliverable. The most urgent item is **C1** — rotate that token now; it's a live privilege-escalation leak.