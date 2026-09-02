import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate, getInternalToken } from '../../shared/internalAuth.ts';
import { forEachOrganization, scopedFilter } from '../../shared/orgContext.ts';
import { US_STATES } from '../../shared/locationEligibility.ts';

// runAutoScrape — org-scoped: iterates each organization and scrapes leads
// using that org's CompanyProfile, trades, and ScrapeSources. Created records
// are tagged with the organization_id so RLS isolates them per tenant.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const errors: string[] = [];
    let totalCreated = 0;
    let orgsProcessed = 0;

    // Iterate every organization — no cross-tenant access
    const result = await forEachOrganization(svc, async (org) => {
      const orgId = org.id;

      // Get this org's company profile (scoped)
      const companies = await svc.entities.CompanyProfile.filter(scopedFilter(orgId)).catch(() => []);
      const company = (companies || [])[0];
      if (!company) return; // Skip orgs without a company profile

      const trades = body?.trades && body.trades.length > 0
        ? body.trades
        : (company.trade ? company.trade.split(',').map((t: string) => t.trim()).filter(Boolean) : []);
      const trade = trades[0] || 'general construction';
      // Resolve the org's service-area state: explicit body override > org.state > company.state
      const orgState = (body?.stateCode || body?.state || org.state || company.state || '').toUpperCase();
      const counties = body?.counties || [];

      // Skip scraping entirely if the org has no service-area state configured
      if (!orgState) {
        errors.push(`[${org.name}] skipped: no service-area state configured`);
        return;
      }

      let orgCreated = 0;

      // 1. Federal opportunities — filtered by org's state (place of performance)
      try {
        const r: any = await client.functions.invoke('scrapeFederalAPIs', {
          _service_token: getInternalToken(),
          organization_id: orgId,
          trades,
          state: orgState,
        });
        orgCreated += r?.totalCreated || 0;
        if (r?.error) errors.push(`[${org.name}] federal: ${r.error}`);
      } catch (e: any) { errors.push(`[${org.name}] federal: ${e?.message || 'failed'}`); }

      // 2. Building permits — already state-scoped
      try {
        const r: any = await client.functions.invoke('scrapePermits', {
          _service_token: getInternalToken(),
          organization_id: orgId,
          limit: 30, state: orgState, counties,
        });
        orgCreated += r?.totalCreated || 0;
        if (r?.error) errors.push(`[${org.name}] permits: ${r.error}`);
      } catch (e: any) { errors.push(`[${org.name}] permits: ${e?.message || 'failed'}`); }

      // 3. News feeds — filtered by org's state
      try {
        const r: any = await client.functions.invoke('scrapeNewsFeeds', {
          _service_token: getInternalToken(),
          organization_id: orgId,
          state: orgState,
        });
        orgCreated += r?.totalCreated || 0;
        if (r?.error) errors.push(`[${org.name}] news: ${r.error}`);
      } catch (e: any) { errors.push(`[${org.name}] news: ${e?.message || 'failed'}`); }

      // 4. Planning agendas — filtered by org's state
      try {
        const r: any = await client.functions.invoke('scrapeAgendas', {
          _service_token: getInternalToken(),
          organization_id: orgId,
          state: orgState,
        });
        orgCreated += r?.totalCreated || 0;
        if (r?.error) errors.push(`[${org.name}] agendas: ${r.error}`);
      } catch (e: any) { errors.push(`[${org.name}] agendas: ${e?.message || 'failed'}`); }

      // 5. Government portal sources (org-scoped)
      const sources = await svc.entities.ScrapeSource.filter(scopedFilter(orgId), '-created_date', 500).catch(() => []);
      const stateMatch = (s: any) => {
        if (!orgState) return true;
        const j = String(s.jurisdiction || '').toUpperCase();
        return j.includes(orgState) || j.includes(US_STATES[orgState] || '');
      };
      const portalSources = (sources || []).filter(s =>
        (s.source_type === 'government_portal' || s.source_type === 'aggregator') &&
        s.url && s.status !== 'error' && stateMatch(s)
      );
      const sortedSources = portalSources.sort((a, b) =>
        new Date(a.last_run_date || 0).getTime() - new Date(b.last_run_date || 0).getTime()
      );

      const SOURCES_PER_RUN = 25;
      const CONCURRENCY = 5;
      const sourcesToScrape = sortedSources.slice(0, SOURCES_PER_RUN);

      for (let i = 0; i < sourcesToScrape.length; i += CONCURRENCY) {
        const batch = sourcesToScrape.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(batch.map(source =>
          client.functions.invoke('browserScrape', {
            _service_token: getInternalToken(),
            organization_id: orgId,
            sourceId: source.id,
            url: source.url,
            sourceName: source.name,
            trade, trades, counties,
          }).catch(() => null)
        ));
        results.forEach((r) => {
          if (r.status === 'fulfilled' && r.value) {
            orgCreated += r.value.created || 0;
          }
        });
      }

      // 6. Residential / social demand intelligence (cloud browser + web search)
      try {
        const r: any = await client.functions.invoke('scrapeSocialLeads', {
          _service_token: getInternalToken(),
          organization_id: orgId,
        });
        orgCreated += r?.created || 0;
        if (r?.error) errors.push(`[${org.name}] social: ${r.error}`);
      } catch (e: any) { errors.push(`[${org.name}] social: ${e?.message || 'failed'}`); }

      totalCreated += orgCreated;
      orgsProcessed++;

      // Create per-org notification
      if (orgCreated > 0) {
        try {
          await svc.entities.Notification.create({
            organization_id: orgId,
            type: 'opportunity',
            title: `${orgCreated} new opportunities found`,
            body: `Auto-scrape found ${orgCreated} new leads for ${org.name}.`,
            priority: 'high',
            linked_route: '/leads',
          });
        } catch {}
      }
    });

    return Response.json({
      success: true,
      totalCreated,
      orgsProcessed,
      errors: errors.slice(0, 20),
      errorCount: errors.length,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}