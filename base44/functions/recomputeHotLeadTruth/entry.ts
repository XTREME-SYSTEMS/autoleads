// Hot Lead Commercial Truth Repair — comprehensive recompute engine.
// Applies ALL commercial-truth gates to every OrganizationOpportunityMatch:
//   1. Source safety (synthetic/non-production URL detection)
//   2. Freshness recompute (bid_due_date vs current date — never infer extensions)
//   3. Cross-org project reference audit
//   4. Source intent classification (ACTIVE_SOLICITATION vs PERMIT_INTELLIGENCE etc.)
//   5. Solicitation-level evidence threshold
//   6. Hot Lead hard invariant (all 9 gates must pass)
//
// This function is safe to run multiple times — it is idempotent.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { computeFreshness } from '../../shared/freshness.ts';
import { isSyntheticSource } from '../../shared/sourceSafety.ts';
import { classifySourceIntent } from '../../shared/sourceIntent.ts';
import { evaluateHotLeadInvariant } from '../../shared/hotLeadInvariant.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const svc = base44.asServiceRole;
    const nowIso = new Date().toISOString();

    // --- Load all data ---
    const matches = await svc.entities.OrganizationOpportunityMatch.list('-created_date', 500);
    const canonicals = await svc.entities.CanonicalOpportunity.list('-created_date', 500);
    const projects = await svc.entities.Project.list('-created_date', 500);
    const sourceRecords = await svc.entities.OpportunitySourceRecord.list('-created_date', 500);
    const svqSources = await svc.entities.SourceVerificationQueue.list('-created_date', 200);
    const scrapeSources = await svc.entities.ScrapeSource.list('-created_date', 500);

    // --- Build lookup maps ---
    const canonicalMap = new Map(canonicals.map(c => [c.id, c]));
    const projectMap = new Map(projects.map(p => [p.id, p]));
    const sourceRecordsByCanonical = new Map<string, any[]>();
    for (const sr of sourceRecords) {
      if (!sr.canonical_opportunity_id) continue;
      if (!sourceRecordsByCanonical.has(sr.canonical_opportunity_id)) {
        sourceRecordsByCanonical.set(sr.canonical_opportunity_id, []);
      }
      sourceRecordsByCanonical.get(sr.canonical_opportunity_id)!.push(sr);
    }
    const svqByName = new Map(svqSources.map(s => [s.source_name, s]));
    const scrapeByName = new Map(scrapeSources.map(s => [s.name, s]));

    // --- Stats ---
    let matchesChecked = 0;
    let crossOrgReferencesFound = 0;
    let crossOrgReferencesRepaired = 0;
    let crossOrgReferencesSuppressed = 0;
    let crossOrgReferencesUnresolved = 0;
    let syntheticProductionRecordsFound = 0;
    let syntheticHotLeadsAfter = 0;
    let expiredHotLeadsFound = 0;
    let expiredHotLeadsAfter = 0;
    let permitDerivedHotLeadsAfter = 0;
    let hotLeadsAfter = 0;
    let canonicalsFreshnessUpdated = 0;
    let canonicalsMarkedNonProduction = 0;
    let matchesUpdated = 0;

    const canonicalBulkUpdates: any[] = [];
    const canonicalPhase2Updates: any[] = [];
    const matchBulkUpdates: any[] = [];

    // --- Phase 1: Recompute canonical freshness + detect synthetic sources ---
    for (const canonical of canonicals) {
      if (canonical.data_class === 'NON_PRODUCTION_EXAMPLE') continue;

      const srcRecs = sourceRecordsByCanonical.get(canonical.id) || [];
      const primaryUrl = srcRecs[0]?.source_url || '';

      // Check synthetic source
      const syntheticCheck = isSyntheticSource(primaryUrl);
      if (syntheticCheck.isSynthetic) {
        syntheticProductionRecordsFound++;
        canonicalBulkUpdates.push({ id: canonical.id, data_class: 'NON_PRODUCTION_EXAMPLE' });
        canonicalsMarkedNonProduction++;
        canonical.data_class = 'NON_PRODUCTION_EXAMPLE';
        continue;
      }

      // Recompute freshness
      const freshnessResult = computeFreshness({
        bid_due_date: canonical.bid_due_date,
        first_seen_at: canonical.first_seen_at,
        last_seen_at: canonical.last_seen_at,
        last_verified_at: canonical.last_verified_at,
      });

      // VERIFICATION CONTRACT: a record cannot claim source-verified freshness
      // while last_verified_at is null. Downgrade to UNKNOWN until actually
      // verified against the source by a scraper function (e.g., scrapeFdots).
      if (!canonical.last_verified_at) {
        freshnessResult.freshness_status = 'UNKNOWN';
        freshnessResult.deadline_status = 'NO_DEADLINE';
      }

      const needsFreshnessUpdate = canonical.freshness_status !== freshnessResult.freshness_status ||
        canonical.deadline_status !== freshnessResult.deadline_status;

      if (needsFreshnessUpdate) {
        canonicalBulkUpdates.push({
          id: canonical.id,
          freshness_status: freshnessResult.freshness_status,
          deadline_status: freshnessResult.deadline_status,
          next_verification_at: freshnessResult.next_verification_at,
        });
        canonicalsFreshnessUpdated++;
        canonical.freshness_status = freshnessResult.freshness_status;
        canonical.deadline_status = freshnessResult.deadline_status;
      }
    }

    // Apply canonical updates
    if (canonicalBulkUpdates.length > 0) {
      await svc.entities.CanonicalOpportunity.bulkUpdate(canonicalBulkUpdates);
    }

    // --- Phase 2: Audit matches + apply hot lead invariant ---
    for (const match of matches) {
      matchesChecked++;
      const canonical = canonicalMap.get(match.canonical_opportunity_id);
      if (!canonical) continue;

      // Skip if canonical was marked NON_PRODUCTION (synthetic)
      if (canonical.data_class === 'NON_PRODUCTION_EXAMPLE') {
        matchBulkUpdates.push({
          id: match.id,
          is_hot_lead: false,
          suppressed: true,
          suppression_reason: 'canonical marked non-production (synthetic source)',
          freshness_status: canonical.freshness_status || match.freshness_status,
        });
        matchesUpdated++;
        continue;
      }

      // --- Cross-org project reference audit ---
      let project: any = null;
      let crossOrgMismatch = false;
      if (match.project_id) {
        project = projectMap.get(match.project_id);
        if (!project) {
          crossOrgMismatch = true;
          crossOrgReferencesFound++;
          crossOrgReferencesUnresolved++;
        } else if (project.organization_id !== match.organization_id) {
          crossOrgMismatch = true;
          crossOrgReferencesFound++;
          // Try to find an org-owned project for this canonical
          const orgProject = projects.find(p =>
            p.organization_id === match.organization_id &&
            (p.title === canonical.title || (project?.source_url && p.source_url === project.source_url))
          );
          if (orgProject) {
            crossOrgReferencesRepaired++;
            project = orgProject;
          } else {
            crossOrgReferencesSuppressed++;
            crossOrgReferencesUnresolved++;
          }
        }
      }

      // --- Source intent classification ---
      const srcRecs = sourceRecordsByCanonical.get(canonical.id) || [];
      const projectUrl = project?.source_url || '';
      const primaryUrl = srcRecs[0]?.source_url || projectUrl;

      // Check synthetic source on project URL (canonical may not have OpportunitySourceRecord)
      const projectSynthetic = isSyntheticSource(projectUrl);
      if (projectSynthetic.isSynthetic && canonical.data_class !== 'NON_PRODUCTION_EXAMPLE') {
        canonicalPhase2Updates.push({ id: canonical.id, data_class: 'NON_PRODUCTION_EXAMPLE' });
        canonical.data_class = 'NON_PRODUCTION_EXAMPLE';
        syntheticProductionRecordsFound++;
      }

      // Find source for classification — match by authority name
      let sourceForClassification: any = null;
      if (canonical.authority) {
        sourceForClassification = svqByName.get(canonical.authority) || scrapeByName.get(canonical.authority);
      }

      // Skip if canonical was marked NON_PRODUCTION in Phase 2
      if (canonical.data_class === 'NON_PRODUCTION_EXAMPLE') {
        matchBulkUpdates.push({
          id: match.id,
          is_hot_lead: false,
          suppressed: true,
          suppression_reason: 'canonical marked non-production (synthetic source)',
          freshness_status: canonical.freshness_status || match.freshness_status,
        });
        matchesUpdated++;
        continue;
      }

      // --- Evaluate hot lead invariant ---
      const wasHotLead = match.is_hot_lead;
      const evaluation = evaluateHotLeadInvariant({
        match: {
          organization_id: match.organization_id,
          project_id: match.project_id,
          location_eligibility: match.location_eligibility,
          trade_match: match.trade_match,
          // Pass suppressed: false so the engine re-evaluates from scratch.
          // Passing the stored state causes gate 4 (notSuppressed) to always fail
          // for previously-suppressed records — a cascading suppression lock.
          suppressed: false,
          freshness_status: match.freshness_status,
          data_class: match.data_class,
        },
        canonical: {
          title: canonical.title,
          authority: canonical.authority,
          solicitation_number: canonical.solicitation_number,
          bid_number: canonical.bid_number,
          project_number: canonical.project_number,
          first_seen_at: canonical.first_seen_at,
          freshness_status: canonical.freshness_status,
          deadline_status: canonical.deadline_status,
          bid_due_date: canonical.bid_due_date,
          data_class: canonical.data_class,
        },
        project: project ? { organization_id: project.organization_id, data_class: project.data_class } : null,
        sourceRecords: srcRecs,
        source: sourceForClassification ? {
          data_type: sourceForClassification.data_type,
          priority: sourceForClassification.priority,
          source_name: sourceForClassification.source_name || sourceForClassification.name,
          url: sourceForClassification.url,
        } : null,
        sourceUrl: primaryUrl,
      });

      // Track expired hot leads found (was hot, now fails freshness)
      if (wasHotLead && evaluation.flags.includes('FRESHNESS_FAIL')) {
        expiredHotLeadsFound++;
      }

      // Build update
      const update: any = {
        is_hot_lead: evaluation.isHotLead,
        suppressed: evaluation.suppressed,
        suppression_reason: evaluation.suppressionReason,
        freshness_status: canonical.freshness_status || match.freshness_status,
      };

      // If cross-org repair found an org project, update project_id
      if (crossOrgMismatch && project && project.organization_id === match.organization_id) {
        update.project_id = project.id;
      }

      matchBulkUpdates.push({ id: match.id, ...update });
      matchesUpdated++;

      if (evaluation.isHotLead) {
        hotLeadsAfter++;
        if (evaluation.flags.includes('SYNTHETIC_SOURCE')) syntheticHotLeadsAfter++;
        if (evaluation.flags.includes('FRESHNESS_FAIL')) expiredHotLeadsAfter++;
        if (evaluation.flags.includes('SOURCE_INTENT_PERMIT_INTELLIGENCE')) permitDerivedHotLeadsAfter++;
      }
    }

    // Apply match updates
    if (matchBulkUpdates.length > 0) {
      await svc.entities.OrganizationOpportunityMatch.bulkUpdate(matchBulkUpdates);
    }

    // Apply Phase 2 canonical updates (synthetic sources found via project URLs)
    if (canonicalPhase2Updates.length > 0) {
      await svc.entities.CanonicalOpportunity.bulkUpdate(canonicalPhase2Updates);
    }

    // --- Log audit ---
    await svc.entities.SuperadminAudit.create({
      superadmin_user_id: user.id,
      superadmin_email: user.email,
      action_type: 'cross_org_update',
      target_entity: 'OrganizationOpportunityMatch,CanonicalOpportunity',
      reason_code: 'hot_lead_commercial_truth_repair',
      details: `Matches checked: ${matchesChecked}, cross-org found: ${crossOrgReferencesFound}, repaired: ${crossOrgReferencesRepaired}, suppressed: ${crossOrgReferencesSuppressed}, unresolved: ${crossOrgReferencesUnresolved}. Synthetic records found: ${syntheticProductionRecordsFound}. Canonicals freshness updated: ${canonicalsFreshnessUpdated}. Hot leads after: ${hotLeadsAfter}.`,
      timestamp: nowIso,
      data_class: 'production',
    });

    return Response.json({
      success: true,
      matches_checked: matchesChecked,
      cross_org_references_found: crossOrgReferencesFound,
      cross_org_references_repaired: crossOrgReferencesRepaired,
      cross_org_references_suppressed: crossOrgReferencesSuppressed,
      cross_org_references_unresolved: crossOrgReferencesUnresolved,
      cross_org_references_remaining: crossOrgReferencesUnresolved,
      synthetic_production_records_found: syntheticProductionRecordsFound,
      synthetic_hot_leads_after: syntheticHotLeadsAfter,
      expired_hot_leads_found: expiredHotLeadsFound,
      expired_hot_leads_after: expiredHotLeadsAfter,
      permit_derived_hot_leads_after: permitDerivedHotLeadsAfter,
      canonicals_freshness_updated: canonicalsFreshnessUpdated,
      canonicals_marked_non_production: canonicalsMarkedNonProduction,
      matches_updated: matchesUpdated,
      hot_leads_after: hotLeadsAfter,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Recompute failed' }, { status: 500 });
  }
}