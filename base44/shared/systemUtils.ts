// Shared utilities for the autonomous self-healing system.
// Imported by runSystemAudit, runAutoHeal, runDataIntegrity, runUiAudit, runBenchmarkResearch.

export const ALL_ENTITIES = [
  'Project', 'Opportunity', 'BidInvitation', 'Takeoff', 'Estimate', 'Proposal',
  'PricingProfile', 'Material', 'CompanyProfile', 'ContractorApp', 'ProjectImage',
  'ProposalPackage', 'ScrapeSource', 'AutomationConfig', 'EmailTemplate',
  'BrandAsset', 'Contact', 'Message', 'AgentTask', 'Notification', 'ActionItem',
  'SystemGap', 'SystemScore', 'Benchmark'
];

export async function fetchPageText(url: string, timeoutMs = 12000): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    const html = await res.text();
    if (!html || html.length < 200) return '';
    return html.replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 8000);
  } catch { return ''; }
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isStale(dateStr: string): boolean {
  if (!dateStr) return false;
  try { return new Date(dateStr) < new Date(); } catch { return false; }
}

export async function safeList(client: any, entity: string, sort = '-created_date', limit = 500): Promise<any[]> {
  try { return await client.entities[entity].list(sort, limit) || []; } catch { return []; }
}

export async function safeFilter(client: any, entity: string, query: any): Promise<any[]> {
  try { return await client.entities[entity].filter(query) || []; } catch { return []; }
}

// Org-scoped list: always filters by organization_id before returning.
// Service-role functions MUST use this instead of safeList to avoid cross-tenant data access.
export async function safeListScoped(client: any, entity: string, orgId: string, sort = '-created_date', limit = 500): Promise<any[]> {
  try { return await client.entities[entity].filter({ organization_id: orgId }, sort, limit) || []; } catch { return []; }
}

export async function createGap(client: any, gap: { title: string; category: string; severity: string; description: string; file_path?: string }): Promise<void> {
  try {
    // Deduplicate: check for ANY existing gap with the same title (open or closed).
    // If an open one exists, skip. If a closed one exists, re-open it instead of
    // creating a duplicate. This prevents the create→close→re-create cycle between
    // runSystemAudit/runUiAudit (creates) and runRecursiveAudit (closes).
    const existing = await client.entities.SystemGap.filter({ title: gap.title });
    if (existing && existing.length > 0) {
      const openOnes = existing.filter((g: any) => g.status === 'open');
      if (openOnes.length > 0) return; // Already open — skip
      // Re-open the most recent closed one instead of creating a duplicate
      const sorted = existing.sort((a: any, b: any) =>
        new Date(b.created_date || 0).getTime() - new Date(a.created_date || 0).getTime()
      );
      await client.entities.SystemGap.update(sorted[0].id, {
        status: 'open',
        description: gap.description,
        fix_summary: '',
      });
      return;
    }
    await client.entities.SystemGap.create({
      title: gap.title,
      category: gap.category,
      severity: gap.severity,
      description: gap.description,
      file_path: gap.file_path || '',
      status: 'open',
    });
  } catch {}
}

export async function closeGapsByTitle(client: any, title: string, fixSummary: string): Promise<void> {
  try {
    const existing = await client.entities.SystemGap.filter({ title, status: 'open' });
    for (const g of existing || []) {
      try { await client.entities.SystemGap.update(g.id, { status: 'fixed', fix_summary: fixSummary }); } catch {}
    }
  } catch {}
}