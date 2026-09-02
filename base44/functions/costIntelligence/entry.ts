import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ctx = await resolveUserOrgs(client, user.id);
    const orgId = ctx.orgIds[0] || '';

    // Fetch all cost metrics and financial data
    const [metrics, invoices, payments, projects, proposals] = await Promise.all([
      client.entities.CostMetric.list('-created_date', 500).catch(() => []),
      client.entities.Invoice.list('-created_date', 200).catch(() => []),
      client.entities.Payment.list('-created_date', 200).catch(() => []),
      client.entities.Project.list('-created_date', 200).catch(() => []),
      client.entities.Proposal.list('-created_date', 200).catch(() => []),
    ]);

    // Compute cost breakdown by category
    const categoryTotals: Record<string, number> = {};
    for (const m of (metrics || [])) {
      if (m.is_predicted) continue;
      categoryTotals[m.category] = (categoryTotals[m.category] || 0) + Number(m.amount || 0);
    }

    const totalRevenue = (payments || []).filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
    const totalCost = Object.values(categoryTotals).reduce((s: number, v: number) => s + v, 0);
    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    // Prepare cost summary for LLM
    const costSummary = Object.entries(categoryTotals)
      .sort((a: any, b: any) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: $${Number(amt).toLocaleString()}`)
      .join(', ');

    const projectCount = (projects || []).length;
    const proposalCount = (proposals || []).length;
    const avgProjectValue = projectCount > 0 ? (projects as any[]).reduce((s: number, p: any) => s + Number(p.value || 0), 0) / projectCount : 0;

    // Use LLM to generate cost analysis, predictions, and recommendations
    const analysis = await client.integrations.Core.InvokeLLM({
      prompt: `You are a construction business cost intelligence analyst. Analyze the following cost data and provide actionable recommendations.

COST BREAKDOWN BY CATEGORY:
${costSummary || 'No cost data available'}

FINANCIAL SUMMARY:
- Total Revenue: $${totalRevenue.toLocaleString()}
- Total Costs: $${totalCost.toLocaleString()}
- Net Profit: $${profit.toLocaleString()}
- Profit Margin: ${margin.toFixed(1)}%
- Active Projects: ${projectCount}
- Proposals: ${proposalCount}
- Avg Project Value: $${avgProjectValue.toFixed(0)}

Generate a JSON response with:
1. "predictions": Predict costs for the next 3 months based on trends. Include category, predicted_amount, and confidence (0-100).
2. "recommendations": 3-5 specific cost-saving recommendations. Each with: title, category, description, potential_savings_monthly, potential_savings_annual, priority (low/medium/high/critical), action_steps (array of strings), and ai_analysis (1-2 sentence explanation).
3. "overall_assessment": 2-3 sentence summary of financial health.

Focus on construction industry-specific costs: labor, materials, equipment, subcontractors, overhead, software, marketing, insurance, fuel, permits.`,
      response_json_schema: {
        type: 'object',
        properties: {
          predictions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category: { type: 'string' },
                predicted_amount: { type: 'number' },
                confidence: { type: 'number' },
                month: { type: 'string' },
              },
            },
          },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                category: { type: 'string' },
                description: { type: 'string' },
                potential_savings_monthly: { type: 'number' },
                potential_savings_annual: { type: 'number' },
                priority: { type: 'string' },
                action_steps: { type: 'array', items: { type: 'string' } },
                ai_analysis: { type: 'string' },
              },
            },
          },
          overall_assessment: { type: 'string' },
        },
      },
    });

    // Store predicted costs as CostMetric records
    if (analysis?.predictions) {
      for (const pred of analysis.predictions.slice(0, 10)) {
        const d = new Date(); d.setMonth(d.getMonth() + 1);
        await client.entities.CostMetric.create({
          organization_id: orgId,
          category: pred.category,
          description: `AI Predicted — ${pred.month || 'next month'}`,
          amount: pred.predicted_amount,
          period: d.toISOString().slice(0, 7),
          date: d.toISOString().slice(0, 10),
          is_predicted: true,
          confidence_score: pred.confidence,
        }).catch(() => null);
      }
    }

    // Store recommendations
    if (analysis?.recommendations) {
      for (const rec of analysis.recommendations) {
        await client.entities.CostRecommendation.create({
          organization_id: orgId,
          category: rec.category,
          title: rec.title,
          description: rec.description,
          potential_savings_monthly: rec.potential_savings_monthly || 0,
          potential_savings_annual: rec.potential_savings_annual || 0,
          priority: rec.priority || 'medium',
          ai_analysis: rec.ai_analysis,
          action_steps: JSON.stringify(rec.action_steps || []),
          status: 'pending',
          confidence_score: 80,
        }).catch(() => null);
      }
    }

    return Response.json({
      success: true,
      predictions_created: analysis?.predictions?.length || 0,
      recommendations_created: analysis?.recommendations?.length || 0,
      overall_assessment: analysis?.overall_assessment || '',
      total_cost: totalCost,
      total_revenue: totalRevenue,
      profit,
      margin: margin.toFixed(1),
    });
  } catch (error: any) {
    console.error('costIntelligence error:', error);
    return Response.json({ error: error?.message || 'Cost analysis failed' }, { status: 500 });
  }
}