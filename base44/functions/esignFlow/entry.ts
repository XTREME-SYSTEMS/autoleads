import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

// Cryptographic helpers for secure signing tokens
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

async function hashContent(content: string): Promise<string> {
  const data = new TextEncoder().encode(content || '');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function getClientIp(req: Request): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown';
}

function addAuditLog(doc: any, entry: any): any[] {
  const log = Array.isArray(doc.signing_audit_log) ? [...doc.signing_audit_log] : [];
  log.push({ ...entry, timestamp: new Date().toISOString() });
  return log;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, document_id } = body;

    // ---- Public actions (signing): require a valid signing token ----
    const isPublicAction = action === 'get' || action === 'sign';
    let user: any = null;
    let orgId: string | null = null;

    if (!isPublicAction) {
      // Authenticated actions: create, send, list
      const { client, user: authUser, authorized } = await authenticate(req, base44);
      if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      user = authUser;
      // Resolve org context for authenticated calls
      if (user) {
        const ctx = await resolveUserOrgs(base44, user.id);
        orgId = ctx.primaryOrgId;
      }
    }

    // Use service role for public signing actions (token validates access)
    const ec = isPublicAction ? base44.asServiceRole.entities.EsignDocument : base44.entities.EsignDocument;

    // ---- Action: create ----
    if (action === 'create') {
      const { title, content, document_type, project_id, proposal_id, contract_id, signers, expires_date } = body;
      if (!title || !content) return Response.json({ error: 'title and content are required' }, { status: 400 });

      const docHash = await hashContent(content);
      const sanitizedSigners = Array.isArray(signers) ? signers.map((s: any) => ({
        name: String(s.name || ''),
        email: String(s.email || '').toLowerCase().trim(),
        role: String(s.role || 'signer'),
      })).filter((s: any) => s.email) : [];

      const doc = await ec.create({
        organization_id: orgId || '',
        project_id: project_id || null,
        proposal_id: proposal_id || null,
        contract_id: contract_id || null,
        title,
        document_type: document_type || 'contract',
        status: 'draft',
        signers: sanitizedSigners,
        content,
        document_hash: docHash,
        signing_audit_log: [{ event: 'created', timestamp: new Date().toISOString(), signer_email: user?.email || '' }],
        expires_date: expires_date || null,
      });

      return Response.json({
        success: true,
        document: { id: doc.id, title: doc.title, status: doc.status },
        message: 'E-sign document created. Use the send action to generate secure signing links.'
      });
    }

    // ---- Action: send — generate tokens and email signers ----
    if (action === 'send') {
      if (!document_id) return Response.json({ error: 'document_id is required' }, { status: 400 });
      const doc = await ec.get(document_id);
      if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });

      const expiresInDays = 30;
      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();

      // Generate a unique token for each signer, store only the hash
      const signersWithTokens = [];
      const tokenMap = []; // {email, token} — only used for emailing, not persisted
      for (const signer of (doc.signers || [])) {
        const token = generateToken();
        const tokenHash = await hashToken(token);
        signersWithTokens.push({
          ...signer,
          token_hash: tokenHash,
          token_expires: expiresAt,
          token_consumed_date: null,
          signed_date: null,
          signature_data: null,
        });
        tokenMap.push({ email: signer.email, token });
      }

      const origin = String(body?.origin || 'https://autoleads.base44.app').replace(/\/$/, '');
      let emailed = 0;
      for (const { email, token } of tokenMap) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: email,
            subject: `Document for Signature: ${doc.title}`,
            body: `<h2>You have a document ready for signature</h2>
<p><strong>${doc.title}</strong></p>
<p>Please review and sign the document at the link below:</p>
<p><a href="${origin}/esign/${doc.id}?token=${token}">Review & Sign Document</a></p>
<p>This link will expire in ${expiresInDays} days. Only you can sign using this link.</p>`,
          });
          emailed++;
        } catch (e) {
          console.error(`Failed to email signer ${email}:`, e?.message || e);
        }
      }

      const updated = await ec.update(document_id, {
        signers: signersWithTokens,
        status: 'sent',
        expires_date: doc.expires_date || new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        signing_audit_log: addAuditLog(doc, { event: 'sent', signer_email: user?.email || '', reason: `${emailed} signers emailed` }),
      });

      return Response.json({ success: true, document: { id: updated.id, status: 'sent' }, emailed, message: 'Document sent with secure signing links' });
    }

    // ---- Action: get — validate signing token before returning content ----
    if (action === 'get') {
      if (!document_id) return Response.json({ error: 'document_id is required' }, { status: 400 });
      const { signing_token } = body;
      if (!signing_token) return Response.json({ error: 'Signing token required' }, { status: 401 });

      const doc = await ec.get(document_id);
      if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });

      // Validate token against stored hashes
      const tokenHash = await hashToken(String(signing_token));
      const signer = (doc.signers || []).find((s: any) => constantTimeEqual(String(s.token_hash || ''), tokenHash));
      if (!signer) {
        await ec.update(document_id, {
          signing_audit_log: addAuditLog(doc, { event: 'token_denied', signer_email: '', ip: getClientIp(req), reason: 'Invalid token' }),
        }).catch(() => null);
        return Response.json({ error: 'Invalid or expired signing link' }, { status: 403 });
      }

      // Check expiration
      if (signer.token_expires && new Date(signer.token_expires) < new Date()) {
        await ec.update(document_id, {
          signing_audit_log: addAuditLog(doc, { event: 'token_denied', signer_email: signer.email, ip: getClientIp(req), reason: 'Token expired' }),
        }).catch(() => null);
        return Response.json({ error: 'This signing link has expired' }, { status: 403 });
      }

      // Check if already consumed (replay protection)
      if (signer.token_consumed_date && signer.signed_date) {
        return Response.json({ error: 'This signing link has already been used' }, { status: 403 });
      }

      // Return document content — do NOT return token hashes or other signers' data
      return Response.json({
        success: true,
        document: {
          id: doc.id,
          title: doc.title,
          content: doc.content,
          document_type: doc.document_type,
          status: doc.status,
          expires_date: doc.expires_date,
          document_hash: doc.document_hash,
          signer: { name: signer.name, email: signer.email, role: signer.role },
          has_signed: !!signer.signed_date,
        },
      });
    }

    // ---- Action: sign — validate token, verify signer, record signature ----
    if (action === 'sign') {
      if (!document_id) return Response.json({ error: 'document_id is required' }, { status: 400 });
      const { signing_token, signer_email, signature_data, signer_name } = body;
      if (!signing_token) return Response.json({ error: 'Signing token required' }, { status: 401 });

      const doc = await ec.get(document_id);
      if (!doc) return Response.json({ error: 'Document not found' }, { status: 404 });
      if (doc.status === 'signed') return Response.json({ error: 'Document already fully signed' }, { status: 400 });
      if (doc.status === 'expired') return Response.json({ error: 'Document expired' }, { status: 400 });

      // Validate token
      const tokenHash = await hashToken(String(signing_token));
      const signerIndex = (doc.signers || []).findIndex((s: any) => constantTimeEqual(String(s.token_hash || ''), tokenHash));
      if (signerIndex === -1) {
        await ec.update(document_id, {
          signing_audit_log: addAuditLog(doc, { event: 'token_denied', signer_email: String(signer_email || ''), ip: getClientIp(req), reason: 'Invalid token' }),
        }).catch(() => null);
        return Response.json({ error: 'Invalid or expired signing link' }, { status: 403 });
      }

      const signer = doc.signers[signerIndex];

      // Check expiration
      if (signer.token_expires && new Date(signer.token_expires) < new Date()) {
        await ec.update(document_id, {
          signing_audit_log: addAuditLog(doc, { event: 'token_denied', signer_email: signer.email, ip: getClientIp(req), reason: 'Token expired' }),
        }).catch(() => null);
        return Response.json({ error: 'This signing link has expired' }, { status: 403 });
      }

      // The signer email from the browser MUST match the token's signer — no self-add
      const browserEmail = String(signer_email || '').toLowerCase().trim();
      if (browserEmail && browserEmail !== signer.email) {
        await ec.update(document_id, {
          signing_audit_log: addAuditLog(doc, { event: 'token_denied', signer_email: browserEmail, ip: getClientIp(req), reason: 'Email mismatch' }),
        }).catch(() => null);
        return Response.json({ error: 'This signing link does not belong to this email address' }, { status: 403 });
      }

      // Check replay — if already consumed and signed, deny
      if (signer.token_consumed_date && signer.signed_date) {
        return Response.json({ error: 'This signing link has already been used' }, { status: 403 });
      }

      // Record signature
      const ip = getClientIp(req);
      const now = new Date().toISOString();
      const updatedSigners = [...doc.signers];
      updatedSigners[signerIndex] = {
        ...signer,
        signed_date: now,
        signature_data: signature_data || 'typed',
        name: signer_name || signer.name,
        token_consumed_date: now,
        signer_ip: ip,
      };

      const allSigned = updatedSigners.length > 0 && updatedSigners.every((s: any) => s.signed_date);
      const newStatus = allSigned ? 'signed' : 'viewed';

      const updated = await ec.update(document_id, {
        signers: updatedSigners,
        status: newStatus,
        signing_audit_log: addAuditLog(doc, { event: 'signed', signer_email: signer.email, ip, reason: allSigned ? 'All parties signed' : 'Partial signature' }),
      });

      return Response.json({
        success: true,
        document: { id: updated.id, status: newStatus },
        all_signed: allSigned,
        message: allSigned ? 'All parties have signed. Document is fully executed.' : 'Signature recorded. Waiting for other signers.',
      });
    }

    // ---- Action: list — auth required ----
    if (action === 'list') {
      const filter: any = {};
      if (orgId) filter.organization_id = orgId;
      if (body?.project_id) filter.project_id = body.project_id;
      if (body?.proposal_id) filter.proposal_id = body.proposal_id;
      const docs = await ec.filter(filter, '-created_date', 50);
      return Response.json({ success: true, documents: docs });
    }

    return Response.json({ error: 'Invalid action. Use: create, send, sign, get, or list' }, { status: 400 });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'E-sign operation failed' }, { status: 500 });
  }
}