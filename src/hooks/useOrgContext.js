import { useContext, useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

// Shared hook: returns the current user's active organization ID.
// All tenant-owned entity creates MUST include this as organization_id.
// Returns null while loading; pages should show a loading state until resolved.
export function useOrgContext() {
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const me = await base44.auth.me();
        if (!live) return;
        setUser(me);
        const active = me?.active_organization_id || (me?.organization_ids?.length > 0 ? me.organization_ids[0] : null);
        setOrgId(active || null);
      } catch {
        if (live) setOrgId(null);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      setUser(me);
      const active = me?.active_organization_id || (me?.organization_ids?.length > 0 ? me.organization_ids[0] : null);
      setOrgId(active || null);
    } catch {}
  }, []);

  return { orgId, loading, user, refresh };
}

// Convenience: just the org ID string (null while loading)
export function useOrgId() {
  const { orgId } = useOrgContext();
  return orgId;
}

// Helper: inject organization_id into a record payload before create.
// Throws if no org context is available — prevents unscoped creates.
export function withOrgId(orgId, data) {
  if (!orgId) throw new Error("No active organization context. Complete onboarding first.");
  return { ...data, organization_id: orgId };
}