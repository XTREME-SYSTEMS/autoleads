import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

const CALENDAR_CONNECTOR_ID = '69ddcb305a599e0b4a1b3cff';

function asDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function recordEvent(client: any, projectId: string, status: string, sourceRecordId: string | null, message: string) {
  try {
    await client.entities.PipelineEvent.create({
      project_id: projectId,
      step: 'schedule',
      status,
      event_type: status === 'completed' ? 'job_scheduled' : 'schedule_blocked',
      source_record_id: sourceRecordId || '',
      message,
      occurred_at: new Date().toISOString(),
    });
  } catch {}
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user || !client) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = String(body?.project_id || '').trim();
    const start = asDate(body?.start_time);
    const requestedEnd = asDate(body?.end_time);
    const durationHours = Math.min(24, Math.max(0.5, Number(body?.duration_hours || 8)));
    const timezone = String(body?.timezone || 'America/New_York').slice(0, 80);
    const crewName = String(body?.crew_name || '').trim().slice(0, 120);
    const notes = String(body?.notes || '').trim().slice(0, 2000);

    if (!projectId || !start) {
      return Response.json({ error: 'project_id and a valid start_time are required' }, { status: 400 });
    }
    if (start.getTime() < Date.now() - 5 * 60 * 1000) {
      return Response.json({ error: 'Job start time must be in the future' }, { status: 400 });
    }
    const end = requestedEnd && requestedEnd > start
      ? requestedEnd
      : new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const project = await client.entities.Project.get(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const [contracts, esigns, payments, jobs] = await Promise.all([
      client.entities.SignedContract.filter({ project_id: projectId }).catch(() => []),
      client.entities.EsignDocument.filter({ project_id: projectId }).catch(() => []),
      client.entities.Payment.filter({ project_id: projectId }).catch(() => []),
      client.entities.Job.filter({ project_id: projectId }).catch(() => []),
    ]);

    const contractReady = (contracts || []).some((c: any) => ['signed', 'executed'].includes(c.status)) ||
      (esigns || []).some((d: any) => d.document_type === 'contract' && d.status === 'signed');
    if (!contractReady) {
      await recordEvent(client, projectId, 'blocked', null, 'A signed contract is required before scheduling.');
      return Response.json({ error: 'A signed contract is required before scheduling the job', blocker: 'contract' }, { status: 409 });
    }

    const paymentReady = (payments || []).some((p: any) => p.status === 'completed' && Number(p.amount || 0) > 0);
    if (!paymentReady) {
      await recordEvent(client, projectId, 'blocked', null, 'A completed payment or deposit is required before scheduling.');
      return Response.json({ error: 'A completed payment or deposit is required before scheduling the job', blocker: 'payment' }, { status: 409 });
    }

    const activeJob = (jobs || []).find((j: any) => ['scheduled', 'in_progress'].includes(j.status));
    if (activeJob && !body?.replace_existing) {
      return Response.json({ success: true, idempotent: true, job: activeJob, message: 'This project already has an active scheduled job.' });
    }

    let accessToken = '';
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CALENDAR_CONNECTOR_ID);
      accessToken = conn?.accessToken || '';
    } catch {}
    if (!accessToken) {
      await recordEvent(client, projectId, 'blocked', null, 'Google Calendar is not connected.');
      return Response.json({ error: 'Google Calendar is not connected', blocker: 'calendar' }, { status: 409 });
    }

    const eventPayload = {
      summary: `AUTOLEADS Job: ${project.title}`,
      description: [
        `Project: ${project.title}`,
        project.client_name ? `Client: ${project.client_name}` : '',
        project.address ? `Address: ${project.address}` : '',
        crewName ? `Crew: ${crewName}` : '',
        notes,
      ].filter(Boolean).join('\n'),
      location: project.address || '',
      start: { dateTime: start.toISOString(), timeZone: timezone },
      end: { dateTime: end.toISOString(), timeZone: timezone },
    };

    const calendarRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(eventPayload),
    });
    const calendarData = await calendarRes.json().catch(() => ({}));
    if (!calendarRes.ok) {
      await recordEvent(client, projectId, 'failed', null, calendarData?.error?.message || 'Calendar API failed.');
      return Response.json({ error: calendarData?.error?.message || `Calendar API error (${calendarRes.status})` }, { status: 502 });
    }

    const job = await client.entities.Job.create({
      project_id: projectId,
      title: project.title,
      status: 'scheduled',
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      timezone,
      crew_name: crewName,
      address: project.address || '',
      notes,
      calendar_event_id: calendarData.id || '',
      calendar_html_link: calendarData.htmlLink || '',
    });
    await client.entities.Project.update(projectId, { stage: 'scheduled' });
    await recordEvent(client, projectId, 'completed', job.id, `Job scheduled for ${start.toISOString()}.`);

    return Response.json({ success: true, job, calendar_event_id: calendarData.id || null, calendar_html_link: calendarData.htmlLink || null });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Scheduling failed' }, { status: 500 });
  }
}
