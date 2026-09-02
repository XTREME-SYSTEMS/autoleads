import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';

// Process proposal generation for a single organization.
// All queries and creates are scoped to orgId — no cross-tenant data access.
async function processOrg(client: any, orgId: string, limit: number, singleProjectId: string | null) {
  const [projects, pricingProfiles, proposalPackages, companies, existingProposals, automations, scopeSystems, brandAssets] = await Promise.all([
    client.entities.Project.filter({ organization_id: orgId }, '-created_date', 200).catch(() => []),
    client.entities.PricingProfile.filter({ organization_id: orgId }).catch(() => []),
    client.entities.ProposalPackage.filter({ organization_id: orgId }).catch(() => []),
    client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
    client.entities.Proposal.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []),
    client.entities.AutomationConfig.filter({ organization_id: orgId }).catch(() => []),
    client.entities.ScopeSystem.filter({ organization_id: orgId }).catch(() => []),
    client.entities.BrandAsset.filter({ organization_id: orgId }).catch(() => []),
  ]);

  const pricing = pricingProfiles[0] || null;
  const pkg = proposalPackages.find((p: any) => p.is_default) || proposalPackages[0] || null;
  const company = companies[0] || null;
  const autoApprove = (automations[0]?.auto_proposal === 'auto');
  // The user's uploaded logo — embedded on every generated proposal so the
  // AI system uses the real brand asset, not a placeholder.
  const logoAsset = (brandAssets || []).find((b: any) => b.type === 'logo' && b.file_url) || null;
  const logoUrl = logoAsset?.file_url || '';
  // The trade scopes the user has configured in their settings. Proposal line
  // items are constrained to these scopes so templates never use wrong scopes.
  const userScopes = (scopeSystems || []).filter((s: any) => s.data_class !== 'NON_PRODUCTION_EXAMPLE');
  const scopeCatalog = userScopes.map((s: any) => `${s.code || ''} | ${s.name || s.scope} | scope=${s.scope || ''} | unit=${s.unit || ''} | price=$${s.price_low || 0}-$${s.price_high || 0}/${s.unit || ''} | specs=${s.specifications || s.description || ''}`).join('\n');
  const allowedScopes = [...new Set(userScopes.map((s: any) => s.scope).filter(Boolean))];

  const existingTitles = new Set((existingProposals || []).map((p: any) => (p.title || '').toLowerCase().trim()));
  let candidates = (projects || []).filter((p: any) =>
    p.verification_status === 'verified' &&
    ['qualification', 'takeoff', 'estimating'].includes(p.stage) &&
    !existingTitles.has((p.title || '').toLowerCase().trim())
  );

  if (singleProjectId) {
    candidates = candidates.filter((p: any) => p.id === singleProjectId);
    if (candidates.length === 0) {
      const proj = (projects || []).find((p: any) => p.id === singleProjectId);
      if (proj) candidates = [proj];
    }
  }

  let created = 0, skipped = 0;
  for (const proj of candidates.slice(0, limit)) {
    const hasInfo = proj.title && (proj.jurisdiction || proj.authority || proj.value || proj.trade);
    if (!hasInfo) { skipped++; continue; }

    const takeoffs = await client.entities.Takeoff.filter({ project_id: proj.id }).catch(() => []);
    const takeoffSummary = (takeoffs || []).map((t: any) => `${t.scope || t.system_code || 'scope'}: ${t.final_quantity || t.raw_quantity} ${t.unit || ''}`).join('; ');

    let llm: any = null;
    let lastErr: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        llm = await client.integrations.Core.InvokeLLM({
          prompt: `You are drafting a construction proposal for a ${company?.trade || 'general contractor'} contractor.
Company: ${company?.name || ''} — Location: ${company?.city || ''}, ${company?.state || ''}
Project: ${proj.title}
Jurisdiction: ${proj.jurisdiction || 'N/A'}
Authority/Client: ${proj.authority || proj.client_name || 'N/A'}
Trade: ${proj.trade || company?.trade || 'N/A'}
Verified project value: ${proj.value || 'unknown'}
Project specs: ${proj.specs || 'N/A'}
Takeoff quantities (measured from the source documents): ${takeoffSummary || 'N/A'}

THIS COMPANY ONLY PERFORMS THESE TRADE SCOPES (configured in the user's settings). Every line item's description MUST match one of these scopes — do NOT invent scopes outside this list:
${scopeCatalog || 'No scope systems configured — match the project trade only.'}
Allowed scope categories: ${allowedScopes.length > 0 ? allowedScopes.join(', ') : (proj.trade || company?.trade || 'general construction')}

Pricing profile: labor_hourly_rate=${pricing?.labor_hourly_rate || 'N/A'}, mandatory_margin_pct=${pricing?.mandatory_margin_pct || 'N/A'}, pricing_tier=${pricing?.pricing_tier || 'mid'}.
Scope pricing samples: ${JSON.stringify((pricing?.scope_pricing || []).slice(0, 6))}

Generate a realistic proposal as JSON: title, client_name, total_value (number, grounded in the verified project value and takeoff quantities — do not round to arbitrary numbers), and items (3-8 line items, each: description (MUST be one of the allowed scopes above), quantity, unit, unit_price, source="approved_estimate"). Use the takeoff quantities to drive each line item's quantity. Apply the mandatory margin into the unit prices. Never include a line item whose scope is not in the allowed list.`,
          response_json_schema: {
            type: 'object',
            properties: {
              title: { type: 'string' }, client_name: { type: 'string' }, total_value: { type: 'number' },
              items: { type: 'array', items: { type: 'object', properties: {
                description: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' },
                unit_price: { type: 'number' }, source: { type: 'string' }
              } } }
            }
          }
        });
        break;
      } catch (e: any) {
        lastErr = e;
        if (attempt < 2) await new Promise(r => setTimeout(r, (attempt + 1) * 1000));
      }
    }
    if (!llm) {
      try {
        await client.entities.SystemGap.create({
          title: `Proposal generation failed for ${proj.title}`,
          category: 'data_integrity',
          severity: 'high',
          description: `LLM failed after 3 retries: ${lastErr?.message || 'unknown'}`,
          status: 'open',
        });
      } catch {}
      skipped++;
      continue;
    }

    const items = Array.isArray(llm?.items) ? llm.items.map((it: any) => ({ ...it, source: it.source || 'approved_estimate' })) : [];
    try {
      await client.entities.Proposal.create({
        organization_id: orgId,
        project_id: proj.id,
        title: llm?.title || proj.title,
        client_name: llm?.client_name || proj.authority || proj.client_name || '',
        status: autoApprove ? 'approved' : 'internal_review',
        signature_status: 'not_sent',
        total_value: llm?.total_value || proj.value || 0,
        logo_url: logoUrl,
        items,
      });
      // CRM auto-capture: save contractor/client info to database (org-scoped)
      const clientName = llm?.client_name || proj.authority || proj.client_name || '';
      if (clientName) {
        try {
          const existingCompanies = await client.entities.CompanyProfile.filter({ organization_id: orgId, name: clientName }).catch(() => []);
          if (!existingCompanies || existingCompanies.length === 0) {
            await client.entities.CompanyProfile.create({
              organization_id: orgId,
              name: clientName,
              trade: proj.trade || company?.trade || '',
              jurisdiction: proj.jurisdiction || '',
              source_id: proj.id,
              relationship_strength: 'none',
              prior_awards: 0,
            });
          }
          const emailMatch = (proj.contract_info || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
          if (emailMatch) {
            const existingContacts = await client.entities.Contact.filter({ organization_id: orgId, email: emailMatch[0] }).catch(() => []);
            if (!existingContacts || existingContacts.length === 0) {
              await client.entities.Contact.create({
                organization_id: orgId,
                full_name: clientName,
                company_name: clientName,
                email: emailMatch[0],
                role: 'owner',
                source_id: proj.id,
                relationship_strength: 'weak',
              });
            }
          }
        } catch {}
      }
      await client.entities.Project.update(proj.id, { stage: 'proposal' });
      created++;
    } catch { skipped++; }
  }

  return { created, skipped };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const limit = Math.min(Number(body.limit) || 10, 25);
    const singleProjectId = body.project_id || null;

    // Authenticated user: process their orgs only (RLS also enforces this)
    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      let totalCreated = 0, totalSkipped = 0;
      for (const orgId of ctx.orgIds) {
        const r = await processOrg(client, orgId, limit, singleProjectId);
        totalCreated += r.created;
        totalSkipped += r.skipped;
      }
      return Response.json({ ok: true, created: totalCreated, skipped: totalSkipped });
    }

    // Service-role (workflow): iterate all organizations — each org gets its own scoped data
    let totalCreated = 0, totalSkipped = 0;
    const result = await forEachOrganization(base44.asServiceRole, async (org) => {
      const r = await processOrg(base44.asServiceRole, org.id, limit, singleProjectId);
      totalCreated += r.created;
      totalSkipped += r.skipped;
    });
    return Response.json({ ok: true, created: totalCreated, skipped: totalSkipped, org_errors: result.errors.length });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}