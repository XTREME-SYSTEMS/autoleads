// seedDemandSources — loads the Florida-first demand-intelligence source catalog
// (from the Construction AI Growth OS workbook) into the ScrapeSource entity,
// then validates reachability of each source through the cloud browser system.
//
// Phase 1: seed all catalog sources (dedupe by URL against existing ScrapeSource).
// Phase 2: validate up to `validate_limit` unverified sources via the cloud browser,
//          marking them active (content retrieved) or error.
//
// Re-run (or drive via workflow) to continue validating remaining unverified sources.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs, scopedFilter } from '../../shared/orgContext.ts';
import { DEMAND_SOURCES } from '../../shared/floridaDemandSources.ts';
import { FLORIDA_RESIDENTIAL_SOURCES } from '../../shared/floridaResidentialSources.ts';
import { cloudBrowserExtract, isCloudBrowserConfigured } from '../../shared/cloudBrowserClient.ts';

// Merge commercial/government demand sources with the exhaustive Florida
// residential source catalog (all 67 counties, cities, social, forums, etc.)
const ALL_SOURCES = [...DEMAND_SOURCES, ...FLORIDA_RESIDENTIAL_SOURCES];

async function directReachable(targetUrl: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const res = await fetch(targetUrl, {
      redirect: 'follow',
      signal: AbortSignal.timeout(20000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AUTOLEADS-SourceValidator/1.0; +https://autoleads.base44.app)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    return { ok: res.ok && res.status < 500, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'direct fetch failed' };
  }
}

function isSafeUrl(raw: string): boolean {
  let parsed: URL;
  try { parsed = new URL(raw); } catch { return false; }
  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return false;
  if (host === '169.254.169.254') return false;
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    if (a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 192 && b === 168) || a >= 224) return false;
  }
  return true;
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, body, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const validateLimit = Math.min(Number(body?.validate_limit ?? 6), 12);
    const skipValidation = Boolean(body?.skip_validation);
    const validateAll = Boolean(body?.validate_all);
    const pruneFailed = Boolean(body?.prune_failed);
    const pruneThreshold = Number(body?.prune_threshold ?? 3);

    // Resolve org context for scoping (seeds are global when run by service role).
    const ctx = user ? await resolveUserOrgs(client, user.id) : null;
    const orgId = ctx?.primaryOrgId;

    // ── Phase 1: Seed catalog ──
    const existing = orgId
      ? await client.entities.ScrapeSource.filter(scopedFilter(orgId), '-created_date', 500).catch(() => [])
      : await client.entities.ScrapeSource.list('-created_date', 500).catch(() => []);
    const existingUrls = new Set((existing || []).map((s: any) => s.url));

    let seeded = 0;
    let duplicates = 0;
    for (const s of ALL_SOURCES) {
      if (!s.url || !isSafeUrl(s.url) || existingUrls.has(s.url)) { duplicates++; continue; }
      await client.entities.ScrapeSource.create({
        organization_id: orgId,
        name: s.name,
        url: s.url,
        source_type: s.source_type,
        jurisdiction: s.jurisdiction,
        trades: s.trades,
        status: 'unverified',
        confidence: s.priority === 'High' ? 0.9 : s.priority === 'Medium' ? 0.7 : 0.5,
      }).catch(() => null);
      existingUrls.add(s.url);
      seeded++;
    }

    // ── Phase 2: Cloud-browser validation ──
    let validated = 0, activeCount = 0, errorCount = 0, fallbackUsed = 0;
    const browserConfigured = isCloudBrowserConfigured();
    let browserReachable = browserConfigured;

    if (!skipValidation && browserConfigured) {
      // Loop until no unverified sources remain (validate_all) or the single batch is done.
      let safetyLoops = 0;
      while (safetyLoops < 50) {
        safetyLoops++;
        const allSources = orgId
          ? await client.entities.ScrapeSource.filter(scopedFilter(orgId), '-created_date', 500).catch(() => [])
          : await client.entities.ScrapeSource.list('-created_date', 500).catch(() => []);
        const pending = (allSources || []).filter((s: any) => s.status === 'unverified' && isSafeUrl(s.url)).slice(0, validateLimit);
        if (pending.length === 0) break;

        for (const src of pending) {
          validated++;
          const result = await cloudBrowserExtract(src.url, 4000);
          // Engine is reachable if it created a session (even if the target site blocked extraction).
          if (result.sessionId) browserReachable = true;
          const usedFallback = !result.ok;
          if (usedFallback) fallbackUsed++;
          const reachable = result.ok ? true : (await directReachable(src.url)).ok;
          if (reachable) {
            activeCount++;
            await client.entities.ScrapeSource.update(src.id, {
              status: 'active',
              last_success_date: new Date().toISOString(),
              last_run_date: new Date().toISOString(),
              parser_version: usedFallback ? 'direct-fetch-fallback' : 'cloud-browser-v1',
            }).catch(() => null);
          } else {
            errorCount++;
            await client.entities.ScrapeSource.update(src.id, {
              status: 'error',
              last_run_date: new Date().toISOString(),
              error_count: (src.error_count || 0) + 1,
              last_error: result.error || 'source unreachable',
            }).catch(() => null);
          }
        }

        if (!validateAll) break; // single-batch mode
      }
    }

    // ── Phase 3: Prune sources that keep failing (not ready) ──
    let pruned = 0;
    if (pruneFailed) {
      const allForPrune = orgId
        ? await client.entities.ScrapeSource.filter(scopedFilter(orgId), '-created_date', 500).catch(() => [])
        : await client.entities.ScrapeSource.list('-created_date', 500).catch(() => []);
      const dead = (allForPrune || []).filter((s: any) => s.status === 'error' && Number(s.error_count || 0) >= pruneThreshold);
      for (const s of dead) {
        await client.entities.ScrapeSource.delete(s.id).catch(() => null);
        pruned++;
      }
    }

    // Count remaining unverified for next batch.
    const remaining = orgId
      ? await client.entities.ScrapeSource.filter({ status: 'unverified' }, '-created_date', 500).catch(() => [])
      : await client.entities.ScrapeSource.filter({ status: 'unverified' }, '-created_date', 500).catch(() => []);

    return Response.json({
      ok: true,
      catalog_size: DEMAND_SOURCES.length,
      seeded,
      duplicates,
      cloud_browser_configured: browserConfigured,
      cloud_browser_reachable: browserReachable,
      validated,
      active: activeCount,
      errors: errorCount,
      fallback_used: fallbackUsed,
      pruned,
      remaining_unverified: (remaining || []).length,
      next_step: (remaining || []).length > 0 ? 'Re-run to validate the next batch.' : 'All sources validated.',
      note: !browserReachable ? 'Cloud browser engine returned errors (likely not deployed). Validation fell back to direct HTTP reachability checks. Redeploy the browser engine to enable JS-heavy site extraction.' : undefined,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'seedDemandSources failed' }, { status: 500 });
  }
}