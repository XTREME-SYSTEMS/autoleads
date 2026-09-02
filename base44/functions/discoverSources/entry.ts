import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs, scopedFilter } from '../../shared/orgContext.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const tradeOverride = body.trade;
    const locationOverride = body.location;

    // Resolve org context — never use bare .list() (cross-tenant)
    const ctx = user ? await resolveUserOrgs(client, user.id) : null;
    const orgId = ctx?.primaryOrgId;
    const [companies, existingSources] = await Promise.all([
      orgId ? client.entities.CompanyProfile.filter(scopedFilter(orgId)).catch(() => []) : [],
      orgId ? client.entities.ScrapeSource.filter(scopedFilter(orgId)).catch(() => []) : [],
    ]);
    const company = companies[0];
    if (!company) return Response.json({ error: 'Set up your company profile first' }, { status: 400 });

    const trade = tradeOverride || company.trade || 'general contractor';
    const location = locationOverride || [company.city, company.state].filter(Boolean).join(', ') || company.state || 'United States';
    const existingUrls = new Set((existingSources || []).map(s => s.url));

    const res = await client.integrations.Core.InvokeLLM({
      model: 'gemini_3_flash',
      add_context_from_internet: true,
      prompt: `Find real, public construction bid opportunity sources for a ${trade} contractor based in ${location}.
Include: government procurement portals (city, county, state level), plan centers, and bid aggregators that post construction projects relevant to the ${trade} trade in and around ${location}.
For each source return: name, url (real working URL), source_type (one of: government_portal, aggregator, api), jurisdiction (city/county/state/national), and trades (the trades it covers).
Return up to 12 sources. Only include sources you can verify have real URLs. Do not invent URLs.`,
      response_json_schema: {
        type: 'object',
        properties: {
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                url: { type: 'string' },
                source_type: { type: 'string' },
                jurisdiction: { type: 'string' },
                trades: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const sources = Array.isArray(res?.sources) ? res.sources : [];
    let created = 0;
    for (const s of sources) {
      if (!s.url || existingUrls.has(s.url)) continue;
      await client.entities.ScrapeSource.create({
        name: s.name || s.url,
        url: s.url,
        source_type: ['government_portal', 'aggregator', 'api', 'email', 'manual'].includes(s.source_type) ? s.source_type : 'government_portal',
        jurisdiction: s.jurisdiction || location,
        trades: s.trades || trade,
        status: 'unverified',
      });
      existingUrls.add(s.url);
      created++;
    }

    return Response.json({ ok: true, trade, location, found: sources.length, created, duplicates: sources.length - created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}