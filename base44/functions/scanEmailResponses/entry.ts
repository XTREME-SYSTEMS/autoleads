import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// scanEmailResponses — daily scan of the contractor's Gmail for replies to
// sent bids. Categorizes: questions, approvals, addendums, change orders,
// requests for additional info, comments about company/project. Creates
// high-priority notifications (green flashing on dashboard) and ActionItems.

const GMAIL_CONNECTOR_ID = '69db200274332486fd28dd7e';

// Search for replies to our sent bids — broader than just bid invitations
const REPLY_QUERY = 'subject:("RE:" OR "FW:" OR "question" OR "clarification" OR "addendum" OR "change order" OR "approval" OR "award" OR "additional information" OR "RFI" OR "resubmit" OR "revision") newer_than:2d -from:me';

async function processOrgEmails(client: any, orgId: string, accessToken: string): Promise<any> {
  // Get sent bids to match replies against
  const sentProposals = await client.entities.Proposal.filter({ organization_id: orgId, status: 'sent' }, '-sent_date', 50).catch(() => []);
  const sentMessages = await client.entities.Message.filter({ organization_id: orgId, direction: 'outbound', status: 'sent' }, '-created_date', 50).catch(() => []);

  // Search Gmail for replies
  const searchRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(REPLY_QUERY)}&maxResults=20`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  );
  if (!searchRes.ok) return { scanned: 0, found: 0, error: 'Gmail API error' };

  const searchData = await searchRes.json();
  const messageIds = (searchData.messages || []).map((m: any) => m.id);
  if (messageIds.length === 0) return { scanned: 0, found: 0, responses: [] };

  // Fetch full emails (batch of 5)
  let categorized = 0;
  const responses: any[] = [];

  for (let i = 0; i < messageIds.length; i += 5) {
    const batch = messageIds.slice(i, i + 5);
    const emails = await Promise.all(batch.map(async (id: string) => {
      try {
        const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });
        if (!r.ok) return null;
        const d = await r.json();
        const headers = d.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
        const from = headers.find((h: any) => h.name === 'From')?.value || '';
        const date = headers.find((h: any) => h.name === 'Date')?.value || '';
        let bodyText = d.snippet || '';
        if (d.payload?.body?.data) {
          bodyText = atob(d.payload.body.data.replace(/-/g, '+').replace(/_/g, '/')).slice(0, 5000);
        } else if (d.payload?.parts) {
          for (const part of d.payload.parts) {
            if (part.mimeType === 'text/plain' && part.body?.data) {
              bodyText = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/')).slice(0, 5000);
              break;
            }
          }
        }
        return { id, subject, from, date, bodyText };
      } catch { return null; }
    }));

    for (const email of emails.filter(Boolean)) {
      try {
        // Classify the email with LLM
        const classified = await client.integrations.Core.InvokeLLM({
          prompt: `Classify this email reply to a construction bid. Determine the type and extract key info.

EMAIL SUBJECT: ${email.subject}
FROM: ${email.from}
DATE: ${email.date}

BODY:
${email.bodyText}

Return JSON:
- is_bid_related: boolean — true if this is a reply about a construction bid/project
- response_type: one of "question", "approval", "award", "addendum", "change_order", "additional_info_request", "rejection", "comment", "other"
- urgency: "critical" | "high" | "medium" | "low"
- summary: 1-2 sentence summary of what the email says
- action_needed: what the contractor needs to do (if anything)
- project_name: project name if identifiable, or null
- sender_name: sender's name or company
- sender_email: sender's email address`,
          response_json_schema: { type: 'object', properties: {
            is_bid_related: { type: 'boolean' }, response_type: { type: 'string' },
            urgency: { type: 'string' }, summary: { type: 'string' },
            action_needed: { type: 'string' }, project_name: { type: 'string' },
            sender_name: { type: 'string' }, sender_email: { type: 'string' },
          } }
        });

        if (!classified?.is_bid_related) continue;

        // Create inbound Message record
        const msgRec = await client.entities.Message.create({
          organization_id: orgId,
          direction: 'inbound', channel: 'email',
          subject: email.subject, body: email.bodyText.slice(0, 10000),
          sender: email.from, recipient: '',
          status: 'received', ai_generated: false,
        }).catch(() => null);

        // Create high-priority notification (green flashing on dashboard)
        const urgencyColors: any = {
          critical: 'high', high: 'high', medium: 'medium', low: 'low'
        };
        await client.entities.Notification.create({
          organization_id: orgId,
          type: classified.response_type === 'award' ? 'award' : classified.response_type === 'approval' ? 'approval' : 'bid_response',
          title: `${classified.response_type?.toUpperCase()}: ${classified.sender_name || email.from}`,
          body: classified.summary || email.subject,
          priority: urgencyColors[classified.urgency] || 'medium',
          read: false, linked_route: '/messages',
          linked_record_id: msgRec?.id || '',
        }).catch(() => null);

        // Create ActionItem if action is needed
        if (classified.action_needed && classified.urgency !== 'low') {
          await client.entities.ActionItem.create({
            organization_id: orgId,
            title: `${classified.response_type}: ${classified.summary?.slice(0, 60) || email.subject}`,
            description: classified.action_needed,
            category: classified.response_type === 'change_order' ? 'change_order' : 'follow_up',
            priority: classified.urgency, status: 'open',
          }).catch(() => null);
        }

        categorized++;
        responses.push({
          type: classified.response_type, urgency: classified.urgency,
          summary: classified.summary, sender: classified.sender_name || email.from,
          actionNeeded: classified.action_needed,
        });
      } catch {}
    }
  }

  return { scanned: messageIds.length, found: categorized, responses };
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let accessToken: string;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch {
      return Response.json({ error: 'Gmail not connected' }, { status: 400 });
    }

    const ctx = await resolveUserOrgs(client, user.id);
    if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });

    const results: any[] = [];
    for (const orgId of ctx.orgIds) {
      const r = await processOrgEmails(client, orgId, accessToken);
      results.push(r);
    }

    const totalFound = results.reduce((s, r) => s + (r.found || 0), 0);
    return Response.json({ success: true, organizations: results.length, totalResponses: totalFound, results });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Email scan failed' }, { status: 500 });
  }
}