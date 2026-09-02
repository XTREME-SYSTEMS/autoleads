import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const US_STATES: { code: string; name: string }[] = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

function detectStateCode(jurisdiction: string, detectedState: string): string {
  if (detectedState && detectedState.length === 2) return detectedState.toUpperCase();
  if (!jurisdiction) return '';
  const j = jurisdiction.toUpperCase().trim();
  // Direct 2-letter match
  const direct = j.match(/\b([A-Z]{2})\b/);
  if (direct) {
    const code = direct[1];
    if (US_STATES.some(s => s.code === code)) return code;
  }
  // Full state name match
  for (const s of US_STATES) {
    if (j.includes(s.name.toUpperCase())) return s.code;
  }
  return '';
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch { return Response.json({ error: 'Not authenticated' }, { status: 401 }); }
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    // Fetch all sources and verification queue
    const sources = await base44.entities.ScrapeSource.list('-created_date', 500);
    const queue = await base44.entities.SourceVerificationQueue.list('-created_date', 500);

    // Group sources by state
    const byState: Record<string, { sources: any[]; queue: any[] }> = {};
    for (const s of sources) {
      const code = detectStateCode(s.jurisdiction || '', s.detected_state || '');
      if (!byState[code || 'UNKNOWN']) byState[code || 'UNKNOWN'] = { sources: [], queue: [] };
      byState[code || 'UNKNOWN'].sources.push(s);
    }
    for (const q of queue) {
      const code = detectStateCode(q.jurisdiction || '', '');
      if (!byState[code || 'UNKNOWN']) byState[code || 'UNKNOWN'] = { sources: [], queue: [] };
      byState[code || 'UNKNOWN'].queue.push(q);
    }

    // Clear old flags for this audit
    const oldFlags = await base44.entities.SystemFlag.list('-created_date', 500);
    for (const f of oldFlags) {
      if (f.status === 'open' || f.status === 'fixing') {
        try { await base44.entities.SystemFlag.delete(f.id); } catch { /* ignore */ }
      }
    }

    let totalCovered = 0;
    let totalFlags = 0;
    const stateResults: any[] = [];

    for (const state of US_STATES) {
      const data = byState[state.code] || { sources: [], queue: [] };
      const stateSources = data.sources;
      const stateQueue = data.queue;
      const active = stateSources.filter(s => s.status === 'active').length;
      const failed = stateSources.filter(s => s.status === 'error').length;
      const authReq = stateQueue.filter(q => q.verification_status === 'AUTH_REQUIRED').length;
      const failedQueue = stateQueue.filter(q => q.verification_status === 'FAILED').length;

      // Determine coverage status
      let coverageStatus = 'uncovered';
      if (stateSources.length === 0) coverageStatus = 'uncovered';
      else if (active >= 3) coverageStatus = 'fully_covered';
      else if (active >= 1) coverageStatus = 'partially_covered';
      else if (stateSources.length > 0) coverageStatus = 'minimal';

      // Collect data types
      const dataTypes = new Set<string>();
      for (const q of stateQueue) { if (q.data_type) dataTypes.add(q.data_type); }
      for (const s of stateSources) { if (s.source_type) dataTypes.add(s.source_type); }

      // Collect source names
      const sourceNames = stateSources.map(s => s.name).filter(Boolean);

      // Count unique counties and cities
      const counties = new Set<string>();
      const cities = new Set<string>();
      for (const s of stateSources) {
        const j = s.jurisdiction || '';
        if (j.match(/county/i)) counties.add(j);
        else if (j && !j.match(/state|national|federal/i)) cities.add(j);
      }

      const isCovered = stateSources.length > 0;
      if (isCovered) totalCovered++;

      // Upsert StateCoverage
      const existing = await base44.entities.StateCoverage.filter({ state_code: state.code }, 1);
      const covData = {
        state_code: state.code,
        state_name: state.name,
        coverage_status: coverageStatus,
        total_sources: stateSources.length,
        active_sources: active,
        failed_sources: failed + failedQueue,
        auth_required_sources: authReq,
        counties_covered: counties.size,
        cities_covered: cities.size,
        building_depts_tracked: stateQueue.filter(q => q.priority === 'county_procurement' || q.priority === 'city_procurement' || q.priority === 'public_works').length,
        data_types_collected: JSON.stringify([...dataTypes]),
        source_names: JSON.stringify(sourceNames.slice(0, 20)),
        open_flags: 0,
        last_audit_date: new Date().toISOString(),
      };

      let covId: string;
      if (existing.length > 0) {
        await base44.entities.StateCoverage.update(existing[0].id, covData);
        covId = existing[0].id;
      } else {
        const rec = await base44.entities.StateCoverage.create(covData);
        covId = rec.id;
      }

      // Create flags for issues
      let stateFlagCount = 0;
      const createFlag = async (flagType: string, severity: string, title: string, desc: string, fixDesc: string, fixAction: string) => {
        await base44.entities.SystemFlag.create({
          flag_type: flagType,
          severity,
          target_type: 'state',
          target_id: state.code,
          target_name: state.name,
          title,
          description: desc,
          fix_description: fixDesc,
          fix_action: fixAction,
          status: 'open',
          auto_fix_available: !!fixAction,
          auto_fix_executed: false,
          state_code: state.code,
        });
        stateFlagCount++;
        totalFlags++;
      };

      if (stateSources.length === 0) {
        await createFlag('missing_coverage', 'high',
          `No sources for ${state.name}`,
          `${state.name} (${state.code}) has zero scrape sources configured. No opportunities are being discovered.`,
          `Run discoverSources for ${state.code} to find and add procurement portals, permit sites, and bid boards.`,
          'discoverSources');
      }
      if (failed > 0 || failedQueue > 0) {
        await createFlag('source_error', 'critical',
          `${failed + failedQueue} failed sources in ${state.name}`,
          `${state.name} has ${failed + failedQueue} sources in error/failed status. These sources are not returning data.`,
          `Run runDataIntegrity to validate source URLs and attempt automatic repair. For sources needing credentials, mark as AUTH_REQUIRED.`,
          'runDataIntegrity');
      }
      if (authReq > 0) {
        await createFlag('auth_required', 'medium',
          `${authReq} sources need credentials in ${state.name}`,
          `${state.name} has ${authReq} sources requiring vendor registration or login credentials.`,
          `Acquire vendor registration credentials for these procurement portals, then update the source access_classification to public_readonly.`,
          '');
      }
      if (active > 0 && active < 3 && stateSources.length > 0) {
        await createFlag('missing_coverage', 'medium',
          `Limited coverage in ${state.name}`,
          `${state.name} has only ${active} active sources. Recommend at least 3 for adequate coverage.`,
          `Run discoverSources for ${state.code} to find additional procurement portals and bid boards.`,
          'discoverSources');
      }

      // Update state coverage flag count
      if (stateFlagCount > 0) {
        await base44.entities.StateCoverage.update(covId, { open_flags: stateFlagCount });
      }

      stateResults.push({
        state: state.code,
        name: state.name,
        coverage: coverageStatus,
        sources: stateSources.length,
        active,
        flags: stateFlagCount,
      });
    }

    return Response.json({
      success: true,
      total_states: US_STATES.length,
      states_covered: totalCovered,
      states_uncovered: US_STATES.length - totalCovered,
      total_flags: totalFlags,
      states: stateResults,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Audit failed' }, { status: 500 });
  }
}