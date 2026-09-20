// ============================================================================
// XTREME Convergence — Score Engine
// ============================================================================
// Ported verbatim from reference_runtime/src/score.mjs.
// VERIFIED_100 is a boolean evidence state, NOT a weighted average.
// A single mandatory FAIL / UNKNOWN / BLOCKED / SKIPPED / STALE prevents
// certification. Stale PASS becomes UNKNOWN. Skipped mandatory is not PASS.
// ============================================================================

export const NON_PASS = new Set<string>(['FAIL', 'UNKNOWN', 'BLOCKED', 'SKIPPED', 'STALE']);

export interface Benchmark {
  benchmark_id: string;
  category?: string;
  mandatory?: boolean;
  status: string;
}

export interface Verified100Input {
  benchmarks: Benchmark[];
  p0Open?: number;
  p1Open?: number;
  cleanCycles?: number;
  requiredCleanCycles?: number;
}

export function isVerified100(input: Verified100Input): boolean {
  const { benchmarks, p0Open = 0, p1Open = 0, cleanCycles = 0, requiredCleanCycles = 1 } = input;
  if (!Array.isArray(benchmarks) || benchmarks.length === 0) return false;
  const mandatory = benchmarks.filter((b) => b.mandatory !== false);
  if (mandatory.length === 0) return false;
  if (mandatory.some((b) => b.status !== 'PASS')) return false;
  if (p0Open !== 0 || p1Open !== 0) return false;
  if (cleanCycles < requiredCleanCycles) return false;
  return true;
}

export function diagnosticScore(benchmarks: Benchmark[]): number {
  const mandatory = (benchmarks || []).filter((b) => b.mandatory !== false);
  if (mandatory.length === 0) return 0;
  const passed = mandatory.filter((b) => b.status === 'PASS').length;
  return Math.round((passed / mandatory.length) * 10000) / 100;
}