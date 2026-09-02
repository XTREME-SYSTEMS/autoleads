import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useOrgContext } from "@/hooks/useOrgContext";

// Always-on trade filter: returns the org's trade tokens and a predicate
// that tests whether a project matches. When no trade is configured on the
// org, matchesTrade returns true for everything (show all).
export function useOrgTradeFilter() {
  const { orgId } = useOrgContext();
  const [tradeTokens, setTradeTokens] = useState([]);

  useEffect(() => {
    if (!orgId) return;
    let live = true;
    (async () => {
      const org = await base44.entities.Organization.get(orgId).catch(() => null);
      if (!live || !org) return;
      const tokens = [...new Set(
        (org.trade || "")
          .toLowerCase()
          .split(/[,/]+/)
          .flatMap(s => s.trim().split(/\s+/))
          .map(s => s.trim())
          .filter(s => s.length >= 4)
      )];
      setTradeTokens(tokens);
    })();
    return () => { live = false; };
  }, [orgId]);

  const matchesTrade = (project) => {
    if (tradeTokens.length === 0) return true;
    const hay = `${project.trade || ""} ${project.title || ""} ${project.project_type || ""} ${project.description || ""}`.toLowerCase();
    return tradeTokens.some(t => hay.includes(t));
  };

  return { tradeTokens, matchesTrade };
}