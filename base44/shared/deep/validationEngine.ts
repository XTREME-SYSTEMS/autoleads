// ============================================================================
// DEEP VALIDATION ENGINE
// ============================================================================
// Validates every pipeline action's output against its step contract.
// This is the heart of "mandatory 100% perfection" — no step advances
// unless ALL validators pass and ALL required outputs exist.
//
// The engine NEVER throws. Every validation returns a structured result
// with pass/fail, evidence strings, and a proof artifact. Failures are
// data, not exceptions — the orchestrator decides what to do with them.
// ============================================================================

import {
  type StepContract,
  type PipelineState,
  getStep,
} from './pipelineDefinition.ts';

export interface ValidationResult {
  state: PipelineState;
  passed: boolean;
  checked_at: string;
  // Per-validator results with evidence
  validator_results: ValidatorResult[];
  // Missing required output fields
  missing_outputs: string[];
  // Missing required input fields
  missing_inputs: string[];
  // Overall evidence summary (for the proof ledger)
  evidence_summary: string;
  // The proof artifact — a JSON snapshot of what was validated
  proof_artifact: string;
  // If failed, what went wrong (human-readable)
  failure_reason: string | null;
}

export interface ValidatorResult {
  name: string;
  passed: boolean;
  evidence: string;
}

export interface InputValidationResult {
  passed: boolean;
  missing: string[];
}

// ============================================================================
// INPUT VALIDATION — checks required inputs exist before an action runs
// ============================================================================
export function validateInputs(
  state: PipelineState,
  input: Record<string, any>
): InputValidationResult {
  const step = getStep(state);
  if (!step) {
    return { passed: false, missing: [`Unknown state: ${state}`] };
  }
  const missing = step.requiredInputs.filter((field) => {
    const val = input[field];
    return val === undefined || val === null || val === '';
  });
  return { passed: missing.length === 0, missing };
}

// ============================================================================
// OUTPUT VALIDATION — checks required outputs exist
// ============================================================================
export function validateOutputs(
  state: PipelineState,
  output: Record<string, any>
): InputValidationResult {
  const step = getStep(state);
  if (!step) {
    return { passed: false, missing: [`Unknown state: ${state}`] };
  }
  const missing = step.requiredOutputs.filter((field) => {
    const val = output[field];
    return val === undefined || val === null || val === '';
  });
  return { passed: missing.length === 0, missing };
}

// ============================================================================
// FULL VALIDATION — runs all validators and produces a structured result
// This is called after EVERY action. The pipeline cannot advance unless
// this returns passed=true.
// ============================================================================
export function validateAction(
  state: PipelineState,
  input: Record<string, any>,
  output: Record<string, any>,
  context: Record<string, any> = {}
): ValidationResult {
  const step = getStep(state);
  const now = new Date().toISOString();

  if (!step) {
    return {
      state,
      passed: false,
      checked_at: now,
      validator_results: [],
      missing_outputs: [],
      missing_inputs: [],
      evidence_summary: `Unknown state: ${state}`,
      proof_artifact: JSON.stringify({ state, error: 'unknown_state' }),
      failure_reason: `Unknown pipeline state: ${state}`,
    };
  }

  // 1. Validate inputs
  const inputCheck = validateInputs(state, input);
  // 2. Validate outputs
  const outputCheck = validateOutputs(state, output);
  // 3. Run all business rule validators
  const validator_results: ValidatorResult[] = step.validators.map((v) => {
    try {
      const result = v.check(output, context);
      return {
        name: v.name,
        passed: result.pass,
        evidence: result.evidence,
      };
    } catch (e: any) {
      return {
        name: v.name,
        passed: false,
        evidence: `VALIDATOR_CRASH: ${e?.message || 'unknown error'}`,
      };
    }
  });

  const allValidatorsPassed = validator_results.every((v) => v.passed);
  const passed = inputCheck.passed && outputCheck.passed && allValidatorsPassed;

  // Build evidence summary
  const failedValidators = validator_results.filter((v) => !v.passed);
  const evidence_parts: string[] = [];
  if (!inputCheck.passed) evidence_parts.push(`Missing inputs: ${inputCheck.missing.join(', ')}`);
  if (!outputCheck.passed) evidence_parts.push(`Missing outputs: ${outputCheck.missing.join(', ')}`);
  failedValidators.forEach((v) => evidence_parts.push(`FAIL[${v.name}]: ${v.evidence}`));
  if (passed) evidence_parts.push(`All ${validator_results.length} validators passed`);

  const evidence_summary = evidence_parts.join(' | ');
  const failure_reason = passed ? null : evidence_parts.join(' | ');

  // Build proof artifact — a complete snapshot for the ledger
  const proof_artifact = JSON.stringify({
    state,
    checked_at: now,
    passed,
    input_keys: Object.keys(input),
    output_keys: Object.keys(output),
    required_inputs: step.requiredInputs,
    required_outputs: step.requiredOutputs,
    validator_results,
    missing_inputs: inputCheck.missing,
    missing_outputs: outputCheck.missing,
  });

  return {
    state,
    passed,
    checked_at: now,
    validator_results,
    missing_outputs: outputCheck.missing,
    missing_inputs: inputCheck.missing,
    evidence_summary,
    proof_artifact,
    failure_reason,
  };
}

// ============================================================================
// PROOF REQUIREMENTS CHECK — verifies all required proof artifacts exist
// ============================================================================
export function checkProofRequirements(
  state: PipelineState,
  artifacts: Record<string, any>
): { passed: boolean; missing: string[] } {
  const step = getStep(state);
  if (!step) return { passed: false, missing: [`Unknown state: ${state}`] };
  const missing = step.proofRequirements.filter(
    (req) => artifacts[req] === undefined || artifacts[req] === null || artifacts[req] === ''
  );
  return { passed: missing.length === 0, missing };
}

// ============================================================================
// CAN ADVANCE — the gate function. Returns true only if the pipeline
// can advance to the next state.
// ============================================================================
export function canAdvance(
  state: PipelineState,
  validation: ValidationResult,
  proofCheck: { passed: boolean; missing: string[] }
): { can_advance: boolean; reason: string } {
  if (isTerminal(state)) {
    return { can_advance: false, reason: 'Terminal state — pipeline complete' };
  }
  if (!validation.passed) {
    return { can_advance: false, reason: `Validation failed: ${validation.failure_reason}` };
  }
  if (!proofCheck.passed) {
    return { can_advance: false, reason: `Missing proof artifacts: ${proofCheck.missing.join(', ')}` };
  }
  return { can_advance: true, reason: 'All checks passed' };
}

function isTerminal(state: PipelineState): boolean {
  return ['WON', 'LOST', 'BLOCKED'].includes(state);
}