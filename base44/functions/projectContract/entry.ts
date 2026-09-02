import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { authenticate } from '../../shared/internalAuth.ts';

function emailFrom(text: unknown): string {
  const match = String(text || '').match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return match ? match[0].toLowerCase() : '';
}
function randomToken(): string {
  const bytes = new Uint8Array(32); crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
async function sha256(input: string): Promise<string> {
  const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(data), b => b.toString(16).padStart(2, '0')).join('');
}
function substitute(template: string, values: Record<string, string>): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    const safe = value || 'Not provided';
    out = out.replaceAll(`{{${key}}}`, safe).replaceAll(`[${key}]`, safe);
  }
  return out;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user || !client) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const action = String(body?.action || 'create');
    const projectId = String(body?.project_id || '').trim();
    if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 });
    const project = await client.entities.Project.get(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });
    const orgId = project.organization_id || '';
    const proposals = await client.entities.Proposal.filter({ project_id: projectId }).catch(() => []);
    const proposal = (proposals || []).find((p: any) => ['approved', 'delivered', 'responded', 'won'].includes(p.status)) || (proposals || [])[0];
    const clientEmail = String(body?.client_email || proposal?.client_email || emailFrom(project.contract_info)).trim().toLowerCase();
    const clientName = String(body?.client_name || proposal?.client_name || project.client_name || project.authority || 'Client').trim();

    if (action === 'create') {
      const existing = await client.entities.EsignDocument.filter({ project_id: projectId }).catch(() => []);
      const current = (existing || []).find((d: any) => d.document_type === 'contract' && !['declined', 'expired'].includes(d.status));
      if (current && !body?.force_new) return Response.json({ success: true, idempotent: true, document: current });
      if (!proposal || Number(proposal.total_value || 0) <= 0) return Response.json({ error: 'A priced proposal is required before creating a contract', blocker: 'bid' }, { status: 409 });
      if (!clientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail)) return Response.json({ error: 'A valid client email is required before creating a contract', blocker: 'client_email' }, { status: 409 });
      const templates = await client.entities.ContractTemplate.filter({ organization_id: orgId }, '-created_date', 200).catch(() => []);
      const approved = (templates || []).find((t: any) => t.validation_status === 'validated' && t.validated_by_user === true && (t.trade === project.trade || t.contract_type === 'universal')) || (templates || []).find((t: any) => t.validation_status === 'validated' && t.validated_by_user === true);
      if (!approved?.content) return Response.json({ error: 'A user-approved contract template is required before creating a project contract', blocker: 'approved_contract_template' }, { status: 409 });
      const companies = await client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []);
      const company = (companies || [])[0] || {};
      const total = Number(proposal.total_value || 0);
      const content = `${substitute(String(approved.content), {
        PROJECT_NAME: project.title || '', CLIENT_NAME: clientName, CLIENT_EMAIL: clientEmail,
        CONTRACTOR_NAME: company.name || '', CONTRACTOR_EMAIL: company.email || user.email || '',
        PROJECT_ADDRESS: project.address || '', PROJECT_VALUE: `$${total.toLocaleString()}`,
        TRADE: project.trade || '', EFFECTIVE_DATE: new Date().toISOString().slice(0, 10),
      })}\n\nPROJECT-SPECIFIC SCHEDULE\nProject: ${project.title}\nClient: ${clientName}\nProject address: ${project.address || 'Not provided'}\nContract value: $${total.toLocaleString()}\nScope reference: ${String(project.specs || '').slice(0, 4000)}`;
      const signedContract = await client.entities.SignedContract.create({
        organization_id: orgId, project_id: projectId, contract_template_id: approved.id, title: `${project.title} - Contract`, content, status: 'draft',
        parties: [{ name: company.name || 'Contractor', role: 'contractor', email: company.email || user.email || '' }, { name: clientName, role: 'client', email: clientEmail }],
        total_value: total, payment_terms: String(body?.payment_terms || 'Payment terms per approved contract template.'),
      });
      const token = randomToken();
      const document = await client.entities.EsignDocument.create({
        organization_id: orgId, project_id: projectId, proposal_id: proposal.id, contract_id: signedContract.id, title: signedContract.title,
        document_type: 'contract', status: 'draft', signers: [{ name: clientName, email: clientEmail, role: 'client' }], content,
        expires_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), access_token_hash: await sha256(token),
      });
      await client.entities.SignedContract.update(signedContract.id, { esign_document_id: document.id });
      await client.entities.Proposal.update(proposal.id, { esign_document_id: document.id, signature_status: 'not_sent' });
      await client.entities.PipelineEvent.create({ organization_id: orgId, project_id: projectId, step: 'contract', status: 'pending', event_type: 'contract_created', source_record_id: document.id, message: 'Project contract created from a user-approved template.', occurred_at: new Date().toISOString() }).catch(() => null);
      return Response.json({ success: true, contract: signedContract, document, signing_url: `/esign/${document.id}?token=${token}`, requires_send: true });
    }

    if (action === 'send') {
      const documentId = String(body?.document_id || '').trim();
      if (!documentId) return Response.json({ error: 'document_id is required' }, { status: 400 });
      const document = await client.entities.EsignDocument.get(documentId).catch(() => null);
      if (!document || document.project_id !== projectId || document.document_type !== 'contract') return Response.json({ error: 'Contract document not found' }, { status: 404 });
      const recipient = document.signers?.find((s: any) => s.email)?.email || clientEmail;
      if (!recipient) return Response.json({ error: 'No signer email is configured' }, { status: 409 });
      const token = randomToken();
      const publicUrl = String(secrets.get('PUBLIC_APP_URL') || body?.app_origin || '').replace(/\/$/, '');
      if (!publicUrl || !/^https:\/\//i.test(publicUrl)) return Response.json({ error: 'PUBLIC_APP_URL must be configured with an HTTPS URL before sending contracts', blocker: 'PUBLIC_APP_URL' }, { status: 503 });
      const signingUrl = `${publicUrl}/esign/${document.id}?token=${token}`;
      const sendResult = await base44.functions.invoke('sendEmail', { to: recipient, subject: `Signature requested: ${document.title}`, body: `A contract is ready for your review and electronic signature.\n\nReview and sign securely: ${signingUrl}\n\nThis link expires ${document.expires_date || 'in 30 days'}.`, project_id: projectId });
      if (sendResult?.error) throw new Error(sendResult.error);
      const updated = await client.entities.EsignDocument.update(document.id, { access_token_hash: await sha256(token), status: 'sent', sent_at: new Date().toISOString() });
      if (proposal) await client.entities.Proposal.update(proposal.id, { signature_status: 'awaiting_signature' });
      const contracts = await client.entities.SignedContract.filter({ project_id: projectId }).catch(() => []);
      const linked = (contracts || []).find((c: any) => c.esign_document_id === document.id);
      if (linked) await client.entities.SignedContract.update(linked.id, { status: 'sent' });
      await client.entities.PipelineEvent.create({ organization_id: orgId, project_id: projectId, step: 'contract', status: 'in_progress', event_type: 'contract_sent', source_record_id: document.id, message: `Contract sent to ${recipient}.`, occurred_at: new Date().toISOString() }).catch(() => null);
      return Response.json({ success: true, document: updated, sent_to: recipient });
    }
    return Response.json({ error: 'Invalid action. Use create or send.' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Contract workflow failed' }, { status: 500 });
  }
}