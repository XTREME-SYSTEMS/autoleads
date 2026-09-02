import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// setupOrganization — creates an Organization + owner membership for a new user.
// Called during onboarding. Returns existing org if user already has one.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Authentication required' }, { status: 401 });

    // Check if user already has an org
    const ctx = await resolveUserOrgs(base44, user.id);
    if (ctx.orgIds.length > 0) {
      const org = await base44.entities.Organization.get(ctx.primaryOrgId).catch(() => null);
      return Response.json({ success: true, organization: org, already_exists: true, memberships: ctx.memberships });
    }

    // Create new organization
    const name = String(body?.name || user.full_name || 'My Company').trim();
    if (!name) return Response.json({ error: 'Organization name is required' }, { status: 400 });

    const org = await base44.entities.Organization.create({
      name,
      owner_user_id: user.id,
      trade: body?.trade || '',
      website: body?.website || '',
      phone: body?.phone || '',
      email: user.email || '',
      address: body?.address || '',
      city: body?.city || '',
      state: body?.state || '',
      zip: body?.zip || '',
      plan: 'free',
      subscription_status: 'none',
      setup_complete: false,
    });

    // Create owner membership
    const membership = await base44.entities.OrganizationMembership.create({
      organization_id: org.id,
      organization_name: org.name,
      user_id: user.id,
      user_email: user.email,
      role: 'owner',
      status: 'active',
      invited_date: new Date().toISOString(),
      accepted_date: new Date().toISOString(),
    });

    // Update the user's organization_ids and active_organization_id via updateMe
    try {
      await base44.auth.updateMe({
        organization_ids: [org.id],
        active_organization_id: org.id,
      });
    } catch (e) {
      console.error('Failed to update user org_ids:', e?.message || e);
    }

    return Response.json({
      success: true,
      organization: org,
      membership,
      created: true,
      message: 'Organization created. Complete the remaining setup steps to activate your pipeline.',
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Organization setup failed' }, { status: 500 });
  }
}