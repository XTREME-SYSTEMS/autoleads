import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { forEachOrganization } from '../../shared/orgContext.ts';
import { safeListScoped } from '../../shared/systemUtils.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const perOrg: any[] = [];
    let totalPass = 0, totalWarn = 0, totalFail = 0, totalTests = 0;

    // Iterate every org — user test is per-tenant, not cross-tenant.
    await forEachOrganization(client, async (org) => {
      const projects = await safeListScoped(client, 'Project', org.id);
      const proposals = await safeListScoped(client, 'Proposal', org.id);
      const estimates = await safeListScoped(client, 'Estimate', org.id);
      const takeoffs = await safeListScoped(client, 'Takeoff', org.id);
      const companies = await safeListScoped(client, 'CompanyProfile', org.id);
      const pricing = await safeListScoped(client, 'PricingProfile', org.id);
      const sources = await safeListScoped(client, 'ScrapeSource', org.id);
      const materials = await safeListScoped(client, 'Material', org.id);
      const contacts = await safeListScoped(client, 'Contact', org.id);
      const images = await safeListScoped(client, 'ProjectImage', org.id);
      const contractorApps = await safeListScoped(client, 'ContractorApp', org.id);
      const paymentPrefs = await safeListScoped(client, 'PaymentPreference', org.id);
      const automations = await safeListScoped(client, 'AutomationConfig', org.id);
      const notifications = await safeListScoped(client, 'Notification', org.id);
      const tasks = await safeListScoped(client, 'ActionItem', org.id);
      const messages = await safeListScoped(client, 'Message', org.id);
      const emailTemplates = await safeListScoped(client, 'EmailTemplate', org.id);
      const brandAssets = await safeListScoped(client, 'BrandAsset', org.id);

      const tests: any[] = [];
      let passCount = 0, warnCount = 0, failCount = 0;

      const check = (name: string, condition: boolean, severity: 'fail' | 'warn' = 'fail', details = '') => {
        const status = condition ? 'pass' : severity;
        if (status === 'pass') passCount++;
        else if (status === 'warn') warnCount++;
        else failCount++;
        tests.push({ name, status, details });
      };

      // --- 1. DASHBOARD & DATA VISIBILITY ---
      check('Dashboard shows projects', projects.length > 0, 'fail', `${projects.length} projects`);
      check('Dashboard shows proposals', proposals.length > 0, 'warn', `${proposals.length} proposals`);
      check('Dashboard shows notifications', notifications.length > 0, 'warn', `${notifications.length} notifications`);
      check('Dashboard shows tasks', tasks.length > 0, 'warn', `${tasks.length} tasks`);

      // --- 2. LEAD DISCOVERY ---
      check('Scrape sources configured', sources.length > 0, 'fail', `${sources.length} sources`);
      check('Active scrape sources exist', sources.some((s: any) => s.status === 'active'), 'warn', `${sources.filter((s: any) => s.status === 'active').length} active`);
      check('Unverified projects exist', projects.some((p: any) => p.verification_status === 'unverified'), 'warn', `${projects.filter((p: any) => p.verification_status === 'unverified').length} unverified`);

      // --- 3. PIPELINE FLOW ---
      const stages: any = {};
      projects.forEach((p: any) => { stages[p.stage] = (stages[p.stage] || 0) + 1; });
      check('Projects in qualification', (stages['qualification'] || 0) > 0, 'warn', `${stages['qualification'] || 0} projects`);
      check('Projects in takeoff stage', (stages['takeoff'] || 0) > 0, 'warn', `${stages['takeoff'] || 0} projects`);
      check('Projects in estimating', (stages['estimating'] || 0) > 0, 'warn', `${stages['estimating'] || 0} projects`);
      check('Projects in proposal stage', (stages['proposal'] || 0) > 0, 'warn', `${stages['proposal'] || 0} projects`);
      check('Takeoffs generated', takeoffs.length > 0, 'warn', `${takeoffs.length} takeoffs`);
      check('Estimates generated', estimates.length > 0, 'warn', `${estimates.length} estimates`);

      // --- 4. ONBOARDING COMPLETENESS ---
      check('Company profile set up', companies.length > 0, 'fail', companies[0]?.name || 'No company');
      check('Pricing profile configured', pricing.length > 0, 'warn', `${pricing.length} profiles`);
      check('Materials in price book', materials.length > 0, 'warn', `${materials.length} materials`);
      check('Payment preferences set', paymentPrefs.length > 0, 'warn', `${paymentPrefs.length} configs`);
      check('Automation configured', automations.length > 0, 'warn', `${automations.length} configs`);

      // --- 5. AUTO BRAND ---
      check('Project images uploaded', images.length > 0, 'warn', `${images.length} images`);
      check('Contractor app created', contractorApps.length > 0, 'warn', `${contractorApps.length} apps`);
      check('Brand assets uploaded', brandAssets.length > 0, 'warn', `${brandAssets.length} assets`);

      // --- 6. COMMUNICATION ---
      check('Contacts exist', contacts.length > 0, 'warn', `${contacts.length} contacts`);
      check('Messages exist', messages.length > 0, 'warn', `${messages.length} messages`);
      check('Email templates created', emailTemplates.length > 0, 'warn', `${emailTemplates.length} templates`);

      // --- 7. DATA QUALITY ---
      const verified = projects.filter((p: any) => p.verification_status === 'verified');
      check('Verified projects exist', verified.length > 0, 'warn', `${verified.length} verified of ${projects.length}`);
      const withValue = projects.filter((p: any) => p.value != null && p.value > 0);
      check('Projects have dollar value', withValue.length > 0, 'warn', `${withValue.length} with value`);
      const withSpecs = projects.filter((p: any) => p.specs && p.specs.length > 20);
      check('Projects have specs', withSpecs.length > 0, 'warn', `${withSpecs.length} with specs`);
      const withContact = projects.filter((p: any) => p.contract_info && p.contract_info.length > 10);
      check('Projects have contact info', withContact.length > 0, 'warn', `${withContact.length} with contacts`);

      // --- 8. USER JOURNEY SIMULATION ---
      const journey: any[] = [
        { step: '1. Login', status: 'pass', note: 'User is authenticated' },
        { step: '2. View Dashboard', status: projects.length > 0 ? 'pass' : 'fail', note: `${projects.length} projects shown` },
        { step: '3. Discover Leads', status: sources.length > 0 ? 'pass' : 'fail', note: `${sources.length} sources available` },
        { step: '4. Open Project Detail', status: projects.length > 0 ? 'pass' : 'fail', note: projects[0] ? `First: ${projects[0].title?.slice(0, 40)}` : 'No projects' },
        { step: '5. Generate Takeoff', status: takeoffs.length > 0 ? 'pass' : 'warn', note: `${takeoffs.length} takeoffs exist` },
        { step: '6. Generate Estimate', status: estimates.length > 0 ? 'pass' : 'warn', note: `${estimates.length} estimates exist` },
        { step: '7. Generate Proposal', status: proposals.length > 0 ? 'pass' : 'warn', note: `${proposals.length} proposals exist` },
        { step: '8. View Company Profile', status: companies.length > 0 ? 'pass' : 'fail', note: companies[0]?.name || 'No company' },
        { step: '9. View Pricing', status: pricing.length > 0 ? 'pass' : 'warn', note: `${pricing.length} pricing profiles` },
        { step: '10. View Auto Brand', status: (images.length > 0 || contractorApps.length > 0) ? 'pass' : 'warn', note: `${images.length} images, ${contractorApps.length} apps` },
        { step: '11. Check Notifications', status: notifications.length > 0 ? 'pass' : 'warn', note: `${notifications.length} notifications` },
        { step: '12. Check Tasks', status: tasks.length > 0 ? 'pass' : 'warn', note: `${tasks.length} tasks` },
      ];

      const uxScore = tests.length > 0 ? Math.round((passCount / tests.length) * 100) : 0;
      totalPass += passCount; totalWarn += warnCount; totalFail += failCount; totalTests += tests.length;
      perOrg.push({ org: org.name, orgId: org.id, summary: { total: tests.length, pass: passCount, warn: warnCount, fail: failCount }, uxScore, journey });
    });

    const overallUxScore = totalTests > 0 ? Math.round((totalPass / totalTests) * 100) : 0;

    return Response.json({
      success: true,
      orgsTested: perOrg.length,
      summary: { total: totalTests, pass: totalPass, warn: totalWarn, fail: totalFail },
      user_experience_score: overallUxScore,
      perOrg,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}