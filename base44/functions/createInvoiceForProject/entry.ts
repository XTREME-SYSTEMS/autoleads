import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

function moneyNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user || !client) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = String(body?.project_id || '').trim();
    if (!projectId) return Response.json({ error: 'project_id is required' }, { status: 400 });

    const project = await client.entities.Project.get(projectId).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const proposals = await client.entities.Proposal.filter({ project_id: projectId }).catch(() => []);
    const proposal = (proposals || []).find((p: any) => ['approved', 'delivered', 'responded', 'won'].includes(p.status)) || (proposals || [])[0];
    if (!proposal || moneyNumber(proposal.total_value) <= 0) {
      return Response.json({ error: 'A priced proposal is required before creating an invoice', blocker: 'bid' }, { status: 409 });
    }

    const existing = await client.entities.Invoice.filter({ project_id: projectId }).catch(() => []);
    const open = (existing || []).find((i: any) => !['paid', 'void'].includes(i.status));
    if (open && !body?.force_new) return Response.json({ success: true, idempotent: true, invoice: open });

    const orgId = project.organization_id || '';
    const depositPct = Math.min(100, Math.max(1, Number(body?.deposit_pct || 50)));
    const proposalTotal = moneyNumber(proposal.total_value);
    const requested = moneyNumber(body?.amount);
    const invoiceTotal = requested > 0 ? Math.min(requested, proposalTotal) : Math.round(proposalTotal * depositPct) / 100;
    if (invoiceTotal <= 0) return Response.json({ error: 'Invoice amount must be greater than zero' }, { status: 400 });

    const now = new Date();
    const due = body?.due_date ? new Date(body.due_date) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(due.getTime())) return Response.json({ error: 'due_date is invalid' }, { status: 400 });

    const invoice = await client.entities.Invoice.create({
      organization_id: orgId,
      project_id: projectId,
      invoice_number: `INV-${now.toISOString().slice(0, 10).replace(/-/g, '')}-${String(projectId).slice(-6).toUpperCase()}`,
      status: 'draft',
      line_items: [{ description: body?.description || `${depositPct}% project deposit`, quantity: 1, unit_price: invoiceTotal, amount: invoiceTotal }],
      subtotal: invoiceTotal,
      tax: 0,
      total: invoiceTotal,
      balance_due: invoiceTotal,
      due_date: due.toISOString().slice(0, 10),
    });

    try {
      await client.entities.PipelineEvent.create({
        organization_id: orgId,
        project_id: projectId,
        step: 'payment',
        status: 'pending',
        event_type: 'invoice_created',
        source_record_id: invoice.id,
        message: `Invoice ${invoice.invoice_number} created for $${invoiceTotal.toFixed(2)}.`,
        occurred_at: now.toISOString(),
      });
    } catch (pipeErr) {
      // PipelineEvent creation failed — invoice is still created, but event receipt is missing
      console.error('PipelineEvent create failed for invoice', { invoice_id: invoice.id, project_id: projectId, organization_id: orgId, error: pipeErr?.message || String(pipeErr), retryable: true });
    }

    return Response.json({ success: true, invoice, deposit_pct: depositPct });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Invoice creation failed' }, { status: 500 });
  }
}