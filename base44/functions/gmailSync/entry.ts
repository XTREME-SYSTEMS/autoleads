import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

// Gmail inbound reply loop:
//   Gmail sync retrieves reply → thread matched → organization resolved →
//   Project resolved → Proposal resolved → Message created →
//   PipelineEvent created → proposal status updated → next-best action generated.
//
// Dedup: skips messages already ingested (by subject + sender).

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection("69db200274332486fd28dd7e");

    // Check-only mode: verify connection without side effects
    if (body.check) {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { "Authorization": `Bearer ${accessToken}` } });
      if (!res.ok) return Response.json({ error: "not connected" }, { status: 500 });
      const data = await res.json();
      return Response.json({ success: true, connected: true, email: data.emailAddress });
    }

    const svc = base44.asServiceRole;
    const orgId = user.data?.organization_ids?.[0] || '';
    const now = new Date().toISOString();

    // List recent inbox messages
    const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10", { headers: { "Authorization": `Bearer ${accessToken}` } });
    const listData = await listRes.json();
    if (!listRes.ok) return Response.json({ error: listData.error?.message || "Gmail API error" }, { status: 500 });

    // Fetch full message details
    const messages = await Promise.all((listData.messages || []).slice(0, 8).map(async (m) => {
      const r = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date&metadataHeaders=In-Reply-To`, { headers: { "Authorization": `Bearer ${accessToken}` } });
      const d = await r.json();
      const headers = d.payload?.headers || [];
      return {
        id: m.id,
        threadId: d.threadId,
        subject: headers.find(h => h.name === "Subject")?.value || "(no subject)",
        from: headers.find(h => h.name === "From")?.value || "",
        date: headers.find(h => h.name === "Date")?.value || "",
        snippet: d.snippet || "",
        inReplyTo: headers.find(h => h.name === "In-Reply-To")?.value || "",
      };
    }));

    // Load sent proposals for matching (only if we have an org)
    let sentProposals = [];
    if (orgId) {
      sentProposals = await svc.entities.Proposal.filter({ organization_id: orgId, status: 'sent' });
    }

    let messagesCreated = 0;
    let pipelineEventsCreated = 0;
    let proposalsUpdated = 0;
    const errors = [];

    for (const msg of messages) {
      try {
        // Dedup: check if we already ingested this message
        if (orgId) {
          const existing = await svc.entities.Message.filter({
            organization_id: orgId,
            direction: 'inbound',
            subject: msg.subject,
            sender: msg.from,
          });
          if (existing && existing.length > 0) continue;
        }

        // Try to match to a sent proposal by subject keyword overlap
        let matchedProposal = null;
        const msgSubjectLower = msg.subject.toLowerCase();
        for (const p of sentProposals) {
          if (p.title) {
            const titleKey = p.title.toLowerCase().substring(0, 25).trim();
            if (titleKey.length > 5 && msgSubjectLower.includes(titleKey)) {
              matchedProposal = p;
              break;
            }
          }
        }

        // Create Message record
        if (orgId) {
          await svc.entities.Message.create({
            organization_id: orgId,
            direction: 'inbound',
            channel: 'email',
            subject: msg.subject,
            body: msg.snippet,
            sender: msg.from,
            recipient: user.email || '',
            project_id: matchedProposal?.project_id || '',
            status: 'unread',
            sent_date: msg.date ? new Date(msg.date).toISOString() : now,
            data_class: 'production',
          });
          messagesCreated++;
        }

        // If matched to a proposal: create PipelineEvent + update proposal status
        if (matchedProposal && matchedProposal.project_id) {
          await svc.entities.PipelineEvent.create({
            organization_id: orgId,
            project_id: matchedProposal.project_id,
            step: 'email',
            status: 'completed',
            event_type: 'inbound_reply_received',
            source_record_id: matchedProposal.id,
            message: `Reply received: "${msg.subject}" from ${msg.from}`,
            occurred_at: now,
            data_class: 'production',
          });
          pipelineEventsCreated++;

          // Update proposal status to "responded"
          await svc.entities.Proposal.update(matchedProposal.id, {
            status: 'responded',
            signature_status: 'viewed',
          });
          proposalsUpdated++;
        }
      } catch (e) {
        errors.push(`Message ${msg.id}: ${e.message || String(e)}`);
      }
    }

    return Response.json({
      success: true,
      messagesRetrieved: messages.length,
      messagesCreated,
      pipelineEventsCreated,
      proposalsUpdated,
      errors: errors.length,
      errorSamples: errors.slice(0, 3),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}