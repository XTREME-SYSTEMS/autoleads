import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    const body = await req.json().catch(() => ({})) || {};
    const { project_id, takeoff_ids } = body;
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    // Fetch project + takeoffs
    const project = await svc.entities.Project.get(project_id).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const takeoffs = await svc.entities.Takeoff.filter({ project_id }, '-created_date', 50).catch(() => []);
    const activeTakeoffs = (takeoffs || []).filter(t =>
      takeoff_ids ? takeoff_ids.includes(t.id) : true
    );

    if (activeTakeoffs.length === 0) {
      return Response.json({
        status: 'warning',
        verdict: 'no_takeoffs',
        message: 'No takeoff records found for this project. Gather project details and run takeoff before validation.'
      });
    }

    // Build context for the validator LLM
    const takeoffSummary = activeTakeoffs.map(t => ({
      scope: t.scope,
      system_code: t.system_code,
      quantity: t.final_quantity || t.raw_quantity,
      unit: t.unit,
      confidence: t.confidence,
      spec_evidence: t.spec_evidence,
      measurement_formula: t.measurement_formula,
      sheet: t.sheet,
      scale: t.scale,
      calibrated: t.calibrated
    }));

    const projectContext = {
      title: project.title,
      description: project.description,
      specs: project.specs,
      trade: project.trade,
      project_type: project.project_type,
      jurisdiction: project.jurisdiction,
      value: project.value,
      authority: project.authority,
      plans_url: project.plans_url,
      source_url: project.source_url
    };

    const prompt = `You are an expert construction estimator and takeoff validator. Your job is to validate construction takeoff quantities and specifications against industry standards, building codes, and best practices.

PROJECT CONTEXT:
${JSON.stringify(projectContext, null, 2)}

TAKEOFF RECORDS TO VALIDATE:
${JSON.stringify(takeoffSummary, null, 2)}

VALIDATION CHECKLIST:
1. Are the quantities reasonable for the project scope and size?
2. Are the units correct for the scope system (e.g. SF for flooring, LF for trim, EA for fixtures)?
3. Are the measurement formulas and scales appropriate?
4. Are the spec evidence references valid and sufficient?
5. Are there any obvious errors, missing items, or red flags?
6. Does the takeoff align with standard construction practices for this trade and project type?
7. Are waste factors appropriate for the material and scope?
8. Are there any safety, code, or compliance concerns?

Research current industry standards for this scope system and project type if needed.

Respond with a JSON object:
{
  "verdict": "approved" | "issues_found",
  "confidence": 0-100,
  "summary": "One sentence overall assessment",
  "checks": [
    { "check": "check name", "result": "pass" | "fail" | "warning", "detail": "explanation" }
  ],
  "issues": ["list of specific issues if any, with what to change and why"],
  "recommendations": ["list of improvement suggestions if any"]
}`;

    const result = await svc.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['approved', 'issues_found'] },
          confidence: { type: 'number' },
          summary: { type: 'string' },
          checks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                check: { type: 'string' },
                result: { type: 'string', enum: ['pass', 'fail', 'warning'] },
                detail: { type: 'string' }
              }
            }
          },
          issues: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } }
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_flash'
    });

    // Log validation event
    await svc.entities.PipelineEvent.create({
      organization_id: project.organization_id,
      project_id: project.id,
      step: 'takeoff',
      status: result.verdict === 'approved' ? 'completed' : 'blocked',
      event_type: 'takeoff_validation',
      message: `AI Validator: ${result.verdict} (${result.confidence}% confidence)`,
      occurred_at: new Date().toISOString()
    }).catch(() => {});

    return Response.json({
      status: 'success',
      project_id: project.id,
      verdict: result.verdict,
      confidence: result.confidence,
      summary: result.summary,
      checks: result.checks || [],
      issues: result.issues || [],
      recommendations: result.recommendations || [],
      takeoffs_validated: activeTakeoffs.length
    });
  } catch (error) {
    console.error('validateTakeoff error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}