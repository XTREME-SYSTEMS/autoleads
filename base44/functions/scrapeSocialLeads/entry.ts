import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs, scopedFilter } from '../../shared/orgContext.ts';
import { cloudBrowserExtract, isCloudBrowserConfigured } from '../../shared/cloudBrowserClient.ts';
import {
  RESIDENTIAL_SERVICES, SOURCE_TAXONOMY, buildQueryFamilies, scoreResidentialLead,
  RESIDENTIAL_LEAD_SCHEMA, INTENT_BRIEF, MAJOR_CITIES_BY_STATE,
} from '../../shared/residentialScrapeConfig.ts';

// Residential demand-intelligence ingestion. Uses the structured taxonomy in
// residentialScrapeConfig.ts: full service scope, intent classification, query
// families, source taxonomy, and 0-100 lead scoring. Browser hits Craigslist +
// Reddit (JS-heavy); web-search LLM covers Facebook groups, Nextdoor, forums,
// marketplaces, real-estate listings, and public records.

function buildTargets(services: string[], locations: string[]): { platform: string; url: string }[] {
  const targets: { platform: string; url: string }[] = [];
  for (const loc of locations) {
    const clCity = loc.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const svc of services) {
      const enc = encodeURIComponent(svc);
      if (clCity && clCity.length > 2) {
        targets.push({ platform: 'craigslist', url: `https://${clCity}.craigslist.org/search/?query=${enc}&sort=date` });
      }
      targets.push({ platform: 'reddit', url: `https://www.reddit.com/search/?q=${encodeURIComponent(svc + ' ' + loc)}&sort=new` });
    }
  }
  const seen = new Set<string>();
  return targets.filter((t) => (seen.has(t.url) ? false : (seen.add(t.url), true))).slice(0, 24);
}

async function createSocialLead(client: any, orgId: string, lead: any): Promise<{ created: boolean }> {
  if (!lead?.title) return { created: false };
  const sourceUrl = lead.source_url || '';
  try {
    if (sourceUrl) {
      const dup = await client.entities.Project.filter({ organization_id: orgId, source_url: sourceUrl }).catch(() => []);
      if (dup && dup.length) return { created: false };
    }
    const score = lead.lead_score ?? scoreResidentialLead(lead);
    const rich = {
      lead_category: lead.lead_category, intent: lead.intent, service: lead.service,
      secondary_services: lead.secondary_services, property_type: lead.property_type,
      timeframe: lead.timeframe, urgency: lead.urgency, budget: lead.budget,
      project_size: lead.project_size, decision_maker_role: lead.decision_maker_role,
      company: lead.company, source_class: lead.source_class, posted_date: lead.posted_date,
      evidence_excerpt: lead.evidence_excerpt, referral_partner: lead.referral_partner,
      diy_only: lead.diy_only, lead_score: score,
    };
    await client.entities.Project.create({
      organization_id: orgId,
      title: String(lead.title).slice(0, 200),
      description: lead.evidence_excerpt || lead.description || '',
      specs: JSON.stringify(rich),
      contract_info: lead.contact_info || '',
      client_name: lead.company || lead.contact_info || lead.source_platform || 'Social lead',
      jurisdiction: [lead.city, lead.state].filter(Boolean).join(', ') || 'Unknown',
      authority: lead.source_platform || 'Social / Residential',
      source_url: sourceUrl,
      source_id: 'social_scraper',
      project_type: 'residential',
      trade: lead.service || 'general construction',
      stage: 'qualification',
      confidence: Math.max(0, Math.min(1, score / 100)),
      verification_status: 'unverified',
      data_class: 'production',
    });
    return { created: true };
  } catch {
    return { created: false };
  }
}

async function runForOrg(client: any, orgId: string): Promise<any> {
  const profiles = await client.entities.CompanyProfile.filter(scopedFilter(orgId)).catch(() => []);
  const profile = (profiles || [])[0] || {};
  const profileTrades = (profile.trade || '').split(',').map((t: string) => t.trim()).filter(Boolean);
  const services = [...new Set([...RESIDENTIAL_SERVICES, ...profileTrades])].slice(0, 15);
  const state = profile.state || '';
  const baseCities = [profile.city].filter(Boolean);
  // Expand to major cities in the org's state so residential demand isn't
  // limited to a single city. Falls back to state-level if no city set.
  const majorCities = state ? (MAJOR_CITIES_BY_STATE[state.toUpperCase()] || []) : [];
  const locations = [...new Set([...baseCities, ...majorCities, state].filter(Boolean))];
  if (locations.length === 0) return { created: 0, duplicates: 0, total: 0, skipped: 'no service area on company profile' };

  const useBrowser = isCloudBrowserConfigured();
  const rawChunks: { platform: string; url: string; text: string }[] = [];
  if (useBrowser) {
    for (const t of buildTargets(services, locations)) {
      const r = await cloudBrowserExtract(t.url, 18000);
      if (r.ok && r.content) rawChunks.push({ platform: t.platform, url: t.url, text: r.content });
    }
  }

  const queryFamilies = buildQueryFamilies(services.slice(0, 6), locations);

  // Web-search complement (always on) — catches FB groups, forums, Nextdoor,
  // marketplaces, real-estate listings, and public records.
  const ws = await client.integrations.Core.InvokeLLM({
    prompt: `You are a construction-demand intelligence agent. Search the public web for recent posts, listings, or filings by homeowners, businesses, facility managers, or adjacent trades indicating DEMAND to HIRE a contractor for these services: ${services.join(', ')}. Focus on these locations: ${locations.join(', ') || 'the US'}. Look on Facebook groups, Reddit, Craigslist, Nextdoor, Houzz, Angi, Thumbtack, contractor forums, local community sites, real-estate listings ("needs renovation"/"value-add"/"as-is"), and public permit/property records. Use these query families as a guide: ${queryFamilies.slice(0, 20).join(' | ')}.
${INTENT_BRIEF}
For each REAL post/listing you actually find, classify its intent, detect the service scope and property type, and return the structured record. Return JSON.`,
    add_context_from_internet: true,
    model: 'gemini_3_flash',
    response_json_schema: RESIDENTIAL_LEAD_SCHEMA,
  });
  const webLeads = ws?.leads || [];

  let browserLeads: any[] = [];
  if (rawChunks.length) {
    const corpus = rawChunks.map((c) => `### ${c.platform} — ${c.url}\n${c.text}`).join('\n\n').slice(0, 40000);
    const pr = await client.integrations.Core.InvokeLLM({
      prompt: `From the following scraped social/classifieds/forum page text, extract posts where someone is looking to HIRE a contractor for concrete, epoxy, coating, polishing, resurfacing, or countertop work — OR posts announcing a renovation/project that would include such scopes — OR adjacent trades seeking a subcontractor. Ignore posts that are contractors advertising their OWN services.
${INTENT_BRIEF}
Only return posts actually present in the text. Return JSON.\n\nCORPUS:\n${corpus}`,
      response_json_schema: RESIDENTIAL_LEAD_SCHEMA,
    });
    browserLeads = pr?.leads || [];
  }

  const allLeads = [...browserLeads, ...webLeads];
  let created = 0, duplicates = 0;
  for (const lead of allLeads) {
    const r = await createSocialLead(client, orgId, lead);
    if (r.created) created++; else duplicates++;
  }
  return { created, duplicates, total: allLeads.length, browserChunks: rawChunks.length, usedBrowser: useBrowser, services, locations };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (body._service_token && body.organization_id) {
      const svc = base44.asServiceRole;
      const result = await runForOrg(svc, body.organization_id);
      return Response.json({ success: true, mode: 'single_org_service', ...result });
    }
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
    const result = await runForOrg(client, orgId);
    return Response.json({ success: true, mode: 'single_org', ...result });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}