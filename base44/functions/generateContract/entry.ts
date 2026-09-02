import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await resolveUserOrgs(base44, user.id);
    const orgId = ctx.primaryOrgId || '';
    if (!orgId) return Response.json({ error: 'No organization membership' }, { status: 403 });

    const body = await req.json();
    const { trade, contract_type = 'commercial', project_id, regenerate } = body;

    if (!trade) return Response.json({ error: 'Trade is required' }, { status: 400 });

    // Check if a validated contract already exists for this trade (org-scoped)
    if (!regenerate) {
      const existing = await base44.entities.ContractTemplate.filter({ organization_id: orgId, trade, validation_status: 'validated' });
      if (existing && existing.length > 0) {
        return Response.json({ success: true, contract: existing[0], message: 'Existing validated contract found' });
      }
    }

    // Get company profile for context (org-scoped)
    const companies = await base44.entities.CompanyProfile.filter({ organization_id: orgId });
    const company = companies?.[0] || {};

    // Step 1: Generate contract using LLM with web search for legal templates
    const genResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a legal AI assistant specializing in construction contracts. Generate a comprehensive, legally-neutral ${contract_type} construction contract template for the "${trade}" trade.

Search the web for standard legal contract templates, clauses, and best practices for ${trade} work in ${contract_type} projects. The contract must be:
- Fair and neutral, protecting BOTH parties equally
- Standard for ${contract_type} construction projects
- Include all essential clauses: scope of work, payment terms, change orders, warranties, dispute resolution, termination, insurance, indemnification, force majeure, and any trade-specific clauses for ${trade}
- Professional and legally sound
- Suitable for use by ${company.name || 'a construction company'}

Generate the FULL contract text with all sections and clauses. Include a terms summary.

Return JSON: { title, content (full contract text), terms_summary (key terms in plain language) }`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          content: { type: "string" },
          terms_summary: { type: "string" }
        }
      }
    });

    // Step 2: AI validation of the generated contract
    const validation = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a contract validation AI. Review this ${trade} ${contract_type} construction contract for legal soundness and neutrality.

CONTRACT:
${genResult.content}

Check for:
1. Both parties are equally protected (not one-sided)
2. All essential clauses are present (scope, payment, change orders, warranties, dispute resolution, termination, insurance, indemnification)
3. No illegal or unenforceable clauses
4. Clear and unambiguous language
5. Trade-specific considerations for ${trade} are addressed
6. Standard for ${contract_type} projects

Return JSON: { is_valid: boolean, issues: [list of issues], recommendations: [list of recommendations], safety_score (0-100) }`,
      response_json_schema: {
        type: "object",
        properties: {
          is_valid: { type: "boolean" },
          issues: { type: "array", items: { type: "string" } },
          recommendations: { type: "array", items: { type: "string" } },
          safety_score: { type: "number" }
        }
      }
    });

    // Step 3: Store the contract template
    const contract = await base44.entities.ContractTemplate.create({
      organization_id: orgId,
      trade,
      contract_type,
      title: genResult.title || `${trade} ${contract_type} Contract`,
      content: genResult.content,
      terms: genResult.terms_summary,
      ai_generated: true,
      validation_status: validation.is_valid ? 'validated' : 'needs_review',
      validated_by_ai: true,
      validated_by_user: false,
      is_standard: true,
      version: 1
    });

    return Response.json({
      success: true,
      contract,
      validation: {
        is_valid: validation.is_valid,
        issues: validation.issues || [],
        recommendations: validation.recommendations || [],
        safety_score: validation.safety_score
      },
      message: validation.is_valid
        ? 'Contract generated and AI-validated. Awaiting user approval before use.'
        : 'Contract generated but needs review. See issues and recommendations.'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}