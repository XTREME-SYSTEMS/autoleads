// Shared validation gate definitions — mandatory checklists for each intervention point.
// Used by the validationGate backend function AND the ValidationGateDashboard UI.

export const VALIDATION_GATES = {
  lead_intake: {
    name: "Lead Intake Validation",
    description: "Validates leads BEFORE humans see them. Ensures mandatory docs and specs are present.",
    subtitle: "Gate 1 — Before human review",
    checklist: [
      { key: "has_title", label: "Project has a title", remediation: null },
      { key: "has_description", label: "Project has a description", remediation: null },
      { key: "has_jurisdiction", label: "Project has jurisdiction (Florida)", remediation: null },
      { key: "has_source_url", label: "Project has source URL", remediation: null },
      { key: "has_specs", label: "Project has specifications", remediation: "batchGatherProjectDetails" },
      { key: "has_contract_info", label: "Project has contract/contact info", remediation: "batchGatherProjectDetails" },
      { key: "has_bid_due_date", label: "Project has bid due date", remediation: "batchGatherProjectDetails" },
      { key: "has_detected_state", label: "Project has detected state (FL)", remediation: null },
      { key: "has_trade", label: "Project has trade classification", remediation: null },
    ],
  },
  prepared_takeoff: {
    name: "Prepared Takeoff Validation",
    description: "Validates takeoffs BEFORE humans review them. Fixes issues before delivery.",
    subtitle: "Gate 2 — Before human takeoff review",
    checklist: [
      { key: "has_takeoffs", label: "Project has at least one takeoff", remediation: "autoTakeoff" },
      { key: "takeoff_has_scope", label: "Each takeoff has scope defined", remediation: "autoTakeoff" },
      { key: "takeoff_has_quantity", label: "Each takeoff has quantity > 0", remediation: "autoTakeoff" },
      { key: "takeoff_has_unit", label: "Each takeoff has unit of measure", remediation: "autoTakeoff" },
      { key: "takeoff_has_final_quantity", label: "Each takeoff has final quantity > 0", remediation: "autoTakeoff" },
      { key: "takeoff_has_approval_state", label: "Each takeoff has approval state set", remediation: null },
      { key: "project_has_specs", label: "Project specs available for takeoff", remediation: "batchGatherProjectDetails" },
    ],
  },
  bid_package: {
    name: "Bid Package Validation",
    description: "Validates bid packages BEFORE delivery to user. Mandatory checklist with all components.",
    subtitle: "Gate 3 — Before bid package delivery",
    checklist: [
      { key: "proposal_has_client_name", label: "Proposal has client name", remediation: null },
      { key: "proposal_has_client_email", label: "Proposal has client email", remediation: null },
      { key: "proposal_has_total_value", label: "Proposal has total value > 0", remediation: "batchCreateBidPackages" },
      { key: "proposal_has_items", label: "Proposal has line items", remediation: "batchCreateBidPackages" },
      { key: "company_has_name", label: "Company profile has name", remediation: null },
      { key: "company_has_license", label: "Company has license number", remediation: null },
      { key: "company_has_phone", label: "Company has phone number", remediation: null },
      { key: "company_has_email", label: "Company has email", remediation: null },
      { key: "has_logo", label: "Brand logo exists", remediation: null },
      { key: "project_has_specs", label: "Project has specifications", remediation: "batchGatherProjectDetails" },
      { key: "project_has_contract_info", label: "Project has contract info", remediation: "batchGatherProjectDetails" },
      { key: "safety_booklet_generated", label: "Safety booklet generated", remediation: "generateSafetyBooklet" },
    ],
  },
};

export const GATE_ORDER = ["lead_intake", "prepared_takeoff", "bid_package"];