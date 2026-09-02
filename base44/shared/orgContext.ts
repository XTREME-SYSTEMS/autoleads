// Organization / multi-tenant context resolver for backend functions.
//
// Provides:
//   - resolveUserOrgs:     the organizations a user belongs to (for app-user calls)
//   - forEachOrganization: iterate every tenant for service-role / scheduled work
//   - requireOrgContext:   validate that a user has an active org membership
//   - scopedFilter:        filter helper that always includes organization_id
//
// Service-role functions MUST NOT use bare .list() or .list()[0] — they cross
// tenant boundaries. Use forEachOrganization + scopedFilter instead.

export interface OrgMembership {
  organization_id: string;
  role: string;
  status: string;
}

export interface OrgContext {
  orgIds: string[];
  primaryOrgId: string | null;
  memberships: OrgMembership[];
}

// Paginate through ALL records of an entity (default list() caps at ~50-200).
// Use this when the full set is needed; prefer scopedFilter when an org is known.
export async function listAll(entity: any, sort = '-created_date', batchSize = 500): Promise<any[]> {
  const all: any[] = [];
  let skip = 0;
  while (true) {
    const batch = await entity.list(sort, batchSize, skip).catch(() => []);
    if (!batch || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < batchSize) break;
    skip += batchSize;
  }
  return all;
}

// Resolve all organizations a user belongs to (active memberships only).
export async function resolveUserOrgs(client: any, userId: string): Promise<OrgContext> {
  const memberships = await client.entities.OrganizationMembership.filter({
    user_id: userId,
    status: 'active'
  }).catch(() => []);
  const active = (memberships || []).filter((m: any) => m.status === 'active');
  const orgIds = active.map((m: any) => m.organization_id).filter(Boolean);
  return {
    orgIds,
    primaryOrgId: orgIds[0] || null,
    memberships: active.map((m: any) => ({
      organization_id: m.organization_id,
      role: m.role,
      status: m.status,
    })),
  };
}

// Require a user to have at least one active org membership.
// Throws a structured error if not — callers should catch and return 403.
export async function requireOrgContext(client: any, user: any): Promise<OrgContext> {
  if (!user) throw { type: 'AUTH_ERROR', message: 'Authentication required' };
  const ctx = await resolveUserOrgs(client, user.id);
  if (ctx.orgIds.length === 0) {
    throw { type: 'AUTHORIZATION_ERROR', message: 'No active organization membership. Setup required.' };
  }
  return ctx;
}

// Check if a user has a specific role in an org.
export function hasOrgRole(ctx: OrgContext, orgId: string, roles: string[]): boolean {
  const m = ctx.memberships.find((m) => m.organization_id === orgId);
  return !!m && roles.includes(m.role);
}

// Iterate every organization in the system for service-role / scheduled work.
// The callback receives each org record and should scope all operations to
// org.id. This is the ONLY safe way to do cross-tenant work as service role.
export async function forEachOrganization(client: any, fn: (org: any) => Promise<any>): Promise<{ processed: number; errors: any[] }> {
  const orgs = await listAll(client.entities.Organization, '-created_date');
  let processed = 0;
  const errors: any[] = [];
  for (const org of orgs) {
    try {
      await fn(org);
      processed++;
    } catch (err) {
      errors.push({ org_id: org.id, org_name: org.name, error: err?.message || String(err) });
    }
  }
  return { processed, errors };
}

// Build a filter object scoped to an organization.
// Always pass the result into entity.filter() — never use bare list() for tenant data.
export function scopedFilter(orgId: string, extra: Record<string, any> = {}): Record<string, any> {
  return { organization_id: orgId, ...extra };
}

// Sync a user's organization_ids array on the User entity to match their active
// memberships. Called after membership changes (invite accept, revoke, etc.).
// Must run as service role (updates another user's data).
export async function syncUserOrgIds(svcClient: any, userId: string): Promise<string[]> {
  const memberships = await svcClient.entities.OrganizationMembership.filter({
    user_id: userId,
    status: 'active'
  }).catch(() => []);
  const orgIds = (memberships || []).map((m: any) => m.organization_id).filter(Boolean);
  try {
    await svcClient.auth.updateUser(userId, { organization_ids: orgIds });
  } catch {
    // Fallback: some SDK versions use a different method name
    try {
      await svcClient.entities.User.update(userId, { organization_ids: orgIds });
    } catch {}
  }
  return orgIds;
}

// Create an organization and set the creator as owner.
// Returns the created org and membership record.
export async function createOrganizationForUser(
  client: any,
  user: any,
  orgData: { name: string; trade?: string; website?: string; phone?: string; address?: string; city?: string; state?: string; zip?: string }
): Promise<{ org: any; membership: any }> {
  if (!user) throw { type: 'AUTH_ERROR', message: 'Authentication required' };
  const org = await client.entities.Organization.create({
    ...orgData,
    owner_user_id: user.id,
    plan: 'free',
    subscription_status: 'none',
    setup_complete: false,
  });
  const membership = await client.entities.OrganizationMembership.create({
    organization_id: org.id,
    organization_name: org.name,
    user_id: user.id,
    user_email: user.email,
    role: 'owner',
    status: 'active',
    accepted_date: new Date().toISOString(),
  });
  // Sync the user's org IDs
  await syncUserOrgIds(client, user.id);
  return { org, membership };
}