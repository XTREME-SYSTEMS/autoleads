import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { fetchOrgAssets, getApprovedTakeoffs } from '../../shared/orgAssets.ts';

// validateBidPackage — pre-send AI checklist that scans the bid package
// (proposal, takeoffs, estimate, company info) against industry standards
// for completeness, pricing accuracy, scope coverage, and compliance.
// Returns "approved" or "issues_found" with specific fixable items.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const proposalId = String(body?.proposal_id || '').trim();
    if (!proposalId) return Response.json({ error: 'proposal_id is required' }, { status: 400 });

    const proposal = await client.entities.Proposal.get(proposalId).catch(() => null);
    if (!proposal) return Response.json({ error: 'Proposal not found' }, { status: 404 });

    const projectId = proposal.project_id;
    const orgId = proposal.organization_id;

    const [project, takeoffs, estimates] = await Promise.all([
      projectId ? client.entities.Project.get(projectId).catch(() => null) : null,
      projectId ? client.entities.Takeoff.filter({ project_id: projectId }).catch(() => []) : [],
      projectId ? client.entities.Estimate.filter({ organization_id: orgId, project_id: projectId }).catch(() => []) : [],
    ]);
    const { company, logo } = await fetchOrgAssets(client, orgId);
    const approvedTakeoffs = getApprovedTakeoffs(takeoffs);
    const estimate = (estimates || []).find((e: any) => e.status === 'approved') || (estimates || [])[0];

    const checklist = {
      has_proposal: !!proposal,
      has_client_email: !!proposal.client_email,
      has_client_name: !!proposal.client_name,
      has_total_value: Number(proposal.total_value) > 0,
      has_items: Array.isArray(proposal.items) && proposal.items.length > 0,
      has_takeoffs: approvedTakeoffs.length > 0,
      has_estimate: !!estimate,
      has_company_name: !!company.name,
      has_company_phone: !!company.phone,
      has_company_email: !!company.email,
      has_license: !!company.license_number,
      has_logo: !!logo,
      has_project_specs: !!project?.specs,
      has_contract_info: !!project?.contract_info,
      has_bid_due_date: !!project?.bid_due_date,
      has_plans_url: !!project?.plans_url,
    };

    const missing = Object.entries(checklist).filter(([_, v]) => !v).map(([k]) => k);

    const prompt = `You are a construction bid package validator. Review this bid package against industry standards before it is emailed to the client.

PROPOSAL:
- Title: ${proposal.title}
- Client: ${proposal.client_name || 'MISSING'}
- Client Email: ${proposal.client_email || 'MISSING'}
- Total Value: $${Number(proposal.total_value || 0).toLocaleString()}
- Items: ${Array.isArray(proposal.items) ? proposal.items.length : 0} line items

PROJECT:
- Title: ${project?.title || 'N/A'}
- Trade: ${project?.trade || 'N/A'}
- Value: ${project?.value ? '$' + Number(project.value).toLocaleString() : 'N/A'}
- Due Date: ${project?.bid_due_date || 'N/A'}
- Has Specs: ${!!project?.specs}
- Has Contract Info: ${!!project?.contract_info}
- Has Plans URL: ${!!project?.plans_url}

TAKEOFFS: ${approvedTakeoffs.length} approved takeoffs
ESTIMATE: ${estimate ? '$' + Number(estimate.grand_total || 0).toLocaleString() : 'NONE'}

COMPANY:
- Name: ${company.name || 'MISSING'}
- License: ${company.license_number || 'MISSING'}
- Phone: ${company.phone || 'MISSING'}
- Email: ${company.email || 'MISSING'}
- Logo: ${logo ? 'Yes' : 'MISSING'}

CHECKLIST RESULTS:
${Object.entries(checklist).map(([k, v]) => `${v ? '✅' : '❌'} ${k}`).join('\n')}

MISSING ITEMS: ${missing.length > 0 ? missing.join(', ') : 'None'}

VALIDATION CHECKS:
1. Is the bid package complete enough to send professionally?
2. Are pricing and quantities consistent between takeoffs, estimate, and proposal?
3. Is the scope of work fully covered?
4. Are all required documents (plans, specs, contract info) referenced?
5. Is the company information complete (license, insurance, contact)?
6. Are there any compliance or red-flag issues?
7. Would this bid package make a professional impression on a contractor/owner?

Respond with JSON:
{
  "verdict": "approved" | "issues_found",
  "confidence": 0-100,
  "summary": "One sentence assessment",
  "checks": [{ "check": "name", "result": "pass"|"fail"|"warning", "detail": "explanation" }],
  "issues": ["specific issues with what to fix and why"],
  "recommendations": ["improvement suggestions"]
}`;

    const result = await client.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['approved', 'issues_found'] },
          confidence: { type: 'number' },
          summary: { type: 'string' },
          checks: { type: 'array', items: { type: 'object', properties: {
            check: { type: 'string' }, result: { type: 'string', enum: ['pass', 'fail', 'warning'] }, detail: { type: 'string' }
          } } },
          issues: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_flash'
    });

    return Response.json({
      status: 'success',
      proposal_id: proposalId,
      verdict: result.verdict,
      confidence: result.confidence,
      summary: result.summary,
      checks: result.checks || [],
      issues: result.issues || [],
      recommendations: result.recommendations || [],
      missing_items: missing,
      checklist,
    });
  } catch (error: any) {
    console.error('validateBidPackage error:', error);
    return Response.json({ error: error?.message || 'Validation failed' }, { status: 500 });
  }
}