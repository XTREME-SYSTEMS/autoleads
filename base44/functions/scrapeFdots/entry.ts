// scrapeFdots — Structural FDOT letting page parser.
// Fetches the FDOT Central Office letting page and parses it WITHOUT LLM
// to extract proposals with their correct LETTING DATE as bid_due_date.
//
// This fixes the deadline fidelity defect where the LLM-based browserScrape
// confused pre-bid meeting dates (August 25) with letting dates (September 30).
//
// DATE CONTRACT:
//   bid_due_date = LETTING DATE (authoritative bid deadline)
//   prebid_meeting_date = stored in description/provenance
//   advertisement dates = stored in provenance
//   addendum dates = stored in addendum links
//
// VERIFICATION CONTRACT:
//   On successful parse, sets: last_verified_at, last_seen_at,
//   freshness_status, deadline_status, next_verification_at.
//   Never fabricates verification timestamps.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { parseFdotsLettingPage } from '../../shared/fdotParser.ts';
import { computeFreshness } from '../../shared/freshness.ts';
import { authenticate } from '../../shared/internalAuth.ts';

const FDOT_CO_URL = 'https://www.fdot.gov/contracts/lettings/letting-project-info.shtm';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const user = await base44.auth.me().catch(() => null);
    if (!user || user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    // Fetch the FDOT page
    let html = '';
    try {
      const res = await fetch(FDOT_CO_URL, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(20000),
        redirect: 'follow',
      });
      html = await res.text();
    } catch (e: any) {
      return Response.json({ error: `FDOT fetch failed: ${e?.message || e}` }, { status: 502 });
    }

    if (!html || html.length < 500) {
      return Response.json({ error: 'FDOT page returned empty content' }, { status: 502 });
    }

    // Parse proposals structurally (no LLM)
    const proposals = parseFdotsLettingPage(html, FDOT_CO_URL);

    // Load existing FDOT canonicals
    const existingCanonicals = await svc.entities.CanonicalOpportunity.list('-created_date', 500);
    const fdotCanonicals = existingCanonicals.filter(c =>
      (c.authority || '').toLowerCase().includes('fdot') &&
      c.data_class !== 'NON_PRODUCTION_EXAMPLE'
    );
    const canonicalBySolicitation = new Map(fdotCanonicals.map(c => [c.solicitation_number, c]));

    const now = new Date().toISOString();
    const authoritativeIds = new Set(proposals.map(p => p.proposalId));

    let created = 0, updated = 0, corrected = 0, staleMarked = 0;
    const corrections: any[] = [];
    const storedReport: any[] = [];
    const authoritativeReport: any[] = [];

    // Process parsed proposals — create or update canonicals
    for (const proposal of proposals) {
      // Pass last_verified_at so computeFreshness returns FRESH (not UNKNOWN)
      const freshnessResult = computeFreshness({
        bid_due_date: proposal.lettingDate,
        last_verified_at: now,
        last_seen_at: now,
      });
      const existing = canonicalBySolicitation.get(proposal.proposalId);

      // Build structured provenance description
      const provenanceParts = [
        `Letting Date: ${proposal.lettingDateRaw}`,
        `Source: FDOT Central Office Letting Page (${FDOT_CO_URL})`,
      ];
      if (proposal.prebidMeetingDate) provenanceParts.push(`Mandatory Pre-Bid: ${proposal.prebidMeetingDate}`);
      if (proposal.advertisement60DayUrl) provenanceParts.push(`60-Day Advertisement: ${proposal.advertisement60DayUrl}`);
      if (proposal.advertisement30DayUrl) provenanceParts.push(`30-Day Advertisement: ${proposal.advertisement30DayUrl}`);
      if (proposal.addendumLinks.length > 0) {
        provenanceParts.push(`Addenda: ${proposal.addendumLinks.map(a => `${a.text}(${a.url})`).join(', ')}`);
      }
      const description = provenanceParts.join('. ');

      authoritativeReport.push({
        proposalId: proposal.proposalId,
        county: proposal.county,
        workType: proposal.majorWorkType,
        lettingDate: proposal.lettingDate,
        prebidDate: proposal.prebidMeetingDate,
      });

      if (existing) {
        // Update existing canonical with correct letting date
        const wasWrong = existing.bid_due_date !== proposal.lettingDate;
        const update: any = {
          bid_due_date: proposal.lettingDate,
          last_verified_at: now,
          last_seen_at: now,
          freshness_status: freshnessResult.freshness_status,
          deadline_status: freshnessResult.deadline_status,
          next_verification_at: freshnessResult.next_verification_at,
          county: proposal.county,
          detected_state: 'FL',
          trade: proposal.majorWorkType,
          jurisdiction: `${proposal.county} County, Florida`,
          description,
        };

        if (wasWrong) {
          corrections.push({
            proposalId: proposal.proposalId,
            before: existing.bid_due_date,
            after: proposal.lettingDate,
            county: proposal.county,
            workType: proposal.majorWorkType,
          });
          corrected++;
        }

        await svc.entities.CanonicalOpportunity.update(existing.id, update);
        updated++;

        storedReport.push({
          proposalId: proposal.proposalId,
          before: existing.bid_due_date,
          after: proposal.lettingDate,
          corrected: wasWrong,
        });
      } else {
        // Create new canonical
        await svc.entities.CanonicalOpportunity.create({
          fingerprint: `FDOT-CO-${proposal.proposalId}`,
          strong_key: `${proposal.proposalId}|FDOT Central Office`,
          title: `FDOT ${proposal.majorWorkType} - ${proposal.proposalId} (${proposal.county} County)`,
          description,
          authority: 'FDOT Central Office',
          jurisdiction: `${proposal.county} County, Florida`,
          detected_state: 'FL',
          county: proposal.county,
          solicitation_number: proposal.proposalId,
          bid_due_date: proposal.lettingDate,
          trade: proposal.majorWorkType,
          first_seen_at: now,
          last_seen_at: now,
          last_verified_at: now,
          freshness_status: freshnessResult.freshness_status,
          deadline_status: freshnessResult.deadline_status,
          next_verification_at: freshnessResult.next_verification_at,
          data_class: 'production',
        });
        created++;
      }
    }

    // Mark stale/extra canonicals (stored but not on authoritative page)
    for (const [solicitation, canonical] of canonicalBySolicitation) {
      if (!authoritativeIds.has(solicitation)) {
        staleMarked++;
        await svc.entities.CanonicalOpportunity.update(canonical.id, {
          freshness_status: 'CLOSED',
          deadline_status: 'CLOSED',
          last_verified_at: now,
          last_seen_at: now,
        });
      }
    }

    // Log audit receipt
    await svc.entities.SuperadminAudit.create({
      superadmin_user_id: user.id,
      superadmin_email: user.email,
      action_type: 'cross_org_update',
      target_entity: 'CanonicalOpportunity',
      reason_code: 'fdot_deadline_fidelity_repair',
      details: `FDOT re-parse: ${proposals.length} proposals found, ${created} created, ${updated} updated, ${corrected} deadlines corrected, ${staleMarked} stale marked. Corrections: ${JSON.stringify(corrections)}`,
      timestamp: now,
      data_class: 'production',
    });

    return Response.json({
      success: true,
      fdotParser: 'PASS',
      fdotProposalsFound: proposals.length,
      created,
      updated,
      corrected,
      staleMarked,
      missingProposals: proposals.filter(p => !canonicalBySolicitation.has(p.proposalId)).length,
      corrections,
      storedReport,
      authoritativeReport,
    });
  } catch (error: any) {
    return Response.json({ error: error.message, fdotParser: 'FAIL' }, { status: 500 });
  }
}