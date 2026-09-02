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

    // Download the full bundle (cached in memory for this request)
    const contentRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: authHeader }
    );
    if (!contentRes.ok) {
      return Response.json({ error: 'download_failed', details: await contentRes.text() }, { status: 502 });
    }
    const fullText = await contentRes.text();

    // Parse sections: ===== FILE: path ===== ... ===== END FILE =====
    const regex = /===== FILE: (.+?) =====\n([\s\S]*?)===== END FILE =====/g;
    let match;
    const sections: {path: string, content: string}[] = [];
    while ((match = regex.exec(fullText)) !== null) {
      sections.push({ path: match[1].trim(), content: match[2] });
    }

    // If a specific path is requested, return its content (with optional chunking)
    const wantPath = body.path;
    if (wantPath) {
      const section = sections.find(s => s.path === wantPath);
      if (!section) return Response.json({ error: 'path not found', requested: wantPath }, { status: 404 });
      
      const contentOffset = Number(body.content_offset || 0);
      const contentLength = Number(body.content_length || 999999);
      const chunk = section.content.slice(contentOffset, contentOffset + contentLength);
      
      return Response.json({
        path: section.path,
        totalSize: section.content.length,
        contentOffset,
        contentLength: chunk.length,
        hasMore: contentOffset + chunk.length < section.content.length,
        content: chunk,
      });
    }

    // If a specific index is requested
    const index = body.index;
    if (index !== undefined && index !== null) {
      const section = sections[Number(index)];
      if (!section) return Response.json({ error: 'index out of range', totalFiles: sections.length }, { status: 404 });
      
      const contentOffset = Number(body.content_offset || 0);
      const contentLength = Number(body.content_length || 999999);
      const chunk = section.content.slice(contentOffset, contentOffset + contentLength);
      
      return Response.json({
        index: Number(index),
        path: section.path,
        totalSize: section.content.length,
        contentOffset,
        contentLength: chunk.length,
        hasMore: contentOffset + chunk.length < section.content.length,
        content: chunk,
      });
    }

    // Return file list
    return Response.json({
      totalSize: fullText.length,
      totalFiles: sections.length,
      files: sections.map((s, i) => ({ index: i, path: s.path, size: s.content.length })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}