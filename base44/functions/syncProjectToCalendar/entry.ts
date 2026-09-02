import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// syncProjectToCalendar — creates/updates a Google Calendar event for each
// project's bid due date with FULL project details embedded: value, specs,
// contractor data, authority, jurisdiction, and a link back to the project
// in the app. The contractor can see everything from their calendar.

const CALENDAR_CONNECTOR_ID = '69ddcb305a599e0b1b3cff';

async function syncOneProject(client: any, project: any, accessToken: string): Promise<any> {
  if (!project.bid_due_date) return { projectId: project.id, status: 'no_due_date' };

  // Build comprehensive calendar event description
  const description = `
🏗️ PROJECT: ${project.title}

📍 JURISDICTION: ${project.jurisdiction || 'N/A'}
🏢 AUTHORITY: ${project.authority || 'N/A'}
👤 CLIENT: ${project.client_name || 'N/A'}
💰 VALUE: ${project.value ? '$' + Number(project.value).toLocaleString() : 'TBD'}
🔨 TRADE: ${project.trade || 'N/A'}
📋 PROJECT TYPE: ${project.project_type || 'N/A'}

📝 SPECS:
${(project.specs || 'N/A').slice(0, 1500)}

📞 CONTRACT INFO:
${project.contract_info || 'N/A'}

🔗 SOURCE: ${project.source_url || 'N/A'}
📄 PLANS: ${project.plans_url || 'N/A'}

📌 View in AUTOLEADS: https://autoleads.base44.app/projects/${project.id}
`.trim();

  const dueDate = new Date(project.bid_due_date);
  // All-day event on the due date
  const start = { date: dueDate.toISOString().split('T')[0] };
  const end = { date: new Date(dueDate.getTime() + 86400000).toISOString().split('T')[0] };

  const event: any = {
    summary: `🔔 BID DUE: ${project.title}`,
    description,
    start: { ...start, timeZone: 'America/New_York' },
    end: { ...end, timeZone: 'America/New_York' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 },  // 1 day before
        { method: 'popup', minutes: 240 },   // 4 hours before
        { method: 'popup', minutes: 60 },    // 1 hour before
      ]
    },
    colorId: '11', // red — stands out
  };

  // Check if we already have a calendar event for this project
  const existing = await client.entities.PipelineEvent.filter({
    project_id: project.id, event_type: 'calendar_synced'
  }).catch(() => []);
  const existingEvent = (existing || []).find((e: any) => e.message?.includes('eventId:'));

  const url = existingEvent
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${existingEvent.message?.match(/eventId:(\S+)/)?.[1]}`
    : 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const method = existingEvent ? 'PUT' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  const data = await res.json();
  if (!res.ok) return { projectId: project.id, status: 'error', error: data.error?.message };

  // Record the sync
  await client.entities.PipelineEvent.create({
    organization_id: project.organization_id,
    project_id: project.id,
    step: 'schedule', status: 'completed', event_type: 'calendar_synced',
    message: `Bid due date synced to Google Calendar. eventId:${data.id}`,
    occurred_at: new Date().toISOString(),
  }).catch(() => null);

  return { projectId: project.id, status: 'synced', eventId: data.id, dueDate: project.bid_due_date };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let accessToken: string;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CALENDAR_CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch {
      return Response.json({ error: 'Google Calendar not connected' }, { status: 400 });
    }

    const ctx = await resolveUserOrgs(client, user.id);
    if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });

    // Sync single project or all projects with due dates
    const projectId = body?.project_id;
    let projects: any[];
    if (projectId) {
      projects = [await client.entities.Project.get(projectId).catch(() => null)].filter(Boolean);
    } else {
      projects = await client.entities.Project.filter({ organization_id: ctx.primaryOrgId }, '-bid_due_date', 100).catch(() => []);
      projects = (projects || []).filter((p: any) => p.bid_due_date && !['lost', 'completed'].includes(p.stage));
    }

    const results: any[] = [];
    for (const project of projects.slice(0, 50)) {
      try {
        const r = await syncOneProject(client, project, accessToken);
        results.push(r);
      } catch (e: any) {
        results.push({ projectId: project.id, status: 'error', error: e.message });
      }
    }

    const synced = results.filter(r => r.status === 'synced').length;
    return Response.json({ success: true, synced, total: projects.length, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Calendar sync failed' }, { status: 500 });
  }
}