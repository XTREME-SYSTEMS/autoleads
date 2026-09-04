import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization, resolveUserOrgs, scopedFilter } from '../../shared/orgContext.ts';

// selfReflect — the autonomous self-reflection orchestrator.
// After every pipeline run, this function:
//   1. Runs the full pipeline (leads → takeoffs → estimates → proposals)
//   2. Scores the system (pre-scores)
//   3. Runs QA monitor (checks outbound emails + proposals for issues, creates flags)
//   4. Scans Gmail for bid reply emails
//   5. Collects all open flags
//   6. Uses LLM to analyze results and generate a self-reflection
//   7. Auto-fixes fixable flags
//   8. Runs auto-heal (stale data, duplicates, missing fields)
//   9. Re-scores the system (post-scores)
//  10. Records everything in SelfReflectionLog
//  11. Notifies if score dropped or critical issues remain
//
// Designed to run via workflow after the daily pipeline, or manually from the UI.

// Circular-safe JSON stringify — replaces circular references with '[Circular]'
// instead of throwing. SDK function.invoke() can return Response-like objects
// with circular refs (ClientRequest._redirectable) that break JSON.stringify.
function safeStringify(obj: any): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) return '[Circular]';
      seen.add(value);
    }
    return value;
  });
}

// Extract only serializable fields from an SDK function.invoke() response.
// The raw response may contain circular refs (ClientRequest, _redirectable).
function sanitizeResponse(res: any): any {
  if (res === null || res === undefined) return res;
  if (typeof res !== 'object') return res;
  // If it has a .data property (common SDK pattern), use that
  if ('data' in res && res.data && typeof res.data === 'object' && !Array.isArray(res.data)) {
    return sanitizeResponse(res.data);
  }
  try {
    // Try a normal stringify first — works for plain objects
    JSON.stringify(res);
    return res;
  } catch {
    // Circular ref detected — extract only scalar/array fields
    const safe: any = {};
    for (const key of Object.keys(res)) {
      const val = (res as any)[key];
      if (val === null || val === undefined) { safe[key] = val; continue; }
      if (typeof val !== 'object') { safe[key] = val; continue; }
      if (Array.isArray(val)) {
        safe[key] = val.map((v: any) => typeof v === 'object' && v !== null ? sanitizeResponse(v) : v);
      } else {
        safe[key] = sanitizeResponse(val);
      }
    }
    return safe;
  }
}

async function invokeFunction(client: any, name: string, payload: any = {}): Promise<any> {
  try {
    const res = await client.functions.invoke(name, payload);
    return sanitizeResponse(res);
  } catch (err: any) {
    return { error: err?.message || String(err), _failed: true };
  }
}

async function runReflectionForOrg(client: any, org: any, triggeredBy: string): Promise<any> {
  const orgId = org.id;
  const startedAt = new Date();
  const issues: any[] = [];
  const fixes: any[] = [];

  // Determine cycle number
  const existingLogs = await client.entities.SelfReflectionLog.filter(
    { organization_id: orgId }, '-created_date', 1
  ).catch(() => []);
  const cycleNumber = (existingLogs && existingLogs.length > 0 ? (existingLogs[0].cycle_number || 0) + 1 : 1);

  // Create log entry — status running
  const logEntry = await client.entities.SelfReflectionLog.create({
    organization_id: orgId,
    cycle_number: cycleNumber,
    triggered_by: triggeredBy,
    status: 'running',
    started_at: startedAt.toISOString(),
  }).catch(() => null);

  try {
    // ─── PHASE 1: RUN THE PIPELINE ───
    const pipelineResult = await invokeFunction(client, 'runFullPipeline', {});
    const pipelineStats = pipelineResult || {};
    if (pipelineResult?._failed) issues.push({ phase: 'pipeline', error: pipelineResult.error });

    // ─── PHASE 2: SCORE THE SYSTEM (pre-scores) ───
    const preScoreResult = await invokeFunction(client, 'runSystemAudit', {});
    const preScores = {
      overall: preScoreResult?.overall ?? 0,
      data_quality: preScoreResult?.data_quality ?? 0,
      pipeline: preScoreResult?.pipeline ?? 0,
      security: preScoreResult?.security ?? 0,
      ui: preScoreResult?.ui ?? 0,
    };
    if (preScoreResult?._failed) issues.push({ phase: 'audit', error: preScoreResult.error });

    // ─── PHASE 3: RUN QA MONITOR (emails + proposals) ───
    const qaResult = await invokeFunction(client, 'qaMonitor', {});
    const qaFlagsCreated = qaResult?.totalFlags ?? 0;
    if (qaResult?._failed) issues.push({ phase: 'qa', error: qaResult.error });

    // ─── PHASE 4: SCAN EMAIL RESPONSES (Gmail) ───
    const emailResult = await invokeFunction(client, 'scanEmailResponses', {});
    const emailsScanned = emailResult?.organizations ?? 0;
    const emailResponsesFound = emailResult?.totalResponses ?? 0;
    if (emailResult?._failed) issues.push({ phase: 'email_scan', error: emailResult.error, note: 'Gmail may not be connected' });

    // ─── PHASE 5: COLLECT OPEN FLAGS ───
    const openFlags = await client.entities.SystemFlag.filter(
      { status: 'open' }, '-created_date', 50
    ).catch(() => []);
    const flagsBefore = (openFlags || []).length;

    // ─── PHASE 6: LLM SELF-REFLECTION ANALYSIS ───
    let llmAnalysis = '';
    let actionPlan = '';
    try {
      const reflection = await client.integrations.Core.InvokeLLM({
        prompt: `You are a self-reflection AI analyzing an autonomous construction lead pipeline run. Evaluate the results honestly and identify what went well, what failed, and what to fix.

ORGANIZATION: ${org.name} (${org.state})
TRADE: ${org.trade || 'general'}

PIPELINE RESULTS:
- Organizations processed: ${pipelineStats?.organizations ?? 1}
- Errors: ${pipelineStats?.errors ?? 0}

PRE-RUN SCORES (0-100):
- Overall: ${preScores.overall}
- Data Quality: ${preScores.data_quality}
- Pipeline Efficiency: ${preScores.pipeline}
- Security: ${preScores.security}
- UI Completeness: ${preScores.ui}

QA MONITOR:
- Flags created: ${qaFlagsCreated}

EMAIL SCAN:
- Emails scanned: ${emailsScanned}
- Bid responses found: ${emailResponsesFound}

OPEN FLAGS: ${flagsBefore}
ISSUES ENCOUNTERED: ${safeStringify(issues)}

Analyze this run and return JSON:
- what_went_well: array of strings (things that worked correctly)
- what_failed: array of strings (things that broke or underperformed)
- root_causes: array of strings (likely root causes of failures)
- fixes_applied: array of strings (what auto-fixes should be applied)
- recommendations: array of strings (what to improve for next cycle)
- overall_assessment: 1-2 paragraph honest reflection on pipeline health
- urgency: "none" | "low" | "medium" | "high" | "critical" — how urgent is manual intervention`,
        response_json_schema: { type: 'object', properties: {
          what_went_well: { type: 'array', items: { type: 'string' } },
          what_failed: { type: 'array', items: { type: 'string' } },
          root_causes: { type: 'array', items: { type: 'string' } },
          fixes_applied: { type: 'array', items: { type: 'string' } },
          recommendations: { type: 'array', items: { type: 'string' } },
          overall_assessment: { type: 'string' },
          urgency: { type: 'string' }
        } }
      });

      llmAnalysis = reflection?.overall_assessment || 'Analysis unavailable.';
      actionPlan = [
        ...(reflection?.what_failed || []).map((f: string) => `ISSUE: ${f}`),
        ...(reflection?.recommendations || []).map((r: string) => `RECOMMEND: ${r}`),
      ].join('\n');
      (reflection?.what_failed || []).forEach((f: string) => issues.push({ type: 'llm_identified', detail: f }));
      (reflection?.fixes_applied || []).forEach((f: string) => fixes.push({ type: 'llm_suggested', detail: f }));
    } catch (err: any) {
      llmAnalysis = `LLM analysis failed: ${err?.message || 'unknown error'}`;
    }

    // ─── PHASE 7: AUTO-FIX FIXABLE FLAGS ───
    let flagsFixed = 0;
    const fixableFlags = (openFlags || []).filter((f: any) => f.auto_fix_available && f.fix_action);
    for (const flag of fixableFlags.slice(0, 15)) {
      const fixResult = await invokeFunction(client, 'autoFixFlag', { flag_id: flag.id });
      if (!fixResult?._failed && !fixResult?.error) {
        flagsFixed++;
        fixes.push({ flag_id: flag.id, action: flag.fix_action, result: fixResult?.result?.message || 'fixed' });
      } else {
        issues.push({ type: 'auto_fix_failed', flag_id: flag.id, error: fixResult?.error });
      }
    }

    // ─── PHASE 8: RUN AUTO-HEAL ───
    const healResult = await invokeFunction(client, 'runAutoHeal', {});
    if (healResult && !healResult._failed) {
      fixes.push({
        type: 'auto_heal',
        purged: healResult.purged, fixed: healResult.fixed, hardened: healResult.hardened,
        merged: healResult.merged, enhanced: healResult.enhanced,
      });
    } else {
      issues.push({ phase: 'heal', error: healResult?.error });
    }

    // ─── PHASE 9: RE-SCORE THE SYSTEM (post-scores) ───
    const postScoreResult = await invokeFunction(client, 'runSystemAudit', {});
    const postScores = {
      overall: postScoreResult?.overall ?? preScores.overall,
      data_quality: postScoreResult?.data_quality ?? preScores.data_quality,
      pipeline: postScoreResult?.pipeline ?? preScores.pipeline,
      security: postScoreResult?.security ?? preScores.security,
      ui: postScoreResult?.ui ?? preScores.ui,
    };
    const scoreDelta = postScores.overall - preScores.overall;

    // ─── PHASE 10: COUNT REMAINING FLAGS ───
    const remainingFlags = await client.entities.SystemFlag.filter(
      { status: 'open' }, '-created_date', 50
    ).catch(() => []);
    const flagsRemaining = (remainingFlags || []).length;

    // ─── PHASE 11: UPDATE LOG ENTRY ───
    const completedAt = new Date();
    const durationSeconds = Math.round((completedAt.getTime() - startedAt.getTime()) / 1000);

    if (logEntry) {
      await client.entities.SelfReflectionLog.update(logEntry.id, {
        status: 'completed',
        completed_at: completedAt.toISOString(),
        duration_seconds: durationSeconds,
        pipeline_results: safeStringify(pipelineStats),
        pre_scores: safeStringify(preScores),
        post_scores: safeStringify(postScores),
        score_delta: scoreDelta,
        flags_created: qaFlagsCreated,
        flags_fixed: flagsFixed,
        flags_remaining: flagsRemaining,
        emails_scanned: emailsScanned,
        email_responses_found: emailResponsesFound,
        email_qa_issues: qaFlagsCreated,
        issues_identified: safeStringify(issues),
        fixes_applied: safeStringify(fixes),
        llm_analysis: llmAnalysis,
        action_plan: actionPlan,
      }).catch(() => null);
    }

    // ─── PHASE 12: NOTIFY IF SCORE DROPPED OR CRITICAL ISSUES ───
    if (scoreDelta < -5 || flagsRemaining > 10) {
      await client.entities.Notification.create({
        organization_id: orgId,
        type: 'system',
        title: `Self-Reflection Cycle ${cycleNumber}: ${scoreDelta < 0 ? 'Score dropped' : 'Issues remain'}`,
        body: `Score: ${preScores.overall} → ${postScores.overall} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta}). ${flagsRemaining} flags still open. ${flagsFixed} auto-fixed. See Self-Reflection Dashboard.`,
        priority: scoreDelta < -10 ? 'high' : 'medium',
        linked_route: '/self-reflection',
      }).catch(() => null);
    }

    // ─── PHASE 13: EMAIL REFLECTION REPORT TO jeremy@xtremepolishingsystems.com ───
    const reflectionEmail = `AUTOLEADS SELF-REFLECTION REPORT — ${org.name}
Cycle ${cycleNumber} • ${new Date().toISOString()}

SCORE: ${preScores.overall} → ${postScores.overall} (${scoreDelta >= 0 ? '+' : ''}${scoreDelta})
FLAGS: ${qaFlagsCreated} created • ${flagsFixed} auto-fixed • ${flagsRemaining} still open
EMAILS SCANNED: ${emailsScanned} • BID RESPONSES: ${emailResponsesFound}

LLM ANALYSIS:
${llmAnalysis}

ACTION PLAN:
${actionPlan || 'No actions queued.'}

See the Self-Reflection Dashboard at autoleads.base44.app/self-reflection.`;
    await client.integrations.Core.SendEmail({
      to: 'jeremy@xtremepolishingsystems.com',
      subject: `AUTOLEADS Self-Reflection Cycle ${cycleNumber} — ${org.name} (${postScores.overall}/100)`,
      body: reflectionEmail,
    }).catch(() => null);

    return {
      org: org.name,
      cycle: cycleNumber,
      status: 'completed',
      pre_score: preScores.overall,
      post_score: postScores.overall,
      score_delta: scoreDelta,
      flags_created: qaFlagsCreated,
      flags_fixed: flagsFixed,
      flags_remaining: flagsRemaining,
      emails_scanned: emailsScanned,
      email_responses: emailResponsesFound,
      issues: issues.length,
      fixes: fixes.length,
    };
  } catch (error: any) {
    // Mark log as failed
    if (logEntry) {
      await client.entities.SelfReflectionLog.update(logEntry.id, {
        status: 'failed',
        completed_at: new Date().toISOString(),
        error: error?.message || 'Unknown error',
      }).catch(() => null);
    }
    return { org: org.name, status: 'failed', error: error?.message };
  }
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const triggeredBy = body?.triggered_by || (user ? 'manual' : 'workflow');

    // If user is logged in, run for their orgs only
    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });

      const results: any[] = [];
      for (const orgId of ctx.orgIds) {
        const org = await client.entities.Organization.get(orgId).catch(() => null);
        if (!org) continue;
        const r = await runReflectionForOrg(client, org, triggeredBy);
        results.push(r);
      }
      return Response.json({ success: true, triggered_by: triggeredBy, results });
    }

    // Service-role: iterate all organizations
    const allResults: any[] = [];
    const sweepResult = await forEachOrganization(client, async (org) => {
      const r = await runReflectionForOrg(client, org, triggeredBy);
      allResults.push(r);
    });

    return Response.json({
      success: true,
      triggered_by: triggeredBy,
      organizations_processed: sweepResult.processed,
      results: allResults,
      errors: sweepResult.errors,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Self-reflection failed' }, { status: 500 });
  }
}