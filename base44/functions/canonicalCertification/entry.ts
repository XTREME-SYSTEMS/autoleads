// Canonical Certification & Regression Test Suite
// Runs the dedup regression tests AND the full canonical corpus certification.
// Returns a comprehensive health report for the canonical opportunity engine.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { runDedupTests } from '../../shared/canonicalOpportunity.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const svc = base44.asServiceRole;

    // === 1. DEDUP REGRESSION TESTS ===
    const dedupTests = runDedupTests();
    const dedupPassed = dedupTests.filter(t => t.passed).length;
    const dedupFailed = dedupTests.length - dedupPassed;

    // === 2. LOAD ALL DATA ===
    const canonicals = await svc.entities.CanonicalOpportunity.list('-created_date', 500);

    let allMatches: any[] = [];
    let off = 0;
    while (off < 2000) {
      const batch = await svc.entities.OrganizationOpportunityMatch.list('-created_date', 500, off);
      if (!batch || batch.length === 0) break;
      allMatches = allMatches.concat(batch);
      if (batch.length < 500) break;
      off += 500;
    }

    let allProjects: any[] = [];
    off = 0;
    while (off < 2000) {
      const batch = await svc.entities.Project.list('-created_date', 500, off);
      if (!batch || batch.length === 0) break;
      allProjects = allProjects.concat(batch);
      if (batch.length < 500) break;
      off += 500;
    }

    const prodProjects = allProjects.filter((p: any) =>
      p.data_class !== 'NON_PRODUCTION_EXAMPLE' && p.title && !p.title.includes('TEST_')
    );

    const projectToCanonical: Record<string, string> = {};
    allMatches.forEach((m: any) => {
      if (m.project_id && m.canonical_opportunity_id) {
        projectToCanonical[m.project_id] = m.canonical_opportunity_id;
      }
    });

    const canonicalProjects: Record<string, any[]> = {};
    prodProjects.forEach((p: any) => {
      const cid = projectToCanonical[p.id];
      if (cid) {
        if (!canonicalProjects[cid]) canonicalProjects[cid] = [];
        canonicalProjects[cid].push(p);
      }
    });

    // === HELPER FUNCTIONS ===
    function fpNormalize(text: string): string {
      return (text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function extractAddress(title: string): string {
      if (!title) return '';
      const parts = title.split('—');
      return parts[parts.length - 1].trim();
    }
    function uniqueVals(arr: string[]): string[] {
      return [...new Set(arr.filter(v => v && String(v).trim() !== ''))];
    }
    function stem(word: string): string {
      return word.replace(/(ing|ings)$/g, '').replace(/(s|es)$/g, '').replace(/(ation|ations)$/g, 'at').replace(/(tion|tions)$/g, 't');
    }
    function jaccardSimilarity(a: string, b: string): number {
      const setA = new Set(a.split(' ').filter(Boolean).map(stem));
      const setB = new Set(b.split(' ').filter(Boolean).map(stem));
      if (setA.size === 0 || setB.size === 0) return 0;
      let intersection = 0;
      for (const w of setA) if (setB.has(w)) intersection++;
      const union = setA.size + setB.size - intersection;
      return union > 0 ? intersection / union : 0;
    }

    // === 3. OVER-MERGE CERTIFICATION ===
    let overMergeConflicts = 0;
    const overMergeDetails: any[] = [];
    for (const c of canonicals) {
      const projects = canonicalProjects[c.id] || [];
      if (projects.length <= 1) continue;
      const states = uniqueVals(projects.map((p: any) => p.detected_state).concat([c.detected_state]));
      const authorities = uniqueVals(projects.map((p: any) => p.authority).concat([c.authority]));
      const permitProjects = projects.filter((p: any) => p.title && p.title.includes('—'));
      if (permitProjects.length > 1) {
        const addresses = uniqueVals(permitProjects.map((p: any) => extractAddress(p.title)));
        if (addresses.length > 1) {
          overMergeConflicts++;
          if (overMergeDetails.length < 5) overMergeDetails.push({ type: 'ADDRESS_CONFLICT', canonical_id: c.id, title: c.title, addresses });
        }
      }
      if (states.length > 1) overMergeConflicts++;
      if (authorities.length > 1) overMergeConflicts++;
    }

    // === 4. UNDER-MERGE CERTIFICATION ===
    const blocks: Record<string, any[]> = {};
    canonicals.forEach(c => {
      const blockKey = `${fpNormalize(c.authority || '')}::${c.detected_state || ''}`;
      if (!blocks[blockKey]) blocks[blockKey] = [];
      blocks[blockKey].push(c);
    });

    let trueDuplicates = 0;
    const underMergeDetails: any[] = [];
    for (const [, blockCanonicals] of Object.entries(blocks)) {
      for (let i = 0; i < blockCanonicals.length; i++) {
        for (let j = i + 1; j < blockCanonicals.length; j++) {
          const a = blockCanonicals[i];
          const b = blockCanonicals[j];
          const titleSim = jaccardSimilarity(fpNormalize(a.title || ''), fpNormalize(b.title || ''));
          if (titleSim < 0.6) continue;
          const addrA = extractAddress(a.title);
          const addrB = extractAddress(b.title);
          const sameAddress = addrA && addrB && addrA === addrB;
          if (titleSim === 1 && sameAddress) {
            trueDuplicates++;
            if (underMergeDetails.length < 5) underMergeDetails.push({ a: a.title, b: b.title, sim: titleSim });
          }
        }
      }
    }

    // === 5. MATCH UNIQUENESS ===
    const pairKey = (m: any) => `${m.organization_id}::${m.canonical_opportunity_id}`;
    const pairCounts: Record<string, number> = {};
    allMatches.forEach((m: any) => { const key = pairKey(m); pairCounts[key] = (pairCounts[key] || 0) + 1; });
    const uniquePairs = Object.keys(pairCounts).length;
    const duplicateActivePairs = Object.values(pairCounts).filter(v => v > 1).length;
    const canonicalIds = new Set(canonicals.map(c => c.id));
    const orphanMatches = allMatches.filter((m: any) => !canonicalIds.has(m.canonical_opportunity_id)).length;

    // === 6. HOT LEAD INTEGRITY ===
    const hotMatches = allMatches.filter((m: any) => m.is_hot_lead === true);
    const hotViolations = hotMatches.filter((m: any) =>
      m.location_eligibility === 'OUT_OF_SERVICE_AREA' ||
      m.location_eligibility === 'UNKNOWN_LOCATION' || !m.location_eligibility ||
      m.freshness_status === 'EXPIRED' || m.freshness_status === 'CLOSED' || m.freshness_status === 'AWARDED' || m.freshness_status === 'CANCELLED' ||
      m.suppressed === true ||
      !canonicalIds.has(m.canonical_opportunity_id)
    ).length;

    // === 7. STATE DETECTION COVERAGE ===
    const canonicalsWithState = canonicals.filter(c => c.detected_state && c.detected_state.length === 2).length;
    const canonicalsWithoutState = canonicals.length - canonicalsWithState;
    const stateDistribution: Record<string, number> = {};
    canonicals.forEach(c => {
      const s = c.detected_state || 'UNKNOWN';
      stateDistribution[s] = (stateDistribution[s] || 0) + 1;
    });

    // === 8. FRESHNESS DISTRIBUTION ===
    const freshnessDistribution: Record<string, number> = {};
    canonicals.forEach(c => {
      const f = c.freshness_status || 'UNKNOWN';
      freshnessDistribution[f] = (freshnessDistribution[f] || 0) + 1;
    });

    // === 9. DEADLINE STATUS DISTRIBUTION ===
    const deadlineDistribution: Record<string, number> = {};
    canonicals.forEach(c => {
      const d = c.deadline_status || 'NO_DEADLINE';
      deadlineDistribution[d] = (deadlineDistribution[d] || 0) + 1;
    });

    // === COMPOSITE SCORE ===
    const allTestsPass = overMergeConflicts === 0 && trueDuplicates === 0 && duplicateActivePairs === 0 && orphanMatches === 0 && hotViolations === 0 && dedupFailed === 0;
    const certificationScore = allTestsPass ? 100 : Math.round(100 - (overMergeConflicts + trueDuplicates + duplicateActivePairs + orphanMatches + hotViolations + dedupFailed) * 5);

    return Response.json({
      timestamp: new Date().toISOString(),
      overall_certification: allTestsPass ? 'PASS' : 'FAIL',
      certification_score: certificationScore,

      dedup_regression: {
        total: dedupTests.length,
        passed: dedupPassed,
        failed: dedupFailed,
        test: dedupFailed === 0 ? 'PASS' : 'FAIL',
        details: dedupTests,
      },

      corpus_stats: {
        total_canonicals: canonicals.length,
        total_projects: prodProjects.length,
        projects_mapped: Object.keys(projectToCanonical).length,
        projects_unmapped: prodProjects.length - Object.keys(projectToCanonical).length,
        multi_source: canonicals.filter(c => (canonicalProjects[c.id] || []).length > 1).length,
        single_source: canonicals.filter(c => (canonicalProjects[c.id] || []).length === 1).length,
        zero_source: canonicals.filter(c => !canonicalProjects[c.id] || canonicalProjects[c.id].length === 0).length,
        total_matches: allMatches.length,
      },

      over_merge: {
        conflicts: overMergeConflicts,
        test: overMergeConflicts === 0 ? 'PASS' : 'FAIL',
        details: overMergeDetails,
      },

      under_merge: {
        true_duplicates: trueDuplicates,
        test: trueDuplicates === 0 ? 'PASS' : 'NEEDS_MERGE',
        details: underMergeDetails,
      },

      match_uniqueness: {
        total_matches: allMatches.length,
        unique_pairs: uniquePairs,
        duplicate_pairs: duplicateActivePairs,
        orphan_matches: orphanMatches,
        test: duplicateActivePairs === 0 && orphanMatches === 0 ? 'PASS' : 'FAIL',
      },

      hot_lead_integrity: {
        total_hot: hotMatches.length,
        violations: hotViolations,
        test: hotViolations === 0 ? 'PASS' : 'FAIL',
      },

      state_coverage: {
        with_state: canonicalsWithState,
        without_state: canonicalsWithoutState,
        coverage_pct: Math.round((canonicalsWithState / canonicals.length) * 100),
        distribution: stateDistribution,
      },

      freshness_distribution: freshnessDistribution,
      deadline_distribution: deadlineDistribution,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Certification failed' }, { status: 500 });
  }
}