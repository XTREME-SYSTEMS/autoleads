// Server-authoritative match eligibility recompute engine.
//
// Recomputes location_eligibility, location_explanation, suppressed,
// suppression_reason, and is_hot_lead for every OrganizationOpportunityMatch
// against the organization's CURRENT service-area configuration.
//
// This is the single source of truth for match eligibility. It does NOT trust
// historical Project.location_eligibility — it recomputes from the canonical
// engine using the org's configured service area + the CanonicalOpportunity's
// jurisdiction/state/address.
//
// HOT LEAD INVARIANT:
//   is_hot_lead = true ONLY when:
//     location_eligibility IN (IN_SERVICE_AREA, MANUAL_OVERRIDE)
//     AND suppressed = false
//     AND freshness_status qualifies (FRESH or AGING)
//     AND trade_match qualifies (PRIMARY_MATCH or SECONDARY_MATCH)
//
// Usage:
//   POST with { organization_id?: string } — if omitted, recomputes ALL orgs.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  isOpportunityInServiceArea,
  normalizeServiceAreaStates,
  detectState,
} from '../../shared/locationEligibility.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const svc = base44.asServiceRole;
    const now = new Date().toISOString();

    let body: any = {};
    try { body = await req.json(); } catch { /* GET or empty body */ }
    const targetOrgId = body?.organization_id || '';

    // --- Load all ScrapeSources to find "Auto Leads Discovery" per org ---
    const allSources = await svc.entities.ScrapeSource.list('-created_date', 500);

    // Build org_id → service area states map
    const orgServiceAreaMap: Record<string, string[]> = {};
    for (const src of allSources) {
      if (!src.organization_id) continue;
      if (!src.name?.startsWith('Auto Leads Discovery')) continue;
      const states = normalizeServiceAreaStates(src.jurisdiction || '');
      if (states.length > 0) {
        orgServiceAreaMap[src.organization_id] = states;
      }
    }

    // --- Load all matches ---
    let allMatches: any[] = [];
    let offset = 0;
    while (offset < 2000) {
      const batch = await svc.entities.OrganizationOpportunityMatch.list('-created_date', 500, offset);
      if (!batch || batch.length === 0) break;
      allMatches = allMatches.concat(batch);
      if (batch.length < 500) break;
      offset += 500;
    }

    // Filter to target org if specified
    const matchesToProcess = targetOrgId
      ? allMatches.filter(m => m.organization_id === targetOrgId)
      : allMatches;

    // --- Load all canonicals for jurisdiction lookup ---
    const allCanonicals = await svc.entities.CanonicalOpportunity.list('-created_date', 500);
    const canonicalMap = new Map(allCanonicals.map(c => [c.id, c]));

    let recomputed = 0;
    let suppressed = 0;
    let hotLeadsBefore = 0;
    let hotLeadsAfter = 0;
    let noServiceArea = 0;
    const errors: string[] = [];

    // Build bulk update list
    const updates: any[] = [];

    for (const match of matchesToProcess) {
      try {
        if (match.is_hot_lead) hotLeadsBefore++;

        const canonical = canonicalMap.get(match.canonical_opportunity_id);
        if (!canonical) {
          errors.push(`Match ${match.id}: canonical not found`);
          continue;
        }

        const serviceAreaStates = orgServiceAreaMap[match.organization_id] || [];

        // If no service area configured → UNKNOWN_LOCATION / NO_ORGANIZATION_MATCH
        let eligibility: string;
        let explanation: string;

        if (serviceAreaStates.length === 0) {
          eligibility = 'NO_ORGANIZATION_MATCH';
          explanation = 'Organization has no service-area configuration. Cannot verify eligibility.';
        } else {
          const result = isOpportunityInServiceArea(
            serviceAreaStates,
            canonical.jurisdiction || '',
            canonical.address || '',
            match.location_eligibility === 'MANUAL_OVERRIDE'
          );
          eligibility = result.eligibility;
          explanation = result.explanation;
        }

        // Determine suppression
        const wasSuppressed = match.suppressed || false;
        let suppressedFlag = wasSuppressed;
        let suppressionReason = match.suppression_reason || '';

        if (eligibility === 'OUT_OF_SERVICE_AREA') {
          suppressedFlag = true;
          suppressionReason = 'outside configured service area';
        } else if (eligibility === 'NO_ORGANIZATION_MATCH') {
          suppressedFlag = true;
          suppressionReason = 'no organization service area configured';
        } else if (eligibility === 'IN_SERVICE_AREA' || eligibility === 'MANUAL_OVERRIDE') {
          // Only un-suppress if the suppression was location-based
          if (wasSuppressed && suppressionReason?.includes('service area')) {
            suppressedFlag = false;
            suppressionReason = '';
          }
        }

        // HOT LEAD INVARIANT
        const freshnessOk = !match.freshness_status ||
          match.freshness_status === 'FRESH' ||
          match.freshness_status === 'AGING';
        const tradeOk = match.trade_match === 'PRIMARY_MATCH' ||
          match.trade_match === 'SECONDARY_MATCH';
        const isHotLead = (eligibility === 'IN_SERVICE_AREA' || eligibility === 'MANUAL_OVERRIDE') &&
          !suppressedFlag && freshnessOk && tradeOk;

        if (isHotLead) hotLeadsAfter++;
        if (suppressedFlag && !wasSuppressed) suppressed++;

        // Only queue update if something changed
        const changed =
          match.location_eligibility !== eligibility ||
          match.location_explanation !== explanation ||
          match.suppressed !== suppressedFlag ||
          match.suppression_reason !== suppressionReason ||
          match.is_hot_lead !== isHotLead;

        if (changed) {
          updates.push({
            id: match.id,
            location_eligibility: eligibility,
            location_explanation: explanation,
            suppressed: suppressedFlag,
            suppression_reason: suppressionReason,
            is_hot_lead: isHotLead,
            last_updated_at: now,
          });
          recomputed++;
        }

        if (serviceAreaStates.length === 0) noServiceArea++;
      } catch (e: any) {
        errors.push(`Match ${match.id}: ${e?.message || String(e)}`);
      }
    }

    // Bulk update in batches of 500
    for (let i = 0; i < updates.length; i += 500) {
      const batch = updates.slice(i, i + 500);
      await svc.entities.OrganizationOpportunityMatch.bulkUpdate(batch);
    }

    // Log audit
    await svc.entities.SuperadminAudit.create({
      superadmin_user_id: user.id,
      superadmin_email: user.email,
      action_type: 'cross_org_update',
      target_entity: 'OrganizationOpportunityMatch',
      target_organization_id: targetOrgId || 'ALL',
      reason_code: 'recompute_match_eligibility',
      details: `Recomputed ${matchesToProcess.length} matches: ${recomputed} changed, ${suppressed} newly suppressed, hot leads ${hotLeadsBefore}→${hotLeadsAfter}, ${noServiceArea} no service area, ${errors.length} errors.`,
      timestamp: now,
      data_class: 'production',
    });

    return Response.json({
      success: true,
      target_org: targetOrgId || 'ALL',
      matches_processed: matchesToProcess.length,
      matches_changed: recomputed,
      newly_suppressed: suppressed,
      hot_leads_before: hotLeadsBefore,
      hot_leads_after: hotLeadsAfter,
      no_service_area_orgs: noServiceArea,
      errors: errors.length,
      error_samples: errors.slice(0, 5),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Recompute failed' }, { status: 500 });
  }
}