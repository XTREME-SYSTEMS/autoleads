import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { createProject, findSourceByName, updateSourceStatus } from '../../shared/scrapeUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';

// Construction NAICS codes (23xxxx series)
const CONSTRUCTION_NAICS = [
  '236115', '236116', '236117', '236118', '236210', '236220', '237110', '237120',
  '237130', '237210', '237310', '237320', '237330', '237340', '237350', '237360',
  '237990', '238110', '238120', '238130', '238140', '238150', '238160', '238170',
  '238190', '238210', '238220', '238290', '238310', '238320', '238330', '238340',
  '238350', '238390', '238910', '238990',
];

// Format date as MM/DD/YYYY for SAM.gov
function formatDate(d: Date): string {
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}/${d.getFullYear()}`;
}

// 1. SAM.gov Opportunities API v2
async function scrapeSamGov(client: any, sourceId: string, orgId: string, state: string): Promise<{ created: number; errors: number; errorDetails: string[] }> {
  const apiKey = secrets.get('SAM_GOV_API_KEY');
  if (!apiKey) return { created: 0, errors: 0, errorDetails: ['No SAM_GOV_API_KEY set'] };

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  let created = 0, errors = 0;
  let offset = 0;
  const limit = 100;
  const errorDetails: string[] = [];

  // Pull construction NAICS in batches (5 per run to stay under daily quota)
  for (const naics of CONSTRUCTION_NAICS.slice(0, 5)) {
    try {
      let url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}` +
        `&postedFrom=${formatDate(thirtyDaysAgo)}&postedTo=${formatDate(now)}` +
        `&naics=${naics}&limit=${limit}&offset=${offset}`;
      // Filter by place of performance state when a service area is configured
      if (state) {
        url += `&placeOfPerformance.format=state&placeOfPerformance.values=${encodeURIComponent(state)}`;
      }

      // 2s delay between NAICS requests to avoid rate-limiting
      if (created > 0 || errors > 0) await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        errorDetails.push(`NAICS ${naics} HTTP ${res.status}: ${errBody.slice(0, 150)}`);
        errors++;
        if (res.status === 429) { errorDetails.push('Quota exceeded — skipping remaining NAICS codes'); break; }
        continue;
      }
      const data = await res.json();
      const opportunities = data?.opportunitiesData || [];

      for (const opp of opportunities) {
        try {
          const title = opp.title || '';
          if (!title) continue;

          const result = await createProject(client, {
            organization_id: orgId,
            title,
            description: opp.description || opp.typeOfSetAsideDescription || '',
            authority: opp.officeName || opp.department || '',
            jurisdiction: 'Federal',
            value: opp.estimatedValue ? parseFloat(opp.estimatedValue) : null,
            bid_due_date: opp.responseDeadLine || null,
            source_url: opp.uiLink || opp.link || '',
            source_id: sourceId,
            project_type: opp.type || '',
            trade: 'general construction',
            confidence: 0.95,
            verification_status: 'verified',
            service_area_states: state ? [state] : [],
          });
          if (result.created) created++;
        } catch { errors++; }
      }
    } catch (e: any) { errorDetails.push(`NAICS ${naics} fetch: ${e?.message || String(e)}`); errors++; }
  }

  return { created, errors, errorDetails };
}

// 2. USAspending.gov API
async function scrapeUsaspending(client: any, sourceId: string, orgId: string, state: string): Promise<{ created: number; errors: number; errorDetails: string[] }> {
  let created = 0, errors = 0;
  const errorDetails: string[] = [];

  try {
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

    const filters: any = {
      time_period: [{ start_date: oneYearAgo.toISOString().slice(0, 10), end_date: now.toISOString().slice(0, 10) }],
      naics_codes: { require: ['23'] },
      award_type_codes: ['A', 'B', 'C', 'D'],
    };
    // Filter by place of performance state when a service area is configured
    if (state) {
      filters.place_of_performance_locations = [{ country: 'USA', state: state }];
    }

    const res = await fetch('https://api.usaspending.gov/api/v2/search/spending_by_award/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filters,
        fields: ['Award ID', 'Recipient Name', 'Total Outlays', 'Awarding Agency', 'Start Date', 'End Date', 'Award Amount', 'Description'],
        page: 1,
        limit: 100,
        sort: 'Award Amount',
        order: 'desc',
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) { const eb = await res.text().catch(()=>''); errorDetails.push(`HTTP ${res.status}: ${eb.slice(0,150)}`); return { created: 0, errors: 1, errorDetails }; }
    const data = await res.json();
    const awards = data?.results || [];

    for (const award of awards) {
      try {
        const title = award.Description || `Federal Award: ${award['Recipient Name'] || 'Unknown'}`;
        const result = await createProject(client, {
          organization_id: orgId,
          title,
          description: award.Description || '',
          authority: award['Awarding Agency'] || '',
          jurisdiction: 'Federal',
          value: award['Award Amount'] ? parseFloat(award['Award Amount']) : null,
          bid_due_date: null,
          source_url: `https://www.usaspending.gov/award/${award['Award ID']}`,
          source_id: sourceId,
          project_type: 'federal contract',
          trade: 'general construction',
          confidence: 0.9,
          verification_status: 'verified',
          service_area_states: state ? [state] : [],
        });
        if (result.created) created++;
      } catch { errors++; }
    }
  } catch (e: any) { errorDetails.push(e?.message || String(e)); errors++; }

  return { created, errors, errorDetails };
}

// 3. Grants.gov Search2 API
async function scrapeGrantsGov(client: any, sourceId: string, orgId: string, state: string): Promise<{ created: number; errors: number; errorDetails: string[] }> {
  let created = 0, errors = 0;
  const errorDetails: string[] = [];

  try {
    const res = await fetch('https://api.grants.gov/v1/api/search2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword: 'construction', status: 'posted', rows: 100 }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) { const eb = await res.text().catch(()=>''); errorDetails.push(`HTTP ${res.status}: ${eb.slice(0,150)}`); return { created: 0, errors: 1, errorDetails }; }
    const data = await res.json();
    const grants = data?.opportunities || [];
    errorDetails.push(`${grants.length} grants returned by API`);

    for (const grant of grants) {
      try {
        const title = grant.title || '';
        if (!title) continue;

        const result = await createProject(client, {
          organization_id: orgId,
          title,
          description: grant.description || '',
          authority: grant.agencyName || grant.agencyCode || '',
          jurisdiction: 'Federal',
          value: grant.awardCeiling ? parseFloat(grant.awardCeiling) : null,
          bid_due_date: grant.closeDate || null,
          source_url: `https://www.grants.gov/search-results-detail/${grant.opportunityId}`,
          source_id: sourceId,
          project_type: 'federal grant',
          trade: 'general construction',
          confidence: 0.9,
          verification_status: 'verified',
          service_area_states: state ? [state] : [],
        });
        if (result.created) created++;
      } catch { errors++; }
    }
  } catch (e: any) { errorDetails.push(e?.message || String(e)); errors++; }

  return { created, errors, errorDetails };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const orgId = body?.organization_id || '';
    const state = (body?.state || '').toUpperCase();

    const sources = await client.entities.ScrapeSource.filter({ source_type: 'api', status: 'active' }).catch(() => []);
    const samSource = (sources || []).find(s => s.name?.includes('SAM.gov Contract Opportunities')) || await findSourceByName(client, 'SAM.gov Contract Opportunities');
    const usaSource = (sources || []).find(s => s.name?.includes('USAspending')) || await findSourceByName(client, 'USAspending.gov Contract Awards');
    const grantsSource = (sources || []).find(s => s.name?.includes('Grants.gov')) || await findSourceByName(client, 'Grants.gov Search');

    const results: any = {};

    if (samSource) {
      const r = await scrapeSamGov(client, samSource.id, orgId, state);
      results.samGov = r;
      await updateSourceStatus(client, samSource.id, { success: r.created > 0 || r.errors === 0, recordsRetrieved: r.created, error: r.errors > 0 ? `${r.errors} errors` : undefined });
    }
    if (!samSource) results.samGov = { created: 0, errors: 0, errorDetails: ['No SAM.gov source found in ScrapeSource'] };

    if (usaSource) {
      const r = await scrapeUsaspending(client, usaSource.id, orgId, state);
      results.usaspending = r;
      await updateSourceStatus(client, usaSource.id, { success: r.created > 0 || r.errors === 0, recordsRetrieved: r.created, error: r.errors > 0 ? `${r.errors} errors` : undefined });
    }

    if (grantsSource) {
      const r = await scrapeGrantsGov(client, grantsSource.id, orgId, state);
      results.grantsGov = r;
      await updateSourceStatus(client, grantsSource.id, { success: r.created > 0 || r.errors === 0, recordsRetrieved: r.created, error: r.errors > 0 ? `${r.errors} errors` : undefined });
    }

    const totalCreated = (results.samGov?.created || 0) + (results.usaspending?.created || 0) + (results.grantsGov?.created || 0);

    if (totalCreated > 0) {
      try {
        await client.entities.Notification.create({
          organization_id: orgId,
          type: 'opportunity',
          title: `${totalCreated} federal opportunities imported`,
          body: `Real federal leads pulled from SAM.gov, USAspending, and Grants.gov APIs.`,
          priority: 'high',
          linked_route: '/projects',
        });
      } catch {}
    }

    return Response.json({ success: true, totalCreated, results });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}