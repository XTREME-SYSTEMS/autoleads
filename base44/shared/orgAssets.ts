// Shared org asset fetching — used by batchCreateBidPackages, validateBidPackage,
// generateSafetyBooklet, scheduleProject, and submitProposal.

export async function fetchOrgAssets(client, orgId) {
  const [companies, brandAssets, projectImages] = await Promise.all([
    client.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
    client.entities.BrandAsset.filter({ organization_id: orgId }).catch(() => []),
    client.entities.ProjectImage.filter({ organization_id: orgId }).catch(() => []),
  ]);
  const company = (companies || [])[0] || {};
  const logo = (brandAssets || []).find(b => b.type === 'logo') || (brandAssets || [])[0] || null;
  return { company, logo, brandAssets: brandAssets || [], projectImages: projectImages || [] };
}

export function getApprovedTakeoffs(takeoffs) {
  return (takeoffs || []).filter(t =>
    t.approval_state === 'approved' || t.reviewer_decision === 'approved' || t.approval_state === 'unreviewed'
  );
}