import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate, getInternalToken } from '../../shared/internalAuth.ts';

// runSystemTest — the built-in end-to-end testing agent.
// Runs the regression suite + system audit + critic, computes a combined
// system score, and emails a test-and-score report to jeremy@xtremepolishingsystems.com.

const REPORT_EMAIL = 'jeremy@xtremepolishingsystems.com';

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

    // 1. Regression suite (invariants)
    const regression = await invokeFn(client, 'runRegressionTests', { organization_id: body?.organization_id });
    // 2. System audit (score)
    const audit = await invokeFn(client, 'runSystemAudit', {});
    // 3. Critic review (also emails its own report)
    const critic = await invokeFn(client, 'runCriticReview', {});

    const regPassed = regression?.passed || 0;
    const regTotal = regression?.total || 0;
    const regPassRate = regression?.pass_rate || 0;
    const sysScore = audit?.overall || 0;
    const criticAvg = critic?.results?.[0]?.avg_score ?? null;
    const combined = Math.round((regPassRate * 0.4) + (sysScore * 0.4) + ((criticAvg ?? 0) * 0.2));

    const failedTests = (regression?.failed_tests || []).slice(0, 10);

    const report = `AUTOLEADS SYSTEM TEST & SCORE — ${new Date().toISOString()}

COMBINED SYSTEM SCORE: ${combined}/100
(40% regression · 40% audit · 20% critic)

REGRESSION TESTS: ${regPassed}/${regTotal} passed (${regPassRate}%)
SYSTEM AUDIT SCORE: ${sysScore}/100
CRITIC AVG ARTIFACT SCORE: ${criticAvg ?? 'n/a'}/100

AUDIT BREAKDOWN:
- Data Quality: ${audit?.data_quality ?? 'n/a'}
- Pipeline: ${audit?.pipeline ?? 'n/a'}
- Security: ${audit?.security ?? 'n/a'}
- UI: ${audit?.ui ?? 'n/a'}

${failedTests.length > 0 ? `FAILED TESTS:\n${failedTests.map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}\n\n` : ''}${combined < 80 ? '⚠️ System score below 80 — review recommended.' : '✅ System healthy.'}

Dashboards: autoleads.base44.app/self-reflection · /system-health · /validation-gates`;

    await client.integrations.Core.SendEmail({
      to: REPORT_EMAIL,
      subject: `AUTOLEADS System Test & Score — ${combined}/100`,
      body: report,
    }).catch(() => null);

    return Response.json({
      success: true,
      combined_score: combined,
      regression: { passed: regPassed, total: regTotal, pass_rate: regPassRate, failed: failedTests.length },
      system_audit_score: sysScore,
      critic_avg_score: criticAvg,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'System test failed' }, { status: 500 });
  }
}