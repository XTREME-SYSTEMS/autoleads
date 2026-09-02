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
    const offset = Number(body.offset || 0);
    const length = Number(body.length || 4000);
    if (!fileId) return Response.json({ error: 'file_id required' }, { status: 400 });

    const contentRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: authHeader }
    );
    if (!contentRes.ok) {
      return Response.json({ error: 'download_failed', details: await contentRes.text() }, { status: 502 });
    }
    const fullText = await contentRes.text();
    const chunk = fullText.slice(offset, offset + length);
    const totalSize = fullText.length;

    return Response.json({
      totalSize,
      offset,
      length: chunk.length,
      hasMore: offset + chunk.length < totalSize,
      content: chunk,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}