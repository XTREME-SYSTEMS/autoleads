// ============================================================================
// XTREME Convergence — Deterministic Engine
// ============================================================================
// Ported verbatim from reference_runtime/src/engine.mjs.
// Prioritizes faults (P0 before P1, deterministic category order) and
// simulates the DISCOVER -> ... -> VALIDATE convergence loop over the
// 40-fault Broken Twin manifest. The engine is a pure function — same
// input always yields the same receipt. No randomness, no improvisation.
// ============================================================================

import { diagnosticScore, isVerified100, type Benchmark } from './score.ts';
import { FAULT_MANIFEST, type Fault, type FaultManifest } from './faultManifest.ts';

const severityOrder: Record<string, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const categoryOrder: Record<string, number> = {
  security: 0, data: 1, source: 2, deployment: 3, queue: 4, worker: 5, build: 6,
  types: 7, api: 8, auth: 9, validation: 10, database: 11, frontend: 12, form: 13,
  responsive: 14, accessibility: 15, evidence: 16, provider: 17, config: 18,
  performance: 19, observability: 20, cost: 21, rollback: 22, backup: 23, visual: 24,
  lint: 25, unit: 26, scheduler: 27,
};

export function prioritizeFaults(faults: Fault[]): Fault[] {
  return [...faults].sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9) ||
      (categoryOrder[a.category] ?? 99) - (categoryOrder[b.category] ?? 99) ||
      a.fault_id.localeCompare(b.fault_id)
  );
}

export interface LedgerEntry {
  cycle: number;
  fingerprint_id: string;
  category: string;
  severity: string;
  disposition: 'REPAIR';
  repair_path: string;
  validator: string;
  score_before: number;
  score_after: number;
  status: 'PASS';
}

export interface ConvergenceResult {
  run_id: string;
  seed: string;
  injected_faults: number;
  detected_faults: number;
  repaired_faults: number;
  validated_faults: number;
  critical_missed: number;
  false_verified_count: number;
  initial_score: number;
  final_score: number;
  p0_open: number;
  p1_open: number;
  final_verified_100: boolean;
  elapsed_ms: number;
  progress_ledger: LedgerEntry[];
}

export function simulateConvergence(faultManifest: FaultManifest = FAULT_MANIFEST): ConvergenceResult {
  const start = Date.now();
  const faults = prioritizeFaults(faultManifest.faults || []);
  const benchmarks: Benchmark[] = faults.map((f) => ({
    benchmark_id: f.fault_id,
    category: f.category,
    mandatory: true,
    status: 'FAIL',
  }));
  const ledger: LedgerEntry[] = [];
  let p0Open = faults.filter((f) => f.severity === 'P0').length;
  let p1Open = faults.filter((f) => f.severity === 'P1').length;
  let cycle = 0;
  const initialScore = diagnosticScore(benchmarks);

  for (const fault of faults) {
    cycle++;
    const before = diagnosticScore(benchmarks);
    const b = benchmarks.find((x) => x.benchmark_id === fault.fault_id)!;
    b.status = 'PASS';
    if (fault.severity === 'P0') p0Open--;
    if (fault.severity === 'P1') p1Open--;
    const after = diagnosticScore(benchmarks);
    ledger.push({
      cycle,
      fingerprint_id: fault.fault_id,
      category: fault.category,
      severity: fault.severity,
      disposition: 'REPAIR',
      repair_path: fault.expected_repair_path,
      validator: fault.expected_detector,
      score_before: before,
      score_after: after,
      status: 'PASS',
    });
  }

  const verified = isVerified100({ benchmarks, p0Open, p1Open, cleanCycles: 1, requiredCleanCycles: 1 });
  const end = Date.now();
  return {
    run_id: `BT-${faultManifest.seed}`,
    seed: faultManifest.seed,
    injected_faults: faults.length,
    detected_faults: faults.length,
    repaired_faults: faults.length,
    validated_faults: faults.length,
    critical_missed: 0,
    false_verified_count: 0,
    initial_score: initialScore,
    final_score: diagnosticScore(benchmarks),
    p0_open: p0Open,
    p1_open: p1Open,
    final_verified_100: verified,
    elapsed_ms: end - start,
    progress_ledger: ledger,
  };
}