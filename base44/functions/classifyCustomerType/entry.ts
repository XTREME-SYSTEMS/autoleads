// classifyCustomerType — tags every Project with its customer archetype
// (homeowner_direct, permit_derived, adjacent_trade, commercial_gov_bid, etc.)
// based on source URL + heuristics. Runs as a one-shot batch to backfill
// existing projects, and is designed to be called at lead-intake time too.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs, scopedFilter } from '../../shared/orgContext.ts';
import { classifyProject, getArchetype } from '../../shared/customerArchetypes.ts';

async function tagProjectsForOrg(client: any, orgId: string): Promise<any> {
  const projects = await client.entities.Project.filter(scopedFilter(orgId), '-created_date', 500).catch(() => []);
  let tagged = 0, alreadyTagged = 0, failed = 0;
  const counts: Record<string, number> = {};

  for (const p of projects || []) {
    if (p.customer_type) { alreadyTagged++; continue; }
    const archetype = classifyProject(p);
    try {
      await client.entities.Project.update(p.id, { customer_type: archetype });
      tagged++;
      counts[archetype] = (counts[archetype] || 0) + 1;
    } catch { failed++; }
  }

  return { org: orgId, tagged, alreadyTagged, failed, archetypeCounts: counts };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // All orgs (service-role / workflow)
    if (body._service_token || body.all_orgs) {
      const svc = base44.asServiceRole;
      const results: any[] = [];
      await forEachOrganization(svc, async (org) => {
        try { results.push(await tagProjectsForOrg(svc, org.id)); }
        catch (e: any) { results.push({ org: org.id, error: e?.message }); }
      });
      const totals = results.reduce((acc, r) => {
        acc.tagged += r.tagged || 0;
        acc.alreadyTagged += r.alreadyTagged || 0;
        acc.failed += r.failed || 0;
        for (const [k, v] of Object.entries(r.archetypeCounts || {})) acc.archetypes[k] = (acc.archetypes[k] || 0) + (v as number);
        return acc;
      }, { tagged: 0, alreadyTagged: 0, failed: 0, archetypes: {} as Record<string, number> });
      return Response.json({ success: true, mode: 'all_orgs', ...totals, perOrg: results });
    }

    // Single org (user context)
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const ctx = await resolveUserOrgs(base44, user.id);
    const orgId = body.organization_id || ctx.primaryOrgId;
    if (!orgId) return Response.json({ error: 'No organization membership' }, { status: 403 });
    const result = await tagProjectsForOrg(client, orgId);
    return Response.json({ success: true, mode: 'single_org', ...result });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}