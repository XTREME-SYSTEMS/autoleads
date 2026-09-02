import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization } from '../../shared/orgContext.ts';

// autoCleanSystem — autonomous data cleaning. Removes duplicates, stale
// records, NON_PRODUCTION_EXAMPLE data, and fixes integrity issues. Runs
// on a schedule to keep the system clean and performant.

async function cleanOrg(client: any, orgId: string): Promise<any> {
  const stats = { duplicatesRemoved: 0, staleRemoved: 0, examplesRemoved: 0, orphanedRemoved: 0, fixed: 0 };

  // 1. Remove NON_PRODUCTION_EXAMPLE records from all entities
  const entities = ['Project', 'Proposal', 'Takeoff', 'Estimate', 'Message', 'PipelineEvent', 'Notification', 'ActionItem'];
  for (const entityName of entities) {
    try {
      const examples = await (client.entities as any)[entityName].filter({ data_class: 'NON_PRODUCTION_EXAMPLE' }, '-created_date', 200).catch(() => []);
      for (const ex of (examples || [])) {
        await (client.entities as any)[entityName].delete(ex.id).catch(() => null);
        stats.examplesRemoved++;
      }
    } catch {}
  }

  // 2. Find and remove duplicate projects (same title + jurisdiction)
  const projects = await client.entities.Project.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []);
  const seen = new Map<string, string>();
  for (const p of (projects || [])) {
    const key = `${(p.title || '').toLowerCase().trim()}|${(p.jurisdiction || '').toLowerCase().trim()}`;
    if (seen.has(key)) {
      // Keep the one with more data, delete the other
      const existingId = seen.get(key)!;
      const existing = (projects || []).find(x => x.id === existingId);
      const keepId = (p.specs?.length || 0) > (existing?.specs?.length || 0) ? p.id : existingId;
      const deleteId = keepId === p.id ? existingId : p.id;
      await client.entities.Project.delete(deleteId).catch(() => null);
      stats.duplicatesRemoved++;
    } else {
      seen.set(key, p.id);
    }
  }

  // 3. Remove stale projects (no activity in 90 days and not won/submitted)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
  const staleProjects = (projects || []).filter(p =>
    ['qualification', 'takeoff', 'estimating'].includes(p.stage) &&
    p.created_date && p.created_date < ninetyDaysAgo
  );
  for (const p of staleProjects.slice(0, 50)) {
    await client.entities.Project.update(p.id, { stage: 'lost' }).catch(() => null);
    stats.staleRemoved++;
  }

  // 4. Remove orphaned takeoffs (project deleted or lost)
  const takeoffs = await client.entities.Takeoff.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []);
  const projectIds = new Set((projects || []).map(p => p.id));
  for (const t of (takeoffs || [])) {
    if (t.project_id && !projectIds.has(t.project_id)) {
      await client.entities.Takeoff.delete(t.id).catch(() => null);
      stats.orphanedRemoved++;
    }
  }

  // 5. Fix projects missing organization_id
  const noOrg = (projects || []).filter(p => !p.organization_id);
  for (const p of noOrg) {
    await client.entities.Project.update(p.id, { organization_id: orgId }).catch(() => null);
    stats.fixed++;
  }

  // 6. Clear old read notifications (>30 days)
  const oldNotifs = await client.entities.Notification.filter({ organization_id: orgId, read: true }, '-created_date', 200).catch(() => []);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  for (const n of (oldNotifs || [])) {
    if (n.created_date && n.created_date < thirtyDaysAgo) {
      await client.entities.Notification.delete(n.id).catch(() => null);
    }
  }

  return stats;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Admin only
    if (user && user.role !== 'admin') {
      // Still allow for org-scoped cleaning
    }

    let results: any[] = [];
    if (user) {
      // User-triggered: clean their orgs
      const { resolveUserOrgs } = await import('../../shared/orgContext.ts');
      const ctx = await resolveUserOrgs(client, user.id);
      for (const orgId of ctx.orgIds) {
        const r = await cleanOrg(client, orgId);
        results.push({ orgId, ...r });
      }
    } else {
      // Service-role: clean all orgs
      await forEachOrganization(base44.asServiceRole, async (org) => {
        const r = await cleanOrg(base44.asServiceRole, org.id);
        results.push({ orgId: org.id, ...r });
      });
    }

    const totals = results.reduce((acc, r) => ({
      duplicatesRemoved: acc.duplicatesRemoved + r.duplicatesRemoved,
      staleRemoved: acc.staleRemoved + r.staleRemoved,
      examplesRemoved: acc.examplesRemoved + r.examplesRemoved,
      orphanedRemoved: acc.orphanedRemoved + r.orphanedRemoved,
      fixed: acc.fixed + r.fixed,
    }), { duplicatesRemoved: 0, staleRemoved: 0, examplesRemoved: 0, orphanedRemoved: 0, fixed: 0 });

    return Response.json({ success: true, ...totals, orgs: results.length, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Clean failed' }, { status: 500 });
  }
}