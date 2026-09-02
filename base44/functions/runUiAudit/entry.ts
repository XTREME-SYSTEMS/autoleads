import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { createGap, safeListScoped } from '../../shared/systemUtils.ts';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization } from '../../shared/orgContext.ts';

// Routes that should have backing data to render meaningfully
const ROUTE_ENTITY_MAP = [
  { path: '/leads', entity: 'Project', label: 'Lead Discovery' },
  { path: '/projects', entity: 'Project', label: 'Projects' },
  { path: '/bids', entity: 'Project', label: 'Bid Board' },
  { path: '/proposals', entity: 'Proposal', label: 'Proposals' },
  { path: '/estimates', entity: 'Estimate', label: 'Estimates' },
  { path: '/takeoff', entity: 'Takeoff', label: 'Takeoff' },
  { path: '/material-pricing', entity: 'Material', label: 'Material Pricing' },
  { path: '/pricing-intelligence', entity: 'PricingProfile', label: 'Pricing Intelligence' },
  { path: '/contractors', entity: 'CompanyProfile', label: 'Contractor Directory' },
  { path: '/contacts', entity: 'Contact', label: 'Contact Directory' },
  { path: '/messages', entity: 'Message', label: 'Messages' },
  { path: '/notifications', entity: 'Notification', label: 'Notifications' },
  { path: '/tasks', entity: 'ActionItem', label: 'Task Board' },
  { path: '/outreach', entity: 'Contact', label: 'Outreach Center' },
  { path: '/scrapers', entity: 'ScrapeSource', label: 'Scraping' },
  { path: '/sources', entity: 'ScrapeSource', label: 'Source Management' },
  { path: '/settings/company', entity: 'CompanyProfile', label: 'Company Settings' },
  { path: '/settings/pricing', entity: 'PricingProfile', label: 'Pricing Settings' },
  { path: '/settings/proposals', entity: 'ProposalPackage', label: 'Proposal Template' },
  { path: '/settings/outreach', entity: 'EmailTemplate', label: 'Outreach Settings' },
  { path: '/settings/branding', entity: 'BrandAsset', label: 'Branding' },
  { path: '/auto-app-setup', entity: 'ContractorApp', label: 'Auto App' },
];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const perOrgResults: any[] = [];
    let totalPagesWithData = 0, totalPagesEmpty = 0, totalStubCount = 0;
    const allEmptyPages: string[] = [];

    // Iterate every org — UI audit is per-tenant, not cross-tenant.
    await forEachOrganization(client, async (org) => {
      let pagesWithData = 0, pagesEmpty = 0;
      const emptyPages: any[] = [];

      for (const route of ROUTE_ENTITY_MAP) {
        const recs = await safeListScoped(client, route.entity, org.id, '-created_date', 1);
        if (recs.length > 0) {
          pagesWithData++;
        } else {
          pagesEmpty++;
          emptyPages.push(route);
        }
      }

      // Empty pages are correct behavior (empty states render properly) — NOT defects.
      // Do NOT create SystemGap records for empty pages. The UI score already reflects
      // data coverage. Creating gaps for empty pages caused an infinite create→close→re-create
      // cycle with runRecursiveAudit and polluted the gap ledger with false positives.

      // Check for stub markers in this org's projects
      const projects = await safeListScoped(client, 'Project', org.id);
      const stubMarkers = ['coming soon', 'placeholder', 'todo', 'lorem ipsum', 'test data', 'sample'];
      let stubCount = 0;
      for (const p of projects) {
        const text = `${p.title} ${p.description || ''} ${p.specs || ''}`.toLowerCase();
        if (stubMarkers.some(m => text.includes(m))) {
          stubCount++;
          await createGap(client, {
            title: `Stub content in project: ${p.title?.slice(0, 40)}`,
            category: 'non_functional_ui',
            severity: 'medium',
            description: `Project ${p.id} (org ${org.name}) contains placeholder/stub text. Consider re-verifying or removing.`,
          });
        }
      }

      const uiScore = Math.round((pagesWithData / ROUTE_ENTITY_MAP.length) * 100);

      // Update or create this org's latest SystemScore
      const scores = await safeListScoped(client, 'SystemScore', org.id, '-created_date', 1);
      if (scores.length > 0) {
        await client.entities.SystemScore.update(scores[0].id, {
          ui_completeness_score: uiScore,
          run_phase: 'ui_audit',
        });
      } else {
        await client.entities.SystemScore.create({
          organization_id: org.id,
          overall_health_score: uiScore,
          ui_completeness_score: uiScore,
          run_phase: 'ui_audit',
          open_gaps: 0,
        });
      }

      totalPagesWithData += pagesWithData;
      totalPagesEmpty += pagesEmpty;
      totalStubCount += stubCount;
      allEmptyPages.push(...emptyPages.map(r => `${org.name}:${r.path}`));
      perOrgResults.push({ org: org.name, orgId: org.id, pagesWithData, pagesEmpty, uiScore, stubCount });
    });

    const overallUiScore = perOrgResults.length > 0
      ? Math.round(perOrgResults.reduce((sum, r) => sum + r.uiScore, 0) / perOrgResults.length)
      : 0;

    return Response.json({
      success: true,
      orgsAudited: perOrgResults.length,
      pagesWithData: totalPagesWithData,
      pagesEmpty: totalPagesEmpty,
      totalRoutes: ROUTE_ENTITY_MAP.length * perOrgResults.length,
      uiScore: overallUiScore,
      stubCount: totalStubCount,
      perOrg: perOrgResults,
      emptyPages: allEmptyPages,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}