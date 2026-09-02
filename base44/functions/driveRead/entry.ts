import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const fileId = body.file_id;
    if (!fileId) return Response.json({ error: 'file_id required' }, { status: 400 });

    // Get metadata first
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType,size`,
      { headers: authHeader }
    );
    if (!metaRes.ok) {
      return Response.json({ error: 'meta_failed', details: await metaRes.text() }, { status: 502 });
    }
    const meta = await metaRes.json();

    // Download content (alt=media)
    const contentRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: authHeader }
    );
    if (!contentRes.ok) {
      return Response.json({ error: 'download_failed', details: await contentRes.text() }, { status: 502 });
    }
    const content = await contentRes.text();

    return Response.json({
      name: meta.name,
      mimeType: meta.mimeType,
      size: meta.size,
      content,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}