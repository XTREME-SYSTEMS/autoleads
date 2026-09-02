# DEEP FORENSIC AUDIT PROMPT — AUTOLEADS National Operating System

## Mission
Perform a comprehensive end-to-end forensic audit of every line of code, every entity record, every backend function, every frontend page, every workflow, every integration, and every piece of content in the AUTOLEADS platform. Score the system, identify every gap, and auto-fix/auto-heal/auto-harden without human intervention.

## Audit Scope

### 1. DATA INTEGRITY AUDIT
- Every entity: count records, check for null/empty required fields, orphaned foreign keys, stale records
- Projects: verify all have title, description, source_url, jurisdiction, authority, trade, specs, contract_info, client_name
- Proposals: verify all have project_id, status transitions are valid (draft→internal_review→approved→delivered→responded→won/lost)
- Takeoffs: verify all have final_quantity > 0, unit, spec_evidence, calibrated flag, approval_state
- Contracts: verify all have status transitions valid (draft→sent→viewed→signed→executed)
- Invoices: verify all have project_id, amount, status
- Payments: verify all have amount, status, provider
- Companies/Contacts: verify relationship_strength, no orphaned company_id references
- ScrapeSources: verify all have schedule_cron, status, last_run_date
- PipelineEvents: verify all have project_id, step, status, occurred_at
- ActionItems: verify all have title, category, status, linked_record_id

### 2. BACKEND FUNCTION AUDIT
- For every function in base44/functions/:
  - Check authentication: uses internalAuth.ts or proper auth
  - Check error handling: try/catch, proper error responses
  - Check RLS: uses asServiceRole where needed for cross-user data
  - Check entity operations: no orphaned creates, no missing updates
  - Check LLM prompts: no hallucination risk, proper JSON schema
  - Check external API calls: proper error handling, no hardcoded secrets
  - Check for dead code, unused imports, broken references

### 3. FRONTEND PAGE AUDIT
- For every page in src/pages/:
  - Check for stub/placeholder content (empty divs, "coming soon", no data binding)
  - Check for broken imports (missing components, wrong paths)
  - Check for hardcoded mock data (should use real entity data)
  - Check for missing loading states (spinner/skeleton)
  - Check for missing empty states (EmptyState component)
  - Check for missing error states
  - Check for proper navigation (BackButton, route links)
  - Check for responsive design (mobile-first)
  - Check for proper data fetching (useEntityList or base44.entities)

### 4. WORKFLOW AUDIT
- For every workflow in base44/workflows/:
  - Check trigger configuration (cron, entity, connector)
  - Check step transitions (call→then, switch→case)
  - Check function invocations (correct function names, parameters)
  - Check for failed runs (get_workflow_run)
  - Check for inactive workflows that should be active

### 5. SECURITY AUDIT
- RLS on every entity: create, read, update, delete rules
- Auth checks on every backend function
- No hardcoded secrets in source code
- No public endpoints that should be authenticated
- Stripe integration: iframe checks, idempotency keys, metadata

### 6. INTEGRATION AUDIT
- Stripe: webhook endpoint, checkout flow, payment intents
- Gmail: connector authorized, send/ingest functions working
- Google Calendar: connector authorized, sync working
- Google Drive: connector authorized, scan working
- HubSpot: connector registered, sync working
- SAM.gov: API key configured, scrape working
- Browserbase: credentials configured, browser scrape working

### 7. UI/UX AUDIT
- Every page renders without errors
- Every button has an onClick handler
- Every form has validation and submit handling
- Every list has empty state
- Every data fetch has loading state
- Navigation is consistent (ApprovedShell, bottom nav, back buttons)
- Color scheme is consistent (gold #f2df0d, black, white, gray)
- Typography is consistent (Oswald brand font, Inter body)

## Scoring
- Data Quality Score (0-100): % of records with complete, valid data
- Pipeline Efficiency Score (0-100): % of projects advancing through stages
- Security Score (0-100): % of entities with RLS, functions with auth
- UI Completeness Score (0-100): % of pages with real data, no stubs
- Overall Health Score: weighted average of all sub-scores

## Auto-Fix Protocol
For every gap found:
1. Log it as a SystemGap record with severity, category, file_path
2. Fix it immediately in the same pass
3. Update the SystemGap to status='fixed' with fix_summary
4. Re-verify the fix worked
5. If fix fails, escalate severity and try alternative approach

## Output
- SystemScore record with all sub-scores
- All SystemGap records created and resolved
- Screenshots of key pages post-fix
- Summary report of what was found and fixed