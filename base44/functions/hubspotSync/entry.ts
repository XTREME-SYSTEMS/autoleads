import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs, scopedFilter } from '../../shared/orgContext.ts';

const HUBSPOT_CONNECTOR_ID = "69db228b2439d854c8587167";
const HUBSPOT_API = "https://api.hubapi.com";

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { body, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(HUBSPOT_CONNECTOR_ID);
    const headers = { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" };

    // Check-only mode: verify connection
    if (body.check) {
      const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts?limit=1`, { headers });
      if (!res.ok) return Response.json({ error: "not connected" }, { status: 500 });
      const data = await res.json();
      return Response.json({ success: true, connected: true, contact_count: data.total || 0 });
    }

    // Resolve org context — never use bare .list() (cross-tenant)
    const ctx = await resolveUserOrgs(base44, user.id);
    if (!ctx.primaryOrgId) return Response.json({ error: 'No active organization membership' }, { status: 403 });

    // Sync mode: push leads (CompanyProfile records) as HubSpot contacts + deals
    const companies = await base44.entities.CompanyProfile.filter(scopedFilter(ctx.primaryOrgId)).catch(() => []);
    const projects = await base44.entities.Project.filter(scopedFilter(ctx.primaryOrgId, { stage: "won" })).catch(() => []);

    let contactsCreated = 0;
    let dealsCreated = 0;
    let errors = [];

    // Create contacts from company profiles
    for (const company of (companies || [])) {
      if (!company.email && !company.phone) continue;
      try {
        const contactRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            properties: {
              company: company.name || "",
              email: company.email || "",
              phone: company.phone || "",
              city: company.city || "",
              state: company.state || "",
              website: company.website || "",
              lifecyclestage: "lead"
            }
          })
        });
        if (contactRes.ok) contactsCreated++;
        else {
          const err = await contactRes.json();
          if (err.message && !err.message.includes("already")) errors.push(`${company.name}: ${err.message}`);
        }
      } catch (e) {
        errors.push(`${company.name}: ${e.message}`);
      }
    }

    // Create deals from won projects
    for (const project of (projects || [])) {
      if (!project.title) continue;
      try {
        const dealRes = await fetch(`${HUBSPOT_API}/crm/v3/objects/deals`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            properties: {
              dealname: project.title,
              amount: project.value || 0,
              dealstage: "closedwon",
              pipeline: "default",
              closedate: project.bid_due_date || new Date().toISOString().split("T")[0]
            }
          })
        });
        if (dealRes.ok) dealsCreated++;
      } catch (e) {
        errors.push(`${project.title}: ${e.message}`);
      }
    }

    return Response.json({
      success: true,
      contacts_created: contactsCreated,
      deals_created: dealsCreated,
      errors: errors.slice(0, 5)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}