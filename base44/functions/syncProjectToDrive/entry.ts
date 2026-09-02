import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// syncProjectToDrive — creates a Google Drive folder structure for each
// project with subfolders for Plans, Specs, Addenda, Proposals, Change
// Orders, and Correspondence. Creates a project summary doc in the root.
// Autonomous folder + file creation for complete project data organization.

const DRIVE_CONNECTOR_ID = '69db1e5e75a5f8c15c80cf34';

async function getAccessToken(base44: any): Promise<string> {
  const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(DRIVE_CONNECTOR_ID);
  return conn.accessToken;
}

async function driveApi(path: string, accessToken: string, method = 'GET', body?: any): Promise<any> {
  const res = await fetch(`https://www.googleapis.com/drive/v3${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Drive API error');
  return data;
}

async function createFolder(accessToken: string, name: string, parentId?: string): Promise<string> {
  const body: any = { name, mimeType: 'application/vnd.google-apps.folder' };
  if (parentId) body.parents = [parentId];
  const folder = await driveApi('/files', accessToken, 'POST', body);
  return folder.id;
}

async function createDoc(accessToken: string, name: string, content: string, parentId: string): Promise<string> {
  // Create a Google Doc with the content
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: name }),
  });
  const doc = await createRes.json();
  if (!createRes.ok) throw new Error(doc.error?.message || 'Doc creation failed');

  // Add content to the doc
  await fetch(`https://docs.googleapis.com/v1/documents/${doc.documentId}:batchUpdate`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        insertText: { location: { index: 1 }, text: content }
      }]
    }),
  });

  // Move to the project folder
  await driveApi(`/files/${doc.documentId}?addParents=${parentId}&removeParents=root`, accessToken, 'PATCH', {});
  return doc.documentId;
}

async function syncOneProject(client: any, project: any, accessToken: string): Promise<any> {
  // Check if we already synced this project to Drive
  const existing = await client.entities.PipelineEvent.filter({
    project_id: project.id, event_type: 'drive_synced'
  }).catch(() => []);
  const existingSync = (existing || []).find((e: any) => e.message?.includes('folderId:'));

  let rootFolderId: string;

  if (existingSync) {
    rootFolderId = existingSync.message?.match(/folderId:(\S+)/)?.[1] || '';
  } else {
    // Create root project folder
    const folderName = `${project.title?.slice(0, 80) || 'Project'} - ${project.id.slice(-6)}`;
    rootFolderId = await createFolder(accessToken, folderName);

    // Create subfolders
    const subfolders = ['Plans & Drawings', 'Specifications', 'Addenda', 'Proposals & Bids', 'Change Orders', 'Correspondence', 'Photos'];
    const subfolderIds: any = {};
    for (const sf of subfolders) {
      try { subfolderIds[sf] = await createFolder(accessToken, sf, rootFolderId); } catch {}
    }

    // Create project summary doc
    const summaryContent = `
PROJECT SUMMARY
===============

Title: ${project.title}
Authority: ${project.authority || 'N/A'}
Client: ${project.client_name || 'N/A'}
Jurisdiction: ${project.jurisdiction || 'N/A'}
Value: ${project.value ? '$' + Number(project.value).toLocaleString() : 'TBD'}
Bid Due Date: ${project.bid_due_date || 'N/A'}
Trade: ${project.trade || 'N/A'}
Project Type: ${project.project_type || 'N/A'}

DESCRIPTION:
${project.description || 'N/A'}

SPECS:
${project.specs || 'N/A'}

CONTRACT INFO:
${project.contract_info || 'N/A'}

SOURCE URL: ${project.source_url || 'N/A'}
PLANS URL: ${project.plans_url || 'N/A'}

View in AUTOLEADS: https://autoleads.base44.app/projects/${project.id}
`.trim();

    try { await createDoc(accessToken, 'Project Summary', summaryContent, rootFolderId); } catch {}
  }

  // Record the sync
  if (!existingSync) {
    await client.entities.PipelineEvent.create({
      organization_id: project.organization_id,
      project_id: project.id,
      step: 'contract', status: 'completed', event_type: 'drive_synced',
      message: `Google Drive folder created. folderId:${rootFolderId}`,
      occurred_at: new Date().toISOString(),
    }).catch(() => null);
  }

  return { projectId: project.id, status: 'synced', folderId: rootFolderId };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let accessToken: string;
    try {
      accessToken = await getAccessToken(base44);
    } catch {
      return Response.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    const ctx = await resolveUserOrgs(client, user.id);
    if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });

    const projectId = body?.project_id;
    let projects: any[];
    if (projectId) {
      projects = [await client.entities.Project.get(projectId).catch(() => null)].filter(Boolean);
    } else {
      projects = await client.entities.Project.filter({ organization_id: ctx.primaryOrgId }, '-created_date', 50).catch(() => []);
      projects = (projects || []).filter((p: any) => !['lost'].includes(p.stage));
    }

    const results: any[] = [];
    for (const project of projects.slice(0, 20)) {
      try {
        const r = await syncOneProject(client, project, accessToken);
        results.push(r);
      } catch (e: any) {
        results.push({ projectId: project.id, status: 'error', error: e.message });
      }
    }

    const synced = results.filter(r => r.status === 'synced').length;
    return Response.json({ success: true, synced, total: projects.length, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Drive sync failed' }, { status: 500 });
  }
}