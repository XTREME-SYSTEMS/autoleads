// =============================================================================
// Free Project Cost Evaluation — Branded introduction email for contact-only
// leads (no specs, no plans, no bid invitation). These are leads discovered from
// universal sources: homeowners posting "need work done", property managers,
// HOAs, facility managers, investors, restoration partners, contractors, etc.
//
// The email offers a FREE project cost evaluation and asks the recipient to
// reply with: photos of their project, square footage, and their desired
// outcome / wants / needs. Once they respond, the lead is normalized into a
// full Project with specs and entered into the pipeline.
// =============================================================================

import { COMPANY, FROM_NAME } from './contractorOutreach.ts';

export { FROM_NAME };

function shell(inner: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:28px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.10);max-width:600px;">
<tr><td style="background:#0a0a0a;padding:30px 40px;">
<div style="color:#f2df0d;font-size:22px;font-weight:bold;letter-spacing:.5px;">NATIONAL CONCRETE POLISHING</div>
<div style="color:#8a8a8a;font-size:11px;margin-top:6px;letter-spacing:1.5px;text-transform:uppercase;">Epoxy • Polished Concrete • Decorative Concrete • Coatings</div>
</td></tr>
<tr><td style="padding:34px 40px;color:#1a1a1a;font-size:15px;line-height:1.65;">${inner}</td></tr>
<tr><td style="background:#fafafa;padding:20px 40px;border-top:1px solid #eee;">
<div style="color:#888;font-size:11px;line-height:1.5;">
<strong style="color:#444;">National Concrete Polishing</strong> — A partner company of Xtreme Polishing Systems<br>
70+ locations • 30+ years experience • Polished Concrete University
</div>
</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

// The free evaluation intro email — sent to contact-only leads.
// `c` can be a Contractor, Contact, or any entity with { contact_name, company_name, email }.
export const FREE_EVAL_INTRO_EMAIL = {
  subject: 'Free Project Cost Evaluation — National Concrete Polishing',
  body: (c: any) => shell(`
    <p style="margin:0 0 16px;">Hello${c.contact_name ? ' ' + c.contact_name : c.company_name ? ' ' + c.company_name : ''},</p>
    <p style="margin:0 0 16px;">I'm reaching out from <strong>National Concrete Polishing</strong> — a partner company of <strong>Xtreme Polishing Systems</strong>, with <strong>${COMPANY.locations}</strong> and over <strong>${COMPANY.years} of experience</strong> in epoxy flooring, polished concrete, decorative concrete, and industrial coatings.</p>

    <div style="background:#FFF7DA;border-left:4px solid #f2df0d;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 8px;font-weight:bold;color:#0a0a0a;font-size:16px;">🎯 Free Project Cost Evaluation</p>
      <p style="margin:0;color:#333;">If you have a concrete, epoxy, polishing, or coating project — big or small — we'd love to give you a <strong>free, no-obligation cost evaluation</strong>. No plans? No problem. Just reply with a few details and we'll take it from there.</p>
    </div>

    <p style="margin:0 0 8px;font-weight:bold;color:#0a0a0a;">What to Send Us (Reply With Any of These):</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#333;">
      <li style="margin:6px 0;"><strong>📸 Photos</strong> of the area you want finished (garage, warehouse, patio, retail floor, etc.)</li>
      <li style="margin:6px 0;"><strong>📐 Square footage</strong> (even a rough estimate helps)</li>
      <li style="margin:6px 0;"><strong>✨ Your desired outcome</strong> — epoxy, polished concrete, decorative, industrial coating, or "not sure yet"</li>
      <li style="margin:6px 0;"><strong>📋 Any wants or needs</strong> — timeline, budget range, special conditions (food-safe, chemical-resistant, high-traffic, etc.)</li>
    </ul>

    <p style="margin:0 0 16px;">Once we receive your photos and details, we'll put together a <strong>complete, itemized cost evaluation — usually within 24 hours</strong>. From there, we can schedule a site visit if needed and get your project on the schedule.</p>

    <p style="margin:0 0 8px;font-weight:bold;color:#0a0a0a;">Our Specialties:</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#333;">${COMPANY.specialties.map((s) => `<li style="margin:4px 0;">${s}</li>`).join('')}</ul>

    <p style="margin:0 0 16px;"><strong style="color:#0a0a0a;">${COMPANY.promise}</strong> ${COMPANY.mobilize}</p>

    <div style="text-align:center;margin:24px 0;">
      <a href="mailto:info@nationalconcretepolishing.com?subject=Free%20Project%20Cost%20Evaluation" style="display:inline-block;padding:16px 40px;background:#f2df0d;color:#0a0a0a;text-decoration:none;font-weight:bold;font-size:16px;border-radius:8px;">Reply to Get Your Free Evaluation →</a>
    </div>

    <p style="margin:0 0 8px;">Looking forward to hearing about your project.</p>
    <p style="margin:16px 0 0 0;">Best regards,<br><strong>National Concrete Polishing</strong><br><span style="color:#888;font-size:13px;">Partner of Xtreme Polishing Systems • 70+ locations nationwide</span></p>
  `),
};

export const FREE_EVAL_FOLLOWUP_EMAIL = {
  subject: 'Quick follow-up — Your Free Project Cost Evaluation',
  body: (c: any) => shell(`
    <p style="margin:0 0 16px;">Hello${c.contact_name ? ' ' + c.contact_name : ''},</p>
    <p style="margin:0 0 16px;">Just following up on my note about the <strong>free project cost evaluation</strong> from National Concrete Polishing. We'd love to help with any epoxy, polished concrete, or coating work you're considering.</p>
    <p style="margin:0 0 16px;">All we need to get started is a few photos of your space, a rough square footage, and an idea of what you're looking for. We'll send back a complete, itemized cost evaluation within 24 hours — no obligation.</p>
    <p style="margin:0 0 16px;">Just reply to this email with the details and we'll take it from there.</p>
    <p style="margin:16px 0 0 0;">Best regards,<br><strong>National Concrete Polishing</strong></p>
  `),
};

export function renderFreeEvalTemplate(tpl: any, c: any): { subject: string; body: string } {
  return { subject: tpl.subject, body: typeof tpl.body === 'function' ? tpl.body(c) : tpl.body };
}