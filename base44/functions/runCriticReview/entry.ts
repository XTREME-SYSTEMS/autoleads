import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs, forEachOrganization } from '../../shared/orgContext.ts';

// runCriticReview — the adversarial "critical agent".
// Reviews recent pipeline artifacts (projects in takeoff+ stages + proposals),
// scores each 0-100, flags gaps as SystemFlags, and emails a critique report
// to jeremy@xtremepolishingsystems.com. Designed to run daily after the pipeline.

const CRITIC_EMAIL = 'jeremy@xtremepolishingsystems.com';

async function critiqueForOrg(client: any, org: any): Promise<any> {
  const projects = await client.entities.Project.filter(
    { stage: { $in: ['takeoff', 'estimating', 'proposal', 'submitted'] } },
    '-created_date', 50
  ).catch(() => []);
  const proposals = await client.entities.Proposal.list('-created_date', 50).catch(() => []);

  const artifacts = [
    ...(projects || []).map((p: any) => ({
      id: p.id, type: 'project', stage: p.stage, title: p.title, trade: p.trade,
      jurisdiction: p.jurisdiction, value: p.value,
      validation_completeness: p.validation_completeness,
      validation_gaps: p.validation_gaps,
      verification_status: p.verification_status,
      specs: (p.specs || '').slice(0, 600),
      contract_info: (p.contract_info || '').slice(0, 300),
    })),
    ...(proposals || []).map((p: any) => ({
      id: p.id, type: 'proposal', status: p.status, title: p.title,
      total_value: p.total_value, items_count: (p.items || []).length,
    })),
  ];

  if (artifacts.length === 0) {
    return { org: org.name, artifacts_reviewed: 0, message: 'No artifacts to critique.' };
  }

  const critique = await client.integrations.Core.InvokeLLM({
    prompt: `You are a ruthless, adversarial construction preconstruction critic. Find EVERY weakness, gap, risk, and missing element in the pipeline artifacts below. Be harsh, specific, and constructive. Score each artifact 0-100 and list concrete fixes. Never give 100 unless it is truly flawless.

ORGANIZATION: ${org.name} (${org.state || '?'}) — TRADE: ${org.trade || 'general'}

ARTIFACTS (JSON):
${JSON.stringify(artifacts, null, 2)}

For each artifact return: id, type, score (0-100), gaps (array of specific problems), recommended_fixes (array of concrete actions). Then give overall_assessment and top_issues (the 3-5 most critical cross-cutting problems).`,
    response_json_schema: { type: 'object', properties: {
      artifacts: { type: 'array', items: { type: 'object', properties: {
        id: { type: 'string' }, type: { type: 'string' }, score: { type: 'number' },
        gaps: { type: 'array', items: { type: 'string' } },
        recommended_fixes: { type: 'array', items: { type: 'string' } },
      } } },
      overall_assessment: { type: 'string' },
      top_issues: { type: 'array', items: { type: 'string' } },
    } },
  });

  // Create SystemFlags for critical gaps (score < 70)
  let flagsCreated = 0;
  for (const a of (critique?.artifacts || [])) {
    if (a.score < 70) {
      await client.entities.SystemFlag.create({
        flag_type: 'data_gap',
        severity: a.score < 50 ? 'critical' : 'high',
        target_type: a.type === 'project' ? 'project' : 'entity',
        target_id: a.id,
        title: `Critic: ${a.type} scored ${a.score}/100`,
        description: ((a.gaps || []).join('; ') || 'Multiple gaps identified by critic agent.').slice(0, 500),
        fix_description: (a.recommended_fixes || []).join('; ').slice(0, 500),
        fix_action: 'manual_review',
        auto_fix_available: false,
        status: 'open',
      }).catch(() => null);
      flagsCreated++;
    }
  }

  const arts = critique?.artifacts || [];
  const avgScore = arts.length ? Math.round(arts.reduce((s: number, a: any) => s + (a.score || 0), 0) / arts.length) : 0;

  const report = `AUTOLEADS CRITIC REPORT — ${org.name}
Cycle: ${new Date().toISOString()}

Artifacts reviewed: ${artifacts.length}
Average score: ${avgScore}/100
Flags created: ${flagsCreated}

TOP ISSUES:
${(critique?.top_issues || []).map((t: string, i: number) => `${i + 1}. ${t}`).join('\n')}

OVERALL ASSESSMENT:
${critique?.overall_assessment || 'n/a'}

LOWEST-SCORED ARTIFACTS:
${arts.slice().sort((a: any, b: any) => a.score - b.score).slice(0, 10).map((a: any) => `- [${a.score}/100] ${a.type} ${a.id}: ${(a.gaps || []).join('; ').slice(0, 200)}`).join('\n')}

See the Self-Reflection Dashboard and System Flags for full detail.`;

  await client.integrations.Core.SendEmail({
    to: CRITIC_EMAIL,
    subject: `AUTOLEADS Critic Report — ${org.name} (avg ${avgScore}/100)`,
    body: report,
  }).catch(() => null);

  return {
    org: org.name,
    artifacts_reviewed: artifacts.length,
    avg_score: avgScore,
    flags_created: flagsCreated,
    top_issues: critique?.top_issues || [],
  };
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, body, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user) {
      const ctx = await resolveUserOrgs(client, user.id);
      if (ctx.orgIds.length === 0) return Response.json({ error: 'No organization membership' }, { status: 403 });
      const results: any[] = [];
      for (const orgId of ctx.orgIds) {
        const org = await client.entities.Organization.get(orgId).catch(() => null);
        if (!org) continue;
        results.push(await critiqueForOrg(client, org));
      }
      return Response.json({ success: true, results });
    }

    const allResults: any[] = [];
    const sweep = await forEachOrganization(client, async (org: any) => {
      allResults.push(await critiqueForOrg(client, org));
    });
    return Response.json({ success: true, results: allResults, processed: sweep.processed });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Critic review failed' }, { status: 500 });
  }
}