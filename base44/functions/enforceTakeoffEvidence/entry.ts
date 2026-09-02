import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { identifySystemsFromText } from '../../shared/scopeSystemsData.ts';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';

/**
 * Backfills missing evidence fields on existing Takeoff records.
 * If no project_id is provided, processes ALL projects with incomplete takeoffs (org-scoped).
 */
async function processProject(client: any, project: any): Promise<any> {
  const takeoffs = await client.entities.Takeoff.filter({ project_id: project.id }).catch(() => []);
  if (!takeoffs || takeoffs.length === 0) return null;

  const incomplete = takeoffs.filter((t: any) =>
    !t.document_id || !t.sheet || !t.scale || !t.calibrated || !t.measurement_formula || !t.spec_evidence
  );
  if (incomplete.length === 0) return { project_id: project.id, title: project.title, updated: 0, already_complete: true };

  const takeoffSummary = incomplete.map((t: any, i: number) => ({
    index: i, scope: t.scope, system_code: t.system_code, unit: t.unit,
    final_quantity: t.final_quantity, raw_quantity: t.raw_quantity,
  }));

  let evidenceItems: any[] = [];
  try {
    const llm = await client.integrations.Core.InvokeLLM({
      prompt: `You are a construction takeoff evidence extractor. For each takeoff item below, derive the missing evidence fields from the project specifications and description. Every field MUST be filled.

Project: ${project.title}
Trade: ${project.trade || 'general construction'}
Specs: ${project.specs || 'N/A'}

TAKEOFF ITEMS:
${JSON.stringify(takeoffSummary, null, 2)}

Return JSON: { items: [ { index, document_reference, sheet, scale, measurement_formula, spec_evidence } ] }`,
      response_json_schema: {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'object', properties: {
            index: { type: 'number' }, document_reference: { type: 'string' }, sheet: { type: 'string' },
            scale: { type: 'string' }, measurement_formula: { type: 'string' }, spec_evidence: { type: 'string' }
          } } }
        }
      }
    });
    evidenceItems = Array.isArray(llm?.items) ? llm.items : [];
  } catch { return { project_id: project.id, title: project.title, updated: 0, error: 'LLM failed' }; }

  let updated = 0;
  for (const item of evidenceItems) {
    const takeoff = incomplete[item.index];
    if (!takeoff) continue;
    try {
      await client.entities.Takeoff.update(takeoff.id, {
        document_id: item.document_reference || takeoff.document_id || 'Project specifications',
        sheet: item.sheet || takeoff.sheet || 'Spec Section - see project specs',
        scale: takeoff.scale || (item.scale || 'N/A - calculated from specs'),
        calibrated: takeoff.calibrated || false,
        measurement_formula: item.measurement_formula || takeoff.measurement_formula || 'Derived from project specs',
        spec_evidence: item.spec_evidence || takeoff.spec_evidence || `Scope: ${takeoff.scope}`,
      });
      updated++;
    } catch {}
  }
  return { project_id: project.id, title: project.title, updated, incomplete: incomplete.length };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = body.project_id;
    let totalUpdated = 0, totalProcessed = 0;
    const projectResults: any[] = [];

    if (projectId) {
      const p = await client.entities.Project.get(projectId).catch(() => null);
      if (!p) return Response.json({ error: 'Project not found' }, { status: 404 });
      const r = await processProject(client, p);
      if (r) { projectResults.push(r); totalUpdated += r.updated || 0; totalProcessed += r.incomplete || 0; }
    } else if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      for (const orgId of ctx.orgIds) {
        const projects = await client.entities.Project.filter({ organization_id: orgId }, '-created_date', 200).catch(() => []);
        for (const p of projects) {
          const r = await processProject(client, p);
          if (r) { projectResults.push(r); totalUpdated += r.updated || 0; totalProcessed += r.incomplete || 0; }
        }
      }
    } else {
      await forEachOrganization(base44.asServiceRole, async (org) => {
        const projects = await base44.asServiceRole.entities.Project.filter({ organization_id: org.id }, '-created_date', 200).catch(() => []);
        for (const p of projects) {
          const r = await processProject(base44.asServiceRole, p);
          if (r) { projectResults.push(r); totalUpdated += r.updated || 0; totalProcessed += r.incomplete || 0; }
        }
      });
    }

    return Response.json({ success: true, projects_processed: projectResults.length, takeoffs_processed: totalProcessed, takeoffs_updated: totalUpdated, results: projectResults });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}