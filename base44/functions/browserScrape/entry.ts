import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createProject, updateSourceStatus } from '../../shared/scrapeUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';
import { browserWorkerFetch } from '../../shared/browserWorkerClient.ts';

async function directFetch(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AUTOLEADS-SourceValidator/1.0; +https://autoleads.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) return '';
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 30000);
  } catch {
    return '';
  }
}

function isSafeUrl(raw: string): boolean {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.localhost')) return false;
  if (host === '169.254.169.254' || host === 'metadata.google.internal') return false;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a,b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a===0 || a===10 || a===127 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&b===168) || a>=224) return false;
  }
  if (host === '::1' || host === '[::1]' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd')) return false;
  return true;
}

async function parseProjectsFromContent(client: any, content: string, sourceName: string, sourceUrl: string, trade: string): Promise<any[]> {
  if (!content || content.length < 200) return [];
  try {
    const res = await client.integrations.Core.InvokeLLM({
      prompt: `Extract construction procurement opportunities that are EXPLICITLY PRESENT in this source page from ${sourceName}. Return only evidence present in the content. Never infer a bid deadline, value, contact, solicitation number, project scope, or status. If a field is absent, return null/empty. Historical awards, grants, permits, planning signals, and news are not active bid opportunities unless the page explicitly identifies an open solicitation.\n\nCRITICAL DATE RULE — distinguish these date types and NEVER map them interchangeably:\n- BID/LETTING DEADLINE (the actual due date for bid submission) → bid_due_date\n- ADVERTISEMENT DATE (when the solicitation was advertised) → do NOT use as bid_due_date\n- PRE-BID MEETING DATE (mandatory pre-bid meeting) → do NOT use as bid_due_date\n- ADDENDUM DATE (when an addendum was issued) → do NOT use as bid_due_date\n- AWARD DATE (when the contract was awarded) → do NOT use as bid_due_date\nOnly the BID/LETTING DEADLINE goes in bid_due_date. If only a pre-bid, advertisement, or addendum date is visible, return null for bid_due_date.\n\nFor each visible active opportunity return: title, authority, jurisdiction, value (number only when published), bid_due_date (YYYY-MM-DD only when the authoritative bid/letting deadline is published), source_url (direct link if present, otherwise ${sourceUrl}), project_type, description, and confidence (0-1 based only on source completeness).\n\nPAGE CONTENT:\n${content.slice(0, 24000)}`,
      response_json_schema: {
        type:'object', properties:{ opportunities:{ type:'array', items:{ type:'object', properties:{
          title:{type:'string'}, authority:{type:'string'}, jurisdiction:{type:'string'}, value:{type:'number'},
          bid_due_date:{type:'string'}, source_url:{type:'string'}, project_type:{type:'string'}, description:{type:'string'}, confidence:{type:'number'}
        }}}}
      }
    });
    return res?.opportunities || [];
  } catch { return []; }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error:'Unauthorized' }, { status:401 });
    const { sourceId, url, sourceName, trade } = body;
    if (!url) return Response.json({ error:'url is required' }, { status:400 });
    if (!isSafeUrl(url)) return Response.json({ error:'url must be a public http(s) address' }, { status:400 });
    const serviceAreaStates = (body.state || body.service_area_states) ? [String(body.state || (body.service_area_states||[])[0] || '').toUpperCase()].filter(Boolean) : [];

    const worker = await browserWorkerFetch(url, { maxChars:30000, waitMs:2500, maxLinks:250 });
    let content = worker.content;
    let extractionMethod = worker.ok ? 'browserworker' : 'direct_fetch';
    if (!content || content.length < 200) content = await directFetch(url);

    if (!content || content.length < 200) {
      if (sourceId) await updateSourceStatus(client, sourceId, { success:false, recordsRetrieved:0, error:worker.error || 'No content retrieved' });
      return Response.json({
        success:false, extractionMethod, browserWorkerReceipt:worker.receiptId || null,
        workerVersion:worker.workerVersion || null, contentLength:content.length,
        consoleErrors:worker.consoleErrors, networkErrors:worker.networkErrors,
        error:worker.error || 'No content retrieved from URL'
      });
    }

    const opportunities = await parseProjectsFromContent(client, content, sourceName || url, url, trade || 'general construction');
    let created=0, duplicates=0;
    const reasons: string[] = [];
    for (const opp of opportunities) {
      if (!opp.title) continue;
      const result = await createProject(client, {
        organization_id: body?.organization_id,
        title:opp.title, description:opp.description || '', authority:opp.authority || '', jurisdiction:opp.jurisdiction || '',
        value:opp.value ?? null, bid_due_date:opp.bid_due_date || null, source_url:opp.source_url || url, source_id:sourceId || '',
        project_type:opp.project_type || 'bid_opportunity', trade:trade || 'general construction', confidence:opp.confidence || 0.6,
        verification_status:'unverified',
        service_area_states: serviceAreaStates,
      });
      if (result.created) created++; else { duplicates++; if (result.reason) reasons.push(result.reason); }
    }

    if (sourceId) await updateSourceStatus(client, sourceId, {
      success: created>0 || duplicates>0,
      recordsRetrieved:created,
      error: created===0 && duplicates===0 ? 'No explicit active opportunities found on page' : undefined,
    });

    return Response.json({
      success:true, extractionMethod, browserWorkerReceipt:worker.receiptId || null,
      workerVersion:worker.workerVersion || null, contentLength:content.length,
      opportunitiesFound:opportunities.length, created, duplicates, reasons:reasons.slice(0,10),
      consoleErrors:worker.consoleErrors, networkErrors:worker.networkErrors,
    });
  } catch (error: any) {
    return Response.json({ error:error.message }, { status:500 });
  }
}