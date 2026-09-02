import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, scopedFilter } from '../../shared/orgContext.ts';
import { captureAndTranslateSource } from '../../shared/sourceTranslator.ts';
import { buildProjectSourcePdf } from '../../shared/sourcePdfBuilder.ts';

// generateSourcePdfs — batch translator that turns every scraped project's
// source data into a clean, human-readable PDF document.
//
// For each project (org-scoped, no cross-tenant access):
//   1. Ensure a human-readable source document exists (translate from the
//      raw source URL if missing).
//   2. Build a PDF from the readable document + specs + scope of work.
//   3. Upload the PDF and store its URL on the project.
//
// Pass { force: true } to regenerate PDFs that already have one.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const force = Boolean(body?.force);
    const limit = Math.min(Number(body?.limit) || 250, 250);

    const totals = { organizations: 0, scanned: 0, pdfs: 0, translated: 0, failed: 0, errors: [] as string[] };

    await forEachOrganization(client, async (org: any) => {
      totals.organizations++;
      const orgId = org.id;
      const projects = await client.entities.Project.filter(scopedFilter(orgId), '-created_date', limit).catch(() => []);
      for (const project of (projects || [])) {
        totals.scanned++;
        try {
          // 1. Ensure a readable source document exists.
          let readableDoc = String(project.source_readable_document || '').trim();
          if (!readableDoc && project.source_url) {
            const translated = await captureAndTranslateSource(client, project.source_url);
            if (translated && translated.readable_document) {
              readableDoc = translated.readable_document;
              await client.entities.Project.update(project.id, {
                source_raw_html: translated.raw_html,
                source_readable_document: translated.readable_document,
                source_template_type: translated.template_type,
                source_translated_at: new Date().toISOString(),
              }).catch(() => null);
              totals.translated++;
            }
          }

          if (!readableDoc) {
            totals.failed++;
            continue;
          }

          // Skip if a PDF already exists and we're not forcing a rebuild.
          if (!force && project.source_pdf_url) {
            continue;
          }

          // 2. Build the PDF bytes from the readable document + specs + scope.
          const pdfBytes = buildProjectSourcePdf({
            ...project,
            source_readable_document: readableDoc,
          });

          // 3. Upload the PDF and store the URL on the project.
          const filename = `source-${String(project.id).slice(0, 12)}.pdf`;
          const file = new File([pdfBytes], filename, { type: 'application/pdf' });
          const upload: any = await client.integrations.Core.UploadFile({ file });
          const fileUrl = upload?.file_url || '';
          if (!fileUrl) {
            totals.failed++;
            continue;
          }

          await client.entities.Project.update(project.id, {
            source_pdf_url: fileUrl,
            source_pdf_generated_at: new Date().toISOString(),
          }).catch(() => null);
          totals.pdfs++;
        } catch (e: any) {
          totals.failed++;
          if (totals.errors.length < 10) totals.errors.push(`${project.id}: ${e?.message || 'unknown'}`);
        }
      }
      return null;
    });

    return Response.json({
      success: true,
      ...totals,
      errors: totals.errors.slice(0, 10),
    });
  } catch (error: any) {
    console.error('generateSourcePdfs error:', error);
    return Response.json({ error: error?.message || 'generateSourcePdfs failed' }, { status: 500 });
  }
}