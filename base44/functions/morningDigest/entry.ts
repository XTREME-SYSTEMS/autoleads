import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';

// morningDigest — counts new projects matching the org's trade/jurisdiction
// from the last 24h, creates a high-priority Notification with total value.
// Runs daily at 6am via the Morning Lead Digest workflow.

async function processOrg(client: any, orgId: string) {
  // Get company profile for trade/jurisdiction matching (org-scoped)
  const companies = await client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []);
  const company = (companies || [])[0];
  const trade = company?.trade || '';
  const jurisdiction = company?.city && company?.state ? `${company.city}, ${company.state}` : '';

  // Get projects from the last 24 hours (org-scoped)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const recentProjects = await client.entities.Project.filter({ organization_id: orgId }, '-created_date', 100).catch(() => []);

  // Filter to last 24h
  const newProjects = (recentProjects || []).filter((p: any) =>
    p.created_date && new Date(p.created_date).toISOString() > yesterday
  );

  // Match by trade if available
  const matched = trade
    ? newProjects.filter((p: any) => {
        const text = `${p.title} ${p.description} ${p.specs} ${p.trade}`.toLowerCase();
        return text.includes(trade.toLowerCase());
      })
    : newProjects;

  // Calculate total value
  const totalValue = matched.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
  const withValue = matched.filter((p: any) => p.value && p.value > 0).length;

  // Create the notification (org-scoped)
  if (matched.length > 0) {
    const valueStr = totalValue > 0 ? ` Total value: $${totalValue.toLocaleString()}.` : '';
    await client.entities.Notification.create({
      organization_id: orgId,
      type: 'opportunity',
      title: `${matched.length} new bids matched your trade today`,
      body: `${matched.length} new construction bid opportunities${trade ? ` for ${trade}` : ''} found in the last 24 hours.${valueStr} Tap to review.`,
      priority: 'high',
      linked_route: '/leads',
    });
  } else {
    await client.entities.Notification.create({
      organization_id: orgId,
      type: 'info',
      title: 'Daily digest: No new bids today',
      body: `No new bid opportunities${trade ? ` for ${trade}` : ''} found in the last 24 hours. The system is monitoring your sources.`,
      priority: 'low',
      linked_route: '/leads',
    });
  }

  return { newProjects: newProjects.length, matched: matched.length, totalValue, withValue, trade, jurisdiction };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      const results: any[] = [];
      for (const orgId of ctx.orgIds) {
        const r = await processOrg(client, orgId);
        results.push(r);
      }
      return Response.json({ success: true, organizations: results.length, results });
    }

    // Service-role: iterate all organizations
    const results: any[] = [];
    await forEachOrganization(base44.asServiceRole, async (org) => {
      const r = await processOrg(base44.asServiceRole, org.id);
      results.push(r);
    });
    return Response.json({ success: true, organizations: results.length, results });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}