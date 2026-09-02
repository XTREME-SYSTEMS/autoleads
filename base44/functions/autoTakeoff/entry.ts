import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { identifySystemsFromText, buildSystemsReferenceForPrompt } from '../../shared/scopeSystemsData.ts';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const projectId = body.project_id;
    if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 });

    const project = await client.entities.Project.get(projectId);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
    const orgId = project.organization_id;
    const [pricingProfiles, existingTakeoffs, automationConfigs] = await Promise.all([
      client.entities.PricingProfile.filter({ organization_id: orgId }).catch(() => []),
      client.entities.Takeoff.filter({ project_id: projectId }).catch(() => []),
      client.entities.AutomationConfig.filter({ organization_id: orgId }).catch(() => [])
    ]);

    const pricing = pricingProfiles[0] || null;
    const autoApprove = (automationConfigs[0]?.auto_takeoff === 'auto');
    const scopePricing = (pricing?.scope_pricing || []).slice(0, 8);

    // Combine all project text for system identification — the readable source
    // document is the primary scope reference since it's the normalized
    // human-readable translation of the original source.
    const projectText = [project.title, project.description, project.specs, project.project_type, project.source_readable_document].filter(Boolean).join(' ');
    const identifiedSystems = identifySystemsFromText(projectText);
    const systemsReference = buildSystemsReferenceForPrompt(project.trade);

    // Build identified systems summary for the LLM
    const identifiedSummary = identifiedSystems.length > 0
      ? identifiedSystems.map(m => `${m.system.code} ${m.system.name} (confidence: ${m.confidence}, matched: ${m.matchedAliases.join(', ')}) - ${m.system.specs} - $${m.system.price_low}-${m.system.price_high}/${m.system.unit}`).join('\n')
      : 'No specific system type identified from project text. Use the systems reference to determine the best match.';

    const llm = await client.integrations.Core.InvokeLLM({
      prompt: `You are an AI construction estimator. Generate a material + labor takeoff for this project based ONLY on the project description and specs. Do not invent quantities — derive them from the scope described.

Project: ${project.title}
Trade: ${project.trade || 'general construction'}
Jurisdiction: ${project.jurisdiction || 'N/A'}
Estimated value: ${project.value || 'unknown'}
Square footage (published): ${project.square_footage || 'not published — derive from specs/plans'}
Finished floor finish: ${project.floor_finish || 'not specified — identify from specs'}
Description: ${project.description || 'N/A'}
Specs: ${project.specs || 'N/A'}
Project type: ${project.project_type || 'N/A'}

READABLE SOURCE DOCUMENT (human-readable translation of the original source — the authoritative scope of work. Base your takeoff measurements on THIS document first, then fall back to the specs field above only if the readable document is thin):
${project.source_readable_document || 'N/A — no readable document, use specs above'}

IDENTIFIED SYSTEM TYPES (matched from project text — use these exact system specs and pricing):
${identifiedSummary}

AVAILABLE SYSTEM TYPES REFERENCE (for additional context):
${systemsReference}

Pricing reference (use these unit prices where the scope matches):
${JSON.stringify(scopePricing)}

CRITICAL: Identify the specific system type being called out in the project specs. For example, if the specs mention "flake epoxy floor", use the Flake Epoxy Floor System (EF-FLAKE) specs: primer + base + full broadcast flakes + 2 coats clear topcoat = 20-30 mils DFT at $5.50-$9.00/SF. Match the system's materials, specifications, and pricing to what is actually specified.

MEASUREMENT MANDATE: If a published square_footage is provided above, you MUST use it as the raw_quantity (in SF) for the flooring scope — do not invent a different number. If floor_finish is specified, the flooring scope's system must match that finish type. Only derive quantities from specs/plans when square_footage is not published.

Return JSON with:
- measurements: array of { scope (string - use the system name if identified), system_code (string - the system code if identified, else null), unit (string: SF, LF, CY, EA, etc.), raw_quantity (number), waste_factor (number 0-0.3), final_quantity (number = raw_quantity * (1+waste_factor)), spec_evidence (string citing the spec that drives this quantity), document_reference (string - the source document this quantity comes from, e.g. "Project specifications", "Bid packet", "Plan set A-101"), sheet (string - plan sheet or spec section reference, e.g. "A-101", "Spec Section 09 68 00", "Drawing S-1"), scale (string - drawing scale used, e.g. '1/4" = 1\\'-0"', or "N/A - calculated from specs"), measurement_formula (string - the exact formula used to derive the quantity, e.g. "Building footprint 200ft x 192.5ft = 38,500 SF") }
- confidence: number 0-1 (lower if specs are thin)
- notes: short string of assumptions made`,
      response_json_schema: {
        type: 'object',
        properties: {
          measurements: { type: 'array', items: { type: 'object', properties: {
            scope: { type: 'string' }, system_code: { type: 'string' }, unit: { type: 'string' }, raw_quantity: { type: 'number' },
            waste_factor: { type: 'number' }, final_quantity: { type: 'number' }, spec_evidence: { type: 'string' },
            document_reference: { type: 'string' }, sheet: { type: 'string' }, scale: { type: 'string' }, measurement_formula: { type: 'string' }
          } } },
          confidence: { type: 'number' }, notes: { type: 'string' }
        }
      }
    });

    const measurements = Array.isArray(llm?.measurements) ? llm.measurements : [];
    let created = 0;
    for (const m of measurements) {
      if (!m.scope || m.final_quantity == null) continue;
      // LLM sometimes returns "NULL" or "N/A" as a string for system_code
      const sysCode = m.system_code && !['null', 'n/a', 'none', ''].includes(String(m.system_code).toLowerCase()) ? m.system_code : null;
      try {
        const scaleVal = m.scale && !['null','n/a','none',''].includes(String(m.scale).toLowerCase()) ? m.scale : 'N/A - calculated from specs';
        await client.entities.Takeoff.create({
          organization_id: orgId,
          project_id: projectId,
          scope: m.scope,
          system_code: sysCode,
          unit: m.unit || 'EA',
          raw_quantity: m.raw_quantity || 0,
          waste_factor: m.waste_factor || 0,
          final_quantity: m.final_quantity,
          spec_evidence: m.spec_evidence || '',
          document_id: m.document_reference || project.source_url || 'Project specifications',
          sheet: m.sheet || 'Spec Section - see project specs',
          scale: scaleVal,
          calibrated: scaleVal !== 'N/A - calculated from specs',
          measurement_formula: m.measurement_formula || `Derived from project value: $${project.value || 'unknown'}`,
          confidence: typeof llm.confidence === 'number' ? llm.confidence : 0.7,
          approval_state: autoApprove ? 'approved' : 'unreviewed',
          reviewer_decision: autoApprove ? 'approved' : 'pending',
        });
        created++;
      } catch {}
    }

    // Return identified systems for frontend display
    const identifiedSystemCodes = identifiedSystems.map(m => m.system.code);

    // Advance project stage to takeoff if still in qualification
    if (project.stage === 'qualification') {
      await client.entities.Project.update(projectId, { stage: 'takeoff' });
    }

    return Response.json({ success: true, project_id: projectId, takeoffs_created: created, confidence: llm?.confidence ?? null, notes: llm?.notes || '', identified_systems: identifiedSystems.map(m => ({ code: m.system.code, name: m.system.name, scope: m.scope, confidence: m.confidence, price_low: m.system.price_low, price_high: m.system.price_high, unit: m.system.unit })) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}