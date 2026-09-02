import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

const ROOT_FOLDER_ID = '1qtcyUc9Xj2R8u5DHXbAK_QwXCG1jFORt';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const folderId = body.folder_id || ROOT_FOLDER_ID;

    // List children of the folder
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${folderId}' in parents and trashed=false`)}&fields=files(id,name,mimeType,modifiedTime,size)&pageSize=200&orderBy=folder,name`;
    const listRes = await fetch(listUrl, { headers: authHeader });
    if (!listRes.ok) {
      const txt = await listRes.text();
      return Response.json({ error: 'drive_list_failed', details: txt }, { status: 502 });
    }
    const listData = await listRes.json();
    const files = (listData.files || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      mimeType: f.mimeType,
      modifiedTime: f.modifiedTime,
      size: f.size,
      isFolder: f.mimeType === 'application/vnd.google-apps.folder',
    }));

    return Response.json({ folderId, count: files.length, files });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}