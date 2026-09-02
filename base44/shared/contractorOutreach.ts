// =============================================================================
// Contractor Outreach — Company capabilities + branded email templates for
// autonomous introductory & follow-up emails to Florida contractors.
// Consumed by sendContractorOutreach. Templates are ready to send immediately.
// =============================================================================

export const COMPANY = {
  name: 'National Concrete Polishing',
  partner: 'Xtreme Polishing Systems',
  partner_desc: 'the largest epoxy distributor in the United States',
  locations: '70+ locations nationwide',
  university: 'Polished Concrete University',
  university_desc: 'interactive, advanced epoxy, polished concrete & coating training classes every week',
  years: '30+ years',
  promise: 'Full proposals in as little as 24 hours — guaranteed.',
  mobilize: "We can mobilize on a moment's notice when needed.",
  specialties: [
    'Epoxy & resinous flooring', 'Polished concrete', 'Decorative & stamped concrete',
    'Concrete overlays & microtoppings', 'Concrete resurfacing & restoration',
    'Terrazzo restoration', 'Industrial & warehouse floor coatings',
    'Commercial floor coatings', 'Concrete countertops',
    'Pool deck, patio & driveway coatings',
  ],
};

export const FROM_NAME = 'National Concrete Polishing';

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

export const INTRO_EMAIL = {
  subject: 'Introduction — National Concrete Polishing | 24-Hour Proposals, 30+ Years Experience',
  body: (c: any) => shell(`
    <p style="margin:0 0 16px;">Hello${c.contact_name ? ' ' + c.contact_name : ''},</p>
    <p style="margin:0 0 16px;">I'm reaching out from <strong>National Concrete Polishing</strong> to introduce our company and respectfully request to be added to your bidding list for any concrete, epoxy, polishing, or coating scopes you may need pricing on.</p>
    <p style="margin:0 0 8px;font-weight:bold;color:#0a0a0a;">Who We Are</p>
    <p style="margin:0 0 16px;">We are a partner company to <strong>Xtreme Polishing Systems</strong> — ${COMPANY.partner_desc}. We own and operate <strong>${COMPANY.locations}</strong>, and we own <strong>${COMPANY.university}</strong>, which provides ${COMPANY.university_desc}. With over <strong>${COMPANY.years} of experience</strong>, we deliver highly competitive bids at lightning speed.</p>
    <p style="margin:0 0 8px;font-weight:bold;color:#0a0a0a;">Our Specialties</p>
    <ul style="margin:0 0 16px;padding-left:20px;color:#333;">${COMPANY.specialties.map((s) => `<li style="margin:4px 0;">${s}</li>`).join('')}</ul>
    <p style="margin:0 0 16px;"><strong style="color:#0a0a0a;">${COMPANY.promise}</strong> ${COMPANY.mobilize}</p>
    <p style="margin:0 0 16px;">We would welcome the opportunity to bid on your upcoming projects. Please add us to your bidder list, and feel free to send any plans, specs, or scope requests — we'll turn around a complete, competitive proposal within 24 hours.</p>
    <p style="margin:0 0 8px;">Thank you for your time, and we look forward to working with you.</p>
    <p style="margin:16px 0 0 0;">Best regards,<br><strong>National Concrete Polishing</strong><br><span style="color:#888;font-size:13px;">Partner of Xtreme Polishing Systems</span></p>
  `),
};

export const FOLLOWUP_EMAILS = [
  { subject: 'Quick follow-up — National Concrete Polishing',
    body: (c: any) => shell(`
      <p style="margin:0 0 16px;">Hello${c.contact_name ? ' ' + c.contact_name : ''},</p>
      <p style="margin:0 0 16px;">I wanted to follow up on my introduction from <strong>National Concrete Polishing</strong>. We're still available and ready to bid on any concrete, epoxy, polishing, or coating scopes you have coming up.</p>
      <p style="margin:0 0 16px;">As a reminder, we're a partner of <strong>Xtreme Polishing Systems</strong>, with <strong>${COMPANY.locations}</strong> and <strong>${COMPANY.years} of experience</strong>. <strong>${COMPANY.promise}</strong></p>
      <p style="margin:0 0 16px;">Please add us to your bidder list and send any upcoming plans or scope requests — we'll have a full proposal back to you within 24 hours.</p>
      <p style="margin:16px 0 0 0;">Best regards,<br><strong>National Concrete Polishing</strong></p>
    `) },
  { subject: 'Still available — National Concrete Polishing',
    body: (c: any) => shell(`
      <p style="margin:0 0 16px;">Hello${c.contact_name ? ' ' + c.contact_name : ''},</p>
      <p style="margin:0 0 16px;">Just checking in from <strong>National Concrete Polishing</strong>. We'd love to be on your bidder list for any epoxy, polished concrete, decorative concrete, or coating work.</p>
      <p style="margin:0 0 16px;">We can mobilize on a moment's notice and deliver full proposals in 24 hours — guaranteed. Send any plans or scope requests our way and we'll take care of the rest.</p>
      <p style="margin:16px 0 0 0;">Best regards,<br><strong>National Concrete Polishing</strong></p>
    `) },
  { subject: 'Final note — National Concrete Polishing',
    body: (c: any) => shell(`
      <p style="margin:0 0 16px;">Hello${c.contact_name ? ' ' + c.contact_name : ''},</p>
      <p style="margin:0 0 16px;">This will be my last note for now from <strong>National Concrete Polishing</strong>. If you have any concrete, epoxy, polishing, or coating scopes — now or in the future — we're ready to bid with a full proposal in 24 hours.</p>
      <p style="margin:0 0 16px;">Keep us on file: partner of <strong>Xtreme Polishing Systems</strong>, ${COMPANY.locations}, ${COMPANY.years} of experience. We'd be glad to earn a spot on your bidder list.</p>
      <p style="margin:16px 0 0 0;">Best regards,<br><strong>National Concrete Polishing</strong></p>
    `) },
];

export function renderTemplate(tpl: any, c: any): { subject: string; body: string } {
  return { subject: tpl.subject, body: typeof tpl.body === 'function' ? tpl.body(c) : tpl.body };
}