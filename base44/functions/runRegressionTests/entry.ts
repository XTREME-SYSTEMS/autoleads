import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { isOpportunityInServiceArea, normalizeServiceAreaStates, detectState } from '../../shared/locationEligibility.ts';
import { runDedupTests, generateFingerprint, compareFingerprints } from '../../shared/canonicalOpportunity.ts';
import { computeFreshness, isHotLead } from '../../shared/freshness.ts';
import { evaluateTradeMatch, isTradeEligible } from '../../shared/tradeMatcher.ts';
import { computeBidability } from '../../shared/bidability.ts';

// runRegressionTests — automated regression suite for AUTOLEADS production hardening.
// Tests: location invariant, canonical dedup, freshness, trade match, tenant isolation.
// Returns structured pass/fail with receipts.

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const results: TestResult[] = [];
    const orgId = body?.organization_id || '';

    // ============================================================
    // 1. LOCATION INVARIANT REGRESSION TESTS
    // ============================================================

    // Test: FL service area — FL opportunity → IN_SERVICE_AREA
    {
      const r = isOpportunityInServiceArea(['FL'], 'Miami, FL', '123 Main St, Miami, FL 33101');
      results.push({
        name: 'Location: FL org + FL opportunity → IN_SERVICE_AREA',
        passed: r.eligibility === 'IN_SERVICE_AREA',
        details: `Got ${r.eligibility}: ${r.explanation}`,
      });
    }

    // Test: FL service area — TX opportunity → OUT_OF_SERVICE_AREA
    {
      const r = isOpportunityInServiceArea(['FL'], 'Austin, TX', '456 Oak Ave, Austin, TX 78701');
      results.push({
        name: 'Location: FL org + TX opportunity → OUT_OF_SERVICE_AREA',
        passed: r.eligibility === 'OUT_OF_SERVICE_AREA',
        details: `Got ${r.eligibility}: ${r.explanation}`,
      });
    }

    // Test: FL service area — WA opportunity → OUT_OF_SERVICE_AREA
    {
      const r = isOpportunityInServiceArea(['FL'], 'Seattle, WA', '789 Pine St, Seattle, WA 98101');
      results.push({
        name: 'Location: FL org + WA opportunity → OUT_OF_SERVICE_AREA',
        passed: r.eligibility === 'OUT_OF_SERVICE_AREA',
        details: `Got ${r.eligibility}: ${r.explanation}`,
      });
    }

    // Test: FL service area — GA opportunity → OUT_OF_SERVICE_AREA (not configured)
    {
      const r = isOpportunityInServiceArea(['FL'], 'Atlanta, GA', '100 Peachtree St, Atlanta, GA 30301');
      results.push({
        name: 'Location: FL org + GA opportunity → OUT_OF_SERVICE_AREA (not configured)',
        passed: r.eligibility === 'OUT_OF_SERVICE_AREA',
        details: `Got ${r.eligibility}: ${r.explanation}`,
      });
    }

    // Test: Unknown geography → UNKNOWN_LOCATION
    {
      const r = isOpportunityInServiceArea(['FL'], 'Unknown location', '');
      results.push({
        name: 'Location: Unknown geography → UNKNOWN_LOCATION',
        passed: r.eligibility === 'UNKNOWN_LOCATION',
        details: `Got ${r.eligibility}: ${r.explanation}`,
      });
    }

    // Test: Federal jurisdiction → UNKNOWN_LOCATION
    {
      const r = isOpportunityInServiceArea(['FL'], 'Federal', '');
      results.push({
        name: 'Location: Federal jurisdiction → UNKNOWN_LOCATION',
        passed: r.eligibility === 'UNKNOWN_LOCATION',
        details: `Got ${r.eligibility}: ${r.explanation}`,
      });
    }

    // Test: Manual override → MANUAL_OVERRIDE
    {
      const r = isOpportunityInServiceArea(['FL'], 'Austin, TX', '', true);
      results.push({
        name: 'Location: Manual override → MANUAL_OVERRIDE',
        passed: r.eligibility === 'MANUAL_OVERRIDE',
        details: `Got ${r.eligibility}: ${r.explanation}`,
      });
    }

    // Test: normalizeServiceAreaStates handles various formats
    {
      const r1 = normalizeServiceAreaStates('FL');
      const r2 = normalizeServiceAreaStates('Florida');
      const r3 = normalizeServiceAreaStates(['FL', 'GA']);
      const r4 = normalizeServiceAreaStates('FL, GA');
      results.push({
        name: 'Location: normalizeServiceAreaStates handles all formats',
        passed: r1.length === 1 && r1[0] === 'FL' &&
                r2.length === 1 && r2[0] === 'FL' &&
                r3.length === 2 && r3.includes('FL') && r3.includes('GA') &&
                r4.length === 2 && r4.includes('FL') && r4.includes('GA'),
        details: `r1=${JSON.stringify(r1)}, r2=${JSON.stringify(r2)}, r3=${JSON.stringify(r3)}, r4=${JSON.stringify(r4)}`,
      });
    }

    // Test: detectState extracts state from various strings
    {
      const tests = [
        { input: 'Miami, FL', expected: 'FL' },
        { input: 'Austin, TX', expected: 'TX' },
        { input: 'Florida', expected: 'FL' },
        { input: 'Texas', expected: 'TX' },
        { input: 'Unknown', expected: '' },
      ];
      const allPass = tests.every(t => detectState(t.input) === t.expected);
      results.push({
        name: 'Location: detectState extracts state from various formats',
        passed: allPass,
        details: tests.map(t => `${t.input}→${detectState(t.input)}(exp:${t.expected})`).join(', '),
      });
    }

    // ============================================================
    // 2. CANONICAL DEDUP ADVERSARIAL TESTS
    // ============================================================
    const dedupResults = runDedupTests();
    for (const r of dedupResults) {
      results.push({
        name: `Dedup: ${r.name}`,
        passed: r.passed,
        details: `Expected ${r.expected}, got ${r.actual}`,
      });
    }

    // ============================================================
    // 3. FRESHNESS ENGINE TESTS
    // ============================================================

    // Test: FRESH — verified within 24h, open deadline
    {
      const r = computeFreshness({
        last_verified_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2h ago
        bid_due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 10 days out
        stage: 'takeoff',
      });
      results.push({
        name: 'Freshness: Recently verified + open deadline → FRESH',
        passed: r.freshness_status === 'FRESH' && r.deadline_status === 'OPEN',
        details: `Got ${r.freshness_status}/${r.deadline_status}`,
      });
    }

    // Test: EXPIRED — deadline passed
    {
      const r = computeFreshness({
        last_verified_at: new Date().toISOString(),
        bid_due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 5 days ago
        stage: 'proposal',
      });
      results.push({
        name: 'Freshness: Deadline passed → EXPIRED',
        passed: r.freshness_status === 'EXPIRED' && r.deadline_status === 'OVERDUE',
        details: `Got ${r.freshness_status}/${r.deadline_status}`,
      });
    }

    // Test: CLOSING_SOON — deadline within 48h
    {
      const r = computeFreshness({
        last_verified_at: new Date().toISOString(),
        bid_due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // 24h out
        stage: 'proposal',
      });
      results.push({
        name: 'Freshness: Deadline <48h → CLOSING_SOON',
        passed: r.deadline_status === 'CLOSING_SOON',
        details: `Got ${r.deadline_status}`,
      });
    }

    // Test: STALE — not verified in >3 days
    {
      const r = computeFreshness({
        last_verified_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
        bid_due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        stage: 'qualification',
      });
      results.push({
        name: 'Freshness: Not verified in 5 days → STALE',
        passed: r.freshness_status === 'STALE',
        details: `Got ${r.freshness_status}`,
      });
    }

    // Test: isHotLead — expired is NOT hot
    {
      const expired = computeFreshness({
        last_verified_at: new Date().toISOString(),
        bid_due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        stage: 'proposal',
      });
      results.push({
        name: 'Freshness: Expired opportunity is NOT a hot lead',
        passed: !isHotLead(expired),
        details: `isHotLead=${isHotLead(expired)}`,
      });
    }

    // Test: SOURCE_UNAVAILABLE
    {
      const r = computeFreshness({ source_available: false });
      results.push({
        name: 'Freshness: Source unavailable → SOURCE_UNAVAILABLE',
        passed: r.freshness_status === 'SOURCE_UNAVAILABLE',
        details: `Got ${r.freshness_status}`,
      });
    }

    // Test: AWARDED
    {
      const r = computeFreshness({ awarded: true });
      results.push({
        name: 'Freshness: Awarded → AWARDED',
        passed: r.freshness_status === 'AWARDED',
        details: `Got ${r.freshness_status}`,
      });
    }

    // Test: CANCELLED
    {
      const r = computeFreshness({ cancelled: true });
      results.push({
        name: 'Freshness: Cancelled → CANCELLED',
        passed: r.freshness_status === 'CANCELLED',
        details: `Got ${r.freshness_status}`,
      });
    }

    // ============================================================
    // 4. TRADE MATCH TESTS
    // ============================================================

    // Test: Primary trade match
    {
      const r = evaluateTradeMatch(
        { title: 'Epoxy Flooring Installation', description: 'Install flake epoxy floor system', specs: '20-30 mils DFT' },
        { primary_trades: ['epoxy flooring', 'concrete polishing'], secondary_trades: [], excluded_scopes: [], keywords: [], aliases: {} }
      );
      results.push({
        name: 'TradeMatch: Epoxy flooring in primary trades → PRIMARY_MATCH',
        passed: r.result === 'PRIMARY_MATCH',
        details: `Got ${r.result}: ${r.explanation}`,
      });
    }

    // Test: Excluded scope
    {
      const r = evaluateTradeMatch(
        { title: 'Roof Replacement Project', description: 'TPO roof installation' },
        { primary_trades: ['epoxy flooring'], secondary_trades: [], excluded_scopes: ['roofing'], keywords: [], aliases: {} }
      );
      results.push({
        name: 'TradeMatch: Roofing in excluded scopes → EXCLUDED_SCOPE',
        passed: r.result === 'EXCLUDED_SCOPE',
        details: `Got ${r.result}: ${r.explanation}`,
      });
    }

    // Test: No match
    {
      const r = evaluateTradeMatch(
        { title: 'HVAC System Installation', description: 'Install HVAC units' },
        { primary_trades: ['epoxy flooring'], secondary_trades: [], excluded_scopes: [], keywords: ['epoxy', 'flooring'], aliases: {} }
      );
      results.push({
        name: 'TradeMatch: HVAC with epoxy config → NO_MATCH',
        passed: r.result === 'NO_MATCH',
        details: `Got ${r.result}: ${r.explanation}`,
      });
    }

    // Test: isTradeEligible — only PRIMARY and SECONDARY qualify
    {
      const primary = evaluateTradeMatch(
        { title: 'Epoxy Floor' },
        { primary_trades: ['epoxy'], secondary_trades: [], excluded_scopes: [], keywords: [], aliases: {} }
      );
      const noMatch = evaluateTradeMatch(
        { title: 'HVAC' },
        { primary_trades: ['epoxy'], secondary_trades: [], excluded_scopes: [], keywords: [], aliases: {} }
      );
      results.push({
        name: 'TradeMatch: isTradeEligible — primary=yes, no_match=no',
        passed: isTradeEligible(primary) && !isTradeEligible(noMatch),
        details: `primary=${isTradeEligible(primary)}, noMatch=${isTradeEligible(noMatch)}`,
      });
    }

    // ============================================================
    // 5. BIDABILITY ENGINE TESTS
    // ============================================================
    {
      const loc = isOpportunityInServiceArea(['FL'], 'Miami, FL', '123 Main St, Miami, FL');
      const trade = evaluateTradeMatch(
        { title: 'Epoxy Flooring for Miami Convention Center', description: '5000 sq ft commercial epoxy flooring' },
        { primary_trades: ['epoxy'], secondary_trades: [], excluded_scopes: [], keywords: [], aliases: {} });
      const fresh = computeFreshness({ last_verified_at: new Date().toISOString(), first_seen_at: new Date().toISOString(), bid_due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10) });
      const result = computeBidability({
        location: loc,
        trade_match: trade,
        freshness: fresh,
        project: {
          value: 150000,
          bid_due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
          plans_url: 'https://example.com/plans.pdf',
          documents: [{ type: 'plans' }],
          specs: 'Epoxy flooring system, 5000 sq ft, commercial grade',
          contract_info: 'John Doe, jdoe@example.com, 305-555-1234',
          verification_status: 'verified',
          authority: 'City of Miami',
        },
        org: { bonding_capacity: 500000, prior_awards: 2, margin_pct: 25 },
      });
      const locOk = loc.eligibility === 'IN_SERVICE_AREA' || loc.eligibility === 'MANUAL_OVERRIDE';
      const tradeOk = isTradeEligible(trade);
      const freshOk = isHotLead(fresh);
      results.push({
        name: 'Bidability: High-fit opportunity scores 70+',
        passed: result.score >= 70 && result.eligible,
        details: `Score ${result.score}/100, eligible=${result.eligible}, loc=${locOk}(${loc.eligibility}), trade=${tradeOk}(${trade.result}), fresh=${freshOk}(${fresh.freshness_status}/${fresh.deadline_status})`,
      });
    }

    {
      const loc = isOpportunityInServiceArea(['FL'], 'Austin, TX', '456 Elm St, Austin, TX');
      const trade = evaluateTradeMatch(
        { title: 'Epoxy Flooring for Austin Office' },
        { primary_trades: ['epoxy'], secondary_trades: [], excluded_scopes: [], keywords: [], aliases: {} });
      const fresh = computeFreshness({ last_verified_at: new Date().toISOString(), first_seen_at: new Date().toISOString(), bid_due_date: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10) });
      const result = computeBidability({
        location: loc,
        trade_match: trade,
        freshness: fresh,
        project: { value: 100000, specs: 'Epoxy flooring', verification_status: 'unverified' },
        org: { bonding_capacity: 200000, prior_awards: 0, margin_pct: 10 },
      });
      results.push({
        name: 'Bidability: Out-of-area opportunity is NOT eligible',
        passed: !result.eligible && result.blockers.length > 0,
        details: `Score ${result.score}/100, eligible=${result.eligible}, blockers: ${result.blockers.join('; ')}`,
      });
    }

    {
      const loc = isOpportunityInServiceArea(['FL'], 'Miami, FL', 'Miami, FL');
      const trade = evaluateTradeMatch(
        { title: 'HVAC System Replacement' },
        { primary_trades: ['epoxy'], secondary_trades: [], excluded_scopes: ['hvac'], keywords: [], aliases: {} });
      const fresh = computeFreshness({ last_verified_at: new Date().toISOString(), first_seen_at: new Date().toISOString(), bid_due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10) });
      const result = computeBidability({
        location: loc,
        trade_match: trade,
        freshness: fresh,
        project: { value: 200000, specs: 'HVAC replacement', verification_status: 'verified' },
        org: { bonding_capacity: 500000, prior_awards: 1, margin_pct: 15 },
      });
      results.push({
        name: 'Bidability: Excluded trade is NOT eligible despite good location',
        passed: !result.eligible && result.blockers.length > 0,
        details: `Score ${result.score}/100, eligible=${result.eligible}, blockers: ${result.blockers.join('; ')}`,
      });
    }

    // ============================================================
    // 6. DATABASE-LEVEL LOCATION INVARIANT TEST (if orgId provided)
    // ============================================================
    if (orgId) {
      try {
        const projects = await client.entities.Project.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []);
        const outOfArea = (projects || []).filter((p: any) => p.location_eligibility === 'OUT_OF_SERVICE_AREA');
        results.push({
          name: `DB: Org ${orgId.slice(-6)} has zero OUT_OF_SERVICE_AREA projects in feed`,
          passed: outOfArea.length === 0,
          details: outOfArea.length > 0 ? `${outOfArea.length} out-of-area projects found` : 'Clean',
        });

        // Verify all projects have location fields populated
        const missingFields = (projects || []).filter((p: any) => !p.location_eligibility || !p.detected_state === undefined);
        results.push({
          name: `DB: All projects have location_eligibility populated`,
          passed: missingFields.length === 0,
          details: missingFields.length > 0 ? `${missingFields.length} projects missing location fields` : 'All populated',
        });
      } catch (e: any) {
        results.push({
          name: 'DB: Location invariant check',
          passed: false,
          details: e?.message || 'DB query failed',
        });
      }
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const passRate = results.length > 0 ? Math.round((passed / results.length) * 100) : 0;
    const failedNames = results.filter(r => !r.passed).map(r => `${r.name}: ${r.details}`);

    return Response.json({
      success: true,
      total: results.length,
      passed,
      failed,
      pass_rate: passRate,
      failed_tests: failedNames,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}