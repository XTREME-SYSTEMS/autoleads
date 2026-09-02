import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { parseOrgCriteria, projectMatchesOrg } from "../../shared/leadMatching.ts";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const svc = base44.asServiceRole;

    // 45-minute lookback (handles slight workflow delays; dedup via PipelineEvent keys)
    const sinceMs = Date.now() - 45 * 60 * 1000;
    const sinceDate = new Date(sinceMs);

    // Fetch all data once (efficient — avoids per-org queries)
    const [orgs, allProjects, allTakeoffs, allProposals, allPayments, allMessages, allUsers, allProfiles] = await Promise.all([
      svc.entities.Organization.list('-created_date', 500),
      svc.entities.Project.list('-created_date', 500),
      svc.entities.Takeoff.list('-created_date', 500),
      svc.entities.Proposal.list('-created_date', 500),
      svc.entities.Payment.list('-created_date', 500),
      svc.entities.Message.list('-created_date', 500),
      svc.entities.User.list().catch(() => []),
      svc.entities.CompanyProfile.list('-created_date', 500).catch(() => [])
    ]);

    // Build lookup maps
    const userEmailMap = new Map();
    (allUsers || []).forEach(u => { if (u.id && u.email) userEmailMap.set(u.id, u.email); });
    const profileMap = new Map();
    (allProfiles || []).forEach(p => { if (p.organization_id) profileMap.set(p.organization_id, p); });

    // Get already-notified keys to avoid duplicate alerts
    const recentEvents = await svc.entities.PipelineEvent.filter({
      event_type: 'email_alert_sent',
      occurred_at: { $gte: sinceDate.toISOString() }
    }).catch(() => []);
    const notifiedKeys = new Set((recentEvents || []).map(e => e.message));

    let totalEmailsSent = 0;
    let totalSkipped = 0;
    const results = [];

    for (const org of orgs || []) {
      const ownerId = org.owner_user_id;
      if (!ownerId) continue;
      const userEmail = userEmailMap.get(ownerId);
      if (!userEmail) continue;

      const profile = profileMap.get(org.id);
      const { orgTrades, orgState } = parseOrgCriteria(profile, org);

      const alerts = [];

      // Filter records for this org
      const orgProjects = (allProjects || []).filter(p => p.organization_id === org.id);
      const orgTakeoffs = (allTakeoffs || []).filter(t => t.organization_id === org.id);
      const orgProposals = (allProposals || []).filter(p => p.organization_id === org.id);
      const orgPayments = (allPayments || []).filter(p => p.organization_id === org.id);
      const orgMessages = (allMessages || []).filter(m => m.organization_id === org.id);

      // 1. NEW LEADS — projects created in lookback matching trade + location
      const newLeads = orgProjects.filter(p => {
        if (!p.created_date || new Date(p.created_date) < sinceDate) return false;
        if (notifiedKeys.has(`${p.id}_new_lead`)) return false;
        return projectMatchesOrg(p, orgTrades, orgState);
      });
      newLeads.forEach(p => {
        const parts = [];
        if (p.jurisdiction) parts.push(p.jurisdiction);
        if (p.bid_due_date) {
          const d = new Date(p.bid_due_date);
          if (!isNaN(d.getTime())) parts.push(`Due ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);
        }
        if (p.value && Number(p.value) > 0) parts.push(`$${Math.round(Number(p.value)).toLocaleString()}`);
        alerts.push({
          type: 'new_lead',
          title: `🚨 New Lead: ${(p.title || 'New Opportunity').slice(0, 60)}`,
          detail: parts.join(' · ') || 'New construction opportunity matching your criteria',
          link: `/leads/${p.id}`,
          key: `${p.id}_new_lead`,
          projectId: p.id
        });
      });

      // 2. PENDING TAKEOFF APPROVALS — takeoffs with reviewer_decision=pending or approval_state=unreviewed
      const pendingTakeoffs = orgTakeoffs.filter(t => {
        if (!t.created_date || new Date(t.created_date) < sinceDate) return false;
        if (notifiedKeys.has(`${t.project_id}_takeoff_approval`)) return false;
        return t.reviewer_decision === 'pending' || t.approval_state === 'unreviewed';
      });
      const takeoffProjectIds = [...new Set(pendingTakeoffs.map(t => t.project_id))];
      takeoffProjectIds.forEach(pid => {
        const project = orgProjects.find(p => p.id === pid);
        alerts.push({
          type: 'takeoff_approval',
          title: '✅ Takeoffs Complete — Approve Now',
          detail: `${project?.title ? project.title + ' — ' : ''}Your takeoffs are complete. Click here to approve so we can get your bid packages ready for final review.`,
          link: `/takeoff-review`,
          key: `${pid}_takeoff_approval`,
          projectId: pid
        });
      });

      // 3. BID PACKAGE READY TO EMAIL — proposals with status approved/internal_review/send_pending
      const readyBids = orgProposals.filter(p => {
        const checkDate = p.updated_date || p.created_date;
        if (!checkDate || new Date(checkDate) < sinceDate) return false;
        if (notifiedKeys.has(`${p.id}_bid_ready`)) return false;
        return ['approved', 'internal_review', 'send_pending'].includes(p.status);
      });
      readyBids.forEach(p => {
        const parts = [p.title || 'Bid Package'];
        if (p.client_name) parts.push(`for ${p.client_name}`);
        if (p.total_value && Number(p.total_value) > 0) parts.push(`$${Math.round(Number(p.total_value)).toLocaleString()}`);
        alerts.push({
          type: 'bid_ready',
          title: '📦 Bid Package Ready to Send',
          detail: parts.join(' '),
          link: `/proposals/${p.id}`,
          key: `${p.id}_bid_ready`,
          projectId: p.project_id
        });
      });

      // 4. CONTRACTOR RESPONSES — proposals with status=responded
      const responses = orgProposals.filter(p => {
        if (!p.updated_date || new Date(p.updated_date) < sinceDate) return false;
        if (notifiedKeys.has(`${p.id}_contractor_response`)) return false;
        return p.status === 'responded';
      });
      responses.forEach(p => {
        alerts.push({
          type: 'contractor_response',
          title: '💬 Contractor Response Received',
          detail: `${p.title || 'A proposal'}${p.client_name ? ` — ${p.client_name}` : ''} has a response`,
          link: `/proposals/${p.id}`,
          key: `${p.id}_contractor_response`,
          projectId: p.project_id
        });
      });

      // 5. DEPOSIT PAYMENTS POSTED — payments with status=completed and payment_type=deposit
      const deposits = orgPayments.filter(p => {
        if (!p.created_date || new Date(p.created_date) < sinceDate) return false;
        if (notifiedKeys.has(`${p.id}_deposit_posted`)) return false;
        return p.status === 'completed' && p.payment_type === 'deposit';
      });
      deposits.forEach(p => {
        alerts.push({
          type: 'deposit_posted',
          title: '💰 Deposit Payment Posted',
          detail: `$${Math.round(Number(p.amount || 0)).toLocaleString()} deposit${p.method ? ` via ${p.method}` : ''}`,
          link: `/money`,
          key: `${p.id}_deposit_posted`,
          projectId: p.project_id
        });
      });

      // 6. CONTRACTOR MESSAGES — inbound unread emails
      const newMessages = orgMessages.filter(m => {
        if (!m.created_date || new Date(m.created_date) < sinceDate) return false;
        if (notifiedKeys.has(`${m.id}_message`)) return false;
        return m.direction === 'inbound' && m.status === 'unread';
      });
      newMessages.forEach(m => {
        alerts.push({
          type: 'contractor_message',
          title: '📧 New Message from Contractor',
          detail: `${m.subject || 'No subject'}${m.sender ? ` — from ${m.sender}` : ''}`,
          link: `/messages`,
          key: `${m.id}_message`,
          projectId: m.project_id
        });
      });

      if (alerts.length === 0) continue;

      // Build HTML email
      const alertHtml = alerts.map(a => `
        <div style="padding:16px;border:1px solid #e5e5e5;border-radius:8px;margin-bottom:12px;background:#fff;">
          <p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#080808;">${a.title}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#666;">${a.detail}</p>
          <a href="https://autoleads.base44.app${a.link}" style="display:inline-block;padding:8px 16px;background:#f2df0d;color:#080808;text-decoration:none;font-weight:bold;border-radius:6px;font-size:13px;">View in AUTOLEADS →</a>
        </div>
      `).join('');

      const htmlBody = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 style="font-size:24px;font-weight:900;color:#080808;margin:0;">AUTOLEADS Alert</h1>
          <p style="font-size:14px;color:#999;margin:4px 0 0;">You have ${alerts.length} new notification${alerts.length > 1 ? 's' : ''}</p>
        </div>
        ${alertHtml}
        <div style="text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid #e5e5e5;">
          <p style="font-size:12px;color:#999;">AUTOLEADS — Your autonomous preconstruction operating system</p>
        </div>
      </div>`;

      try {
        await svc.integrations.Core.SendEmail({
          to: userEmail,
          subject: `🚨 AUTOLEADS: ${alerts.length} New Alert${alerts.length > 1 ? 's' : ''}`,
          body: htmlBody
        });
        totalEmailsSent++;

        // Track sent alerts to prevent duplicates
        await svc.entities.PipelineEvent.bulkCreate(
          alerts.map(a => ({
            organization_id: org.id,
            project_id: a.projectId || null,
            step: 'email',
            status: 'completed',
            event_type: 'email_alert_sent',
            message: a.key,
            occurred_at: new Date().toISOString()
          }))
        );
        results.push({ org: org.name, email: userEmail, alertCount: alerts.length });
      } catch (emailErr) {
        totalSkipped++;
        results.push({ org: org.name, error: emailErr.message });
      }
    }

    return Response.json({
      status: 'success',
      totalEmailsSent,
      totalSkipped,
      results: results.slice(0, 20)
    });
  } catch (error) {
    console.error('sendEmailAlerts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}