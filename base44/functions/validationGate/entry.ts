import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { fetchOrgAssets, getApprovedTakeoffs } from '../../shared/orgAssets.ts';

// validationGate — runs the mandatory checklist at a given intervention point.
// If items fail AND have a remediation function, it auto-triggers that function,
// re-checks, and logs the full result to ValidationLog. This ensures no human
// ever sees an incomplete lead, takeoff, or bid package — "no one gets embarrassed."

const REMEDIATION_FUNCTIONS = {
  batchGatherProjectDetails: async (client, projectId, orgId) => {
    return await client.functions.invoke('batchGatherProjectDetails', {
      project_ids: [projectId], _service_token: 'auto',
    }).catch(() => null);
  },
  autoTakeoff: async (client, projectId, orgId) => {
    return await client.functions.invoke('autoTakeoff', {
      project_id: projectId, _service_token: 'auto',
    }).catch(() => null);
  },
  batchCreateBidPackages: async (client, projectId, orgId) => {
    return await client.functions.invoke('batchCreateBidPackages', {
      project_ids: [projectId], _service_token: 'auto',
    }).catch(() => null);
  },
  generateSafetyBooklet: async (client, projectId, orgId, project) => {
    return await client.functions.invoke('generateSafetyBooklet', {
      organization_id: orgId, project_id: projectId, trade: project?.trade,
    }).catch(() => null);
  },
};

function runLeadIntakeChecklist(project) {
  return {
    has_title: !!project?.title,
    has_description: !!project?.description && project.description.length > 20,
    has_jurisdiction: !!project?.jurisdiction,
    has_source_url: !!project?.source_url,
    has_specs: !!project?.specs && project.specs.length > 20,
    has_contract_info: !!project?.contract_info && project.contract_info.length > 5,
    has_bid_due_date: !!project?.bid_due_date,
    has_detected_state: !!project?.detected_state,
    has_trade: !!project?.trade,
  };
}

function runPreparedTakeoffChecklist(project, takeoffs) {
  const approved = getApprovedTakeoffs(takeoffs);
  const allTakeoffs = takeoffs || [];
  return {
    has_takeoffs: allTakeoffs.length > 0,
    takeoff_has_scope: allTakeoffs.length > 0 && allTakeoffs.every(t => !!t.scope),
    takeoff_has_quantity: allTakeoffs.length > 0 && allTakeoffs.every(t => Number(t.quantity) > 0),
    takeoff_has_unit: allTakeoffs.length > 0 && allTakeoffs.every(t => !!t.unit),
    takeoff_has_final_quantity: allTakeoffs.length > 0 && allTakeoffs.every(t => Number(t.final_quantity) > 0),
    takeoff_has_approval_state: allTakeoffs.length > 0 && allTakeoffs.every(t => !!t.approval_state),
    project_has_specs: !!project?.specs && project.specs.length > 20,
  };
}

function runBidPackageChecklist(proposal, project, company, logo, hasSafetyBooklet) {
  return {
    proposal_has_client_name: !!proposal?.client_name,
    proposal_has_client_email: !!proposal?.client_email,
    proposal_has_total_value: Number(proposal?.total_value) > 0,
    proposal_has_items: Array.isArray(proposal?.items) && proposal.items.length > 0,
    company_has_name: !!company?.name,
    company_has_license: !!company?.license_number,
    company_has_phone: !!company?.phone,
    company_has_email: !!company?.email,
    has_logo: !!logo,
    project_has_specs: !!project?.specs && project.specs.length > 20,
    project_has_contract_info: !!project?.contract_info && project.contract_info.length > 5,
    safety_booklet_generated: hasSafetyBooklet,
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const gate = String(body?.gate || '').trim();
    const projectId = String(body?.project_id || '').trim();
    const proposalId = String(body?.proposal_id || '').trim();
    const auto_remediate = body?.auto_remediate !== false; // default true

    if (!gate) {
      return Response.json({ error: 'gate is required (lead_intake, prepared_takeoff, or bid_package)' }, { status: 400 });
    }

    // Sweep mode: no project_id → validate all relevant projects for this gate
    if (!projectId) {
      let sweepProjects = [];
      if (gate === 'lead_intake') {
        sweepProjects = await client.entities.Project.filter({ stage: 'qualification' }, '-created_date', 50).catch(() => []);
      } else if (gate === 'prepared_takeoff') {
        sweepProjects = await client.entities.Project.filter({ stage: 'takeoff' }, '-created_date', 50).catch(() => []);
      } else if (gate === 'bid_package') {
        const proposals = await client.entities.Proposal.filter({ status: 'internal_review' }, '-created_date', 50).catch(() => []);
        const projectIds = [...new Set((proposals || []).map(p => p.project_id).filter(Boolean))];
        for (const pid of projectIds) {
          const proj = await client.entities.Project.get(pid).catch(() => null);
          if (proj) sweepProjects.push(proj);
        }
      }

      const results = [];
      for (const proj of sweepProjects) {
        try {
          const innerReq = new Request(req.url, {
            method: 'POST',
            headers: req.headers,
            body: JSON.stringify({ gate, project_id: proj.id, proposal_id: proposalId, auto_remediate }),
          });
          const innerRes = await validationGateSingle(innerReq, base44, client, user, gate, proj.id, proposalId, auto_remediate);
          results.push(innerRes);
        } catch (err) {
          results.push({ project_id: proj.id, error: err.message, validation_status: 'failed' });
        }
      }

      return Response.json({
        status: 'success',
        gate,
        sweep: true,
        projects_validated: results.length,
        passed: results.filter(r => r.validation_status === 'passed').length,
        remediated: results.filter(r => r.validation_status === 'remediated').length,
        blocked: results.filter(r => r.validation_status === 'blocked').length,
        failed: results.filter(r => r.validation_status === 'failed').length,
        results,
      });
    }

    const result = await validationGateSingle(req, base44, client, user, gate, projectId, proposalId, auto_remediate);
    return Response.json(result);
  } catch (error: any) {
    console.error('validationGate error:', error);
    return Response.json({ error: error?.message || 'Validation failed' }, { status: 500 });
  }
}

async function validationGateSingle(req: Request, base44: any, client: any, user: any, gate: string, projectId: string, proposalId: string, auto_remediate: boolean): Promise<any> {
  try {
    const project = await client.entities.Project.get(projectId).catch(() => null);
    if (!project) return { error: 'Project not found', project_id: projectId, validation_status: 'failed' };

    const orgId = project.organization_id || '';
    let proposal = null;
    let takeoffs = [];
    let company = {};
    let logo = null;
    let hasSafetyBooklet = false;

    // Gather context based on gate
    if (gate === 'prepared_takeoff') {
      takeoffs = await client.entities.Takeoff.filter({ project_id: projectId }).catch(() => []);
    } else if (gate === 'bid_package') {
      const proposals = await client.entities.Proposal.filter({ project_id: projectId }).catch(() => []);
      proposal = proposalId ? await client.entities.Proposal.get(proposalId).catch(() => null) : (proposals || [])[0] || null;
      takeoffs = await client.entities.Takeoff.filter({ project_id: projectId }).catch(() => []);
      const orgAssets = await fetchOrgAssets(client, orgId);
      company = orgAssets.company;
      logo = orgAssets.logo;
      // Check if a safety booklet was recently generated for this project
      const bookletEvents = await client.entities.PipelineEvent.filter({
        project_id: projectId, event_type: 'safety_booklet_generated'
      }).catch(() => []);
      hasSafetyBooklet = (bookletEvents || []).length > 0;
    }

    // Run the checklist
    let results;
    if (gate === 'lead_intake') results = runLeadIntakeChecklist(project);
    else if (gate === 'prepared_takeoff') results = runPreparedTakeoffChecklist(project, takeoffs);
    else if (gate === 'bid_package') results = runBidPackageChecklist(proposal, project, company, logo, hasSafetyBooklet);
    else return Response.json({ error: 'Invalid gate. Use: lead_intake, prepared_takeoff, or bid_package' }, { status: 400 });

    // Identify failures
    const failedKeys = Object.entries(results).filter(([_, v]) => !v).map(([k]) => k);

    // Build checklist with labels and remediation info
    const checklistMeta = {
      lead_intake: () => import('../../shared/validationGates.ts').then(m => m.VALIDATION_GATES.lead_intake.checklist),
      prepared_takeoff: () => import('../../shared/validationGates.ts').then(m => m.VALIDATION_GATES.prepared_takeoff.checklist),
      bid_package: () => import('../../shared/validationGates.ts').then(m => m.VALIDATION_GATES.bid_package.checklist),
    };

    // Since dynamic import may not work in Deno, define inline
    const GATE_CHECKLISTS = {
      lead_intake: [
        { key: 'has_title', label: 'Project has a title', remediation: null },
        { key: 'has_description', label: 'Project has a description', remediation: null },
        { key: 'has_jurisdiction', label: 'Project has jurisdiction (Florida)', remediation: null },
        { key: 'has_source_url', label: 'Project has source URL', remediation: null },
        { key: 'has_specs', label: 'Project has specifications', remediation: 'batchGatherProjectDetails' },
        { key: 'has_contract_info', label: 'Project has contract/contact info', remediation: 'batchGatherProjectDetails' },
        { key: 'has_bid_due_date', label: 'Project has bid due date', remediation: 'batchGatherProjectDetails' },
        { key: 'has_detected_state', label: 'Project has detected state (FL)', remediation: null },
        { key: 'has_trade', label: 'Project has trade classification', remediation: null },
      ],
      prepared_takeoff: [
        { key: 'has_takeoffs', label: 'Project has at least one takeoff', remediation: 'autoTakeoff' },
        { key: 'takeoff_has_scope', label: 'Each takeoff has scope defined', remediation: 'autoTakeoff' },
        { key: 'takeoff_has_quantity', label: 'Each takeoff has quantity > 0', remediation: 'autoTakeoff' },
        { key: 'takeoff_has_unit', label: 'Each takeoff has unit of measure', remediation: 'autoTakeoff' },
        { key: 'takeoff_has_final_quantity', label: 'Each takeoff has final quantity > 0', remediation: 'autoTakeoff' },
        { key: 'takeoff_has_approval_state', label: 'Each takeoff has approval state set', remediation: null },
        { key: 'project_has_specs', label: 'Project specs available for takeoff', remediation: 'batchGatherProjectDetails' },
      ],
      bid_package: [
        { key: 'proposal_has_client_name', label: 'Proposal has client name', remediation: null },
        { key: 'proposal_has_client_email', label: 'Proposal has client email', remediation: null },
        { key: 'proposal_has_total_value', label: 'Proposal has total value > 0', remediation: 'batchCreateBidPackages' },
        { key: 'proposal_has_items', label: 'Proposal has line items', remediation: 'batchCreateBidPackages' },
        { key: 'company_has_name', label: 'Company profile has name', remediation: null },
        { key: 'company_has_license', label: 'Company has license number', remediation: null },
        { key: 'company_has_phone', label: 'Company has phone number', remediation: null },
        { key: 'company_has_email', label: 'Company has email', remediation: null },
        { key: 'has_logo', label: 'Brand logo exists', remediation: null },
        { key: 'project_has_specs', label: 'Project has specifications', remediation: 'batchGatherProjectDetails' },
        { key: 'project_has_contract_info', label: 'Project has contract info', remediation: 'batchGatherProjectDetails' },
        { key: 'safety_booklet_generated', label: 'Safety booklet generated', remediation: 'generateSafetyBooklet' },
      ],
    };

    const checklistItems = GATE_CHECKLISTS[gate].map(item => ({
      ...item,
      passed: results[item.key],
    }));

    const passedCount = checklistItems.filter(i => i.passed).length;
    const failedCount = checklistItems.filter(i => !i.passed).length;

    // Auto-remediation: trigger remediation functions for failed items
    const remediationActions = [];
    let remediationTriggered = false;

    if (auto_remediate && failedCount > 0) {
      const remediationNeeded = checklistItems.filter(i => !i.passed && i.remediation);
      const uniqueRemediations = [...new Set(remediationNeeded.map(i => i.remediation))];

      for (const remediationFn of uniqueRemediations) {
        if (REMEDIATION_FUNCTIONS[remediationFn]) {
          remediationTriggered = true;
          try {
            const result = await REMEDIATION_FUNCTIONS[remediationFn](client, projectId, orgId, project);
            remediationActions.push({
              function: remediationFn,
              triggered_for: checklistItems.filter(i => i.remediation === remediationFn && !i.passed).map(i => i.key),
              success: true,
              result: result ? 'completed' : 'no result',
            });
          } catch (err) {
            remediationActions.push({
              function: remediationFn,
              triggered_for: checklistItems.filter(i => i.remediation === remediationFn && !i.passed).map(i => i.key),
              success: false,
              error: err.message,
            });
          }
        }
      }

      // Re-fetch project after remediation and re-run checklist
      if (remediationTriggered) {
        const refreshedProject = await client.entities.Project.get(projectId).catch(() => project);
        if (gate === 'prepared_takeoff') {
          takeoffs = await client.entities.Takeoff.filter({ project_id: projectId }).catch(() => takeoffs);
        } else if (gate === 'bid_package') {
          const proposals = await client.entities.Proposal.filter({ project_id: projectId }).catch(() => []);
          proposal = proposalId ? await client.entities.Proposal.get(proposalId).catch(() => proposal) : (proposals || [])[0] || proposal;
          const orgAssets = await fetchOrgAssets(client, orgId);
          company = orgAssets.company;
          logo = orgAssets.logo;
          const bookletEvents = await client.entities.PipelineEvent.filter({
            project_id: projectId, event_type: 'safety_booklet_generated'
          }).catch(() => []);
          hasSafetyBooklet = (bookletEvents || []).length > 0;
        }

        // Re-run checklist
        let refreshedResults;
        if (gate === 'lead_intake') refreshedResults = runLeadIntakeChecklist(refreshedProject);
        else if (gate === 'prepared_takeoff') refreshedResults = runPreparedTakeoffChecklist(refreshedProject, takeoffs);
        else refreshedResults = runBidPackageChecklist(proposal, refreshedProject, company, logo, hasSafetyBooklet);

        checklistItems.forEach(item => {
          item.passed = refreshedResults[item.key];
        });
      }
    }

    const finalPassed = checklistItems.filter(i => i.passed).length;
    const finalFailed = checklistItems.filter(i => !i.passed).length;

    // Determine status
    let status: string;
    if (finalFailed === 0) {
      status = remediationTriggered ? 'remediated' : 'passed';
    } else {
      status = remediationTriggered ? 'blocked' : 'failed';
    }

    const summary = `${finalPassed}/${checklistItems.length} checks passed. ${finalFailed} failed.${remediationTriggered ? ` ${remediationActions.length} remediation action(s) triggered.` : ''}`;

    // Log to ValidationLog
    const logEntry = await client.entities.ValidationLog.create({
      organization_id: orgId,
      gate,
      project_id: projectId,
      proposal_id: proposal?.id || '',
      checklist: JSON.stringify(checklistItems.map(i => ({ key: i.key, label: i.label, passed: i.passed, remediation: i.remediation }))),
      passed_count: finalPassed,
      failed_count: finalFailed,
      remediation_actions: JSON.stringify(remediationActions),
      remediation_triggered: remediationTriggered,
      status,
      summary,
      validated_by: user?.email || 'system',
    }).catch(() => null);

    // Create notification if blocked
    if (status === 'blocked') {
      await client.entities.Notification.create({
        organization_id: orgId,
        type: 'validation',
        title: `Validation blocked at ${gate}: ${project.title}`,
        body: `${finalFailed} mandatory items still missing after auto-remediation. Manual review needed.`,
        priority: 'high',
        linked_route: '/validation-gates',
        linked_record_id: logEntry?.id || '',
      }).catch(() => null);
    }

    return {
      status: 'success',
      gate,
      project_id: projectId,
      proposal_id: proposal?.id || '',
      checklist: checklistItems,
      passed_count: finalPassed,
      failed_count: finalFailed,
      remediation_triggered: remediationTriggered,
      remediation_actions: remediationActions,
      validation_status: status,
      summary,
      log_id: logEntry?.id,
    };
  } catch (error: any) {
    console.error('validationGateSingle error:', error);
    return { error: error?.message || 'Validation failed', project_id: projectId, validation_status: 'failed' };
  }
}