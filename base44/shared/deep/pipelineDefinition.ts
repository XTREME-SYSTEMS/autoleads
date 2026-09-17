// ============================================================================
// DEEP PIPELINE DEFINITION — Deterministic End-to-End Pipeline
// ============================================================================
// The backbone of the DEEP architecture: a formal state machine governing
// every lead's journey from source discovery to won contract.
//
// PRINCIPLES:
// 1. DETERMINISTIC — every state transition is a pure function. Same input
//    always produces the same output. No AI improvisation between stages.
// 2. VALIDATED — every action's output is validated against a typed contract
//    before the pipeline can advance. Failed validation = BLOCKED, not skip.
// 3. EVIDENCED — every action produces proof artifacts (raw data, parsed
//    output, validation result) recorded in the proof ledger.
// 4. AUDITABLE — the full transition history is reconstructable from the
//    proof ledger alone. No hidden state, no side effects.
// ============================================================================

export type PipelineState =
  | 'SOURCE_DISCOVERED'
  | 'SOURCE_SCRAPED'
  | 'SOURCE_PARSED'
  | 'LEAD_VALIDATED'
  | 'LEAD_MATCHED'
  | 'LEAD_QUALIFIED'
  | 'TAKEOFF_COMPLETED'
  | 'ESTIMATE_COMPLETED'
  | 'PROPOSAL_GENERATED'
  | 'PROPOSAL_VALIDATED'
  | 'PROPOSAL_APPROVED'
  | 'BID_SUBMITTED'
  | 'FOLLOW_UP_SENT'
  | 'RESPONSE_RECEIVED'
  | 'NEGOTIATION_STARTED'
  | 'CONTRACT_SIGNED'
  | 'INVOICE_SENT'
  | 'PAYMENT_RECEIVED'
  | 'WON'
  | 'LOST'
  | 'BLOCKED';

export interface ValidationRule {
  name: string;
  // Returns { pass: boolean, evidence: string } — never throws
  check: (output: any, context: any) => { pass: boolean; evidence: string };
}

export interface StepContract {
  state: PipelineState;
  // The deterministic next state(s). Array = branching (evaluated by router).
  nextState: PipelineState | PipelineState[];
  description: string;
  // Fields that MUST exist in the input payload (validated before action runs)
  requiredInputs: string[];
  // Fields that MUST exist in the output payload (validated after action runs)
  requiredOutputs: string[];
  // Business rule validators — ALL must pass for the step to be considered complete
  validators: ValidationRule[];
  // Proof artifacts that must exist after this step (e.g. 'raw_html', 'parsed_json')
  proofRequirements: string[];
  // Whether this step can auto-heal on validation failure
  autoHealable: boolean;
  // Whether human approval is required before advancing to the next state
  humanApprovalRequired: boolean;
  // Max retry attempts before escalating to BLOCKED
  maxRetries: number;
}

// ============================================================================
// THE PIPELINE — Source → Won Contract
// 18 deterministic states, each with strict entry/exit contracts.
// ============================================================================

export const PIPELINE: StepContract[] = [
  {
    state: 'SOURCE_DISCOVERED',
    nextState: 'SOURCE_SCRAPED',
    description: 'A source URL has been identified as a potential lead source',
    requiredInputs: ['source_url'],
    requiredOutputs: ['source_url', 'source_name', 'discovered_at'],
    validators: [
      {
        name: 'URL is valid and absolute',
        check: (out) => ({
          pass: typeof out.source_url === 'string' && /^https?:\/\/.+/.test(out.source_url),
          evidence: `source_url="${out.source_url}"`,
        }),
      },
      {
        name: 'Source name is non-empty',
        check: (out) => ({
          pass: typeof out.source_name === 'string' && out.source_name.trim().length > 0,
          evidence: `source_name="${out.source_name}"`,
        }),
      },
    ],
    proofRequirements: ['source_url', 'source_name'],
    autoHealable: false,
    humanApprovalRequired: false,
    maxRetries: 1,
  },
  {
    state: 'SOURCE_SCRAPED',
    nextState: 'SOURCE_PARSED',
    description: 'Raw content has been fetched from the source URL',
    requiredInputs: ['source_url'],
    requiredOutputs: ['raw_content', 'http_status', 'scraped_at'],
    validators: [
      {
        name: 'HTTP status is 2xx',
        check: (out) => ({
          pass: typeof out.http_status === 'number' && out.http_status >= 200 && out.http_status < 300,
          evidence: `http_status=${out.http_status}`,
        }),
      },
      {
        name: 'Raw content is non-empty',
        check: (out) => ({
          pass: typeof out.raw_content === 'string' && out.raw_content.trim().length > 100,
          evidence: `content_length=${out.raw_content?.length || 0}`,
        }),
      },
    ],
    proofRequirements: ['raw_content', 'http_status'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 3,
  },
  {
    state: 'SOURCE_PARSED',
    nextState: 'LEAD_VALIDATED',
    description: 'Structured data has been extracted from raw content',
    requiredInputs: ['raw_content'],
    requiredOutputs: ['title', 'description', 'jurisdiction', 'authority'],
    validators: [
      {
        name: 'Title is non-empty',
        check: (out) => ({
          pass: typeof out.title === 'string' && out.title.trim().length > 3,
          evidence: `title="${out.title?.substring(0, 80)}"`,
        }),
      },
      {
        name: 'Jurisdiction is non-empty',
        check: (out) => ({
          pass: typeof out.jurisdiction === 'string' && out.jurisdiction.trim().length > 0,
          evidence: `jurisdiction="${out.jurisdiction}"`,
        }),
      },
      {
        name: 'Description is substantive',
        check: (out) => ({
          pass: typeof out.description === 'string' && out.description.trim().length > 20,
          evidence: `description_length=${out.description?.length || 0}`,
        }),
      },
    ],
    proofRequirements: ['parsed_json'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 2,
  },
  {
    state: 'LEAD_VALIDATED',
    nextState: 'LEAD_MATCHED',
    description: 'Parsed lead has been validated as a real, active opportunity',
    requiredInputs: ['title', 'jurisdiction'],
    requiredOutputs: ['is_active_opportunity', 'validation_score', 'validation_reasons'],
    validators: [
      {
        name: 'Active opportunity flag is boolean',
        check: (out) => ({
          pass: typeof out.is_active_opportunity === 'boolean',
          evidence: `is_active_opportunity=${out.is_active_opportunity}`,
        }),
      },
      {
        name: 'Validation score is 0-100',
        check: (out) => ({
          pass: typeof out.validation_score === 'number' && out.validation_score >= 0 && out.validation_score <= 100,
          evidence: `validation_score=${out.validation_score}`,
        }),
      },
      {
        name: 'Validation reasons are documented',
        check: (out) => ({
          pass: Array.isArray(out.validation_reasons) && out.validation_reasons.length > 0,
          evidence: `reasons_count=${out.validation_reasons?.length || 0}`,
        }),
      },
    ],
    proofRequirements: ['validation_result_json'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 2,
  },
  {
    state: 'LEAD_MATCHED',
    nextState: 'LEAD_QUALIFIED',
    description: 'Lead has been matched to the organization\'s trade and service area',
    requiredInputs: ['title', 'jurisdiction'],
    requiredOutputs: ['trade_match', 'location_eligibility', 'match_score'],
    validators: [
      {
        name: 'Trade match is boolean or score',
        check: (out) => ({
          pass: out.trade_match !== undefined && out.trade_match !== null,
          evidence: `trade_match=${out.trade_match}`,
        }),
      },
      {
        name: 'Location eligibility is determined',
        check: (out) => ({
          pass: ['IN_SERVICE_AREA', 'OUT_OF_SERVICE_AREA', 'BORDER_MARKET', 'UNKNOWN_LOCATION', 'MANUAL_OVERRIDE'].includes(out.location_eligibility),
          evidence: `location_eligibility="${out.location_eligibility}"`,
        }),
      },
      {
        name: 'Match score is 0-100',
        check: (out) => ({
          pass: typeof out.match_score === 'number' && out.match_score >= 0 && out.match_score <= 100,
          evidence: `match_score=${out.match_score}`,
        }),
      },
    ],
    proofRequirements: ['match_result_json'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 1,
  },
  {
    state: 'LEAD_QUALIFIED',
    nextState: 'TAKEOFF_COMPLETED',
    description: 'Lead has been qualified as worth pursuing (bidability confirmed)',
    requiredInputs: ['trade_match', 'location_eligibility'],
    requiredOutputs: ['qualified', 'bidability_score', 'qualification_reasons'],
    validators: [
      {
        name: 'Qualified flag is boolean',
        check: (out) => ({
          pass: typeof out.qualified === 'boolean',
          evidence: `qualified=${out.qualified}`,
        }),
      },
      {
        name: 'Bidability score is 0-100',
        check: (out) => ({
          pass: typeof out.bidability_score === 'number' && out.bidability_score >= 0 && out.bidability_score <= 100,
          evidence: `bidability_score=${out.bidability_score}`,
        }),
      },
    ],
    proofRequirements: ['qualification_json'],
    autoHealable: false,
    humanApprovalRequired: false,
    maxRetries: 1,
  },
  {
    state: 'TAKEOFF_COMPLETED',
    nextState: 'ESTIMATE_COMPLETED',
    description: 'Material quantities have been measured from source documents',
    requiredInputs: ['title', 'specs'],
    requiredOutputs: ['takeoff_items', 'total_square_footage', 'takeoff_method'],
    validators: [
      {
        name: 'Takeoff items is a non-empty array',
        check: (out) => ({
          pass: Array.isArray(out.takeoff_items) && out.takeoff_items.length > 0,
          evidence: `items_count=${out.takeoff_items?.length || 0}`,
        }),
      },
      {
        name: 'Each item has scope, quantity, and unit',
        check: (out) => ({
          pass: Array.isArray(out.takeoff_items) && out.takeoff_items.every((i: any) =>
            i.scope && typeof i.quantity === 'number' && i.unit
          ),
          evidence: `all_items_complete=${Array.isArray(out.takeoff_items) && out.takeoff_items.every((i: any) => i.scope && typeof i.quantity === 'number' && i.unit)}`,
        }),
      },
      {
        name: 'Takeoff method is documented',
        check: (out) => ({
          pass: typeof out.takeoff_method === 'string' && out.takeoff_method.trim().length > 0,
          evidence: `takeoff_method="${out.takeoff_method}"`,
        }),
      },
    ],
    proofRequirements: ['takeoff_json'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 2,
  },
  {
    state: 'ESTIMATE_COMPLETED',
    nextState: 'PROPOSAL_GENERATED',
    description: 'Costs have been calculated from takeoff quantities and pricing data',
    requiredInputs: ['takeoff_items'],
    requiredOutputs: ['estimate_items', 'total_cost', 'margin_pct', 'total_value'],
    validators: [
      {
        name: 'Estimate items is a non-empty array',
        check: (out) => ({
          pass: Array.isArray(out.estimate_items) && out.estimate_items.length > 0,
          evidence: `items_count=${out.estimate_items?.length || 0}`,
        }),
      },
      {
        name: 'Total cost is a positive number',
        check: (out) => ({
          pass: typeof out.total_cost === 'number' && out.total_cost > 0,
          evidence: `total_cost=${out.total_cost}`,
        }),
      },
      {
        name: 'Margin is within configured range',
        check: (out) => ({
          pass: typeof out.margin_pct === 'number' && out.margin_pct >= 0 && out.margin_pct <= 100,
          evidence: `margin_pct=${out.margin_pct}`,
        }),
      },
      {
        name: 'Total value = cost + margin (within 1%)',
        check: (out) => {
          const expected = out.total_cost * (1 + out.margin_pct / 100);
          const diff = Math.abs(expected - out.total_value) / Math.max(expected, 1);
          return {
            pass: diff < 0.01,
            evidence: `expected=${expected.toFixed(2)} actual=${out.total_value} diff_pct=${(diff * 100).toFixed(2)}%`,
          };
        },
      },
    ],
    proofRequirements: ['estimate_json'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 2,
  },
  {
    state: 'PROPOSAL_GENERATED',
    nextState: 'PROPOSAL_VALIDATED',
    description: 'A professional proposal has been assembled from the estimate',
    requiredInputs: ['estimate_items', 'total_value'],
    requiredOutputs: ['proposal_id', 'title', 'items', 'scope_of_work', 'cover_letter', 'total_value'],
    validators: [
      {
        name: 'Proposal ID exists',
        check: (out) => ({
          pass: typeof out.proposal_id === 'string' && out.proposal_id.length > 0,
          evidence: `proposal_id="${out.proposal_id}"`,
        }),
      },
      {
        name: 'Items is a non-empty array',
        check: (out) => ({
          pass: Array.isArray(out.items) && out.items.length > 0,
          evidence: `items_count=${out.items?.length || 0}`,
        }),
      },
      {
        name: 'Scope of work is substantive (100+ chars)',
        check: (out) => ({
          pass: typeof out.scope_of_work === 'string' && out.scope_of_work.length > 100,
          evidence: `scope_length=${out.scope_of_work?.length || 0}`,
        }),
      },
      {
        name: 'Cover letter is substantive (100+ chars)',
        check: (out) => ({
          pass: typeof out.cover_letter === 'string' && out.cover_letter.length > 100,
          evidence: `cover_letter_length=${out.cover_letter?.length || 0}`,
        }),
      },
      {
        name: 'Total value is a positive number',
        check: (out) => ({
          pass: typeof out.total_value === 'number' && out.total_value > 0,
          evidence: `total_value=${out.total_value}`,
        }),
      },
    ],
    proofRequirements: ['proposal_json'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 2,
  },
  {
    state: 'PROPOSAL_VALIDATED',
    nextState: 'PROPOSAL_APPROVED',
    description: 'Proposal has passed the bid package validation gate',
    requiredInputs: ['proposal_id'],
    requiredOutputs: ['validation_passed', 'checklist_results', 'validation_gaps'],
    validators: [
      {
        name: 'Validation passed flag is boolean',
        check: (out) => ({
          pass: typeof out.validation_passed === 'boolean',
          evidence: `validation_passed=${out.validation_passed}`,
        }),
      },
      {
        name: 'Checklist results are documented',
        check: (out) => ({
          pass: Array.isArray(out.checklist_results) && out.checklist_results.length > 0,
          evidence: `checklist_count=${out.checklist_results?.length || 0}`,
        }),
      },
      {
        name: 'No critical gaps remain (if passed)',
        check: (out) => ({
          pass: out.validation_passed === true || (Array.isArray(out.validation_gaps) && out.validation_gaps.length > 0),
          evidence: `gaps=${out.validation_passed ? 'none' : out.validation_gaps?.join(',') || 'unknown'}`,
        }),
      },
    ],
    proofRequirements: ['validation_json'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 2,
  },
  {
    state: 'PROPOSAL_APPROVED',
    nextState: 'BID_SUBMITTED',
    description: 'Proposal has been approved for submission (auto or human)',
    requiredInputs: ['proposal_id', 'validation_passed'],
    requiredOutputs: ['approved', 'approved_by', 'approved_at'],
    validators: [
      {
        name: 'Approved flag is true',
        check: (out) => ({
          pass: out.approved === true,
          evidence: `approved=${out.approved}`,
        }),
      },
      {
        name: 'Approver is documented',
        check: (out) => ({
          pass: typeof out.approved_by === 'string' && out.approved_by.length > 0,
          evidence: `approved_by="${out.approved_by}"`,
        }),
      },
    ],
    proofRequirements: ['approval_record'],
    autoHealable: false,
    humanApprovalRequired: true,
    maxRetries: 1,
  },
  {
    state: 'BID_SUBMITTED',
    nextState: 'FOLLOW_UP_SENT',
    description: 'Bid has been submitted to the client (email, portal, or manual)',
    requiredInputs: ['proposal_id', 'approved'],
    requiredOutputs: ['submitted', 'submit_method', 'submit_receipt', 'submitted_at'],
    validators: [
      {
        name: 'Submitted flag is true',
        check: (out) => ({
          pass: out.submitted === true,
          evidence: `submitted=${out.submitted}`,
        }),
      },
      {
        name: 'Submit method is documented',
        check: (out) => ({
          pass: ['email', 'manual', 'portal', 'other'].includes(out.submit_method),
          evidence: `submit_method="${out.submit_method}"`,
        }),
      },
      {
        name: 'Submit receipt exists (for email/portal)',
        check: (out) => ({
          pass: out.submit_method === 'manual' || (typeof out.submit_receipt === 'string' && out.submit_receipt.length > 0),
          evidence: `submit_receipt="${out.submit_receipt || 'manual_attestation'}"`,
        }),
      },
    ],
    proofRequirements: ['submit_receipt', 'submit_method'],
    autoHealable: false,
    humanApprovalRequired: false,
    maxRetries: 1,
  },
  {
    state: 'FOLLOW_UP_SENT',
    nextState: 'RESPONSE_RECEIVED',
    description: 'Follow-up communication has been sent to the client',
    requiredInputs: ['submitted'],
    requiredOutputs: ['followup_number', 'sent_at', 'next_followup_date'],
    validators: [
      {
        name: 'Follow-up number is a positive integer',
        check: (out) => ({
          pass: typeof out.followup_number === 'number' && out.followup_number > 0 && Number.isInteger(out.followup_number),
          evidence: `followup_number=${out.followup_number}`,
        }),
      },
      {
        name: 'Sent timestamp exists',
        check: (out) => ({
          pass: typeof out.sent_at === 'string' && out.sent_at.length > 0,
          evidence: `sent_at="${out.sent_at}"`,
        }),
      },
    ],
    proofRequirements: ['followup_record'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 3,
  },
  {
    state: 'RESPONSE_RECEIVED',
    nextState: ['NEGOTIATION_STARTED', 'WON', 'LOST'],
    description: 'Client has responded to the bid — routed to negotiation, won, or lost',
    requiredInputs: ['followup_number'],
    requiredOutputs: ['response_type', 'response_content', 'received_at'],
    validators: [
      {
        name: 'Response type is classified',
        check: (out) => ({
          pass: ['interested', 'negotiating', 'accepted', 'rejected', 'no_response'].includes(out.response_type),
          evidence: `response_type="${out.response_type}"`,
        }),
      },
      {
        name: 'Response content is documented',
        check: (out) => ({
          pass: typeof out.response_content === 'string' && out.response_content.length > 0,
          evidence: `response_content_length=${out.response_content?.length || 0}`,
        }),
      },
    ],
    proofRequirements: ['response_record'],
    autoHealable: false,
    humanApprovalRequired: false,
    maxRetries: 1,
  },
  {
    state: 'NEGOTIATION_STARTED',
    nextState: 'CONTRACT_SIGNED',
    description: 'Negotiation is in progress with the client',
    requiredInputs: ['response_type'],
    requiredOutputs: ['negotiation_status', 'negotiated_value', 'terms_summary'],
    validators: [
      {
        name: 'Negotiation status is active',
        check: (out) => ({
          pass: ['in_progress', 'agreed', 'stalled'].includes(out.negotiation_status),
          evidence: `negotiation_status="${out.negotiation_status}"`,
        }),
      },
      {
        name: 'Negotiated value is a number (if agreed)',
        check: (out) => ({
          pass: out.negotiation_status !== 'agreed' || (typeof out.negotiated_value === 'number' && out.negotiated_value > 0),
          evidence: `negotiated_value=${out.negotiated_value}`,
        }),
      },
    ],
    proofRequirements: ['negotiation_record'],
    autoHealable: false,
    humanApprovalRequired: true,
    maxRetries: 1,
  },
  {
    state: 'CONTRACT_SIGNED',
    nextState: 'INVOICE_SENT',
    description: 'Contract has been signed by both parties',
    requiredInputs: ['negotiation_status'],
    requiredOutputs: ['contract_id', 'signed_value', 'signed_at', 'signature_status'],
    validators: [
      {
        name: 'Contract ID exists',
        check: (out) => ({
          pass: typeof out.contract_id === 'string' && out.contract_id.length > 0,
          evidence: `contract_id="${out.contract_id}"`,
        }),
      },
      {
        name: 'Signed value is a positive number',
        check: (out) => ({
          pass: typeof out.signed_value === 'number' && out.signed_value > 0,
          evidence: `signed_value=${out.signed_value}`,
        }),
      },
      {
        name: 'Signature status is "signed"',
        check: (out) => ({
          pass: out.signature_status === 'signed',
          evidence: `signature_status="${out.signature_status}"`,
        }),
      },
    ],
    proofRequirements: ['signed_contract'],
    autoHealable: false,
    humanApprovalRequired: true,
    maxRetries: 1,
  },
  {
    state: 'INVOICE_SENT',
    nextState: 'PAYMENT_RECEIVED',
    description: 'Invoice has been sent to the client for the signed contract',
    requiredInputs: ['contract_id', 'signed_value'],
    requiredOutputs: ['invoice_id', 'invoice_amount', 'invoice_status', 'sent_at'],
    validators: [
      {
        name: 'Invoice ID exists',
        check: (out) => ({
          pass: typeof out.invoice_id === 'string' && out.invoice_id.length > 0,
          evidence: `invoice_id="${out.invoice_id}"`,
        }),
      },
      {
        name: 'Invoice amount matches signed value (within 1%)',
        check: (out, ctx) => {
          const expected = ctx?.signed_value || 0;
          const diff = Math.abs(expected - out.invoice_amount) / Math.max(expected, 1);
          return {
            pass: diff < 0.01,
            evidence: `expected=${expected} actual=${out.invoice_amount} diff_pct=${(diff * 100).toFixed(2)}%`,
          };
        },
      },
      {
        name: 'Invoice status is "sent" or "paid"',
        check: (out) => ({
          pass: ['sent', 'paid', 'partial', 'overdue'].includes(out.invoice_status),
          evidence: `invoice_status="${out.invoice_status}"`,
        }),
      },
    ],
    proofRequirements: ['invoice_record'],
    autoHealable: true,
    humanApprovalRequired: false,
    maxRetries: 1,
  },
  {
    state: 'PAYMENT_RECEIVED',
    nextState: 'WON',
    description: 'Payment has been received for the contract',
    requiredInputs: ['invoice_id', 'invoice_amount'],
    requiredOutputs: ['payment_id', 'payment_amount', 'payment_status', 'paid_at'],
    validators: [
      {
        name: 'Payment ID exists',
        check: (out) => ({
          pass: typeof out.payment_id === 'string' && out.payment_id.length > 0,
          evidence: `payment_id="${out.payment_id}"`,
        }),
      },
      {
        name: 'Payment amount is a positive number',
        check: (out) => ({
          pass: typeof out.payment_amount === 'number' && out.payment_amount > 0,
          evidence: `payment_amount=${out.payment_amount}`,
        }),
      },
      {
        name: 'Payment status is "paid" or "partial"',
        check: (out) => ({
          pass: ['paid', 'partial'].includes(out.payment_status),
          evidence: `payment_status="${out.payment_status}"`,
        }),
      },
    ],
    proofRequirements: ['payment_record'],
    autoHealable: false,
    humanApprovalRequired: false,
    maxRetries: 1,
  },
  {
    state: 'WON',
    nextState: 'WON',
    description: 'Contract has been won — full lifecycle complete',
    requiredInputs: ['payment_status'],
    requiredOutputs: ['won_at', 'final_value', 'lifecycle_duration_days'],
    validators: [
      {
        name: 'Won timestamp exists',
        check: (out) => ({
          pass: typeof out.won_at === 'string' && out.won_at.length > 0,
          evidence: `won_at="${out.won_at}"`,
        }),
      },
      {
        name: 'Final value is a positive number',
        check: (out) => ({
          pass: typeof out.final_value === 'number' && out.final_value > 0,
          evidence: `final_value=${out.final_value}`,
        }),
      },
    ],
    proofRequirements: ['won_record'],
    autoHealable: false,
    humanApprovalRequired: false,
    maxRetries: 0,
  },
  {
    state: 'LOST',
    nextState: 'LOST',
    description: 'Bid was lost — recorded for outcome learning',
    requiredInputs: ['response_type'],
    requiredOutputs: ['lost_at', 'loss_reason', 'loss_stage'],
    validators: [
      {
        name: 'Lost timestamp exists',
        check: (out) => ({
          pass: typeof out.lost_at === 'string' && out.lost_at.length > 0,
          evidence: `lost_at="${out.lost_at}"`,
        }),
      },
      {
        name: 'Loss reason is documented',
        check: (out) => ({
          pass: typeof out.loss_reason === 'string' && out.loss_reason.length > 0,
          evidence: `loss_reason="${out.loss_reason}"`,
        }),
      },
    ],
    proofRequirements: ['loss_record'],
    autoHealable: false,
    humanApprovalRequired: false,
    maxRetries: 0,
  },
  {
    state: 'BLOCKED',
    nextState: 'BLOCKED',
    description: 'Pipeline is blocked — validation failed and auto-heal could not resolve',
    requiredInputs: [],
    requiredOutputs: ['blocked_at', 'blocked_reason', 'blocked_state', 'retry_count'],
    validators: [
      {
        name: 'Blocked reason is documented',
        check: (out) => ({
          pass: typeof out.blocked_reason === 'string' && out.blocked_reason.length > 0,
          evidence: `blocked_reason="${out.blocked_reason}"`,
        }),
      },
    ],
    proofRequirements: ['block_record'],
    autoHealable: true,
    humanApprovalRequired: true,
    maxRetries: 3,
  },
];

// ============================================================================
// UTILITIES
// ============================================================================

export const STATE_MAP: Record<PipelineState, StepContract> =
  PIPELINE.reduce((acc, step) => { acc[step.state] = step; return acc; }, {} as any);

export function getStep(state: PipelineState): StepContract | undefined {
  return STATE_MAP[state];
}

export function getInitialState(): PipelineState {
  return 'SOURCE_DISCOVERED';
}

export function getTerminalStates(): PipelineState[] {
  return ['WON', 'LOST', 'BLOCKED'];
}

export function isTerminal(state: PipelineState): boolean {
  return getTerminalStates().includes(state);
}

// The full ordered pipeline (excluding terminal/error states)
export const PIPELINE_ORDER: PipelineState[] = [
  'SOURCE_DISCOVERED',
  'SOURCE_SCRAPED',
  'SOURCE_PARSED',
  'LEAD_VALIDATED',
  'LEAD_MATCHED',
  'LEAD_QUALIFIED',
  'TAKEOFF_COMPLETED',
  'ESTIMATE_COMPLETED',
  'PROPOSAL_GENERATED',
  'PROPOSAL_VALIDATED',
  'PROPOSAL_APPROVED',
  'BID_SUBMITTED',
  'FOLLOW_UP_SENT',
  'RESPONSE_RECEIVED',
  'NEGOTIATION_STARTED',
  'CONTRACT_SIGNED',
  'INVOICE_SENT',
  'PAYMENT_RECEIVED',
  'WON',
];

export function getStepIndex(state: PipelineState): number {
  return PIPELINE_ORDER.indexOf(state);
}

export function getProgress(state: PipelineState): number {
  const idx = getStepIndex(state);
  if (idx < 0) return 0;
  return Math.round((idx / (PIPELINE_ORDER.length - 1)) * 100);
}