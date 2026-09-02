import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

// gmailIngestBids — fetches bid-invite emails from the user's connected Gmail,
// parses them with LLM into Project records. This is the highest-value, lowest-effort
// data source: real, qualified leads delivered directly to the contractor.

const GMAIL_CONNECTOR_ID = '69db200274332486fd28dd7e';

// Gmail search query for bid-related emails
const BID_QUERY = 'subject:("bid invitation" OR "invitation to bid" OR "ITB" OR "RFQ" OR "RFP" OR "bid request" OR "project bid" OR "construction bid" OR "bidding opportunity") newer_than:7d';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const maxEmails = body.max_emails || 10;

    // Get the current app user's Gmail access token
    let accessToken: string;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection('69db200274332486fd28dd7e');
      accessToken = conn.accessToken;
    } catch {
      return Response.json({ error: 'Gmail not connected. Connect Gmail in Settings to ingest bid emails.' }, { status: 400 });
    }

    // Search for bid-related emails
    const searchRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(BID_QUERY)}&maxResults=${maxEmails}`,
      { headers: { 'Authorization': `Bearer ${accessToken}` } }
    );
    if (!searchRes.ok) {
      const err = await searchRes.json().catch(() => ({}));
      return Response.json({ error: err.error?.message || 'Gmail API error' }, { status: 500 });
    }
    const searchData = await searchRes.json();
    const messageIds = (searchData.messages || []).map((m: any) => m.id);

    if (messageIds.length === 0) {
      return Response.json({ success: true, scanned: 0, created: 0, duplicates: 0, results: [], message: 'No bid-invite emails found in the last 7 days.' });
    }

    // Fetch full email content for each message (parallel batches of 5)
    const BATCH = 5;
    let created = 0, duplicates = 0;
    const results: any[] = [];

    for (let i = 0; i < messageIds.length; i += BATCH) {
      const batch = messageIds.slice(i, i + BATCH);
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

          // Extract body text from email payload
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

      // Parse each email with LLM and create Project records
      for (const email of emails.filter(Boolean)) {
        try {
          const parsed = await client.integrations.Core.InvokeLLM({
            prompt: `From the following bid invitation email, extract the construction project details. Only return REAL data from the email — do not fabricate. If this is not a construction bid invitation, return null for all fields.

EMAIL SUBJECT: ${email.subject}
FROM: ${email.from}
DATE: ${email.date}

EMAIL BODY:
${email.bodyText}

Return JSON with:
- is_bid_invite: boolean — true if this is a construction bid invitation/RFQ/RFP
- title: project name or bid title
- description: 2-3 sentence project summary
- specs: scope of work, materials, key requirements
- contract_info: owner/contact name, email, phone, address if present
- value: project value as number, or null
- bid_due_date: YYYY-MM-DD if stated, else null
- client_name: the owner/client/agency name
- authority: the issuing authority/agency
- project_type: commercial/residential/municipal/industrial/renovation
- jurisdiction: city, state if determinable
- trade: trade/scope if mentioned (e.g. "epoxy flooring", "concrete polishing")`,
            response_json_schema: {
              type: 'object',
              properties: {
                is_bid_invite: { type: 'boolean' },
                title: { type: 'string' }, description: { type: 'string' }, specs: { type: 'string' },
                contract_info: { type: 'string' }, value: { type: 'number' }, bid_due_date: { type: 'string' },
                client_name: { type: 'string' }, authority: { type: 'string' },
                project_type: { type: 'string' }, jurisdiction: { type: 'string' }, trade: { type: 'string' },
              },
            },
          });

          if (!parsed?.is_bid_invite || !parsed?.title) {
            results.push({ subject: email.subject, status: 'skipped', reason: 'not a bid invite' });
            continue;
          }

          // Check for duplicates by normalized title
          const existing = await client.entities.Project.filter({ title: parsed.title }).catch(() => []);
          if (existing && existing.length > 0) {
            duplicates++;
            results.push({ subject: email.subject, status: 'duplicate', title: parsed.title });
            continue;
          }

          // Create the Project record
          const project = await client.entities.Project.create({
            title: parsed.title,
            description: parsed.description || '',
            specs: parsed.specs || '',
            contract_info: parsed.contract_info || '',
            value: typeof parsed.value === 'number' ? parsed.value : undefined,
            bid_due_date: parsed.bid_due_date || undefined,
            client_name: parsed.client_name || '',
            authority: parsed.authority || '',
            project_type: parsed.project_type || '',
            jurisdiction: parsed.jurisdiction || '',
            trade: parsed.trade || '',
            stage: 'qualification',
            verification_status: 'verified',
            verified_date: new Date().toISOString(),
            source_url: '',
            source_id: `gmail:${email.id}`,
            confidence: 0.9,
            data_class: 'production',
          });

          created++;
          results.push({ subject: email.subject, status: 'created', title: parsed.title, project_id: project?.id });
        } catch (e: any) {
          results.push({ subject: email.subject, status: 'error', error: e.message });
        }
      }
    }

    // Create notification if projects were created
    if (created > 0) {
      try {
        await client.entities.Notification.create({
          type: 'opportunity',
          title: `${created} new bid invites from Gmail`,
          body: `Gmail ingestion found ${created} new construction bid invitations from your inbox.`,
          priority: 'high',
          linked_route: '/leads',
        });
      } catch {}
    }

    return Response.json({ success: true, scanned: messageIds.length, created, duplicates, results });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}