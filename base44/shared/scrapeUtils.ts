// Shared utilities for real-source scraping (federal APIs + BrowserWorker).
// Imported by scrapeFederalAPIs, browserScrape, and runAutoScrape.

import { isOpportunityInServiceArea, normalizeServiceAreaStates, type LocationResult } from './locationEligibility.ts';
import { captureAndTranslateSource } from './sourceTranslator.ts';



// Deterministic CompanyProfile selection — see tradeMatcher.ts for full docs.
// Re-exported here to avoid circular imports; the implementation is identical.
function selectCanonicalCompanyProfile(companies: any[]): any | null {
  if (!companies || companies.length === 0) return null;
  const production = companies.filter(c => c.data_class !== 'NON_PRODUCTION_EXAMPLE');
  if (production.length === 0) return null;
  const sourcePatterns = ['permit', 'portal', 'source', 'city of', 'county of', 'department', 'agency', 'feed'];
  const contractorProfiles = production.filter(c => {
    const name = (c.name || '').toLowerCase();
    return !sourcePatterns.some(p => name.includes(p));
  });
  if (contractorProfiles.length === 0) return null;
  if (contractorProfiles.length === 1) return contractorProfiles[0];
  const contractorTradeKeywords = [
    'epoxy', 'concrete', 'coating', 'polishing', 'flooring', 'resinous',
    'polyurea', 'polyaspartic', 'polished', 'floor', 'construction',
    'contractor', 'builder', 'remodeling', 'renovation',
  ];
  const scored = contractorProfiles.map(c => {
    const trade = (c.trade || '').toLowerCase();
    const name = (c.name || '').toLowerCase();
    let score = 0;
    for (const kw of contractorTradeKeywords) {
      if (trade.includes(kw)) score += 2;
      if (name.includes(kw)) score += 1;
    }
    if (c.website) score += 1;
    if (c.phone) score += 1;
    if (c.license_number) score += 1;
    return { company: c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored[0].company;
}

// Cached trade keywords from the company profile + approved ScopeSystem aliases.
// Used to filter scraped opportunities so only leads matching the user's
// approved trades/scope are created as Project records.
// Cache is keyed by organization_id to prevent cross-tenant keyword leakage.
const _tradeKeywordsCache: Map<string, { value: string[]; ts: number }> = new Map();
const TRADE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function loadTradeKeywords(client: any, orgId?: string): Promise<string[]> {
  const cacheKey = orgId || '__global__';
  const cached = _tradeKeywordsCache.get(cacheKey);
  if (cached && (Date.now() - cached.ts) < TRADE_CACHE_TTL) {
    return cached.value;
  }
  try {
    const keywords = new Set<string>();

    const companies = orgId
      ? await client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => [])
      : [];
    // Deterministic selection — never use (companies || [])[0].
    // Source/permit records must not become the org's trade identity.
    const company = selectCanonicalCompanyProfile(companies);
    if (company?.trade) {
      company.trade.split(',').forEach((t: string) => {
        const trimmed = t.trim().toLowerCase();
        if (trimmed) keywords.add(trimmed);
      });
    }

    const systems = await client.entities.ScopeSystem.list().catch(() => []);
    for (const s of systems || []) {
      if (s.scope) keywords.add(String(s.scope).toLowerCase());
      if (Array.isArray(s.aliases)) {
        s.aliases.forEach((a: string) => {
          const trimmed = a.trim().toLowerCase();
          if (trimmed) keywords.add(trimmed);
        });
      }
    }

    const value = [...keywords];
    _tradeKeywordsCache.set(cacheKey, { value, ts: Date.now() });
    return value;
  } catch {
    _tradeKeywordsCache.set(cacheKey, { value: [], ts: Date.now() });
    return [];
  }
}

// Normalize a title for deduplication
export function normalizeTitle(t: string): string {
  return (t || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 80);
}

// Get a set of existing normalized titles for dedup
export async function getExistingTitles(client: any, orgId?: string): Promise<Set<string>> {
  try {
    const existing = orgId
      ? await client.entities.Project.filter({ organization_id: orgId }, '-created_date', 500).catch(() => [])
      : await client.entities.Project.list('-created_date', 500).catch(() => []);
    return new Set((existing || []).map((p: any) => normalizeTitle(p.title)));
  } catch {
    return new Set();
  }
}

// Check if a URL responds successfully
export async function verifyUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(8000) });
    return res.ok || (res.status >= 300 && res.status < 400);
  } catch {
    return false;
  }
}

// Extract document links (plans, specs, addenda, bid forms) from raw HTML.
// Looks for <a href> tags pointing to PDFs, Office docs, CAD files, or
// planholder portals, and links whose text mentions construction documents.
export function extractDocumentLinks(html: string, baseUrl: string): { name: string; url: string; type: string }[] {
  const links: { name: string; url: string; type: string }[] = [];
  const seen = new Set<string>();
  const anchorRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorRegex.exec(html)) !== null && links.length < 25) {
    let href = match[1];
    const rawText = (match[2] || '').replace(/<[^>]+>/g, '').trim();
    // Resolve relative URLs
    try {
      href = new URL(href, baseUrl).href;
    } catch { continue; }

    const lower = `${href} ${rawText}`.toLowerCase();
    const isPdf = /\.pdf($|\?|#)/.test(href);
    const isDoc = /\.(docx?|xlsx?|zip|dwg|dxf|tif{1,2})($|\?|#)/.test(href);
    const isPlanPortal = /(planholder|planroom|plan.?room|bidx|questcdn|docker|isqft|constructconnect|bidsync|bonfire|citizens|ionwave|opengov|procureware|evisions|e?bid)/.test(lower);
    const hasKeyword = /(plan|spec|addendum|addenda|drawing|bid.?form|bid.?document|rfp|rfq|ifb|solicitation|scoping|scope)/.test(lower);

    if (!isPdf && !isDoc && !isPlanPortal && !hasKeyword) continue;
    if (seen.has(href)) continue;
    seen.add(href);

    let type = 'other';
    if (/(addendum|addenda)/.test(lower)) type = 'addenda';
    else if (/(plan|drawing|dwg|blueprint|sheet)/.test(lower)) type = 'plans';
    else if (/(spec|specification|scoping|scope)/.test(lower)) type = 'specs';
    else if (/(bid.?form|bid.?document|rfp|rfq|ifb|solicitation)/.test(lower)) type = 'bid_form';
    else if (isPdf || isDoc) type = 'document';

    const name = rawText || href.split('/').pop()?.split('?')[0] || 'Document';
    links.push({ name: name.slice(0, 120), url: href, type });
  }
  return links;
}

// Fields that every lead MUST have for a user to validate/triage the project.
// Leads missing any of these are rejected at ingestion — they don't enter the pipeline.
export const MANDATORY_LEAD_FIELDS = [
  'title',
  'description',
  'source_url',
  'jurisdiction',
  'authority',
  'trade',
] as const;

// A lead must have EITHER real specs OR document links (plans/specs downloads).
// A lead with neither is not actionable — a contractor cannot validate a project
// with no scope of work and no way to get drawings. This is the hard mandate.
export function hasActionableSpecsOrDocs(data: any): boolean {
  const realSpecs = data.specs && String(data.specs).trim() &&
    !String(data.specs).toLowerCase().startsWith('not available on source');
  const hasDocs = Array.isArray(data.documents) && data.documents.length > 0;
  return Boolean(realSpecs || hasDocs);
}

// Calculate a 0-100 completeness score for the validation package a contractor needs.
export function calculateValidationCompleteness(data: any): { score: number; gaps: string[] } {
  const gaps: string[] = [];
  let score = 0;
  const realSpecs = data.specs && String(data.specs).trim() &&
    !String(data.specs).toLowerCase().startsWith('not available on source');
  if (realSpecs) score += 20; else gaps.push('specs');
  const hasPlans = data.plans_url || (Array.isArray(data.documents) && data.documents.some((d: any) => d.type === 'plans'));
  if (hasPlans) score += 15; else gaps.push('drawings');
  const realContact = data.contract_info && String(data.contract_info).trim() &&
    !String(data.contract_info).toLowerCase().startsWith('not available on source');
  if (realContact) score += 15; else gaps.push('contact info');
  if (data.value != null && Number(data.value) > 0) score += 15; else gaps.push('value');
  if (data.bid_due_date) score += 10; else gaps.push('bid due date');
  const realAddress = data.address && String(data.address).trim() &&
    !String(data.address).toLowerCase().startsWith('not available on source');
  if (realAddress) score += 10; else gaps.push('address');
  if (data.client_name && !String(data.client_name).toLowerCase().startsWith('not available on source')) score += 5;
  else gaps.push('client name');
  // Takeoff-critical measurements — mandatory for flooring takeoff.
  if (data.square_footage != null && Number(data.square_footage) > 0) score += 5;
  else gaps.push('square footage');
  if (data.floor_finish && String(data.floor_finish).trim() &&
    !String(data.floor_finish).toLowerCase().startsWith('not available on source')) score += 5;
  else gaps.push('floor finish');
  return { score: Math.min(100, score), gaps };
}

// Auto-enrich a lead by fetching its source URL and extracting missing project
// details (specs, contract info, client name, value, bid due date, address, document links) via LLM.
export async function enrichLeadData(client: any, data: {
  title: string;
  description?: string;
  source_url?: string;
  jurisdiction?: string;
  authority?: string;
}): Promise<{
  specs?: string;
  contract_info?: string;
  client_name?: string;
  value?: number | null;
  bid_due_date?: string | null;
  address?: string;
  documents?: { name: string; url: string; type: string }[];
  plans_url?: string;
  prebid_meeting_date?: string | null;
  square_footage?: number | null;
  floor_finish?: string;
}> {
  let pageText = '';
  let documents: { name: string; url: string; type: string }[] = [];
  if (data.source_url) {
    try {
      const res = await fetch(data.source_url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(12000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
      });
      const html = await res.text();
      // Extract document links BEFORE stripping HTML tags
      documents = extractDocumentLinks(html, data.source_url!);
      pageText = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .slice(0, 8000);
    } catch {}
  }

  // No source content means no enrichment. AUTOLEADS does not use open-ended web search
  // to fill missing value, deadlines, contacts, specifications, or addresses.
  if (!pageText || pageText.length < 200) return { documents };

  const contextPrompt = `From the following page content extracted from the authoritative source, extract only details explicitly present on the page. Do not infer or fill missing facts.`;
  const pageSection = `\n\nPAGE CONTENT:\n${pageText}`;

  try {
    const extracted = await client.integrations.Core.InvokeLLM({
      prompt: `${contextPrompt} Return JSON with:
- specs: scope of work, materials, key requirements (readable string, 2-4 sentences). If the page only links to downloadable specs, describe what the specs cover and note "see linked documents for full specifications".
- contract_info: owner/contact name, email, phone, address if present, else "Not listed on source"
- client_name: the owner/client name if present, else null
- value: the published project value as a number, or null if not stated
- bid_due_date: YYYY-MM-DD if stated, else null
- prebid_meeting_date: ISO datetime if a pre-bid meeting or site walk is scheduled, else null
- address: project site address if present, else null
- square_footage: total square footage of the floor area to be finished, as a number, if stated on the page (e.g. 4500 for 4,500 SF). null if not stated.
- floor_finish: the specified finished floor finish type if stated (e.g. "epoxy", "polished concrete", "VCT", "LVT", "polyaspartic", "urethane cement", "carpet tile"). null if not stated.${pageSection}`,
      response_json_schema: {
        type: 'object',
        properties: {
          specs: { type: 'string' },
          contract_info: { type: 'string' },
          client_name: { type: 'string' },
          value: { type: 'number' },
          bid_due_date: { type: 'string' },
          prebid_meeting_date: { type: 'string' },
          address: { type: 'string' },
          square_footage: { type: 'number' },
          floor_finish: { type: 'string' },
        },
      },
    });
    const plansDoc = documents.find(d => d.type === 'plans');
    return {
      ...extracted,
      documents,
      plans_url: plansDoc?.url || undefined,
    };
  } catch {
    return { documents };
  }
}

// Historical compatibility shim. AUTOLEADS no longer estimates a project value or quantity
// when the authoritative source did not publish one.
export async function autoEstimateValue(_client: any, _data: any): Promise<number | null> {
  return null;
}

// Create a Project record from scraped data, with dedup + mandatory-field enforcement.
// MANDATE: a lead must have real specs OR document links (plans/specs downloads).
// Leads with neither are rejected — a contractor cannot validate a project with no scope and no drawings.
export async function createProject(client: any, data: {
  title: string;
  description?: string;
  specs?: string;
  contract_info?: string;
  client_name?: string;
  authority?: string;
  jurisdiction?: string;
  value?: number | null;
  bid_due_date?: string | null;
  source_url?: string;
  source_id?: string;
  project_type?: string;
  trade?: string;
  address?: string;
  confidence?: number;
  verification_status?: string;
  documents?: { name: string; url: string; type: string }[];
  plans_url?: string;
  prebid_meeting_date?: string | null;
  square_footage?: number | null;
  floor_finish?: string;
  organization_id?: string;
  service_area_states?: string[];
  manual_override?: boolean;
}): Promise<{ created: boolean; reason?: string }> {
  const key = normalizeTitle(data.title);
  if (!key) return { created: false, reason: 'empty title' };

  // Mandatory-field gate: reject leads that lack the data needed to identify them.
  for (const field of MANDATORY_LEAD_FIELDS) {
    const val = (data as any)[field];
    if (!val || !String(val).trim()) {
      return { created: false, reason: `missing mandatory field: ${field}` };
    }
  }

  // LOCATION ELIGIBILITY INVARIANT — enforced at ingestion (Layer 3).
  // Every opportunity receives a location eligibility result. Out-of-area
  // opportunities are suppressed (not hard-deleted) so source intelligence is preserved.
  const serviceStates = data.service_area_states && data.service_area_states.length > 0
    ? data.service_area_states.map((s: string) => s.toUpperCase())
    : [];
  let locationResult: LocationResult | null = null;
  if (serviceStates.length > 0) {
    locationResult = isOpportunityInServiceArea(
      serviceStates,
      data.jurisdiction || '',
      data.address || '',
      data.manual_override || false
    );
    // Out-of-service-area: suppress ingestion. Do NOT hard-delete — just reject this create.
    // The source intelligence is preserved by the source adapter; this org simply doesn't get the record.
    if (locationResult.eligibility === 'OUT_OF_SERVICE_AREA') {
      return { created: false, reason: `out_of_service_area: ${locationResult.explanation}` };
    }
  }

  // Trade relevance filter
  const tradeKeywords = await loadTradeKeywords(client, data.organization_id);
  if (tradeKeywords.length > 0 && data.project_type !== 'permit') {
    const hay = `${data.title || ''} ${data.description || ''} ${data.specs || ''}`.toLowerCase();
    const matches = tradeKeywords.some(kw => hay.includes(kw));
    if (!matches) data.confidence = Math.min(data.confidence || 0.5, 0.5);
  }

  const existing = await client.entities.Project.filter({ organization_id: data.organization_id, source_url: data.source_url }).catch(() => []);
  if (existing && existing.length > 0) return { created: false, reason: 'duplicate source_url' };

  // Cross-source dedup
  const normKey = normalizeTitle(data.title);
  if (normKey && data.jurisdiction) {
    const sameJuris = await client.entities.Project.filter({ organization_id: data.organization_id, jurisdiction: data.jurisdiction }).catch(() => []);
    if (sameJuris && sameJuris.some((p: any) => normalizeTitle(p.title) === normKey)) {
      return { created: false, reason: 'duplicate title+jurisdiction' };
    }
  }

  // Auto-enrich: fetch the source and extract extended fields + document links
  // Enrichment is mandatory for takeoff-critical fields: specs, square footage,
  // and finished floor finish must always be attempted from the source page.
  const needsEnrichment = !data.specs || !data.contract_info || !data.client_name ||
    !data.address || data.value == null || !data.bid_due_date || !data.documents?.length ||
    data.square_footage == null || !data.floor_finish;
  if (needsEnrichment) {
    try {
      const enriched = await enrichLeadData(client, {
        title: data.title,
        description: data.description,
        source_url: data.source_url,
        jurisdiction: data.jurisdiction,
        authority: data.authority,
      });
      if (!data.specs && enriched.specs) data.specs = enriched.specs;
      if (!data.contract_info && enriched.contract_info) data.contract_info = enriched.contract_info;
      if (!data.client_name && enriched.client_name) data.client_name = enriched.client_name;
      if (!data.address && enriched.address) data.address = enriched.address;
      if (data.value == null && enriched.value != null) data.value = enriched.value;
      if (!data.bid_due_date && enriched.bid_due_date) data.bid_due_date = enriched.bid_due_date;
      if (!data.documents?.length && enriched.documents?.length) data.documents = enriched.documents;
      if (!data.plans_url && enriched.plans_url) data.plans_url = enriched.plans_url;
      if (!data.prebid_meeting_date && enriched.prebid_meeting_date) data.prebid_meeting_date = enriched.prebid_meeting_date;
      if (data.square_footage == null && enriched.square_footage != null) data.square_footage = enriched.square_footage;
      if (!data.floor_finish && enriched.floor_finish) data.floor_finish = enriched.floor_finish;
    } catch {}
  }

  // MANDATE GATE: reject leads with no real specs AND no document links.
  // A contractor cannot validate a project with no scope of work and no way to get drawings.
  if (!hasActionableSpecsOrDocs(data)) {
    return { created: false, reason: 'rejected: no specs and no document/drawing links found on source' };
  }

  // Calculate validation completeness
  const { score, gaps } = calculateValidationCompleteness(data);
  data.validation_completeness = score;
  const validation_gaps = gaps.join(', ');

  // Determine verification status: only 'verified' when the full package is present.
  let vStatus = data.verification_status || 'unverified';
  if (score >= 85) vStatus = 'verified';
  else if (gaps.includes('specs') && gaps.includes('drawings')) vStatus = 'failed';
  else vStatus = 'incomplete';

  // Fill remaining gaps with clear placeholders (only for non-critical contact fields)
  const placeholder = 'Not available on source — run Verify for deeper search';
  if (!data.contract_info || !String(data.contract_info).trim()) data.contract_info = placeholder;
  if (!data.client_name || !String(data.client_name).trim()) data.client_name = data.authority || placeholder;
  if (!data.address || !String(data.address).trim()) data.address = data.jurisdiction || placeholder;

  // MANDATORY: capture the original source HTML and translate it into a
  // human-readable document. Every scraped project must carry its original
  // source data plus a readable translation — no exceptions.
  let sourceRawHtml = '';
  let sourceReadableDocument = '';
  let sourceTemplateType = 'generic';
  if (data.source_url) {
    try {
      const translated = await captureAndTranslateSource(client, data.source_url);
      if (translated) {
        sourceRawHtml = translated.raw_html;
        sourceReadableDocument = translated.readable_document;
        sourceTemplateType = translated.template_type;
      }
    } catch {}
  }

  // HARD MANDATE: a project WITHOUT a human-readable source document is rejected.
  // 100% of projects that enter the app must carry their original source data
  // translated into a readable document — no exceptions, no fallbacks.
  if (!sourceReadableDocument || !sourceReadableDocument.trim()) {
    return { created: false, reason: 'rejected: mandatory human-readable source document could not be produced' };
  }

  try {
    await client.entities.Project.create({
      organization_id: data.organization_id || '',
      title: data.title,
      description: data.description || '',
      specs: data.specs,
      contract_info: data.contract_info,
      client_name: data.client_name,
      authority: data.authority || '',
      jurisdiction: data.jurisdiction || '',
      value: data.value ?? null,
      bid_due_date: data.bid_due_date || null,
      source_url: data.source_url || '',
      source_id: data.source_id || '',
      project_type: data.project_type || '',
      trade: data.trade || '',
      address: data.address,
      confidence: data.confidence || 0.8,
      plans_url: data.plans_url || '',
      documents: data.documents || [],
      prebid_meeting_date: data.prebid_meeting_date || null,
      square_footage: data.square_footage ?? null,
      floor_finish: data.floor_finish || '',
      validation_completeness: score,
      validation_gaps,
      verification_status: vStatus,
      verified_date: new Date().toISOString(),
      stage: 'qualification',
      data_class: 'production',
      location_eligibility: locationResult?.eligibility || 'UNKNOWN_LOCATION',
      location_explanation: locationResult?.explanation || 'Service area not checked at ingestion.',
      detected_state: locationResult?.detectedState || '',
      source_raw_html: sourceRawHtml,
      source_readable_document: sourceReadableDocument,
      source_template_type: sourceTemplateType,
      source_translated_at: sourceReadableDocument ? new Date().toISOString() : '',
    });
    return { created: true };
  } catch (e: any) {
    return { created: false, reason: e?.message || 'create failed' };
  }
}

// Update a ScrapeSource record after a scrape run
export async function updateSourceStatus(client: any, sourceId: string, result: {
  success: boolean;
  recordsRetrieved: number;
  error?: string;
}): Promise<void> {
  try {
    const updates: any = {
      last_run_date: new Date().toISOString(),
      records_retrieved: result.recordsRetrieved,
    };
    if (result.success) {
      updates.status = 'active';
      updates.last_success_date = new Date().toISOString();
      updates.error_count = 0;
      updates.last_error = '';
    } else {
      updates.status = 'error';
      updates.error_count = { $inc: 1 };
      updates.last_error = result.error || 'Unknown error';
    }
    await client.entities.ScrapeSource.update(sourceId, updates);
  } catch {}
}

// Find a ScrapeSource by name (for linking projects to sources)
export async function findSourceByName(client: any, name: string): Promise<any | null> {
  try {
    const sources = await client.entities.ScrapeSource.filter({ name });
    return (sources || [])[0] || null;
  } catch {
    return null;
  }
}