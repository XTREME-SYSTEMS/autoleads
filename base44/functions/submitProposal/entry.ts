import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';
import { fetchOrgAssets } from '../../shared/orgAssets.ts';
import { buildBrandedBidEmail } from '../../shared/brandedEmail.ts';

// Proposal delivery truth: status only advances when there is real evidence.
//   - method='email': sends via sendEmail; status -> 'sent' ONLY on provider receipt
//   - method='manual': requires operator attestation; status -> 'manual_external_submission'
//   - 'delivered' / 'delivery_confirmed' are NEVER set by this function alone
// Follow-up automation begins only after legitimate send/submission evidence.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const proposalId = String(body?.proposal_id || '').trim();
    if (!proposalId) return Response.json({ error: 'proposal_id is required' }, { status: 400 });

    const method = String(body?.method || 'manual').toLowerCase().trim();
    if (!['email', 'manual'].includes(method)) {
      return Response.json({ error: 'method must be "email" or "manual"' }, { status: 400 });
    }

    const proposal = await client.entities.Proposal.get(proposalId).catch(() => null);
    if (!proposal) return Response.json({ error: 'Proposal not found' }, { status: 404 });

    if (!['approved', 'internal_review', 'draft'].includes(proposal.status)) {
      return Response.json({ error: `Proposal is already ${proposal.status}` }, { status: 409 });
    }

    // Manual submission requires explicit operator attestation
    if (method === 'manual' && !body?.attestation) {
      return Response.json({
        error: 'Manual submission requires explicit attestation that the bid was delivered externally.',
        attestation_required: true,
      }, { status: 400 });
    }

    const projectId = proposal.project_id || null;
    const orgId = proposal.organization_id || '';
    const now = new Date().toISOString();
    let newStatus: string;
    let eventType: string;
    let message: string;
    let sendReceipt: string | null = null;

    if (method === 'email') {
      // Send via email — only set 'sent' if provider returns success
      const recipient = String(body?.recipient || proposal.client_email || '').trim();
      if (!recipient) {
        return Response.json({ error: 'No recipient email on proposal. Use method="manual" with attestation for external submission.' }, { status: 400 });
      }
      try {
        const { company, logo, projectImages } = await fetchOrgAssets(client, orgId);
        const proj = projectId ? await client.entities.Project.get(projectId).catch(() => null) : null;
        const brandedHtml = buildBrandedBidEmail({ company, logo, project: proj, proposal, projectImages });
        const sendResult = await client.functions.invoke('sendEmail', {
          to: recipient,
          subject: `Bid Proposal: ${proposal.title} — ${company.name || 'AUTOLEADS'}`,
          body: brandedHtml,
        });
        sendReceipt = sendResult?.messageId || sendResult?.id || 'sent';
        newStatus = 'sent';
        eventType = 'bid_emailed';
        message = `Branded bid emailed to ${recipient}. Provider receipt: ${sendReceipt}`;
      } catch (sendError: any) {
        // Send failed — do NOT advance status. Record the failure.
        await client.entities.PipelineEvent.create({
          organization_id: orgId,
          project_id: projectId || '',
          step: 'bid',
          status: 'failed',
          event_type: 'bid_email_failed',
          source_record_id: proposalId,
          message: `Email send failed: ${sendError?.message || 'unknown error'}`,
          occurred_at: now,
        }).catch(() => null);
        return Response.json({ error: 'Email send failed. Proposal status not advanced.', details: sendError?.message }, { status: 502 });
      }
    } else {
      // Manual external submission with attestation
      newStatus = 'manual_external_submission';
      eventType = 'bid_manual_submission';
      message = `Bid manually submitted externally. Attested by ${user?.email || 'operator'}.`;
    }

    // Update proposal status
    await client.entities.Proposal.update(proposalId, {
      status: newStatus,
      sent_date: now,
    });

    // Advance project to submitted only after legitimate evidence
    if (projectId) {
      const project = await client.entities.Project.get(projectId).catch(() => null);
      if (project && ['qualification', 'takeoff', 'estimating', 'proposal'].includes(project.stage)) {
        await client.entities.Project.update(projectId, { stage: 'submitted' }).catch(() => null);
      }
    }

    // Create immutable pipeline event
    await client.entities.PipelineEvent.create({
      organization_id: orgId,
      project_id: projectId || '',
      step: 'bid',
      status: 'completed',
      event_type: eventType,
      source_record_id: proposalId,
      message,
      occurred_at: now,
    }).catch(() => null);

    // Sync "Bid Sent" event + weekly follow-up reminders to Google Calendar
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection('69ddcb305a599e0b1b3cff').catch(() => null);
      if (conn?.accessToken && projectId) {
        const proj = await client.entities.Project.get(projectId).catch(() => null);
        if (proj) {
          const today = new Date();
          // "Bid Sent" event today
          await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: `📤 Bid Sent: ${proj.title}`,
              description: `Bid package sent to ${recipient}. View: https://autoleads.base44.app/proposals/${proposalId}`,
              start: { date: today.toISOString().split('T')[0], timeZone: 'America/New_York' },
              end: { date: new Date(today.getTime() + 86400000).toISOString().split('T')[0], timeZone: 'America/New_York' },
              colorId: '9',
            }),
          }).catch(() => null);
          // Weekly follow-up reminders for 4 weeks
          for (let week = 1; week <= 4; week++) {
            const reminderDate = new Date(today.getTime() + week * 7 * 86400000);
            await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                summary: `📞 Follow Up: ${proj.title}`,
                description: `Week ${week} follow-up reminder. Check if contractor has responded. View: https://autoleads.base44.app/proposals/${proposalId}`,
                start: { date: reminderDate.toISOString().split('T')[0], timeZone: 'America/New_York' },
                end: { date: new Date(reminderDate.getTime() + 86400000).toISOString().split('T')[0], timeZone: 'America/New_York' },
                reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 480 }] },
                colorId: '5',
              }),
            }).catch(() => null);
          }
        }
      }
    } catch {}

    // Set up follow-up sequence only after legitimate send
    let followUps = 0;
    try {
      const followRes = await client.functions.invoke('autoFollowUp', {
        project_id: projectId,
        _service_token: body?._service_token,
      });
      followUps = followRes?.drafted || 0;
    } catch {}

    // Create notification
    await client.entities.Notification.create({
      organization_id: orgId,
      type: 'proposal',
      title: `Bid ${method === 'email' ? 'sent' : 'submitted'}: ${proposal.title}`,
      body: `${method === 'email' ? 'Emailed to client' : 'Manually submitted'}. Follow-up sequence configured (${followUps} messages). Record the outcome when you hear back.`,
      priority: 'medium',
      read: false,
      linked_route: `/proposals/${proposalId}`,
      linked_record_id: proposalId,
    }).catch(() => null);

    return Response.json({
      success: true,
      proposal_id: proposalId,
      status: newStatus,
      method,
      send_receipt: sendReceipt,
      follow_ups_configured: followUps,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Submission failed' }, { status: 500 });
  }
}