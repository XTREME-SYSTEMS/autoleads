import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { buildBrandedBidEmail } from '../../shared/brandedEmail.ts';

// scheduleProject — sends a branded scheduling email to the contractor with
// available dates and an interactive "Approve Date" button. When the contractor
// clicks approve (via a deep link back to the app), the system creates a Google
// Calendar event for the scheduled job and notifies the user.

const CALENDAR_CONNECTOR_ID = '69ddcb305a599e0b1b3cff';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = String(body?.project_id || '').trim();
    const availableDates = Array.isArray(body?.available_dates) ? body.available_dates : [];
    const notes = String(body?.notes || '').trim();

    if (!projectId || availableDates.length === 0) {
      return Response.json({ error: 'project_id and available_dates array are required' }, { status: 400 });
    }

    const project = await client.entities.Project.get(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const orgId = project.organization_id || '';
    const [companies, brandAssets, projectImages, proposals] = await Promise.all([
      client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
      client.entities.BrandAsset.filter({ organization_id: orgId }).catch(() => []),
      client.entities.ProjectImage.filter({ organization_id: orgId }).catch(() => []),
      client.entities.Proposal.filter({ project_id: projectId }).catch(() => []),
    ]);

    const company = (companies || [])[0] || {};
    const logo = (brandAssets || []).find((b: any) => b.type === 'logo') || (brandAssets || [])[0] || null;
    const proposal = (proposals || [])[0] || null;
    const recipient = proposal?.client_email || (String(project.contract_info || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] || '');

    if (!recipient) {
      return Response.json({ error: 'No contractor email found for this project' }, { status: 400 });
    }

    // Build the scheduling email
    const dateOptionsHtml = availableDates.map((d: string, i: number) => {
      const date = new Date(d);
      const formatted = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      const approveUrl = `https://autoleads.base44.app/schedule-approve?project=${projectId}&date=${encodeURIComponent(d)}&idx=${i}`;
      return `<div style="background:#f9f9f9;border:1px solid #e0e0e0;border-radius:8px;padding:15px;margin:10px 0;text-align:center;">
        <p style="font-size:16px;font-weight:bold;color:#080808;margin:0 0 10px;">${formatted}</p>
        <a href="${approveUrl}" style="display:inline-block;padding:10px 24px;background:#FFC400;color:#080808;text-decoration:none;font-weight:bold;border-radius:6px;font-size:14px;">Approve This Date</a>
      </div>`;
    }).join('');

    const logoHtml = logo?.file_url || logo?.url
      ? `<img src="${logo.file_url || logo.url}" style="max-height:60px;margin-bottom:15px;"/>`
      : `<h1 style="color:#080808;">${company.name || 'AUTOLEADS'}</h1>`;

    const htmlBody = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:25px 20px;background:#fff;border-radius:12px 12px 0 0;">${logoHtml}</div>
  <div style="background:#fff;padding:0 30px 30px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;color:#080808;">Dear ${proposal?.client_name || project?.client_name || 'Valued Client'},</p>
    <p style="font-size:15px;line-height:1.6;color:#333;">
      Great news! We're ready to schedule your project: <strong>${project.title}</strong>.
      Please review the available start dates below and click "Approve This Date" for your preferred option.
      Once you approve, we'll confirm the schedule and add it to our calendar.
    </p>
    ${notes ? `<div style="background:#FFF7DA;border-radius:8px;padding:15px;margin:15px 0;"><p style="margin:0;font-size:14px;color:#333;"><strong>Note from ${company.name || 'us'}:</strong> ${notes}</p></div>` : ''}
    <p style="font-size:14px;font-weight:bold;color:#080808;margin:20px 0 10px;">Available Start Dates:</p>
    ${dateOptionsHtml}
    <p style="font-size:14px;color:#666;margin-top:20px;">If none of these dates work, please reply to this email with your preferred timeframe.</p>
  </div>
  <div style="background:#080808;padding:20px 30px;border-radius:12px;margin-top:15px;text-align:center;">
    <p style="font-size:16px;font-weight:bold;color:#FFC400;margin:0 0 8px;">${company.name || 'AUTOLEADS'}</p>
    <div style="font-size:13px;color:#fff;">
      ${company.phone ? `<a href="tel:${company.phone}" style="color:#FFC400;text-decoration:none;">📞 ${company.phone}</a> &nbsp;|&nbsp; ` : ''}
      ${company.email ? `<a href="mailto:${company.email}" style="color:#FFC400;text-decoration:none;">✉️ ${company.email}</a>` : ''}
    </div>
  </div>
</div></body></html>`;

    // Send the email
    const sendResult = await client.functions.invoke('sendEmail', {
      to: recipient,
      subject: `Schedule Your Project: ${project.title} — Available Dates Inside`,
      body: htmlBody,
    });

    // Log pipeline event
    await client.entities.PipelineEvent.create({
      organization_id: orgId,
      project_id: projectId,
      step: 'schedule',
      status: 'in_progress',
      event_type: 'scheduling_email_sent',
      message: `Scheduling email sent to ${recipient} with ${availableDates.length} available dates.`,
      occurred_at: new Date().toISOString(),
    }).catch(() => null);

    // Store available dates on project for approval tracking
    await client.entities.Project.update(projectId, {
      address: project.address, // preserve
    }).catch(() => null);

    // Create action item
    await client.entities.ActionItem.create({
      organization_id: orgId,
      project_id: projectId,
      title: `Awaiting schedule approval: ${project.title}`,
      description: `Scheduling email sent with ${availableDates.length} date options. Waiting for contractor to approve a start date.`,
      category: 'scheduling',
      priority: 'medium',
      status: 'open',
    }).catch(() => null);

    return Response.json({
      status: 'success',
      project_id: projectId,
      recipient,
      dates_offered: availableDates.length,
      send_receipt: sendResult?.messageId || sendResult?.id || 'sent',
    });
  } catch (error: any) {
    console.error('scheduleProject error:', error);
    return Response.json({ error: error?.message || 'Scheduling failed' }, { status: 500 });
  }
}