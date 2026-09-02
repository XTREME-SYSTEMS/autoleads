import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    let user;
    try { user = await base44.auth.me(); } catch { return Response.json({ error: 'Not authenticated' }, { status: 401 }); }
    if (user?.role !== 'admin') return Response.json({ error: 'Admin access required' }, { status: 403 });

    const flagId = body?.flag_id;
    if (!flagId) return Response.json({ error: 'flag_id required' }, { status: 400 });

    const flag = await base44.entities.SystemFlag.get(flagId);
    if (!flag) return Response.json({ error: 'Flag not found' }, { status: 404 });
    if (flag.status === 'fixed') return Response.json({ success: true, message: 'Already fixed' });

    // Mark as fixing
    await base44.entities.SystemFlag.update(flagId, { status: 'fixing', auto_fix_executed: true });

    let result: any = { action: flag.fix_action };

    try {
      switch (flag.fix_action) {
        case 'runDataIntegrity':
          await base44.functions.invoke('runDataIntegrity', {});
          result.message = 'Data integrity check completed';
          break;
        case 'runAutoHeal':
          await base44.functions.invoke('runAutoHeal', {});
          result.message = 'Auto-heal completed';
          break;
        case 'recomputeHotLeadTruth':
          await base44.functions.invoke('recomputeHotLeadTruth', {});
          result.message = 'Hot lead truth recomputed';
          break;
        case 'recomputeMatchEligibility':
          await base44.functions.invoke('recomputeMatchEligibility', {});
          result.message = 'Match eligibility recomputed';
          break;
        case 'canonicalizeProjects':
          await base44.functions.invoke('canonicalizeProjects', {});
          result.message = 'Projects canonicalized';
          break;
        case 'discoverSources':
          await base44.functions.invoke('discoverSources', { state: flag.state_code || flag.target_id });
          result.message = `Source discovery initiated for ${flag.target_name}`;
          break;
        case 'runSystemAudit':
          await base44.functions.invoke('runSystemAudit', {});
          result.message = 'System audit completed';
          break;
        case 'scoreSourceQuality':
          await base44.functions.invoke('scoreSourceQuality', {});
          result.message = 'Source quality scored';
          break;
        default:
          if (!flag.fix_action) {
            result.message = 'No auto-fix available for this flag type. Manual intervention required.';
            result.manual = true;
          } else {
            // Try to invoke as a generic function
            try {
              await base44.functions.invoke(flag.fix_action, {});
              result.message = `${flag.fix_action} executed`;
            } catch {
              result.message = `Unknown fix action: ${flag.fix_action}`;
              result.manual = true;
            }
          }
      }

      // Mark as fixed (or open if manual)
      await base44.entities.SystemFlag.update(flagId, {
        status: result.manual ? 'open' : 'fixed',
        auto_fix_executed: !result.manual,
        fix_result: result.message || JSON.stringify(result),
        resolved_at: result.manual ? undefined : new Date().toISOString(),
        resolved_by: user?.email || 'admin',
      });

      return Response.json({ success: true, result });
    } catch (fixError: any) {
      await base44.entities.SystemFlag.update(flagId, {
        status: 'open',
        fix_result: `Auto-fix failed: ${fixError?.message || 'unknown error'}`,
        auto_fix_executed: true,
      });
      return Response.json({ error: fixError?.message || 'Auto-fix failed' }, { status: 500 });
    }
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Failed' }, { status: 500 });
  }
}