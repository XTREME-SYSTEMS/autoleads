import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// Backend scraping system: uses the company's own information (name + website)
// to scrape the public web for real company details, then populates the
// CompanyProfile, ProposalPackage (credentials), the default proposal
// template (BrandAsset), and every email template (EmailTemplate) with the
// real company info — embedding the uploaded logo and constraining scopes to
// the trades the user has configured in their ScopeSystem settings.

const EMAIL_PURPOSES = [
  { key: 'follow_up', label: 'Follow Up', desc: 'following up with a general contractor after submitting a bid' },
  { key: 'outreach', label: 'Outreach', desc: 'reaching out to a new general contractor or potential client to introduce services' },
  { key: 'bid_response', label: 'Bid Response', desc: 'responding to a bid invitation from a general contractor or owner' },
  { key: 'introduction', label: 'Introduction', desc: 'introducing your company to a new contact for the first time' },
  { key: 'reminder', label: 'Reminder', desc: 'reminding a client about an upcoming deadline, meeting, or action needed' },
  { key: 'thank_you', label: 'Thank You', desc: 'thanking a client after a meeting, project award, or completed project' },
];

async function enrichOrg(client: any, orgId: string) {
  const [companies, brandAssets, scopeSystems, packages, emails] = await Promise.all([
    client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
    client.entities.BrandAsset.filter({ organization_id: orgId }).catch(() => []),
    client.entities.ScopeSystem.filter({ organization_id: orgId }).catch(() => []),
    client.entities.ProposalPackage.filter({ organization_id: orgId }).catch(() => []),
    client.entities.EmailTemplate.filter({ organization_id: orgId }).catch(() => []),
  ]);

  const company = (companies || [])[0] || null;
  if (!company) return { ok: false, error: 'No company profile found for this organization.' };

  const logo = (brandAssets || []).find(b => b.type === 'logo' && b.file_url) || null;
  const logoUrl = logo?.file_url || '';
  const userScopes = (scopeSystems || []).filter(s => s.data_class !== 'NON_PRODUCTION_EXAMPLE');
  const tradeScopes = [...new Set(userScopes.map(s => s.scope).filter(Boolean))];
  const scopeCatalog = userScopes.map(s => `${s.code || ''} ${s.name || s.scope} (${s.scope || ''}) — ${s.specifications || s.description || ''}`).join('\n');
  const tradesLabel = tradeScopes.length > 0 ? tradeScopes.join(', ') : (company.trade || 'general construction');

  // 1. Scrape the web for real company info using the company name + website.
  const extract = await client.integrations.Core.InvokeLLM({
    prompt: `Search the web and the company's website to extract real, verified information about this construction company. Only return information you actually find — set any field to null if not found. Do NOT invent values.

Company name: ${company.name}
Website: ${company.website || 'not provided — search for the company by name'}
Location: ${company.city || ''}, ${company.state || ''}
Known trade: ${company.trade || 'general construction'}

Find:
- A 2-3 sentence company description / highlights (what they do, specialties, certifications, notable projects)
- Phone, email, street address, city, state, zip (from their website contact page)
- Website URL (confirm or discover)
- Contractor license number (from state license registry if findable)
- Bonding capacity (dollar amount if published)
- Years of experience / year founded
- General liability insurance carrier and limit if publicly available

Return a JSON object. Null any field you cannot verify.`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string' },
        zip: { type: 'string' },
        website: { type: 'string' },
        license_number: { type: 'string' },
        bonding_capacity: { type: 'number' },
        years_experience: { type: 'number' },
        insurance_carrier: { type: 'string' },
        insurance_limit: { type: 'string' },
      },
    },
  }).catch(() => null);

  const found = extract || {};
  const pick = (v: any) => (v !== null && v !== undefined && String(v).trim() !== '') ? v : undefined;

  // 2. Update CompanyProfile with real contact + credential info.
  const companyUpdate: any = {};
  if (pick(found.phone)) companyUpdate.phone = found.phone;
  if (pick(found.email)) companyUpdate.email = found.email;
  if (pick(found.address)) companyUpdate.address = found.address;
  if (pick(found.city)) companyUpdate.city = found.city;
  if (pick(found.state)) companyUpdate.state = found.state;
  if (pick(found.zip)) companyUpdate.zip = found.zip;
  if (pick(found.website)) companyUpdate.website = found.website;
  if (pick(found.license_number)) companyUpdate.license_number = found.license_number;
  if (pick(found.bonding_capacity)) companyUpdate.bonding_capacity = Number(found.bonding_capacity);
  if (Object.keys(companyUpdate).length > 0) {
    await client.entities.CompanyProfile.update(company.id, companyUpdate).catch(() => null);
  }

  // 3. Update / create the credentials ProposalPackage with real info.
  const pkg = (packages || []).find((p: any) => p.is_default) || (packages || [])[0] || null;
  const pkgFields: any = {};
  if (pick(found.description)) pkgFields.company_highlights = found.description;
  if (pick(found.years_experience)) pkgFields.years_experience = Number(found.years_experience);
  if (pick(found.license_number)) pkgFields.license_number = found.license_number;
  if (pick(found.bonding_capacity)) pkgFields.bonding_capacity = Number(found.bonding_capacity);
  if (pick(found.insurance_carrier)) pkgFields.insurance_carrier = found.insurance_carrier;
  if (pick(found.insurance_limit)) pkgFields.insurance_limit = found.insurance_limit;
  if (pick(found.website)) pkgFields.website = found.website;
  if (pkg) {
    if (Object.keys(pkgFields).length > 0) await client.entities.ProposalPackage.update(pkg.id, pkgFields).catch(() => null);
  } else if (Object.keys(pkgFields).length > 0) {
    await client.entities.ProposalPackage.create({ organization_id: orgId, name: `${company.name} Credentials Package`, is_default: true, ...pkgFields }).catch(() => null);
  }

  // 4. Regenerate the default proposal template (BrandAsset) with logo + real info + trade scopes.
  const logoEmbed = logoUrl
    ? `<img src="${logoUrl}" style="max-height:70px;object-fit:contain;" />`
    : '';
  const proposalRes = await client.integrations.Core.InvokeLLM({
    prompt: `Create a professional construction proposal template as clean HTML only (no markdown fences, no explanations). Start with <!DOCTYPE html>. Put all CSS in a <style> tag in <head>.

Company: ${company.name}
Trade / scopes this company performs (ONLY use these scopes in the Scope of Work section — do not invent other trades): ${tradesLabel}
${scopeCatalog ? `Scope systems reference:\n${scopeCatalog}` : ''}
Company description: ${found.description || 'A trusted, licensed, and insured contractor delivering quality workmanship on time and on budget.'}
Website: ${found.website || company.website || ''}
Phone: ${found.phone || ''}
Email: ${found.email || ''}
License #: ${found.license_number || ''}
Bonding capacity: ${found.bonding_capacity ? '$' + Number(found.bonding_capacity).toLocaleString() : ''}

${logoEmbed ? `Embed the company logo at the top using exactly: <img src="${logoUrl}" style="max-height:70px;object-fit:contain;" />` : 'Use the company name as a bold text header.'}

The template must include sections with clear headings: Company Overview (with logo and the real description above), Scope of Work (covering ONLY the trades listed above), Project Timeline, Pricing & Schedule of Values (styled HTML table), Terms & Conditions, and a Signature block. Use placeholders like [Client Name], [Project Name], [Date], [Project Address]. Make it polished and print-ready.`,
  }).catch(() => null);
  const proposalHtml = typeof proposalRes === 'string' ? proposalRes : (proposalRes?.response || proposalRes?.text || '');
  if (proposalHtml && proposalHtml.length > 80) {
    const existingTpl = (brandAssets || []).find((b: any) => b.type === 'proposal_template' && b.is_default);
    if (existingTpl) {
      await client.entities.BrandAsset.update(existingTpl.id, { content: proposalHtml, name: `${company.name} Proposal Template` }).catch(() => null);
    } else {
      await client.entities.BrandAsset.create({ organization_id: orgId, name: `${company.name} Proposal Template`, type: 'proposal_template', content: proposalHtml, source: 'authored', is_default: true }).catch(() => null);
    }
  }

  // 5. Regenerate email templates for every purpose with real company info + logo.
  const emailRes = await client.integrations.Core.InvokeLLM({
    prompt: `Create professional construction business email templates for this company. Return a JSON object with a "templates" array. Each element has purpose, subject, and body (HTML).

Company: ${company.name}
Trades: ${tradesLabel}
Description: ${found.description || ''}
Website: ${found.website || company.website || ''}
Phone: ${found.phone || ''}
Email: ${found.email || ''}
${logoUrl ? `Embed the logo at the top of each body using: <img src="${logoUrl}" style="max-height:50px;object-fit:contain;" />` : ''}

Generate one template for each of these purposes: ${EMAIL_PURPOSES.map(p => `${p.key} (${p.desc})`).join('; ')}.
Use placeholders like [Client Name], [Project Name], [Date]. Professional, concise, branded. Return ONLY the JSON object.`,
    response_json_schema: {
      type: 'object',
      properties: {
        templates: {
          type: 'array',
          items: {
            type: 'object',
            properties: { purpose: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' } },
          },
        },
      },
    },
  }).catch(() => null);
  const templates = (typeof emailRes === 'object' && emailRes?.templates) || [];
  const existingByPurpose: Record<string, any> = {};
  (emails || []).forEach((e: any) => { if (e.purpose) existingByPurpose[e.purpose] = e; });
  let emailsUpdated = 0;
  for (const t of templates) {
    if (!t?.subject && !t?.body) continue;
    const existing = existingByPurpose[t.purpose];
    if (existing) {
      await client.entities.EmailTemplate.update(existing.id, { subject: t.subject || existing.subject, body: t.body || existing.body, ai_generated: true, approval_status: 'approved' }).catch(() => null);
    } else {
      const label = EMAIL_PURPOSES.find(p => p.key === t.purpose)?.label || t.purpose;
      await client.entities.EmailTemplate.create({ organization_id: orgId, name: `${label} Template`, subject: t.subject || '', body: t.body || '', purpose: t.purpose || 'custom', ai_generated: true, approval_status: 'approved' }).catch(() => null);
    }
    emailsUpdated++;
  }

  return {
    ok: true,
    org_id: orgId,
    company: company.name,
    logo_embedded: !!logoUrl,
    trade_scopes: tradeScopes,
    company_fields_updated: Object.keys(companyUpdate),
    package_updated: Object.keys(pkgFields).length,
    proposal_template_regenerated: !!proposalHtml,
    email_templates_regenerated: emailsUpdated,
  };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      const orgId = body?.organization_id && ctx.orgIds.includes(body.organization_id) ? body.organization_id : ctx.orgIds[0];
      const result = await enrichOrg(client, orgId);
      return Response.json(result);
    }

    // Service-role (workflow): target a specific org or iterate all.
    if (body?.organization_id) {
      return Response.json(await enrichOrg(base44.asServiceRole, body.organization_id));
    }
    const results: any[] = [];
    const { forEachOrganization } = await import('../../shared/orgContext.ts');
    await forEachOrganization(base44.asServiceRole, async (org: any) => {
      results.push(await enrichOrg(base44.asServiceRole, org.id).catch((e: any) => ({ ok: false, org_id: org.id, error: e?.message })));
    });
    return Response.json({ ok: true, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Enrichment failed' }, { status: 500 });
  }
}