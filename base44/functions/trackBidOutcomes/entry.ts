import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs } from '../../shared/orgContext.ts';

async function processOrg(client: any, orgId: string) {
  // Find all delivered/responded proposals (org-scoped)
  const proposals = await client.entities.Proposal.filter({ organization_id: orgId }, '-created_date', 500).catch(() => []);
  const active = (proposals || []).filter((p: any) => ['delivered', 'responded'].includes(p.status));

  let actionItemsCreated = 0;
  const now = Date.now();

  for (const proposal of active) {
    const projectId = proposal.project_id;
    if (!projectId) continue;

    const project = await client.entities.Project.get(projectId).catch(() => null);
    if (!project) continue;

    // Check if bid due date has passed
    const dueDate = project.bid_due_date ? new Date(project.bid_due_date).getTime() : 0;
    const isOverdue = dueDate > 0 && now > dueDate;
    const daysSinceSubmission = proposal.sent_date
      ? Math.floor((now - new Date(proposal.sent_date).getTime()) / 86400000)
      : 0;

    // Only prompt if overdue or 7+ days since submission
    if (!isOverdue && daysSinceSubmission < 7) continue;

    // Check if an action item already exists for this proposal (org-scoped)
    const existing = await client.entities.ActionItem.filter({
      organization_id: orgId,
      linked_record_id: proposal.id,
      status: 'open',
    }).catch(() => []);

    if (existing && existing.length > 0) continue;

    // Create action item prompting for outcome
    await client.entities.ActionItem.create({
      organization_id: orgId,
      title: `Record bid outcome — ${project.title}`,
      description: `Bid submitted ${daysSinceSubmission} days ago${isOverdue ? ' (past due date)' : ''}. Did we win or lose? Recording outcomes improves future bid intelligence.`,
      category: 'opportunity_review',
      priority: isOverdue ? 'high' : 'medium',
      status: 'open',
      linked_record_id: proposal.id,
      linked_route: `/proposals/${proposal.id}`,
      ai_prepared: true,
      requires_approval: false,
    }).catch(() => null);
    actionItemsCreated++;
  }

  // Create a summary notification if there are new action items (org-scoped)
  if (actionItemsCreated > 0) {
    await client.entities.Notification.create({
      organization_id: orgId,
      type: 'proposal',
      title: `${actionItemsCreated} bid${actionItemsCreated === 1 ? '' : 's'} awaiting outcome`,
      body: 'Record win/loss outcomes to improve bid intelligence and trigger contracting.',
      priority: 'medium',
      read: false,
      linked_route: '/tasks',
    }).catch(() => null);
  }

  return { active_bids: active.length, action_items_created: actionItemsCreated };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      let totalItems = 0, totalBids = 0;
      for (const orgId of ctx.orgIds) {
        const r = await processOrg(client, orgId);
        totalItems += r.action_items_created;
        totalBids += r.active_bids;
      }
      return Response.json({ success: true, active_bids: totalBids, action_items_created: totalItems });
    }

    // Service-role: iterate all organizations
    let totalItems = 0, totalBids = 0;
    await forEachOrganization(base44.asServiceRole, async (org) => {
      const r = await processOrg(base44.asServiceRole, org.id);
      totalItems += r.action_items_created;
      totalBids += r.active_bids;
    });
    return Response.json({ success: true, active_bids: totalBids, action_items_created: totalItems });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Tracking failed' }, { status: 500 });
  }
}