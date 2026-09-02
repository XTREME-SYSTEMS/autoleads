# AUTOLEADS Autonomous Ceiling Execution Prompt

## How to Use This Prompt

Paste the **EXECUTION PROMPT** below into a new Base44 conversation to autonomously drive the system to 100% ceiling capability using a recursive audit → implement → validate loop.

### Prerequisites
1. The app must be deployed and accessible in the Base44 builder.
2. All existing secrets must be set (STRIPE_SECRET_KEY, SAM_GOV_API_KEY, BROWSERBASE_API_KEY, etc.).
3. All existing OAuth connectors must be authorized (Gmail, Google Calendar, Google Drive, HubSpot).
4. The user must be available to approve OAuth authorizations, Stripe account claiming, and app store submissions.

### The Recursive Loop

This prompt does NOT run linearly. It runs as a **recursive cycle**:

```
┌─────────────────────────────────────────────────┐
│  CYCLE 1                                        │
│  1. AUDIT    → runSystemAudit, find all gaps     │
│  2. IMPLEMENT → fix the gaps, build the items    │
│  3. VALIDATE → prove the fixes work             │
│  4. AUDIT    → re-run audit, find new gaps       │
│                                                 │
│  CYCLE 2                                        │
│  5. IMPLEMENT → fix the new gaps                 │
│  6. VALIDATE → prove the fixes work             │
│  7. AUDIT    → re-run audit, find new gaps       │
│                                                 │
│  CYCLE 3                                        │
│  8. IMPLEMENT → fix the new gaps                 │
│  9. VALIDATE → prove the fixes work             │
│  10. AUDIT   → re-run audit                      │
│  ...                                            │
│                                                 │
│  STOP when: audit finds 0 gaps AND score ≥ 95   │
└─────────────────────────────────────────────────┘
```

Each cycle tightens the system. The audit never lies — it queries real database records, runs real functions, checks real connectors. If the audit says there are 11 open gaps, there are 11 open gaps. The implement phase fixes them. The validate phase proves they're fixed. The next audit finds whatever the implement phase missed or broke. Repeat until the audit comes back clean.

### When to Stop

The loop terminates when ALL of these are true:
1. `runSystemAudit` returns score ≥ 95
2. `SystemGap` where `status=open` count = 0
3. `ScrapeSource` where `status=unverified` count = 0
4. `Project` where `source_url` is null count = 0
5. All workflows active
6. All connectors authorized
7. Stripe configured with products
8. All roadmap items ✅

If any check fails, the loop continues.

---

## EXECUTION PROMPT

Copy everything below this line and paste it into a new Base44 conversation:

---

```
You are executing the AUTOLEADS Ceiling Capability Roadmap using a recursive audit → implement → validate loop. You will not stop until the system reaches 100% ceiling capability or you hit a blocker that requires user input (OAuth, Stripe, app store).

## Your Mission

Drive AUTOLEADS to 100% production readiness by recursively cycling through:
1. AUDIT — find every gap, broken item, missing feature, and failing function
2. IMPLEMENT — fix every gap found, build every missing item, wire every stub
3. VALIDATE — prove each fix works with real tests and real data
4. Repeat from step 1 until the audit comes back clean

## The Recursive Cycle (EXECUTE THIS EXACTLY)

### PHASE 1: AUDIT (find everything that's broken or missing)

Run these in parallel:
- test_backend_function("runSystemAudit", {})
- test_backend_function("runDataIntegrity", {})
- test_backend_function("runUiAudit", {})
- Read base44/prompts/ceiling_roadmap.md — count [ ] vs ✅ items
- Query SystemGap where status=open — list every open gap
- Query ScrapeSource where status=unverified — count unverified sources
- Query Project where source_url is null — count untraceable projects
- Query Project where verification_status != verified — count unverified projects
- get_connectors_info() — check which connectors are authorized
- Read every backend function entry.ts — check for stubs, timeouts, broken logic
- Read every page in src/pages/ — check for empty stubs, unwired buttons, static data
- Read every workflow .jsonc — check which are active vs paused

Compile a COMPLETE GAP LIST. Every item is one of:
- A roadmap checkbox that's still [ ]
- A SystemGap record that's open
- A source that's unverified
- A project missing a source_url
- A backend function that times out or returns errors
- A page that's a stub or has unwired functionality
- A workflow that's paused or broken
- A connector that's not authorized
- A UI element that doesn't work

Output the gap list with counts: "AUDIT COMPLETE: [N] gaps found. Breakdown: [details]"

### PHASE 2: IMPLEMENT (fix every gap, build every item)

Take the gap list from Phase 1 and fix EVERY item. Batch independent work into parallel tool calls:
- Write multiple files in one response
- Create multiple entities in one call
- Fix multiple functions in one batch
- Never make sequential calls when parallel is possible

Rules:
- NO STUBS: Every item must be fully implemented — working code, real data, tested.
- REAL DATA ONLY: Never fabricate leads, projects, or sources with an LLM. Every lead must trace to a real source_url.
- MINIMAL CHANGES: Don't rewrite working code. Use find_replace for edits. Create new focused files.
- FOLLOW THE ROADMAP: Work sections A→M in priority order. Don't skip items.
- BATCH BY SECTION: Complete all items in a section before moving to the next.

For each gap:
1. Read the relevant files (entity schema, function code, page component)
2. Implement the fix or build the feature
3. Test it immediately (test_backend_function for functions, visual check for pages)
4. Mark the roadmap item ✅ if applicable
5. Close the SystemGap record (status=fixed, fix_summary="...")

Output after implementation: "IMPLEMENT COMPLETE: [N] gaps fixed. [M] items built. Moving to validation."

### PHASE 3: VALIDATE (prove every fix works)

For every fix from Phase 2, prove it works:
- For backend functions: test_backend_function with real payloads — verify real data returns
- For pages: read the file, verify it renders real data (not static, not empty)
- For entities: query the entity, verify records exist with real data
- For workflows: verify they're active and have valid schedules
- For connectors: verify they're authorized with correct scopes
- For sources: verify they're status=active with real last_success_date
- For projects: verify they have real source_urls and verification_status=verified

If ANY validation fails:
- Log a new SystemGap record with the failure
- Go back to PHASE 2 and fix it
- Re-validate

Output after validation: "VALIDATION COMPLETE: [N] fixes verified. [M] failures found. [If M>0: returning to IMPLEMENT. If M=0: proceeding to next AUDIT cycle.]"

### PHASE 4: RECURSE (back to Phase 1)

After validation passes (0 failures), go back to PHASE 1 (AUDIT) and run the full audit again. The new audit will find:
- Gaps the previous implement phase missed
- New gaps created by the previous fixes
- Items that were skipped because they depended on earlier work

Continue the cycle: AUDIT → IMPLEMENT → VALIDATE → AUDIT → IMPLEMENT → VALIDATE → ...

### STOP CONDITION

Stop the recursion ONLY when a full AUDIT cycle finds:
- 0 open SystemGap records
- 0 unverified ScrapeSource records
- 0 projects without source_url
- 0 projects with verification_status != verified
- 0 backend functions with errors or timeouts
- 0 pages that are stubs
- 0 paused workflows
- 0 unauthorized connectors
- runSystemAudit score ≥ 95
- All roadmap items ✅

When ALL are true, report: "AUTOLEADS has reached 100% ceiling capability. Final score: [X]/100. [N] cycles completed. Ready for production launch."

If ANY check fails, continue the loop.

## Execution Rules

1. READ FIRST: Read base44/prompts/ceiling_roadmap.md, base44/prompts/master_build_prompt.md, base44/prompts/autoleads_master_v3.md before starting.

2. BATCH WORK: Group independent items into parallel tool calls. Write multiple files in one response. Create multiple entities in one call. Never make sequential calls when parallel is possible.

3. NO STUBS: Every item must be fully implemented — working code, real data, tested. A "parser" must actually parse. A "client" must actually call the API. An "integration" must actually sync data.

4. REAL DATA ONLY: Never fabricate leads, projects, or sources with an LLM. Every lead must trace to a real source_url. Every source must be live-tested before activation.

5. AUDIT NEVER LIES: The audit phase queries real database records and runs real functions. If it says there are 11 gaps, there are 11 gaps. Don't argue with the audit — fix the gaps.

6. VALIDATE EVERYTHING: After implementing, validate. If validation fails, go back and fix. Never skip validation.

7. RESUMABLE: If stopped, read the roadmap file, query open SystemGap records, find the first incomplete item, and resume the cycle from AUDIT.

8. MINIMAL CHANGES: Don't rewrite working code. Use find_replace for edits. Create new focused files, don't bloat existing ones. Don't change functionality the user didn't ask for.

9. LOG EVERYTHING: Create SystemGap records for issues found. Create SystemScore records after each audit. Update the roadmap file with ✅ for completed items. Create Recommendation records for strategic decisions.

10. ASK ONLY WHEN REQUIRED: Ask the user only for:
    - OAuth authorizations (connect a new service)
    - Stripe account claiming / going live
    - App store submissions
    - Decisions that cost money (paid API keys, partnerships)
    - Anything that requires their Google Cloud Console / dashboard access

## Execution Priority (within each IMPLEMENT phase)

Work sections in this order (highest impact first):
1. A — Source Infrastructure (the data engine)
2. B — Data Quality (fix what's there before adding more)
3. C — AI Automation (the moat)
4. D — Daily-Habit Loop (retention)
5. E — UX & UI (polish)
6. F — Integrations (connectors)
7. G — Security & Compliance (before launch)
8. H — Virality & GTM (monetization)
9. I — System Health (monitoring)
10. J — Analytics (intelligence)
11. K — Mobile (native deployment)
12. L — Scalability (architecture)
13. M — Documentation (knowledge base)

## Error Handling

- If a source URL is dead, mark it status=error and move on — don't block the pipeline
- If an API quota is exhausted, log it as a SystemGap and move to the next source
- If a parser fails, log the error in ScrapeSource.last_error and retry on next schedule
- If a backend function times out, split the work into smaller batches
- If an OAuth connector fails, ask the user to re-authorize
- If validation fails, log a SystemGap and re-implement — don't skip
- Never leave the system in a broken state — always finish the current item before stopping

## Context Files (read these first)
- base44/prompts/ceiling_roadmap.md — the full A-Z checklist
- base44/prompts/master_build_prompt.md — the original vision
- base44/prompts/autoleads_master_v3.md — system prompt context
- base44/prompts/handoff_package_audit.md — forensic audit of the handoff package
- base44/entities/*.jsonc — all entity schemas
- base44/functions/*/entry.ts — all existing backend functions
- base44/workflows/*.jsonc — all existing workflows
- src/App.jsx — the router (all pages)
- src/components/autoleads/ApprovedShell.jsx — the app shell
- src/lib/agentContext.js — AI agent context

## Start Now

Begin by reading the roadmap file and the context files, then execute PHASE 1 (AUDIT). Output the gap list, then immediately proceed to PHASE 2 (IMPLEMENT), then PHASE 3 (VALIDATE), then recurse back to PHASE 1. Do not stop until the system reaches 100% ceiling capability or you need user input for an OAuth/payment/app-store action.
```

---

## How to Audit the Autonomous Run

While the agent is executing (or after it stops), you can audit progress:

### 1. Check the Roadmap File
Read `base44/prompts/ceiling_roadmap.md` — count ✅ vs [ ] items.

### 2. Check System Scores
Query `SystemScore` records sorted by `created_date` descending. The latest score shows current system health. Each cycle creates a new score — you can see the progression.

### 3. Check Open Gaps
Query `SystemGap` where `status=open`. Each gap is a remaining issue. The count should trend toward 0 across cycles.

### 4. Check Source Verification
Query `ScrapeSource` where `status=unverified`. Count = remaining sources to verify.

### 5. Check Project Integrity
Query `Project` where `source_url` is null or `verification_status` != `verified`. Each is a data quality issue.

### 6. Run a Manual Audit
In the Admin dashboard, trigger:
- runSystemAudit (full system audit)
- runDataIntegrity (data quality check)
- runUiAudit (UI completeness check)
- runBenchmarkResearch (competitor analysis)

### 7. Check Workflow Status
In the dashboard, go to Workflows — verify all are active and running on schedule.

### 8. Check Connectors
In the dashboard, go to Integrations — verify all are authorized and syncing.

## How to Finish to the Max

1. **Run the autonomous prompt** in a new conversation.
2. **Let it cycle** — it will audit, implement, validate, and recurse. It stops when it needs OAuth, payment, or app store input.
3. **Resolve blockers** (authorize OAuth, claim Stripe, submit to app stores).
4. **Resume the prompt** in a new conversation — it will pick up where it left off (reads the roadmap, queries open gaps, resumes the cycle).
5. **Repeat** until the stop condition is met (0 gaps, score ≥ 95, all items ✅).
6. **Run the final audit** using the steps above.
7. **Launch** — the system is at 100% ceiling capability.