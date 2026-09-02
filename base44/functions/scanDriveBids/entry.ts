import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createProject } from '../../shared/scrapeUtils.ts';
import { identifySystemsFromText } from '../../shared/scopeSystemsData.ts';
import { authenticate } from '../../shared/internalAuth.ts';

// scanDriveBids — scans Google Drive for PDF bid documents, extracts project
// scope and system requirements using AI, and creates Project records with
// identified construction systems. Uses the authorized Google Drive connector.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Default to the same Drive folder configured in driveBrowse
    const ROOT_FOLDER_ID = '1qtcyUc9Xj2R8u5DHXbAK_QwXCG1jFORt';
    const folderId = body.folder_id || ROOT_FOLDER_ID;
    const maxFiles = body.max_files || 5;

    // 1. Get Google Drive access token from the authorized connector
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // 2. List PDF files in the folder (most recent first)
    const query = encodeURIComponent(`'${folderId}' in parents and mimeType='application/pdf' and trashed=false`);
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=${maxFiles}&orderBy=modifiedTime desc`;
    const listRes = await fetch(listUrl, { headers: authHeader });
    if (!listRes.ok) {
      return Response.json({ error: 'drive_list_failed', details: await listRes.text() }, { status: 502 });
    }
    const listData = await listRes.json();
    const pdfFiles = (listData.files || []).filter((f: any) => f.mimeType === 'application/pdf');

    if (pdfFiles.length === 0) {
      return Response.json({ success: true, message: 'No PDF files found in folder', scanned: 0, totalCreated: 0, results: [] });
    }

    // 3. Process each PDF: download → upload → extract → identify systems → create project
    const results: any[] = [];
    let totalCreated = 0;

    for (const file of pdfFiles) {
      try {
        // Download the PDF from Google Drive
        const downloadRes = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
          headers: authHeader,
          signal: AbortSignal.timeout(30000),
        });
        if (!downloadRes.ok) {
          results.push({ name: file.name, error: `download_failed_${downloadRes.status}` });
          continue;
        }

        const pdfBlob = await downloadRes.blob();
        const fileObj = new File([pdfBlob], file.name, { type: 'application/pdf' });

        // Upload to Base44 storage so ExtractDataFromUploadedFile can access it
        const uploadResult = await client.integrations.Core.UploadFile({ file: fileObj as any });
        const fileUrl = (uploadResult as any)?.file_url;
        if (!fileUrl) {
          results.push({ name: file.name, error: 'upload_failed' });
          continue;
        }

        // Extract structured project data from the PDF
        const extractResult = await client.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: {
            type: 'object',
            properties: {
              projects: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string', description: 'Project name or bid title' },
                    description: { type: 'string', description: '2-3 sentence summary of the project scope' },
                    specs: { type: 'string', description: 'Technical specifications, system requirements, materials called out' },
                    authority: { type: 'string', description: 'Owner/agency/architect name' },
                    jurisdiction: { type: 'string' },
                    project_type: { type: 'string' },
                    address: { type: 'string' },
                    bid_due_date: { type: 'string' },
                    value: { type: 'number' },
                    confidence: { type: 'number' },
                  },
                },
              },
            },
          },
        });

        const projects = (extractResult as any)?.output?.projects || (extractResult as any)?.projects || [];

        let created = 0;
        const allIdentifiedSystems: string[] = [];

        for (const proj of projects) {
          if (!proj.title) continue;

          // Identify scope systems from the extracted text
          const systemText = `${proj.title} ${proj.description || ''} ${proj.specs || ''}`;
          const identifiedSystems = identifySystemsFromText(systemText);
          const systemsSummary = identifiedSystems.map((s: any) =>
            `${s.system.code} ${s.system.name} (${Math.round(s.confidence * 100)}%)`
          ).join(', ');
          if (systemsSummary) allIdentifiedSystems.push(systemsSummary);

          const result = await createProject(client, {
            title: proj.title,
            description: proj.description || '',
            specs: proj.specs || '',
            authority: proj.authority || '',
            jurisdiction: proj.jurisdiction || '',
            project_type: proj.project_type || 'bid_document',
            address: proj.address || '',
            value: proj.value || null,
            bid_due_date: proj.bid_due_date || null,
            source_url: `https://drive.google.com/file/d/${file.id}/view`,
            source_id: file.id,
            trade: 'general construction',
            confidence: proj.confidence || 0.7,
            verification_status: 'verified',
          });

          if (result.created) {
            created++;
            totalCreated++;
          }
        }

        results.push({
          name: file.name,
          fileId: file.id,
          projectsFound: projects.length,
          created,
          identifiedSystems: allIdentifiedSystems.join('; '),
        });
      } catch (e: any) {
        results.push({ name: file.name, error: e.message });
      }
    }

    if (totalCreated > 0) {
      try {
        await client.entities.Notification.create({
          type: 'opportunity',
          title: `${totalCreated} projects from Drive bid documents`,
          body: `Scanned ${pdfFiles.length} PDF bid documents from Google Drive and found ${totalCreated} new project opportunities with identified construction systems.`,
          priority: 'high',
          linked_route: '/projects',
        });
      } catch {}
    }

    return Response.json({
      success: true,
      scanned: pdfFiles.length,
      totalCreated,
      results,
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}