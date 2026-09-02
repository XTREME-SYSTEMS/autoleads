import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, scopedFilter } from '../../shared/orgContext.ts';
import { captureAndTranslateSource } from '../../shared/sourceTranslator.ts';
import { buildProjectTakeoffPdf } from '../../shared/sourcePdfBuilder.ts';

// compileProjectDocument — for every approved project, compiles the
// human-readable project scope + takeoff measurements into a single
// professional, downloadable PDF document.
//
// A project is "approved" when it has at least one approved takeoff
// (approval_state === 'approved'). Pass { project_id } to compile a single
// project, or { force: true } to regenerate compiled docs that already exist.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const singleProjectId = body?.project_id || null;
    const force = Boolean(body?.force);
    const limit = Math.min(Number(body?.limit) || 200, 200);

    const totals = { compiled: 0, skipped: 0, failed: 0, errors: [] as string[] };

    // Single-project mode
    if (singleProjectId) {
      const project = await client.entities.Project.get(singleProjectId).catch(() => null);
      if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
      const result = await compileOne(client, project, force);
      if (result.ok) totals.compiled++; else { totals.failed++; totals.errors.push(result.error || 'unknown'); }
      return Response.json({ success: true, ...totals, project_id: singleProjectId, compiled_pdf_url: result.url || null });
    }

    // Batch mode — iterate every organization (no cross-tenant access)
    await forEachOrganization(client, async (org: any) => {
      const projects = await client.entities.Project.filter(scopedFilter(org.id), '-created_date', limit).catch(() => []);
      for (const project of (projects || [])) {
        const result = await compileOne(client, project, force);
        if (result.ok) totals.compiled++;
        else if (result.skipped) totals.skipped++;
        else { totals.failed++; if (totals.errors.length < 10) totals.errors.push(`${project.id}: ${result.error}`); }
      }
      return null;
    });

    return Response.json({ success: true, ...totals, errors: totals.errors.slice(0, 10) });
  } catch (error: any) {
    console.error('compileProjectDocument error:', error);
    return Response.json({ error: error?.message || 'compileProjectDocument failed' }, { status: 500 });
  }
}

async function compileOne(client: any, project: any, force: boolean): Promise<{ ok: boolean; skipped?: boolean; url?: string; error?: string }> {
  try {
    // Only compile approved projects (at least one approved takeoff)
    const takeoffs = await client.entities.Takeoff.filter({ project_id: project.id }).catch(() => []);
    const approvedTakeoffs = (takeoffs || []).filter((t: any) => t.approval_state === 'approved' || t.reviewer_decision === 'approved');
    if (approvedTakeoffs.length === 0) return { ok: false, skipped: true };

    if (!force && project.compiled_pdf_url) return { ok: false, skipped: true };

    // Ensure a readable source document exists
    let readableDoc = String(project.source_readable_document || '').trim();
    if (!readableDoc && project.source_url) {
      const translated = await captureAndTranslateSource(client, project.source_url);
      if (translated && translated.readable_document) {
        readableDoc = translated.readable_document;
        await client.entities.Project.update(project.id, {
          source_readable_document: translated.readable_document,
          source_template_type: translated.template_type,
          source_translated_at: new Date().toISOString(),
        }).catch(() => null);
      }
    }

    const pdfBytes = buildProjectTakeoffPdf({ ...project, source_readable_document: readableDoc }, approvedTakeoffs);
    const filename = `compiled-${String(project.id).slice(0, 12)}.pdf`;
    const file = new File([pdfBytes], filename, { type: 'application/pdf' });
    const upload: any = await client.integrations.Core.UploadFile({ file });
    const fileUrl = upload?.file_url || '';
    if (!fileUrl) return { ok: false, error: 'upload returned no url' };

    await client.entities.Project.update(project.id, {
      compiled_pdf_url: fileUrl,
      compiled_pdf_generated_at: new Date().toISOString(),
    }).catch(() => null);
    return { ok: true, url: fileUrl };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'unknown' };
  }
}