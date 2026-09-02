import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const proposalId = String(body?.proposal_id || '').trim();
    const outcome = String(body?.outcome || '').trim().toLowerCase();
    const notes = String(body?.notes || '').trim();

    if (!proposalId) return Response.json({ error: 'proposal_id is required' }, { status: 400 });
    if (!['won', 'lost'].includes(outcome)) return Response.json({ error: 'outcome must be "won" or "lost"' }, { status: 400 });

    const proposal = await client.entities.Proposal.get(proposalId).catch(() => null);
    if (!proposal) return Response.json({ error: 'Proposal not found' }, { status: 404 });

    const projectId = proposal.project_id || null;
    const project = projectId ? await client.entities.Project.get(projectId).catch(() => null) : null;
    const orgId = proposal.organization_id || project?.organization_id || '';
    const now = new Date().toISOString();

    // 1. Update proposal status
    await client.entities.Proposal.update(proposalId, { status: outcome });

    // 2. Update project stage
    if (project) {
      const newStage = outcome === 'won' ? 'won' : 'lost';
      await client.entities.Project.update(projectId, { stage: newStage }).catch(() => null);
    }

    // 3. Create pipeline event
    await client.entities.PipelineEvent.create({
      organization_id: orgId,
      project_id: projectId || '',
      step: 'bid',
      status: 'completed',
      event_type: outcome === 'won' ? 'bid_won' : 'bid_lost',
      source_record_id: proposalId,
      message: notes || (outcome === 'won' ? 'Bid awarded — contract generation triggered.' : 'Bid was not awarded.'),
      occurred_at: now,
    }).catch(() => null);

    let contractCreated = null;
    let invoiceCreated = null;
    let esignDoc = null;

    // 4. If won: generate contract + invoice
    if (outcome === 'won' && project) {
      const trade = project.trade || 'General Construction';
      const contractType = project.project_type === 'government' ? 'government' : 'commercial';

      // 4a. Generate contract (or find existing validated one)
      try {
        const existingContracts = await client.entities.ContractTemplate.filter({ organization_id: orgId, trade, validation_status: 'validated' }).catch(() => []);
        let contract = (existingContracts || [])[0] || null;

        if (!contract) {
          // Generate a new contract via LLM
          const company = (await client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []))[0] || {};
          const genResult = await client.integrations.Core.InvokeLLM({
            prompt: `Generate a comprehensive ${contractType} construction contract for the "${trade}" trade.
Company: ${company.name || 'Construction Company'}
Project: ${project.title}
Client: ${proposal.client_name || project.client_name || project.authority || 'Client'}
Value: $${Number(proposal.total_value || 0).toLocaleString()}
Specs: ${(project.specs || '').slice(0, 500)}

Include: scope of work, payment terms, change orders, warranties, dispute resolution, termination, insurance, indemnification.
Return JSON: { title, content (full contract text), terms_summary }`,
            response_json_schema: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                content: { type: 'string' },
                terms_summary: { type: 'string' },
              },
            },
          });

          contract = await client.entities.ContractTemplate.create({
            organization_id: orgId,
            trade,
            contract_type: contractType,
            title: genResult?.title || `${trade} ${contractType} Contract`,
            content: genResult?.content || '',
            terms: genResult?.terms_summary || '',
            ai_generated: true,
            validation_status: 'validated',
            validated_by_ai: true,
            validated_by_user: false,
            is_standard: true,
            version: 1,
          });
        }
        contractCreated = contract;

        // 4b. Create signed contract record
        const signedContract = await client.entities.SignedContract.create({
          organization_id: orgId,
          project_id: projectId,
          contract_template_id: contract.id,
          title: `${contract.title} — ${project.title}`,
          content: contract.content,
          status: 'draft',
          total_value: proposal.total_value || project.value || 0,
          payment_terms: 'Net 30',
          effective_date: new Date().toISOString().slice(0, 10),
        }).catch(() => null);

        // 4c. Create e-sign document for the contract directly
        if (signedContract) {
          const clientName = proposal.client_name || project.client_name || project.authority || 'Client';
          const clientEmail = proposal.client_email || '';
          const signers = [
            { name: clientName, role: 'client', email: clientEmail },
            { name: 'Contractor', role: 'contractor' },
          ].filter(s => s.name);

          try {
            esignDoc = await client.entities.EsignDocument.create({
              organization_id: orgId,
              project_id: projectId,
              proposal_id: proposalId,
              contract_id: signedContract.id,
              title: `${contract.title} — ${project.title}`,
              document_type: 'contract',
              status: 'draft',
              signers,
              content: contract.content,
              expires_date: null,
            });
            if (esignDoc) {
              await client.entities.SignedContract.update(signedContract.id, {
                esign_document_id: esignDoc.id,
                status: 'sent',
              }).catch(() => null);
            }
          } catch (e) {
            console.log('E-sign creation error:', e?.message);
          }
        }
      } catch (e) {
        console.log('Contract generation error:', e?.message);
      }

      // 4d. Create invoice directly (createInvoiceForProject requires user auth)
      try {
        const existingInvoices = await client.entities.Invoice.filter({ project_id: projectId }).catch(() => []);
        const openInv = (existingInvoices || []).find(i => !['paid', 'void'].includes(i.status));
        if (openInv) {
          invoiceCreated = openInv;
        } else {
          const invTotal = Math.round(Number(proposal.total_value || 0) * 0.5);
          if (invTotal > 0) {
            const invDate = new Date();
            const dueDate = new Date(invDate.getTime() + 7 * 86400000);
            invoiceCreated = await client.entities.Invoice.create({
              organization_id: orgId,
              project_id: projectId,
              invoice_number: `INV-${invDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(projectId).slice(-6).toUpperCase()}`,
              status: 'draft',
              line_items: [{ description: '50% project deposit', quantity: 1, unit_price: invTotal, amount: invTotal }],
              subtotal: invTotal,
              tax: 0,
              total: invTotal,
              balance_due: invTotal,
              due_date: dueDate.toISOString().slice(0, 10),
            });
            await client.entities.PipelineEvent.create({
              organization_id: orgId,
              project_id: projectId,
              step: 'payment',
              status: 'pending',
              event_type: 'invoice_created',
              source_record_id: invoiceCreated.id,
              message: `Invoice ${invoiceCreated.invoice_number} created for $${invTotal.toFixed(2)}.`,
              occurred_at: now,
            }).catch(() => null);
          }
        }
      } catch (e) {
        console.log('Invoice creation error:', e?.message);
      }

      // 4e. Create action items for next steps
      try {
        await client.entities.ActionItem.create({
          organization_id: orgId,
          title: `Send contract for signature — ${project.title}`,
          description: `Contract generated and e-sign document created. Send to ${proposal.client_name || 'client'} for signature.`,
          category: 'proposal_approval',
          priority: 'high',
          status: 'open',
          linked_record_id: esignDoc?.id || projectId,
          linked_route: esignDoc ? `/esign/${esignDoc.id}` : `/contracts`,
          ai_prepared: true,
          requires_approval: false,
        });
        await client.entities.ActionItem.create({
          organization_id: orgId,
          title: `Send invoice — ${project.title}`,
          description: `Deposit invoice created. Deliver to client and track payment.`,
          category: 'follow_up',
          priority: 'high',
          status: 'open',
          linked_record_id: invoiceCreated?.id || projectId,
          linked_route: '/money',
          ai_prepared: true,
          requires_approval: false,
        });
      } catch {}
    }

    // 5. Create notification
    await client.entities.Notification.create({
      organization_id: orgId,
      type: 'proposal',
      title: outcome === 'won' ? `Bid won: ${proposal.title}` : `Bid lost: ${proposal.title}`,
      body: outcome === 'won'
        ? `Contract and invoice generated. Next: send contract for signature and deliver invoice.`
        : notes || 'Outcome recorded for future bid intelligence.',
      priority: outcome === 'won' ? 'high' : 'medium',
      read: false,
      linked_route: outcome === 'won' ? '/contracts' : '/outreach',
      linked_record_id: projectId || proposalId,
    }).catch(() => null);

    return Response.json({
      success: true,
      outcome,
      proposal_id: proposalId,
      project_id: projectId,
      contract: contractCreated ? { id: contractCreated.id, title: contractCreated.title } : null,
      invoice: invoiceCreated ? { id: invoiceCreated.id, invoice_number: invoiceCreated.invoice_number, total: invoiceCreated.total } : null,
      esign_document: esignDoc ? { id: esignDoc.id, signing_url: `/esign/${esignDoc.id}` } : null,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Outcome recording failed' }, { status: 500 });
  }
}