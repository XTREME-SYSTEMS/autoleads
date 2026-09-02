import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';

// generateSafetyBooklet — generates a branded safety regulations booklet
// tailored to the company's trade and project type. The booklet includes
// OSHA-aligned safety protocols, PPE requirements, site safety rules, and
// emergency procedures — all branded with the company's name and logo.

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const orgId = String(body?.organization_id || '').trim();
    const projectId = String(body?.project_id || '').trim();
    const trade = String(body?.trade || '').trim();

    const [companies, brandAssets, project] = await Promise.all([
      orgId ? client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []) : client.entities.CompanyProfile.list().catch(() => []),
      orgId ? client.entities.BrandAsset.filter({ organization_id: orgId }).catch(() => []) : client.entities.BrandAsset.list().catch(() => []),
      projectId ? client.entities.Project.get(projectId).catch(() => null) : null,
    ]);

    const company = (companies || [])[0] || {};
    const logo = (brandAssets || []).find((b: any) => b.type === 'logo') || (brandAssets || [])[0] || null;
    const effectiveTrade = trade || project?.trade || company.trade || 'general construction';

    const result = await client.integrations.Core.InvokeLLM({
      prompt: `You are a construction safety expert. Generate a professional, branded safety regulations booklet for a ${effectiveTrade} contractor.

COMPANY INFO:
- Name: ${company.name || 'AUTOLEADS'}
- Trade: ${effectiveTrade}
- License: ${company.license_number || 'Licensed & Insured'}
- Location: ${company.city || ''}, ${company.state || ''}

${project ? `PROJECT CONTEXT:
- Title: ${project.title}
- Type: ${project.project_type || effectiveTrade}
- Location: ${project.jurisdiction || project.address || 'N/A'}` : ''}

Generate a comprehensive safety booklet as JSON with these sections:
1. cover: Title page with company name, "Safety Regulations Booklet", and a professional subtitle
2. introduction: 2-3 paragraph introduction about the company's commitment to safety
3. ppe_requirements: Detailed PPE requirements specific to ${effectiveTrade} work (head, eye, hand, foot, respiratory, hearing protection)
4. site_safety_rules: 10-15 numbered site safety rules specific to ${effectiveTrade}
5. hazard_identification: Common hazards in ${effectiveTrade} work and how to mitigate them
6. emergency_procedures: Emergency response procedures (injury, fire, weather, chemical spill if applicable)
7. osha_standards: Key OSHA standards that apply to ${effectiveTrade} work (cite relevant 29 CFR parts)
8. daily_safety_checklist: A daily safety checklist with 10-15 items
9. incident_reporting: Incident reporting procedures and documentation requirements
10. training_requirements: Required safety training for ${effectiveTrade} workers

Make it professional, specific to ${effectiveTrade}, and ready to present to clients as a differentiator. Use real OSHA references where applicable.`,
      response_json_schema: {
        type: 'object',
        properties: {
          cover: { type: 'object', properties: { title: { type: 'string' }, subtitle: { type: 'string' } } },
          introduction: { type: 'string' },
          ppe_requirements: { type: 'array', items: { type: 'object', properties: { category: { type: 'string' }, requirement: { type: 'string' } } } },
          site_safety_rules: { type: 'array', items: { type: 'string' } },
          hazard_identification: { type: 'array', items: { type: 'object', properties: { hazard: { type: 'string' }, mitigation: { type: 'string' } } } },
          emergency_procedures: { type: 'array', items: { type: 'object', properties: { scenario: { type: 'string' }, procedure: { type: 'string' } } } },
          osha_standards: { type: 'array', items: { type: 'string' } },
          daily_safety_checklist: { type: 'array', items: { type: 'string' } },
          incident_reporting: { type: 'string' },
          training_requirements: { type: 'array', items: { type: 'string' } },
        }
      },
      add_context_from_internet: true,
      model: 'gemini_3_flash'
    });

    // Build branded HTML booklet
    const logoHtml = logo?.file_url || logo?.url
      ? `<img src="${logo.file_url || logo.url}" style="max-height:60px;margin-bottom:15px;"/>`
      : '';
    const companyName = company.name || 'AUTOLEADS';

    const htmlBooklet = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Inter,Arial,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#080808;">
      <div style="text-align:center;border-bottom:3px solid #FFC400;padding-bottom:30px;margin-bottom:30px;">
        ${logoHtml}
        <h1 style="font-size:32px;font-weight:900;margin:0;">${result.cover?.title || 'Safety Regulations Booklet'}</h1>
        <p style="font-size:16px;color:#666;margin:10px 0 0;">${result.cover?.subtitle || `${companyName} — Committed to Safety`}</p>
        <p style="font-size:14px;color:#E9A900;font-weight:bold;margin:15px 0 0;">${companyName}${company.license_number ? ` | Lic#${company.license_number}` : ''}</p>
      </div>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Introduction</h2>
      <p style="line-height:1.7;">${result.introduction || ''}</p>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">PPE Requirements</h2>
      <ul style="line-height:1.8;">${(result.ppe_requirements || []).map((p: any) => `<li><strong>${p.category}:</strong> ${p.requirement}</li>`).join('')}</ul>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Site Safety Rules</h2>
      <ol style="line-height:1.8;">${(result.site_safety_rules || []).map((r: string) => `<li>${r}</li>`).join('')}</ol>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Hazard Identification & Mitigation</h2>
      <table style="width:100%;border-collapse:collapse;">${(result.hazard_identification || []).map((h: any) => `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold;width:40%;">${h.hazard}</td><td style="padding:8px;border:1px solid #ddd;">${h.mitigation}</td></tr>`).join('')}</table>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Emergency Procedures</h2>
      <ul style="line-height:1.8;">${(result.emergency_procedures || []).map((e: any) => `<li><strong>${e.scenario}:</strong> ${e.procedure}</li>`).join('')}</ul>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Applicable OSHA Standards</h2>
      <ul style="line-height:1.8;">${(result.osha_standards || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Daily Safety Checklist</h2>
      <ul style="line-height:2;">${(result.daily_safety_checklist || []).map((c: string) => `<li>☐ ${c}</li>`).join('')}</ul>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Incident Reporting</h2>
      <p style="line-height:1.7;">${result.incident_reporting || ''}</p>

      <h2 style="color:#E9A900;border-bottom:2px solid #FFC400;padding-bottom:5px;">Training Requirements</h2>
      <ul style="line-height:1.8;">${(result.training_requirements || []).map((t: string) => `<li>${t}</li>`).join('')}</ul>

      <div style="text-align:center;margin-top:40px;padding-top:20px;border-top:2px solid #FFC400;">
        <p style="font-size:12px;color:#999;">${companyName} — Safety is Everyone's Responsibility</p>
      </div>
    </body></html>`;

    return Response.json({
      status: 'success',
      company_name: companyName,
      trade: effectiveTrade,
      booklet_html: htmlBooklet,
      booklet_data: result,
    });
  } catch (error: any) {
    console.error('generateSafetyBooklet error:', error);
    return Response.json({ error: error?.message || 'Safety booklet generation failed' }, { status: 500 });
  }
}