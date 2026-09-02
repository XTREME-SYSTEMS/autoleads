import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';
import { cloudBrowserExtract, isCloudBrowserConfigured } from '../../shared/cloudBrowserClient.ts';

// Autonomous Florida contractor discovery. Scrapes GCs, flooring, concrete,
// remodelers, architects, property/facility managers — stores them in the
// Contractor entity ready for outreach. Uses web-search LLM now; cloud-browser
// Google-search path is ready for when the engine is functional.

const FL_TRADES = ['general contractor', 'commercial general contractor', 'flooring contractor', 'concrete contractor', 'remodeler', 'builder', 'homebuilder', 'architect', 'interior designer', 'property manager', 'facility manager', 'restoration contractor', 'tile contractor', 'landscape contractor', 'pool contractor'];

const CONTRACTOR_SCHEMA = {
  type: 'object',
  properties: { contractors: { type: 'array', items: { type: 'object', properties: {
    company_name: { type: 'string' }, contact_name: { type: 'string' }, email: { type: 'string' },
    phone: { type: 'string' }, website: { type: 'string' }, trade: { type: 'string' },
    city: { type: 'string' }, county: { type: 'string' }, license_number: { type: 'string' },
    source_url: { type: 'string' }, source_platform: { type: 'string' },
  } } } },
};

async function runForOrg(client: any, orgId: string): Promise<any> {
  const ws = await client.integrations.Core.InvokeLLM({
    prompt: `Search the public web for licensed contractors and construction professionals in Florida who may need a concrete, epoxy, polishing, or coating subcontractor or vendor. Focus on these trades: ${FL_TRADES.join(', ')}. Search Google Maps, Yelp, BBB, BuildZoom, HomeGuide, the Florida DBPR contractor license search, local chamber directories, and trade association directories. For each REAL company you actually find, return: company_name, contact_name (if visible), email (if visible), phone, website, trade, city, county, license_number (if visible), source_url, source_platform. Only return companies you actually found online — do NOT invent any. Return JSON.`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: CONTRACTOR_SCHEMA,
  });
  let contractors = ws?.contractors || [];

  // Browser-ready path (engages once the cloud browser is functional).
  if (isCloudBrowserConfigured()) {
    const targets = FL_TRADES.slice(0, 6).map((t) => `https://www.google.com/search?q=${encodeURIComponent(t + ' Florida license contact')}`);
    const chunks: string[] = [];
    for (const url of targets.slice(0, 4)) {
      const r = await cloudBrowserExtract(url, 18000);
      if (r.ok && r.content) chunks.push(r.content);
    }
    if (chunks.length) {
      const pr = await client.integrations.Core.InvokeLLM({
        prompt: `From the following scraped search results, extract Florida contractor companies (company_name, contact_name, email, phone, website, trade, city, county, license_number). Only companies actually present in the text. Return JSON.\n\n${chunks.join('\n\n').slice(0, 40000)}`,
        response_json_schema: CONTRACTOR_SCHEMA,
      });
      contractors = [...contractors, ...(pr?.contractors || [])];
    }
  }

  let created = 0, duplicates = 0;
  for (const c of contractors) {
    if (!c.company_name) continue;
    const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
    const rawEmail = (c.email || '').toLowerCase().trim();
    const email = EMAIL_RE.test(rawEmail) ? rawEmail : '';
    const dedup = email ? { organization_id: orgId, email } : { organization_id: orgId, company_name: c.company_name, city: c.city || '' };
    const dup = await client.entities.Contractor.filter(dedup).catch(() => []);
    if (dup && dup.length) { duplicates++; continue; }
    try {
      await client.entities.Contractor.create({
        organization_id: orgId,
        company_name: String(c.company_name).slice(0, 200),
        contact_name: c.contact_name || '', email, phone: c.phone || '', website: c.website || '',
        trade: c.trade || '', city: c.city || '', state: 'FL', county: c.county || '',
        license_number: c.license_number || '', source_url: c.source_url || '',
        source_platform: c.source_platform || '', outreach_status: 'pending',
        followup_count: 0, data_class: 'production',
      });
      created++;
    } catch { duplicates++; }
  }
  return { created, duplicates, total: contractors.length, usedBrowser: isCloudBrowserConfigured() };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (body._service_token || body.all_orgs) {
      const svc = base44.asServiceRole;
      const out = await forEachOrganization(svc, async (org) => {
        try { return await runForOrg(svc, org.id); }
        catch (e: any) { return { error: e?.message, org: org.id }; }
      });
      return Response.json({ success: true, mode: 'all_orgs', ...out });
    }
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const ctx = await resolveUserOrgs(base44, user.id);
    const orgId = body.organization_id || ctx.primaryOrgId;
    if (!orgId) return Response.json({ error: 'No organization membership' }, { status: 403 });
    return Response.json({ success: true, mode: 'single_org', ...await runForOrg(client, orgId) });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}