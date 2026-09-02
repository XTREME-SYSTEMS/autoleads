// Shared lead matching utilities used by pushNewLeadAlerts and sendEmailAlerts

export function parseOrgCriteria(profile, org) {
  const orgTrades = (profile?.trade || org?.trade || '')
    .split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
  const orgState = (profile?.state || org?.state || '').toUpperCase();
  return { orgTrades, orgState };
}

export function projectMatchesOrg(project, orgTrades, orgState) {
  // Location match: detected_state or jurisdiction must match org state
  if (orgState) {
    const projState = (project.detected_state || '').toUpperCase();
    const projJuris = (project.jurisdiction || '').toLowerCase();
    if (projState !== orgState && !projJuris.includes(orgState.toLowerCase())) return false;
  }
  // Trade match: project trade must overlap with org trades
  if (orgTrades.length > 0) {
    const projTrade = (project.trade || '').toLowerCase();
    if (projTrade && !orgTrades.some(t => projTrade.includes(t) || t.includes(projTrade))) return false;
  }
  return true;
}