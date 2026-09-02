import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate, getInternalToken } from '../../shared/internalAuth.ts';

// tripleValidateTakeoff — the triple-validation gate.
// Runs validateTakeoff up to 3 times. The takeoff only passes if it scores
// 100 three times IN A ROW. On the first failure, it runs:
//   ANALYZE (LLM root-cause) → FIX (autoFixFlag) → HEAL (runAutoHeal) → HARDEN (SystemFlag)
// and leaves the project at verification_status 'incomplete' for manual review.

const REQUIRED_SCORE = 100;
const REQUIRED_STREAK = 3;

async function invokeFn(client: any, name: string, payload: any = {}): Promise<any> {
  try {
    const token = getInternalToken();
    const res = await fetch(`https://autoleads.base44.app/functions/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, _service_token: token }),
    });
    if (!res.ok) return { error: await res.text(), _failed: true };
    return await res.json();
  } catch (err: any) {
    return { error: err?.message || String(err), _failed: true };
  }
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const project_id = body?.project_id;
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    const project = await client.entities.Project.get(project_id).catch(() => null);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const scores: any[] = [];
    let streak = 0;

    for (let i = 0; i < REQUIRED_STREAK; i++) {
      const r = await invokeFn(client, 'validateTakeoff', { project_id });
      const score = r?.confidence ?? 0;
      scores.push({ run: i + 1, verdict: r?.verdict, score, issues: r?.issues || [] });
      if (r?.verdict === 'approved' && score >= REQUIRED_SCORE) {
        streak++;
      } else {
        break; // fail fast — any non-100 triggers hardening
      }
    }

    const passed = streak >= REQUIRED_STREAK;
    const base = { project_id, passed, required_score: REQUIRED_SCORE, required_streak: REQUIRED_STREAK, scores };

    if (passed) {
      await client.entities.Project.update(project_id, {
        verification_status: 'verified',
        verified_date: new Date().toISOString(),
      }).catch(() => null);
      await client.entities.PipelineEvent.create({
        organization_id: project.organization_id,
        project_id,
        step: 'takeoff',
        status: 'completed',
        event_type: 'triple_validation_passed',
        message: `Takeoff validated 3x at ${REQUIRED_SCORE} — triple gate passed`,
        occurred_at: new Date().toISOString(),
      }).catch(() => null);
      return Response.json({ ...base, status: 'triple_validated' });
    }

    // ─── FAILURE → ANALYZE → FIX → HEAL → HARDEN ───
    const failedRun = scores.find(s => s.verdict !== 'approved' || s.score < REQUIRED_SCORE);

    // 1. ANALYZE
    const diagnosis: any = await client.integrations.Core.InvokeLLM({
      prompt: `A construction takeoff failed triple-validation (required ${REQUIRED_SCORE}/100 three times in a row). Diagnose the most likely root cause and prescribe a concrete fix and a hardening action to prevent recurrence.

Project: ${project.title} (${project.trade}, ${project.jurisdiction})
Validation runs: ${JSON.stringify(scores)}

Return JSON: { root_cause, prescribed_fix, hardening_action }`,
      response_json_schema: { type: 'object', properties: {
        root_cause: { type: 'string' },
        prescribed_fix: { type: 'string' },
        hardening_action: { type: 'string' },
      } },
    }).catch(() => ({}));

    // 2. FIX — auto-fix any open, fixable flags on this project
    const projectFlags = await client.entities.SystemFlag.filter(
      { target_type: 'project', target_id: project_id, status: 'open' },
      '-created_date', 20
    ).catch(() => []);
    let fixedCount = 0;
    for (const f of (projectFlags || []).filter((x: any) => x.auto_fix_available && x.fix_action)) {
      const fr = await invokeFn(client, 'autoFixFlag', { flag_id: f.id });
      if (!fr?._failed && !fr?.error) fixedCount++;
    }

    // 3. HEAL
    const heal = await invokeFn(client, 'runAutoHeal', {});

    // 4. HARDEN — create a compliance flag so the failure is visible & tracked
    await client.entities.SystemFlag.create({
      flag_type: 'compliance_issue',
      severity: 'high',
      target_type: 'project',
      target_id: project_id,
      title: `Triple-validation failed — takeoff not at ${REQUIRED_SCORE} 3x`,
      description: `Takeoff validation failed. Root cause: ${diagnosis?.root_cause || 'unknown'}. Prescribed fix: ${diagnosis?.prescribed_fix || 'n/a'}.`,
      fix_description: diagnosis?.hardening_action || diagnosis?.prescribed_fix || 'Manual takeoff review required.',
      fix_action: 'manual_review',
      auto_fix_available: false,
      status: 'open',
    }).catch(() => null);

    await client.entities.Project.update(project_id, { verification_status: 'incomplete' }).catch(() => null);
    await client.entities.PipelineEvent.create({
      organization_id: project.organization_id,
      project_id,
      step: 'takeoff',
      status: 'blocked',
      event_type: 'triple_validation_failed',
      message: `Triple-validation failed. Auto-fixed ${fixedCount} flags, healed, hardened. Root cause: ${diagnosis?.root_cause || 'unknown'}`,
      occurred_at: new Date().toISOString(),
    }).catch(() => null);

    return Response.json({
      ...base,
      status: 'failed_hardened',
      diagnosis,
      flags_auto_fixed: fixedCount,
      heal: { purged: heal?.purged, fixed: heal?.fixed, hardened: heal?.hardened },
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Triple validation failed' }, { status: 500 });
  }
}