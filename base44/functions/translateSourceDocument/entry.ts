import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { captureAndTranslateSource } from '../../shared/sourceTranslator.ts';

// translateSourceDocument — manual on-demand translator.
// Captures the original source HTML and produces a human-readable markdown
// document using the best-fit standard template. The shared logic lives in
// base44/shared/sourceTranslator.ts and is also invoked mandatorily at
// ingestion (createProject) so every scraped project carries its original
// source data plus a readable translation.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = body.project_id;
    if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 });

    const project = await client.entities.Project.get(projectId);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
    if (!project.source_url) return Response.json({ error: 'Project has no source_url to translate' }, { status: 400 });

    const result = await captureAndTranslateSource(client, project.source_url);
    if (!result) {
      return Response.json({
        error: 'Could not fetch source URL — the original source is unreachable',
        source_url: project.source_url,
      }, { status: 502 });
    }

    await client.entities.Project.update(projectId, {
      source_raw_html: result.raw_html,
      source_readable_document: result.readable_document,
      source_template_type: result.template_type,
      source_translated_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      project_id: projectId,
      template_type: result.template_type,
      confidence: result.confidence,
      raw_html_bytes: result.raw_html.length,
      readable_document_chars: result.readable_document.length,
    });
  } catch (error: any) {
    console.error('translateSourceDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}