// Source Verification Queue Initializer
// Populates the SourceVerificationQueue from existing ScrapeSource records.
// Classifies each source by priority, platform, and access type.
// Does NOT activate any source — just queues it for verification.

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

// Classify source by jurisdiction and name into priority category
function classifyPriority(source: any): string {
  const name = (source.name || '').toLowerCase();
  const jur = (source.jurisdiction || '').toLowerCase();

  if (jur.includes('fdot') || name.includes('fdot') || name.includes('transportation')) return 'fdot';
  if (name.includes('state') || name.includes('dms') || name.includes('procurement portal')) return 'state_procurement';
  if (jur.includes('county') || name.includes('county')) return 'county_procurement';
  if (jur.includes('school') || name.includes('school')) return 'school_district';
  if (jur.includes('university') || name.includes('university') || name.includes('college')) return 'university';
  if (jur.includes('airport') || name.includes('airport')) return 'airport';
  if (jur.includes('port') || name.includes('port authority')) return 'port';
  if (jur.includes('transit') || name.includes('transit')) return 'transit';
  if (jur.includes('water') || jur.includes('wastewater')) return 'water_wastewater';
  if (jur.includes('housing') || name.includes('housing')) return 'housing_authority';
  if (jur.includes('public works')) return 'public_works';
  if (name.includes('permit')) return 'permit';
  if (name.includes('agenda') || name.includes('planning')) return 'planning';
  if (name.includes('news')) return 'aggregator';
  return 'city_procurement';
}

// Detect platform from URL
function detectPlatform(url: string): string {
  if (!url) return 'unknown';
  const u = url.toLowerCase();
  if (u.includes('socrata') || u.includes('data.cityof') || u.includes('data.')) return 'Socrata';
  if (u.includes('opengov')) return 'OpenGov';
  if (u.includes('bidsync')) return 'BidSync';
  if (u.includes('bonfire')) return 'Bonfire';
  if (u.includes('ionwave')) return 'IONWave';
  if (u.includes('demandstar')) return 'DemandStar';
  if (u.includes('procore')) return 'Procore';
  if (u.includes('socrata') || u.match(/data\.\w+\.(gov|net|org)/)) return 'Socrata';
  return 'custom';
}

// Classify data type from source name/type
function classifyDataType(source: any): string {
  const name = (source.name || '').toLowerCase();
  const type = source.source_type || '';
  if (name.includes('permit')) return 'permit';
  if (name.includes('agenda') || name.includes('planning')) return 'planning';
  if (name.includes('news')) return 'news';
  if (name.includes('award')) return 'award';
  if (name.includes('funding') || name.includes('grant')) return 'funding';
  if (type === 'api') return 'permit';
  return 'active_bid';
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;

    // Fetch all sources and existing queue entries
    const [sources, existingQueue] = await Promise.all([
      svc.entities.ScrapeSource.list('-created_date', 500),
      svc.entities.SourceVerificationQueue.list('-created_date', 500),
    ]);

    const prodSources = sources.filter((s: any) => s.data_class !== 'NON_PRODUCTION_EXAMPLE');
    const existingNames = new Set((existingQueue || []).map((q: any) => q.source_name));

    // Filter to Florida sources only (controlled beta jurisdiction)
    const flSources = prodSources.filter((s: any) => {
      const jur = (s.jurisdiction || '').toUpperCase();
      return jur.includes('FL') || jur.includes('FLORIDA');
    });

    const queueEntries: any[] = [];
    for (const source of flSources) {
      if (existingNames.has(source.name)) continue; // skip already queued

      queueEntries.push({
        source_id: source.id,
        source_name: source.name,
        url: source.url,
        jurisdiction: source.jurisdiction,
        verification_status: source.status === 'active' ? 'ACTIVE' : 'UNVERIFIED',
        priority: classifyPriority(source),
        platform: detectPlatform(source.url),
        data_type: classifyDataType(source),
        active_bid_capability: false, // to be determined during verification
        access_classification: 'public_readonly', // default — verified during testing
        last_verified_at: source.last_success_date || '',
        notes: source.last_error ? `Previous error: ${source.last_error.substring(0, 200)}` : '',
        data_class: 'production',
      });
    }

    if (queueEntries.length > 0) {
      await svc.entities.SourceVerificationQueue.bulkCreate(queueEntries);
    }

    // Summary by priority
    const byPriority: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const allQueue = [...(existingQueue || []), ...queueEntries];
    allQueue.forEach((q: any) => {
      byPriority[q.priority] = (byPriority[q.priority] || 0) + 1;
      byStatus[q.verification_status] = (byStatus[q.verification_status] || 0) + 1;
    });

    return Response.json({
      success: true,
      status: 'QUEUE_INITIALIZED',
      florida_sources_found: flSources.length,
      new_entries_created: queueEntries.length,
      already_queued: existingNames.size,
      total_queue_size: allQueue.length,
      by_priority: byPriority,
      by_status: byStatus,
      entries: queueEntries.map(e => ({
        source_name: e.source_name,
        priority: e.priority,
        platform: e.platform,
        data_type: e.data_type,
        status: e.verification_status,
      })),
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Queue initialization failed' }, { status: 500 });
  }
}