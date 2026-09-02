import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const GMAIL_CONNECTOR_ID = '69db200274332486fd28dd7e';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { message_id, project_id, contact_email, force } = body;

    // Get the user's Gmail token
    let accessToken;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID);
      accessToken = conn.accessToken;
    } catch {
      return Response.json({ error: 'Gmail not connected. Connect Gmail in Settings first.' }, { status: 400 });
    }

    // Read the incoming email
    let emailContent = '';
    let fromAddr = contact_email || '';
    let subject = '';

    if (message_id) {
      const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${message_id}?format=full`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (!res.ok) return Response.json({ error: 'Failed to read email' }, { status: 500 });
      const emailData = await res.json();
      subject = emailData?.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
      fromAddr = emailData?.payload?.headers?.find(h => h.name === 'From')?.value || fromAddr;
      // Extract plain text body
      const parts = emailData?.payload?.parts || [];
      const textPart = parts.find(p => p.mimeType === 'text/plain');
      if (textPart?.body?.data) {
        emailContent = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      } else if (emailData?.payload?.body?.data) {
        emailContent = atob(emailData.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      }
    } else if (body.email_body) {
      emailContent = body.email_body;
      subject = body.email_subject || '';
    } else {
      return Response.json({ error: 'Either message_id or email_body is required' }, { status: 400 });
    }

    // Get company profile for context — scoped to user's org (never bare .list())
    const { resolveUserOrgs, scopedFilter } = await import('../../shared/orgContext.ts');
    const ctx = await resolveUserOrgs(base44, user.id);
    const companies = ctx.primaryOrgId
      ? await base44.entities.CompanyProfile.filter(scopedFilter(ctx.primaryOrgId)).catch(() => [])
      : [];
    const company = companies?.[0] || {};

    // Step 1: Classify the reply and generate a response
    const llmRes = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an AI sales assistant for ${company.name || 'a construction company'} (${company.trade || 'construction'}).
A potential client has replied to our bid/proposal email. Analyze their reply and generate an intelligent response.

CLIENT'S REPLY:
Subject: ${subject}
From: ${fromAddr}
Body: ${emailContent}

CLASSIFY their response as one of: interested, not_interested, needs_more_info, asking_question, scheduling_meeting, price_negotiation, other

Then generate a professional, persuasive response that:
- If interested: push for a decision, meeting, or next step
- If not interested: ask what would change their mind, keep the door open
- If needs_more_info: provide helpful info and offer a call
- If asking_question: answer thoroughly and professionally
- If scheduling: confirm availability and suggest times
- If price_negotiation: acknowledge and offer value-based reasoning

Keep the response concise (under 200 words), professional, and action-oriented. Sign as ${company.name || 'our team'}.

Return JSON with: classification, confidence (0-1), response_subject, response_body`,
      response_json_schema: {
        type: "object",
        properties: {
          classification: { type: "string" },
          confidence: { type: "number" },
          response_subject: { type: "string" },
          response_body: { type: "string" }
        }
      }
    });

    // Step 2: Validate the response before sending
    const validation = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a validation system for outbound construction sales emails. Review this AI-generated response for safety and quality.

ORIGINAL CLIENT REPLY: ${emailContent}

PROPOSED RESPONSE:
Subject: ${llmRes.response_subject}
Body: ${llmRes.response_body}

Check for:
1. Professional tone (no slang, no aggressive language)
2. No false claims or guarantees about outcomes
3. No inappropriate content
4. Appropriate length (under 200 words)
5. Clear call to action
6. Does not promise specific pricing without approval (unless already in a proposal)

Return JSON: { approved: boolean, issues: [list of any issues], corrected_body: string (use original if no corrections needed) }`,
      response_json_schema: {
        type: "object",
        properties: {
          approved: { type: "boolean" },
          issues: { type: "array", items: { type: "string" } },
          corrected_body: { type: "string" }
        }
      }
    });

    const finalBody = validation.corrected_body || llmRes.response_body;
    const finalSubject = llmRes.response_subject || `Re: ${subject}`;

    // Step 3: Send the response via the sendEmail function
    if (!force) {
      // By default, return the draft for user review unless force=true
      return Response.json({
        success: true,
        mode: 'draft',
        classification: llmRes.classification,
        confidence: llmRes.confidence,
        validated: validation.approved,
        issues: validation.issues || [],
        response_subject: finalSubject,
        response_body: finalBody,
        from: fromAddr,
        message: 'Response generated and validated. Set force=true to auto-send.'
      });
    }

    // Auto-send mode
    await base44.functions.invoke('sendEmail', {
      to: fromAddr,
      subject: finalSubject,
      body: finalBody
    });

    // Log the outbound message
    await base44.entities.Message.create({
      direction: 'outbound',
      channel: 'email',
      subject: finalSubject,
      body: finalBody,
      sender: user.email,
      recipient: fromAddr,
      project_id: project_id || null,
      status: 'sent',
      ai_generated: true,
      requires_approval: false,
      sent_date: new Date().toISOString()
    });

    return Response.json({
      success: true,
      mode: 'sent',
      classification: llmRes.classification,
      validated: validation.approved,
      response_subject: finalSubject,
      response_body: finalBody
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}