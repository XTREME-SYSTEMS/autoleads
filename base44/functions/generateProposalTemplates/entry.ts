import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await resolveUserOrgs(client, user.id);
    if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
    const orgId = ctx.orgIds[0];

    // Fetch company profile, logo, and existing templates
    const [companies, logos] = await Promise.all([
      client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
      client.entities.BrandAsset.filter({ organization_id: orgId, type: "logo" }).catch(() => []),
    ]);
    const company = companies?.[0] || {};
    const logo = (logos || []).find((l: any) => l.is_default) || (logos || [])[0] || null;
    const logoUrl = logo?.file_url || '';

    if (!company.name) {
      return Response.json({ error: 'No company profile found. Set up your company information in Settings → Company first.' }, { status: 400 });
    }

    const websiteUrl = (company.website || '').trim();

    // Step 1: Research top commercial proposal templates + scrape company website
    const llm = await client.integrations.Core.InvokeLLM({
      prompt: `You are a construction industry expert and professional proposal writer. Research and analyze:

1. TOP COMMERCIAL PROPOSAL & BID TEMPLATES: Search for and identify the best commercial construction proposal and bid template packages used by top contractors. What sections, content structure, professional formatting, and key elements do winning proposals include? Look at real examples from construction industry leaders.

2. COMPANY WEBSITE ANALYSIS: ${websiteUrl ? `Visit and analyze the company website at ${websiteUrl}. Extract: services offered, company about/history, notable projects/portfolio, certifications and licenses, unique differentiators, service areas, testimonials, and contact information.` : 'No website available — use the company profile info provided below.'}

COMPANY PROFILE:
- Name: ${company.name}
- Trade: ${company.trade || 'N/A'}
- Website: ${websiteUrl || 'N/A'}
- Phone: ${company.phone || 'N/A'}
- Email: ${company.email || 'N/A'}
- Address: ${company.address || ''} ${company.city || ''} ${company.state || ''} ${company.zip || ''}
- License: ${company.license_number || 'N/A'}
- Employees: ${company.employees || 'N/A'}
- Bonding capacity: ${company.bonding_capacity || 'N/A'}

Based on your research of top commercial proposal templates AND the company's website analysis, generate a COMPLETE professional proposal template and email templates:

PROPOSAL TEMPLATE (as HTML string):
A full, ready-to-use professional proposal template with these sections:
- Cover page: company logo placeholder {{LOGO_URL}}, company name, project name {{PROJECT_NAME}}, client name {{CLIENT_NAME}}, date {{DATE}}, proposal number {{PROPOSAL_NUMBER}}
- Executive Summary: brief overview of the project and why this company is the right choice
- Company Overview: pulled from website research — history, expertise, team, certifications
- Scope of Work: structured section with placeholder line items {{SCOPE_ITEMS}}
- Pricing Summary: table with quantity, unit, unit price, total — placeholder rows
- Project Timeline: milestone schedule section
- Qualifications & Certifications: licenses, bonding capacity, insurance
- Past Projects / Portfolio: notable completed work from website research
- Terms & Conditions: standard construction proposal terms
- Signature Block: client and contractor signature lines
Style: clean professional HTML with inline CSS, branded colors matching a construction company, proper spacing, print-ready. Use {{VARIABLE}} placeholders for project-specific data.

EMAIL TEMPLATES (3 templates):
1. Introduction email — for initial client outreach, introduces the company
2. Bid submission email — for sending a completed proposal/bid package
3. Follow-up email — for checking in 3-5 days after sending a bid

Return as JSON with this exact structure:
{
  "proposal_template": "<html>...full HTML...</html>",
  "company_research": "Summary of what was found about the company from their website",
  "template_structure": "Summary of best practices identified from top commercial proposal templates",
  "email_templates": [
    { "name": "...", "subject": "...", "body": "...", "purpose": "introduction" },
    { "name": "...", "subject": "...", "body": "...", "purpose": "bid_response" },
    { "name": "...", "subject": "...", "body": "...", "purpose": "follow_up" }
  ]
}`,
      add_context_from_internet: true,
      model: 'gemini_3_8_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          proposal_template: { type: 'string' },
          company_research: { type: 'string' },
          template_structure: { type: 'string' },
          email_templates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                subject: { type: 'string' },
                body: { type: 'string' },
                purpose: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Save the proposal template as default BrandAsset
    try {
      await client.entities.BrandAsset.updateMany(
        { organization_id: orgId, type: 'proposal_template', is_default: true },
        { $set: { is_default: false } }
      );
    } catch {}

    const savedTemplate = await client.entities.BrandAsset.create({
      organization_id: orgId,
      name: `${company.name} — Master Proposal Template`,
      type: 'proposal_template',
      content: llm?.proposal_template || '',
      source: 'ai_generated',
      is_default: true,
    });

    // Save email templates
    const savedEmails = [];
    for (const email of (llm?.email_templates || [])) {
      try {
        const saved = await client.entities.EmailTemplate.create({
          organization_id: orgId,
          name: email.name,
          subject: email.subject,
          body: email.body,
          purpose: email.purpose || 'custom',
          ai_generated: true,
          approval_status: 'approved',
        });
        savedEmails.push(saved);
      } catch {}
    }

    return Response.json({
      ok: true,
      logo_url: logoUrl,
      company_name: company.name,
      company_research: llm?.company_research || '',
      template_structure: llm?.template_structure || '',
      proposal_template_id: savedTemplate?.id || null,
      proposal_template_html: llm?.proposal_template || '',
      email_templates_created: savedEmails.length,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}