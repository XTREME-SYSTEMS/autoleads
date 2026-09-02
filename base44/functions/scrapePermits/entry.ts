import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createProject, updateSourceStatus, findSourceByName } from '../../shared/scrapeUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';

// scrapePermits — pulls building permit data from Socrata open-data portals.
// Many US cities/counties publish building permits via Socrata (data.{city}.gov).
// These are "private project" leads — early-stage construction before bids go public.

interface SocrataSource {
  name: string;
  url: string;        // e.g. https://data.cityofnewyork.us/resource/ipu4-2q9t.json
  jurisdiction: string;
  permitTypeField: string;
  titleFields: string[];   // fields to combine into a project title
  addressFields: string[];
  valueField: string;
  dateField: string;
  tradeFilter?: string[];  // permit type values that indicate construction work
  whereClause?: string;    // Socrata $where filter (e.g. commercial-only)
  idField?: string;        // unique permit ID field (for dedup source_url)
  residential?: boolean;   // residential-focused source (driveway/garage/patio/pool deck)
  concreteKeywords?: string[]; // text keywords that indicate concrete/coating work
}

const SOCRATA_SOURCES: SocrataSource[] = [
  {
    name: 'Chicago Building Permits',
    url: 'https://data.cityofchicago.org/resource/building-permits.json',
    jurisdiction: 'Chicago, IL',
    permitTypeField: 'permit_type',
    titleFields: ['work_type', 'permit_type'],
    addressFields: ['street_number', 'street_direction', 'street_name', 'street_type'],
    valueField: 'reported_cost',
    dateField: 'application_start_date',
    tradeFilter: ['PERMIT - NEW CONSTRUCTION', 'PERMIT - RENOVATION/ALTERATION', 'PERMIT - EASY PERMIT PROCESS'],
  },
  {
    name: 'Austin Building Permits',
    url: 'https://data.austintexas.gov/resource/3syk-w9eu.json',
    jurisdiction: 'Austin, TX',
    permitTypeField: 'permittype',
    titleFields: ['work_class', 'permit_type_desc'],
    addressFields: ['original_address1'],
    valueField: 'total_job_valuation',
    dateField: 'applieddate',
    tradeFilter: ['BP'],
  },
  {
    name: 'Seattle Building Permits',
    url: 'https://data.seattle.gov/resource/76t5-zqzr.json',
    jurisdiction: 'Seattle, WA',
    permitTypeField: 'permittypemapped',
    titleFields: ['permittypedesc', 'permitclass'],
    addressFields: ['originaladdress1'],
    valueField: 'permitclass',
    dateField: 'applieddate',
    tradeFilter: ['CONSTRUCTION', 'NEW', 'ADDITION', 'BUILDING'],
  },
  {
    name: 'Orlando Building Permits',
    url: 'https://data.cityoforlando.net/resource/ryhf-m453.json',
    jurisdiction: 'Orlando, FL',
    permitTypeField: 'application_type',
    titleFields: ['project_name', 'worktype'],
    addressFields: ['permit_address'],
    valueField: 'estimated_cost',
    dateField: 'issue_permit_date',
    tradeFilter: [],
    whereClause: "plan_review_type like '%Commercial%' AND application_type='Building Permit'",
    idField: 'permit_number',
  },
  // ── Residential-focused permit sources (driveway/garage/pool deck/patio/slab) ──
  {
    name: 'NYC DOB Residential Permits',
    url: 'https://data.cityofnewyork.us/resource/ipu4-2q9t.json',
    jurisdiction: 'New York City, NY',
    permitTypeField: 'permit_type',
    titleFields: ['work_type', 'permit_type'],
    addressFields: ['street_number', 'street_name'],
    valueField: 'filing_status',
    dateField: 'filing_date',
    residential: true,
    tradeFilter: ['NB', 'A1', 'A2'],
    concreteKeywords: ['driveway', 'garage', 'pool deck', 'patio', 'slab', 'concrete', 'epoxy', 'floor', 'foundation', 'basement', 'walkway', 'porch'],
  },
  {
    name: 'Los Angeles Residential Building Permits',
    url: 'https://data.lacity.org/resource/yfy5-m8kr.json',
    jurisdiction: 'Los Angeles, CA',
    permitTypeField: 'permit_type',
    titleFields: ['permit_sub_type', 'work_description'],
    addressFields: ['address_start', 'street_direction', 'street_name'],
    valueField: 'valuation',
    dateField: 'issue_date',
    residential: true,
    tradeFilter: ['Bldg-New', 'Bldg-Alter/Repair'],
    concreteKeywords: ['driveway', 'garage', 'pool deck', 'patio', 'slab', 'concrete', 'epoxy', 'floor', 'foundation', 'basement', 'walkway', 'porch'],
  },
  {
    name: 'San Francisco Residential Building Permits',
    url: 'https://data.sfgov.org/resource/i98e-sjp0.json',
    jurisdiction: 'San Francisco, CA',
    permitTypeField: 'permit_type',
    titleFields: ['work_description', 'permit_type'],
    addressFields: ['address_number', 'street_name'],
    valueField: 'estimated_cost',
    dateField: 'filed_date',
    residential: true,
    tradeFilter: ['additions', 'alterations', 'new construction'],
    concreteKeywords: ['driveway', 'garage', 'pool deck', 'patio', 'slab', 'concrete', 'epoxy', 'floor', 'foundation', 'basement', 'walkway', 'porch'],
  },
];

async function fetchSocrata(source: SocrataSource, limit: number): Promise<any[]> {
  // Build SoQL query: most recent permits, limited results.
  // Note: URLSearchParams encodes `$` as `%24`, which some Socrata endpoints
  // (e.g. Orlando, behind Akamai) reject with 403. Build the URL manually with
  // literal `$` parameter names.
  let url = `${source.url}?$limit=${limit}&$order=${encodeURIComponent(source.dateField + ' DESC')}`;
  if (source.whereClause) {
    url += `&$where=${encodeURIComponent(source.whereClause)}`;
  }

  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'AUTOLEADS/1.0' },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.log(`Socrata fetch failed for ${source.name}: HTTP ${res.status}`);
      return [];
    }
    return await res.json();
  } catch (e: any) {
    console.log(`Socrata fetch error for ${source.name}: ${e?.message || e}`);
    return [];
  }
}

function buildTitle(row: any, fields: string[]): string {
  const parts = fields.map(f => row[f]).filter(v => v && String(v).trim());
  if (parts.length === 0) return '';
  return parts.join(' - ').slice(0, 200);
}

function buildAddress(row: any, fields: string[]): string {
  const parts = fields.map(f => row[f]).filter(v => v && String(v).trim());
  return parts.join(' ').trim();
}

function parseValue(val: any): number | null {
  if (!val) return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function parseDate(val: any): string | null {
  if (!val) return null;
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const limitPerSource = body.limit || 50;
    const stateFilter = (body.state || '').toUpperCase();
    const counties = (body.counties || []) as string[];

    let totalCreated = 0;
    let totalDuplicates = 0;
    const sourceResults: any[] = [];

    // Source selection uses STATE only — jurisdictions are city-based, not county-based.
    const permitSources = SOCRATA_SOURCES.filter(s => {
      if (stateFilter && !String(s.jurisdiction || '').toUpperCase().includes(stateFilter)) return false;
      return true;
    });
    for (const source of permitSources) {
      const rows = await fetchSocrata(source, limitPerSource);

      // Filter to construction-related permits (case-insensitive substring match)
      const filtered = rows.filter(row => {
        if (!source.tradeFilter || source.tradeFilter.length === 0) return true;
        const pt = String(row[source.permitTypeField] || '').toUpperCase();
        // If no permit type field at all, keep the row (some datasets use different field names)
        if (!pt && source.permitTypeField) return true;
        return source.tradeFilter.some(t => pt.includes(t.toUpperCase()));
      }).filter(row => {
        // For residential sources, require concrete/coating-relevant text so we
        // surface driveway/garage/pool deck/patio/slab permits, not all residential work.
        if (!source.concreteKeywords || source.concreteKeywords.length === 0) return true;
        const hay = `${row.work_type || ''} ${row.worktype || ''} ${row.project_name || ''} ${row.description || ''} ${row.work_description || ''} ${row.permit_type || ''} ${row.permittype || ''} ${row.work_class || ''} ${row.permit_type_desc || ''} ${row.permit_sub_type || ''}`.toLowerCase();
        return source.concreteKeywords.some(k => hay.includes(k.toLowerCase()));
      });

      let created = 0;
      let duplicates = 0;

      // Find or create a ScrapeSource record for this Socrata feed
      let sourceRecord = await findSourceByName(client, source.name);
      if (!sourceRecord) {
        try {
          sourceRecord = await client.entities.ScrapeSource.create({
            organization_id: body?.organization_id,
            name: source.name,
            url: source.url,
            source_type: 'api',
            jurisdiction: source.jurisdiction,
            status: 'active',
            data_class: 'production',
          });
        } catch {
          sourceRecord = null;
        }
      }

      for (const row of filtered) {
        const title = buildTitle(row, source.titleFields);
        if (!title) continue;

        const address = buildAddress(row, source.addressFields);
        const value = parseValue(row[source.valueField]);
        const permitDate = parseDate(row[source.dateField]);

        // Generate specs from available permit data
        const specsParts: string[] = [];
        if (row.worktype) specsParts.push(`Work Type: ${row.worktype}`);
        if (row.plan_review_type) specsParts.push(`Plan Review: ${row.plan_review_type}`);
        if (row.project_name) specsParts.push(`Project: ${row.project_name}`);
        if (row.square_footage && Number(row.square_footage) > 0) specsParts.push(`Square Footage: ${row.square_footage} SF`);
        if (value && value > 0) specsParts.push(`Estimated Cost: $${value.toLocaleString()}`);
        if (row.contractor_name) specsParts.push(`Contractor: ${row.contractor_name}`);
        if (row.permit_number) specsParts.push(`Permit Number: ${row.permit_number}`);
        if (row.application_status) specsParts.push(`Status: ${row.application_status}`);
        const specs = specsParts.length > 0 ? specsParts.join('. ') : `Commercial building permit in ${source.jurisdiction}`;

        // Set bid_due_date 60 days from permit date (permits indicate upcoming work)
        let bidDueDate: string | null;
        if (permitDate) {
          const d = new Date(permitDate);
          d.setDate(d.getDate() + 60);
          bidDueDate = d.toISOString().split('T')[0];
        } else {
          const d = new Date();
          d.setDate(d.getDate() + 60);
          bidDueDate = d.toISOString().split('T')[0];
        }

        // Build a unique source_url per permit (for dedup)
        const permitId = source.idField && row[source.idField]
          ? String(row[source.idField])
          : `${title}_${address}_${permitDate || ''}`.replace(/\s+/g, '_').slice(0, 100);
        const uniqueSourceUrl = `${source.url}#${permitId}`;

        const result = await createProject(client, { organization_id: body?.organization_id,
          title: `${title} — ${address || source.jurisdiction}`,
          description: `Building permit issued in ${source.jurisdiction}. Permit type: ${row[source.permitTypeField] || 'Unknown'}. Address: ${address || 'N/A'}.`,
          specs,
          authority: source.name,
          jurisdiction: source.jurisdiction,
          value,
          bid_due_date: bidDueDate,
          source_url: uniqueSourceUrl,
          source_id: sourceRecord?.id || '',
          project_type: source.residential ? 'residential' : 'permit',
          trade: 'general construction',
          address: address ? `${address}, ${source.jurisdiction}` : source.jurisdiction,
          confidence: 0.7,
          verification_status: 'verified',
          service_area_states: stateFilter ? [stateFilter] : [],
        });

        if (result.created) created++;
        else duplicates++;
      }

      totalCreated += created;
      totalDuplicates += duplicates;

      if (sourceRecord) {
        await updateSourceStatus(client, sourceRecord.id, {
          success: created > 0 || duplicates > 0,
          recordsRetrieved: created,
          error: created === 0 && duplicates === 0 ? 'No permits found' : undefined,
        });
      }

      sourceResults.push({
        name: source.name,
        jurisdiction: source.jurisdiction,
        rowsFetched: rows.length,
        filtered: filtered.length,
        created,
        duplicates,
      });
    }

    if (totalCreated > 0) {
      try {
        await client.entities.Notification.create({
          organization_id: body?.organization_id,
          type: 'opportunity',
          title: `${totalCreated} building permits found`,
          body: `Socrata permit scraper found ${totalCreated} new construction permits across ${sourceResults.length} cities.`,
          priority: 'medium',
          linked_route: '/projects',
        });
      } catch {}
    }

    return Response.json({
      success: true,
      totalCreated,
      totalDuplicates,
      sources: sourceResults,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}