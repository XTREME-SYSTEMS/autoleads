import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs, scopedFilter } from '../../shared/orgContext.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection("69ddcb305a599e0b4a1b3cff");

    // Check-only mode: verify connection without side effects
    if (body.check) {
      const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary", { headers: { "Authorization": `Bearer ${accessToken}` } });
      if (!res.ok) return Response.json({ error: "not connected" }, { status: 500 });
      return Response.json({ success: true, connected: true });
    }

    // Resolve the user's org context — never use bare .list() (cross-tenant)
    const ctx = await resolveUserOrgs(base44, user.id);
    if (!ctx.primaryOrgId) return Response.json({ error: 'No active organization membership' }, { status: 403 });
    const configs = await base44.asServiceRole.entities.AutomationConfig.filter(scopedFilter(ctx.primaryOrgId)).catch(() => []);
    const config = (configs || [])[0];
    const cadence = config?.scrape_cadence || "24h";
    const hours = parseInt(cadence) || 24;

    const now = new Date();
    const start = new Date(now.getTime() + hours * 3600 * 1000);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    const event = {
      summary: "AUTOLEADS Auto-Scrape Run",
      description: "Automated opportunity scraping run. AUTOLEADS will scan for new construction opportunities matching your trades and service area.",
      start: { dateTime: start.toISOString(), timeZone: "America/New_York" },
      end: { dateTime: end.toISOString(), timeZone: "America/New_York" },
    };

    const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(event),
    });
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.error?.message || "Calendar API error" }, { status: 500 });
    return Response.json({ success: true, eventId: data.id, start: data.start });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}