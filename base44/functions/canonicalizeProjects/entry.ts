// Idempotent canonicalization engine for AUTOLEADS.
// Processes projects → CanonicalOpportunity + OrganizationOpportunityMatch.
//
// KEY FIXES from prior inline implementation:
//   1. NEVER uses project database IDs as solicitation numbers
//   2. Idempotent matching — checks for existing org+canonical pair before creating
//   3. Proper state detection from jurisdiction string
//   4. Uses shared canonicalOpportunity.ts fingerprint engine
//
// This function is safe to run multiple times — it will not create duplicates.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { generateFingerprint, compareFingerprints } from '../../shared/canonicalOpportunity.ts';
import { detectState, isOpportunityInServiceArea, normalizeServiceAreaStates } from '../../shared/locationEligibility.ts';
import { computeFreshness } from '../../shared/freshness.ts';
import { isSyntheticSource } from '../../shared/sourceSafety.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const svc = base44.asServiceRole;
    const now = new Date().toISOString();

    // --- Load all existing canonicals into memory for fingerprint comparison ---
    const existingCanonicals = await svc.entities.CanonicalOpportunity.list('-created_date', 500);

    // --- Load all ScrapeSources to build org → service area states map ---
    // This is the authoritative service-area source truth. canonicalizeProjects
    // MUST recompute eligibility against this, never trust Project.location_eligibility.
    const allSources = await svc.entities.ScrapeSource.list('-created_date', 500);
    const orgServiceAreaMap: Record<string, string[]> = {};
    for (const src of allSources) {
      if (!src.organization_id) continue;
      if (!src.name?.startsWith('Auto Leads Discovery')) continue;
      const states = normalizeServiceAreaStates(src.jurisdiction || '');
      if (states.length > 0) {
        orgServiceAreaMap[src.organization_id] = states;
      }
    }

    // --- Load all projects (paginated) ---
    let allProjects: any[] = [];
    let offset = 0;
    while (offset < 1000) {
      const batch = await svc.entities.Project.list('-created_date', 500, offset);
      if (!batch || batch.length === 0) break;
      allProjects = allProjects.concat(batch);
      if (batch.length < 500) break;
      offset += 500;
    }

    // Skip NON_PRODUCTION and test projects
    const productionProjects = allProjects.filter(p =>
      p.data_class !== 'NON_PRODUCTION_EXAMPLE' &&
      !p.title?.startsWith('ISOLATION_TEST') &&
      !p.title?.startsWith('STRIPE_REPLAY_TEST') &&
      !p.title?.startsWith('EMAIL_LOOP_TEST')
    );

    let canonicalsCreated = 0;
    let canonicalsUpdated = 0;
    let matchesCreated = 0;
    let matchesUpdated = 0;
    let statesFixed = 0;
    const errors: string[] = [];

    // --- Process each project ---
    for (const project of productionProjects) {
      try {
        // Detect state from jurisdiction
        const detectedState = project.detected_state || detectState(project.jurisdiction || project.address || '');

        // Generate fingerprint — NEVER use project ID as solicitation number
        // Only use actual solicitation/bid/project number fields from the source
        const fpInput = {
          solicitation_number: project.solicitation_number || '',
          bid_number: project.bid_number || '',
          project_number: project.project_number || '',
          authority: project.authority || '',
          title: project.title || '',
          address: project.address || '',
          city: project.city || '',
          county: project.county || '',
          state: detectedState,
          zip: project.zip || '',
        };

        // Validate: if solicitation_number looks like a database ID, don't use it
        if (fpInput.solicitation_number && /^[0-9a-f]{24}$/.test(fpInput.solicitation_number)) {
          fpInput.solicitation_number = '';
        }

        const fp = generateFingerprint(fpInput);

        // Compare against existing canonicals using full fuzzy matching
        let matchedCanonical: any = null;
        for (const existing of existingCanonicals) {
          // Regenerate existing canonical's fingerprint to get title_key/location_key
          const existingFp = generateFingerprint({
            solicitation_number: existing.solicitation_number || '',
            bid_number: existing.bid_number || '',
            project_number: existing.project_number || '',
            authority: existing.authority || '',
            title: existing.title || '',
            city: existing.city || '',
            state: existing.state || existing.detected_state || '',
            zip: existing.zip || '',
          });
          // Use full comparison (strong key + fuzzy title + location)
          const cmpResult = compareFingerprints(existingFp, fp);
          if (cmpResult === 'CONFIRMED_DUPLICATE' || cmpResult === 'POSSIBLE_DUPLICATE') {
            matchedCanonical = existing;
            break;
          }
        }

        let canonicalId: string;

        if (matchedCanonical) {
          // Upsert existing canonical — update last_seen_at and merge missing fields
          canonicalId = matchedCanonical.id;
          const updates: any = {
            last_seen_at: now,
          };

          // Fix missing state
          if (!matchedCanonical.detected_state && detectedState) {
            updates.detected_state = detectedState;
            statesFixed++;
          }

          // Merge missing fields from this project
          if (!matchedCanonical.authority && project.authority) updates.authority = project.authority;
          if (!matchedCanonical.jurisdiction && project.jurisdiction) updates.jurisdiction = project.jurisdiction;
          if (!matchedCanonical.solicitation_number && fpInput.solicitation_number) {
            updates.solicitation_number = fpInput.solicitation_number;
            updates.strong_key = fp.strong_key;
            updates.fingerprint = fp.fingerprint;
          }
          if (project.value && (!matchedCanonical.value || project.value > matchedCanonical.value)) {
            updates.value = project.value;
          }
          if (project.bid_due_date && !matchedCanonical.bid_due_date) {
            updates.bid_due_date = project.bid_due_date;
          }

          await svc.entities.CanonicalOpportunity.update(canonicalId, updates);
          canonicalsUpdated++;

          // Update in-memory cache
          Object.assign(matchedCanonical, updates);
        } else {
          // Create new canonical
          const freshnessResult = computeFreshness({
            bid_due_date: project.bid_due_date,
            first_seen_at: now,
            last_seen_at: now,
          });
          const syntheticCheck = isSyntheticSource(project.source_url);
          const newCanonical = await svc.entities.CanonicalOpportunity.create({
            fingerprint: fp.fingerprint,
            strong_key: fp.strong_key,
            title: project.title || 'Untitled',
            description: project.description || '',
            authority: project.authority || '',
            jurisdiction: project.jurisdiction || '',
            detected_state: detectedState,
            address: project.address || '',
            city: project.city || '',
            county: project.county || '',
            state: detectedState,
            zip: project.zip || '',
            solicitation_number: fpInput.solicitation_number,
            bid_number: fpInput.bid_number,
            project_number: fpInput.project_number,
            value: project.value || 0,
            bid_due_date: project.bid_due_date || '',
            project_type: project.project_type || '',
            trade: project.trade || '',
            first_seen_at: now,
            last_seen_at: now,
            freshness_status: freshnessResult.freshness_status,
            deadline_status: freshnessResult.deadline_status,
            next_verification_at: freshnessResult.next_verification_at,
            data_class: syntheticCheck.isSynthetic ? 'NON_PRODUCTION_EXAMPLE' : 'production',
            fingerprint_state: 'CANONICAL',
          });
          canonicalId = newCanonical.id;
          canonicalsCreated++;
          existingCanonicals.push(newCanonical);
        }

        // --- Idempotent match creation ---
        // Check if a match already exists for this org+canonical pair
        if (project.organization_id) {
          const existingMatches = await svc.entities.OrganizationOpportunityMatch.filter({
            organization_id: project.organization_id,
            canonical_opportunity_id: canonicalId,
          });

          // RECOMPUTE eligibility against org's current service area — never trust
          // historical Project.location_eligibility as final match truth.
          const serviceAreaStates = orgServiceAreaMap[project.organization_id] || [];
          let matchEligibility: string;
          let matchExplanation: string;

          if (serviceAreaStates.length === 0) {
            matchEligibility = 'NO_ORGANIZATION_MATCH';
            matchExplanation = 'Organization has no service-area configuration. Cannot verify eligibility.';
          } else {
            const locResult = isOpportunityInServiceArea(
              serviceAreaStates,
              project.jurisdiction || '',
              project.address || '',
              false
            );
            matchEligibility = locResult.eligibility;
            matchExplanation = locResult.explanation;
          }

          const isOutOfArea = matchEligibility === 'OUT_OF_SERVICE_AREA' || matchEligibility === 'NO_ORGANIZATION_MATCH';
          const matchSuppressed = isOutOfArea;
          const matchSuppressionReason = isOutOfArea
            ? (matchEligibility === 'OUT_OF_SERVICE_AREA'
              ? 'outside configured service area'
              : 'no organization service area configured')
            : '';

          if (existingMatches && existingMatches.length > 0) {
            // Update existing match — recompute eligibility, don't just copy stale values
            const existingMatch = existingMatches[0];
            const updatePayload: any = {
              project_id: project.id,
              last_updated_at: now,
              freshness_status: 'FRESH',
              location_eligibility: matchEligibility,
              location_explanation: matchExplanation,
            };

            // Only change suppression if it was location-based (don't undo manual suppressions)
            if (isOutOfArea) {
              updatePayload.suppressed = true;
              updatePayload.suppression_reason = matchSuppressionReason;
              updatePayload.is_hot_lead = false;
            } else if (existingMatch.suppressed && existingMatch.suppression_reason?.includes('service area')) {
              updatePayload.suppressed = false;
              updatePayload.suppression_reason = '';
            }

            await svc.entities.OrganizationOpportunityMatch.update(existingMatch.id, updatePayload);
            matchesUpdated++;
          } else {
            // Create new match with server-authoritative eligibility
            await svc.entities.OrganizationOpportunityMatch.create({
              organization_id: project.organization_id,
              canonical_opportunity_id: canonicalId,
              project_id: project.id,
              location_eligibility: matchEligibility,
              location_explanation: matchExplanation,
              trade_match: 'NO_MATCH',
              pursue_decision: 'undecided',
              first_seen_at: now,
              last_updated_at: now,
              freshness_status: 'FRESH',
              is_hot_lead: false,
              suppressed: matchSuppressed,
              suppression_reason: matchSuppressionReason,
            });
            matchesCreated++;
          }
        }
      } catch (e: any) {
        errors.push(`Project ${project.id}: ${e?.message || String(e)}`);
      }
    }

    // Log audit receipt
    await svc.entities.SuperadminAudit.create({
      superadmin_user_id: user.id,
      superadmin_email: user.email,
      action_type: 'cross_org_create',
      target_entity: 'CanonicalOpportunity,OrganizationOpportunityMatch',
      reason_code: 'idempotent_canonicalization',
      details: `Canonicalized ${productionProjects.length} projects: ${canonicalsCreated} new canonicals, ${canonicalsUpdated} updated, ${matchesCreated} new matches, ${matchesUpdated} updated matches, ${statesFixed} states fixed. ${errors.length} errors.`,
      timestamp: now,
      data_class: 'production',
    });

    return Response.json({
      success: true,
      projects_processed: productionProjects.length,
      canonicals_created: canonicalsCreated,
      canonicals_updated: canonicalsUpdated,
      matches_created: matchesCreated,
      matches_updated: matchesUpdated,
      states_fixed: statesFixed,
      errors: errors.length,
      error_samples: errors.slice(0, 5),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Canonicalization failed' }, { status: 500 });
  }
}