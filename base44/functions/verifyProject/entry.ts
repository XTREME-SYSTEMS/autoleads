import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { extractDocumentLinks, calculateValidationCompleteness } from '../../shared/scrapeUtils.ts';

async function fetchPageHtml(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      }
    });
    const html = await res.text();
    if (!html || html.length < 200) return '';
    return html;
  } catch {
    return '';
  }
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const projectId = body.project_id;
    if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 });

    const project = await client.entities.Project.get(projectId);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    let pageText = '';
    let documents = [];
    if (project.source_url) {
      const html = await fetchPageHtml(project.source_url);
      if (html) {
        documents = extractDocumentLinks(html, project.source_url);
        pageText = html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
          .replace(/<style[\s\S]*?<\/style>/gi, ' ')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .slice(0, 8000);
      }
    }

    const useWebSearch = !pageText;
    const contextPrompt = useWebSearch
      ? `Search the web for this construction project and extract REAL details. Project: "${project.title}" in ${project.jurisdiction || 'unknown location'}. Only return data from actual sources — do not fabricate.`
      : `From the following page content extracted from a construction bid posting, extract the REAL project details. Be accurate — only use information actually present on the page.`;

    const pageSection = useWebSearch ? '' : `\n\nPAGE CONTENT:\n${pageText}`;

    const extracted = await client.integrations.Core.InvokeLLM({
      prompt: `${contextPrompt} Return JSON with:
- description: 2-4 sentence project summary
- specs: scope of work, materials, key requirements (as a readable string). If the page only links to downloadable specs, describe what the specs cover and note "see linked documents for full specifications".
- contract_info: owner/contact name, email, phone, address if present, else "Not listed on source"
- value: the actual published project value as a number, or null if not stated
- bid_due_date: YYYY-MM-DD if stated, else null
- client_name: the owner/client name if present, else null
- project_type: commercial/residential/municipal/industrial/renovation if determinable, else null
- jurisdiction: city, state if determinable, else null
- prebid_meeting_date: ISO datetime if a pre-bid meeting or site walk is scheduled, else null${pageSection}`,
      response_json_schema: {
        type: 'object',
        properties: {
          description: { type: 'string' }, specs: { type: 'string' }, contract_info: { type: 'string' },
          value: { type: 'number' }, bid_due_date: { type: 'string' }, client_name: { type: 'string' },
          project_type: { type: 'string' }, jurisdiction: { type: 'string' }, prebid_meeting_date: { type: 'string' }
        }
      },
      ...(useWebSearch ? { add_context_from_internet: true, model: 'gemini_3_flash' } : {})
    });

    if (!pageText && !extracted?.description && documents.length === 0) {
      await client.entities.Project.update(projectId, { verification_status: 'failed' });
      return Response.json({ error: 'No source URL and web search found no data', verification_status: 'failed' }, { status: 502 });
    }

    // Merge document links: keep existing + add newly found (dedup by URL)
    const existingDocs = Array.isArray(project.documents) ? project.documents : [];
    const allDocs = [...existingDocs];
    const seenUrls = new Set(allDocs.map(d => d.url));
    for (const d of documents) {
      if (!seenUrls.has(d.url)) { allDocs.push(d); seenUrls.add(d.url); }
    }
    const plansDoc = allDocs.find(d => d.type === 'plans');

    const update = {
      description: extracted?.description || project.description || '',
      specs: extracted?.specs || project.specs || '',
      contract_info: extracted?.contract_info || project.contract_info || '',
      documents: allDocs,
      plans_url: plansDoc?.url || project.plans_url || '',
      verification_status: 'verified',
      verified_date: new Date().toISOString(),
    };
    const real = (v) => v && v !== 'null' && v !== 'N/A' && v !== 'Not listed on source' ? v : undefined;
    if (typeof extracted?.value === 'number' && extracted.value > 0) update.value = extracted.value;
    if (real(extracted?.bid_due_date)) update.bid_due_date = extracted.bid_due_date;
    if (real(extracted?.client_name)) update.client_name = extracted.client_name;
    if (real(extracted?.project_type)) update.project_type = extracted.project_type;
    if (real(extracted?.jurisdiction) && !project.jurisdiction) update.jurisdiction = extracted.jurisdiction;
    if (real(extracted?.prebid_meeting_date)) update.prebid_meeting_date = extracted.prebid_meeting_date;

    // Recalculate validation completeness
    const { score, gaps } = calculateValidationCompleteness(update);
    update.validation_completeness = score;
    update.validation_gaps = gaps.join(', ');
    if (gaps.includes('specs') && gaps.includes('drawings')) {
      update.verification_status = 'failed';
    } else if (gaps.length > 1) {
      update.verification_status = 'incomplete';
    }

    await client.entities.Project.update(projectId, update);

    return Response.json({ success: true, project_id: projectId, verification_status: update.verification_status, validation_completeness: score, validation_gaps: gaps, documents_found: allDocs.length, updated_fields: Object.keys(update), source: useWebSearch ? 'web_search' : 'source_url' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}