// ============================================================================
// XTREME Convergence — Fault Manifest
// ============================================================================
// 40 deterministic seeded faults for the Broken Twin convergence proof.
// Ported verbatim from 06_BROKEN_TWIN/fault_manifest.json (seed: XTREME-BROKEN-TWIN-001).
// The repair agent is never handed the expected repair answer — it must
// detect, classify, repair, and independently validate each fault.
// ============================================================================

export type Severity = 'P0' | 'P1' | 'P2' | 'P3';

export interface Fault {
  fault_id: string;
  category: string;
  severity: Severity;
  fault_type: string;
  injected: boolean;
  expected_condition: string;
  expected_detector: string;
  expected_classification: string;
  expected_repair_path: string;
  expected_validation: string;
  expected_recovery: string;
  expected_rollback: string;
  score_impact: string;
}

export interface FaultManifest {
  manifest_version: string;
  seed: string;
  environment: string;
  faults: Fault[];
}

// Shared defaults — identical across all 40 seeded faults.
const D = {
  injected: true,
  expected_validation: 'independent validator must PASS original and regression tests',
  expected_recovery: 'system returns to mandatory PASS for impacted predicates',
  expected_rollback: 'reversible sandbox/branch path recorded',
  score_impact: 'prevents VERIFIED_100 while active',
};

// Varying fields per fault: [id, category, severity, fault_type, condition, detector, classification, repair_path]
const R: [string, string, Severity, string, string, string, string, string][] = [
  ['BT-001', 'build', 'P1', 'broken_build', 'Build command fails', 'build validator', 'build', 'repair build/config'],
  ['BT-002', 'lint', 'P2', 'lint_failure', 'Lint error exists', 'lint validator', 'lint', 'repair lint defect'],
  ['BT-003', 'types', 'P1', 'type_error', 'Type check fails', 'type validator', 'types', 'repair type contract'],
  ['BT-004', 'unit', 'P1', 'unit_failure', 'Unit test fails', 'unit validator', 'unit', 'repair logic'],
  ['BT-005', 'api', 'P1', 'api_contract_mismatch', 'API response violates contract', 'API validator', 'api', 'repair contract/implementation'],
  ['BT-006', 'frontend', 'P1', 'broken_route', 'Required route fails', 'browser validator', 'frontend', 'repair route'],
  ['BT-007', 'frontend', 'P2', 'broken_navigation', 'Navigation target incorrect', 'browser validator', 'frontend', 'repair navigation'],
  ['BT-008', 'form', 'P2', 'invalid_form_behavior', 'Form validation incorrect', 'E2E validator', 'form', 'repair form contract'],
  ['BT-009', 'responsive', 'P2', 'layout_regression', 'Mobile/tablet layout breaks', 'visual validator', 'responsive', 'repair responsive rules'],
  ['BT-010', 'accessibility', 'P2', 'a11y_defect', 'Accessibility check fails', 'a11y validator', 'accessibility', 'repair a11y defect'],
  ['BT-011', 'evidence', 'P1', 'stale_evidence', 'Expired evidence counted as PASS', 'score engine', 'evidence', 'invalidate evidence and rerun'],
  ['BT-012', 'database', 'P1', 'missing_migration', 'Required migration missing', 'data validator', 'database', 'draft/apply sandbox migration'],
  ['BT-013', 'database', 'P1', 'schema_mismatch', 'Schema differs from contract', 'data validator', 'database', 'repair schema or contract'],
  ['BT-014', 'security', 'P0', 'rls_policy_defect', 'Tenant isolation test fails', 'security validator', 'security', 'repair RLS in sandbox'],
  ['BT-015', 'auth', 'P0', 'authorization_failure', 'Unauthorized role can access protected path', 'security validator', 'auth', 'repair authorization'],
  ['BT-016', 'queue', 'P1', 'duplicate_delivery', 'Duplicate job produces duplicate mutation', 'queue validator', 'queue', 'add/repair idempotency'],
  ['BT-017', 'queue', 'P1', 'missing_idempotency', 'Mutation lacks idempotency key', 'queue validator', 'queue', 'implement idempotency'],
  ['BT-018', 'queue', 'P1', 'expired_lease', 'Expired lease remains locked', 'queue validator', 'queue', 'recover stale lease'],
  ['BT-019', 'worker', 'P1', 'worker_death', 'Worker disappears during job', 'heartbeat validator', 'worker', 'requeue after lease expiry'],
  ['BT-020', 'worker', 'P1', 'stale_heartbeat', 'Stale worker still receives jobs', 'heartbeat validator', 'worker', 'quarantine stale worker'],
  ['BT-021', 'provider', 'P2', 'http_429', 'Provider rate limit', 'integration validator', 'provider', 'bounded backoff/circuit policy'],
  ['BT-022', 'provider', 'P1', 'http_500', 'Provider server error', 'integration validator', 'provider', 'retry/fallback policy'],
  ['BT-023', 'provider', 'P1', 'model_outage', 'Primary model unavailable', 'agent validator', 'provider', 'fallback or block safely'],
  ['BT-024', 'database', 'P1', 'db_interruption', 'Database temporarily unreachable', 'resilience validator', 'database', 'recover safely'],
  ['BT-025', 'queue', 'P1', 'queue_backlog', 'Queue age exceeds SLO', 'queue validator', 'queue', 'restore execution fabric'],
  ['BT-026', 'deployment', 'P1', 'health_check_failure', 'Preview health check fails', 'deployment validator', 'deployment', 'repair build/runtime'],
  ['BT-027', 'validation', 'P1', 'validator_failure', 'Implementation succeeds but validator fails', 'validation engine', 'validation', 'repair or quarantine validator'],
  ['BT-028', 'queue', 'P1', 'retry_exhaustion', 'Max retries reached', 'queue validator', 'queue', 'route to DLQ'],
  ['BT-029', 'queue', 'P2', 'dlq_creation', 'Poison job must land in DLQ', 'queue validator', 'queue', 'create durable DLQ receipt'],
  ['BT-030', 'config', 'P1', 'config_corruption', 'Required config becomes invalid', 'config validator', 'config', 'restore known-good config'],
  ['BT-031', 'source', 'P0', 'source_sha_drift', 'Runtime source SHA differs from approved SHA', 'source validator', 'source', 'block release/reconcile drift'],
  ['BT-032', 'deployment', 'P0', 'deployment_source_mismatch', 'Deployment identity mismatches source', 'deployment validator', 'deployment', 'block and restore parity'],
  ['BT-033', 'performance', 'P2', 'performance_regression', 'Latency exceeds constitution', 'performance validator', 'performance', 'optimize then regress'],
  ['BT-034', 'security', 'P1', 'dependency_vulnerability', 'High-risk dependency finding', 'security validator', 'security', 'upgrade/replace dependency'],
  ['BT-035', 'observability', 'P2', 'missing_observability', 'Critical path has no usable logs/metrics', 'observability validator', 'observability', 'add instrumentation'],
  ['BT-036', 'cost', 'P2', 'budget_limit_breach', 'Run would exceed configured budget', 'budget validator', 'cost', 'throttle/block/escalate'],
  ['BT-037', 'rollback', 'P1', 'rollback_required', 'Change must be reverted', 'rollback validator', 'rollback', 'execute sandbox rollback'],
  ['BT-038', 'backup', 'P1', 'restore_test', 'Backup exists but restore unproven', 'restore validator', 'backup', 'restore and validate integrity'],
  ['BT-039', 'visual', 'P2', 'visual_regression', 'Approved visual mismatch', 'visual validator', 'visual', 'repair exact mismatch'],
  ['BT-040', 'scheduler', 'P1', 'duplicate_scheduler', 'Duplicate scheduler creates duplicate cycles', 'automation validator', 'scheduler', 'enforce canonical lease/idempotency'],
];

export const FAULT_MANIFEST: FaultManifest = {
  manifest_version: '1.0.0',
  seed: 'XTREME-BROKEN-TWIN-001',
  environment: 'NON_PRODUCTION_ONLY',
  faults: R.map(([fault_id, category, severity, fault_type, expected_condition, expected_detector, expected_classification, expected_repair_path]) => ({
    fault_id,
    category,
    severity,
    fault_type,
    ...D,
    expected_condition,
    expected_detector,
    expected_classification,
    expected_repair_path,
  })) as Fault[],
};