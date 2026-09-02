// Shared outreach utilities used by both sendContractorOutreach and
// sendFreeEvaluationOutreach — email sending, date helpers, validation.

export const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function nextDateIso(days: number): string {
  return new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}

// Send an email via the user's Gmail connector (user context) or the built-in
// SendEmail integration (service-role / workflow context).
export async function sendEmailTo(client: any, user: any, to: string, subject: string, bodyHtml: string, fromName: string): Promise<boolean> {
  if (!to) return false;
  if (user) {
    try { const r: any = await client.functions.invoke('sendEmail', { to, subject, body: bodyHtml, from_name: fromName }); return Boolean(r?.success); }
    catch { return false; }
  }
  try { const r: any = await client.integrations.Core.SendEmail({ to, subject, body: bodyHtml, from_name: fromName }); return !r?.error; }
  catch { return false; }
}

// Normalize any contact-shaped record into something email templates can render.
export function normalizeContact(c: any): any {
  return {
    contact_name: c.contact_name || c.full_name || c.name || '',
    company_name: c.company_name || c.company || '',
    email: c.email || '',
    ...c,
  };
}