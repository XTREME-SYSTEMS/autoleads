import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { body, authorized } = await authenticate(req, base44);
    const slug = body.slug;

    if (!slug) return Response.json({ error: 'Missing slug' }, { status: 400 });

    // Public access for published apps; auth required for unpublished
    const filter = authorized ? { share_slug: slug } : { share_slug: slug, is_published: true };
    const apps = await base44.asServiceRole.entities.ContractorApp.filter(filter);
    if (!apps || apps.length === 0) return Response.json({ error: 'Not found' }, { status: 404 });

    const app = apps[0];
    const images = await base44.asServiceRole.entities.ProjectImage.filter({ organization_id: app.organization_id });

    return Response.json({ app, images: images || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}