import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';

// createChangeOrder — AI-assisted change order creator. Takes a contractor's
// revision request (from email body, pasted text, or structured input) and
// uses AI to parse it into a structured ChangeOrder record with line items,
// pricing, and reason. Also identifies any additional forms that may be needed.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const projectId = String(body?.project_id || '').trim();
    const proposalId = String(body?.proposal_id || '').trim();
    const revisionText = String(body?.revision_text || '').trim();
    const source = String(body?.source || 'manual').trim(); // 'email' | 'paste' | 'manual'

    if (!projectId || !revisionText) {
      return Response.json({ error: 'project_id and revision_text are required' }, { status: 400 });
    }

    const [project, proposals, estimates] = await Promise.all([
      client.entities.Project.get(projectId).catch(() => null),
      proposalId ? client.entities.Proposal.filter({ project_id: projectId }).catch(() => []) : client.entities.Proposal.filter({ project_id: projectId }).catch(() => []),
      client.entities.Estimate.filter({ project_id: projectId }).catch(() => []),
    ]);

    const proposal = proposalId
      ? await client.entities.Proposal.get(proposalId).catch(() => null)
      : (proposals || [])[0] || null;
    const estimate = (estimates || []).find((e: any) => e.status === 'approved') || (estimates || [])[0] || null;
    const originalValue = proposal?.total_value || estimate?.grand_total || project?.value || 0;

    // AI parse the revision request into a structured change order
    const result = await client.integrations.Core.InvokeLLM({
      prompt: `You are a construction change order expert. Parse the contractor's revision request into a structured change order.

PROJECT:
- Title: ${project?.title || 'N/A'}
- Trade: ${project?.trade || 'N/A'}
- Original Value: $${Number(originalValue).toLocaleString()}

ORIGINAL SCOPE (from proposal items):
${proposal?.items ? JSON.stringify(proposal.items.map((i: any) => ({ description: i.description, quantity: i.quantity, unit: i.unit, unit_price: i.unit_price }))) : 'N/A'}

CONTRACTOR REVISION REQUEST (source: ${source}):
"""
${revisionText}
"""

Parse this into a structured change order. Identify:
1. What is being changed (addition, deletion, modification, credit, time extension, scope change)
2. Specific line items affected with quantities, units, and pricing
3. The reason for the change
4. Total change amount (positive = addition, negative = credit)
5. Any time impact in days
6. What additional forms or documents may be needed for this type of change (e.g., change order request form, RFQ, RFI, change directive, etc.)

Respond with JSON:
{
  "change_type": "addition" | "deletion" | "modification" | "credit" | "time_extension" | "scope_change",
  "title": "Short title for the change order",
  "description": "Detailed description of the change",
  "reason": "Reason for the change",
  "items": [{ "description": "", "quantity": 0, "unit": "", "unit_price": 0, "total": 0 }],
  "change_amount": 0,
  "time_impact_days": 0,
  "requested_by": "contractor" | "owner" | "architect" | "field",
  "additional_forms_needed": ["list of forms that may be required for this change type"],
  "notes": "Any additional notes or concerns"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          change_type: { type: 'string', enum: ['addition', 'deletion', 'modification', 'credit', 'time_extension', 'scope_change'] },
          title: { type: 'string' },
          description: { type: 'string' },
          reason: { type: 'string' },
          items: { type: 'array', items: { type: 'object', properties: {
            description: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' },
            unit_price: { type: 'number' }, total: { type: 'number' }
          } } },
          change_amount: { type: 'number' },
          time_impact_days: { type: 'number' },
          requested_by: { type: 'string' },
          additional_forms_needed: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_flash'
    });

    // Generate change order number
    const existingCOs = await client.entities.ChangeOrder.filter({ project_id: projectId }).catch(() => []);
    const coNumber = `CO-${String((existingCOs || []).length + 1).padStart(3, '0')}`;
    const newTotal = Number(originalValue) + Number(result.change_amount || 0);

    // Create the ChangeOrder record
    const changeOrder = await client.entities.ChangeOrder.create({
      organization_id: project?.organization_id || '',
      project_id: projectId,
      proposal_id: proposal?.id || '',
      change_order_number: coNumber,
      title: result.title || 'Change Order',
      description: result.description || revisionText.slice(0, 500),
      reason: result.reason || '',
      change_type: result.change_type || 'modification',
      items: result.items || [],
      original_value: Number(originalValue),
      change_amount: Number(result.change_amount || 0),
      new_total_value: newTotal,
      time_impact_days: Number(result.time_impact_days || 0),
      status: 'submitted',
      requested_by: result.requested_by || 'contractor',
    });

    // Log pipeline event
    await client.entities.PipelineEvent.create({
      organization_id: project?.organization_id || '',
      project_id: projectId,
      step: 'contract',
      status: 'in_progress',
      event_type: 'change_order_created',
      source_record_id: changeOrder.id,
      message: `AI-parsed change order ${coNumber} created: ${result.title}. Change: $${Number(result.change_amount || 0).toLocaleString()}. Additional forms: ${(result.additional_forms_needed || []).join(', ') || 'none'}`,
      occurred_at: new Date().toISOString(),
    }).catch(() => null);

    // Create notification
    await client.entities.Notification.create({
      organization_id: project?.organization_id || '',
      type: 'change_order',
      title: `Change Order ${coNumber}: ${result.title}`,
      body: `Contractor revision parsed into a ${result.change_type}. Change amount: $${Number(result.change_amount || 0).toLocaleString()}. Review and approve.`,
      priority: 'high',
      linked_route: `/projects/${projectId}`,
      linked_record_id: changeOrder.id,
    }).catch(() => null);

    return Response.json({
      status: 'success',
      change_order_id: changeOrder.id,
      change_order_number: coNumber,
      change_type: result.change_type,
      title: result.title,
      change_amount: result.change_amount,
      new_total_value: newTotal,
      time_impact_days: result.time_impact_days,
      items: result.items,
      additional_forms_needed: result.additional_forms_needed || [],
      notes: result.notes,
    });
  } catch (error: any) {
    console.error('createChangeOrder error:', error);
    return Response.json({ error: error?.message || 'Change order creation failed' }, { status: 500 });
  }
}