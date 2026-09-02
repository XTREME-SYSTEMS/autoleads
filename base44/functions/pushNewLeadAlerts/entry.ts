import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { parseOrgCriteria, projectMatchesOrg } from "../../shared/leadMatching.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // Lookback window: last 45 minutes (handles slight workflow delays)
    const since = new Date(Date.now() - 45 * 60 * 1000).toISOString();

    // Fetch all organizations
    const orgs = await svc.entities.Organization.list('-created_date', 500);

    // Fetch recent projects (new leads)
    const recentProjects = await svc.entities.Project.list('-created_date', 200);

    // Filter to only projects created within the lookback window
    const newProjects = (recentProjects || []).filter(p =>
      p.created_date && new Date(p.created_date).toISOString() >= since
    );

    if (newProjects.length === 0) {
      return Response.json({ status: 'success', message: 'No new leads in lookback window', totalSent: 0 });
    }

    // Get already-notified project IDs from PipelineEvents to avoid duplicate pushes
    const recentEvents = await svc.entities.PipelineEvent.filter({
      event_type: 'push_notification_sent',
      occurred_at: { $gte: since }
    }).catch(() => []);
    const notifiedIds = new Set((recentEvents || []).map(e => e.project_id));

    let totalSent = 0;
    let totalSkipped = 0;
    const results = [];

    for (const org of orgs) {
      const ownerId = org.owner_user_id;
      if (!ownerId) continue;

      // Get org's company profile for matching criteria
      const profiles = await svc.entities.CompanyProfile.filter({ organization_id: org.id }).catch(() => []);
      const profile = (profiles || [])[0];

      // Parse matching criteria (shared logic)
      const { orgTrades, orgState } = parseOrgCriteria(profile, org);

      // Find matching new projects for this org
      const matching = newProjects.filter(p => {
        if (notifiedIds.has(p.id)) return false;
        return projectMatchesOrg(p, orgTrades, orgState);
      });

      // Send push notification for each matching project
      for (const project of matching) {
        try {
          const shortTitle = (project.title || 'New Opportunity').slice(0, 50);
          const parts = [];
          if (project.jurisdiction) parts.push(project.jurisdiction);
          if (project.bid_due_date) {
            const d = new Date(project.bid_due_date);
            if (!isNaN(d.getTime())) parts.push(`Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
          }
          if (project.value && Number(project.value) > 0) {
            parts.push(`$${Math.round(Number(project.value)).toLocaleString()}`);
          }
          const content = parts.length > 0 ? parts.join(' · ') : 'New construction opportunity matching your criteria';

          await svc.integrations.Core.SendPushNotification({
            user_id: ownerId,
            title: `🚨 New Lead: ${shortTitle}`,
            content,
            action_label: 'View Lead',
            action_url: `/leads/${project.id}`
          });

          // Track that we sent a push for this project to avoid duplicates
          await svc.entities.PipelineEvent.create({
            organization_id: org.id,
            project_id: project.id,
            step: 'lead',
            status: 'completed',
            event_type: 'push_notification_sent',
            message: `Push notification sent for: ${project.title}`,
            occurred_at: new Date().toISOString()
          });

          totalSent++;
          results.push({ org: org.name, project: project.title, sent: true });
        } catch (pushErr) {
          // Push failed (likely no native mobile build or push credentials) — log and continue
          totalSkipped++;
          results.push({ org: org.name, project: project.title, sent: false, error: pushErr.message });
        }
      }
    }

    return Response.json({
      status: 'success',
      newProjects: newProjects.length,
      totalSent,
      totalSkipped,
      results: results.slice(0, 20)
    });
  } catch (error) {
    console.error('pushNewLeadAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}