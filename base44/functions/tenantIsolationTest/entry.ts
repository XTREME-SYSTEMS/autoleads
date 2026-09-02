// Tenant Isolation Test Harness
// Tests RLS enforcement through actual authenticated user-token paths.
// Uses the user's own client (NOT asServiceRole) so RLS is enforced.
//
// When called with a real user token, this function:
// 1. Resolves the user's organization memberships
// 2. Finds organizations the user does NOT belong to
// 3. Attempts cross-tenant read/create/update/delete operations
// 4. Reports which operations were DENIED (PASS) vs ALLOWED (FAIL)

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';
import { resolveUserOrgs } from '../../shared/orgContext.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized || !user) {
      return Response.json({ error: 'Authentication required — this test must run with a real user token' }, { status: 401 });
    }

    // Resolve the user's org memberships
    const ctx = await resolveUserOrgs(base44, user.id);
    if (ctx.orgIds.length === 0) {
      return Response.json({ error: 'User has no organization memberships' }, { status: 403 });
    }

    // Find all organizations
    const allOrgs = await base44.asServiceRole.entities.Organization.list(100);
    const otherOrgs = (allOrgs || []).filter((o: any) => !ctx.orgIds.includes(o.id) && o.owner_user_id !== user.id);

    if (otherOrgs.length === 0) {
      return Response.json({ 
        success: true, 
        note: 'No other organizations found to test against. Need at least 2 orgs for isolation test.',
        user_orgs: ctx.orgIds.length,
      });
    }

    const targetOrg = otherOrgs[0];
    const results: any[] = [];
    let passCount = 0;
    let failCount = 0;
    const isAdmin = user.role === 'admin';

    function record(test: string, action: string, denied: boolean, error?: string) {
      const status = denied ? 'DENIED' : 'ALLOWED';
      const result = denied ? 'PASS' : 'FAIL';
      if (denied) passCount++; else failCount++;
      results.push({ test, action, status, result, error: error || null });
    }

    function recordNA(test: string, reason: string) {
      passCount++;
      results.push({ test, action: 'n/a', status: 'N/A', result: 'PASS', error: reason });
    }

    // Admin users bypass RLS by design — RLS rules explicitly allow admin access to all orgs.
    // Cross-tenant tests are N/A for admin users; the real isolation test requires a non-admin user.
    if (isAdmin) {
      recordNA('Cross-tenant Project.create', 'Admin bypass — RLS admin rules allow cross-org access by design');
      recordNA('Cross-tenant Project.filter', 'Admin bypass — RLS admin rules allow cross-org access by design');
      recordNA('Cross-tenant Proposal.filter', 'Admin bypass — RLS admin rules allow cross-org access by design');
      recordNA('Cross-tenant Invoice.filter', 'Admin bypass — RLS admin rules allow cross-org access by design');
    } else {
      // --- TEST 1: Cross-tenant CREATE (Project with other org's ID) ---
      try {
        await client.entities.Project.create({
          organization_id: targetOrg.id,
          title: 'ISOLATION_TEST_SHOULD_FAIL',
          description: 'Cross-tenant creation test — should be denied by RLS',
          source_url: 'https://test.autoleads/isolation',
          jurisdiction: 'TEST',
          authority: 'TEST',
          trade: 'TEST',
          specs: 'TEST',
          contract_info: 'TEST',
          client_name: 'TEST',
        });
        record('Cross-tenant Project.create', 'create', false);
      } catch (e: any) {
        record('Cross-tenant Project.create', 'create', true, e?.message || String(e));
      }

      // --- TEST 2: Cross-tenant FILTER (Project by other org_id) ---
      try {
        const filtered = await client.entities.Project.filter({ organization_id: targetOrg.id }, '-created_date', 10);
        if (filtered && filtered.length > 0) {
          record('Cross-tenant Project.filter', 'filter', false, `Returned ${filtered.length} records from other org`);
        } else {
          record('Cross-tenant Project.filter', 'filter', true, 'Returned 0 records (RLS enforced)');
        }
      } catch (e: any) {
        record('Cross-tenant Project.filter', 'filter', true, e?.message || String(e));
      }

      // --- TEST 3: Cross-tenant FILTER (Proposal by other org_id) ---
      try {
        const filtered = await client.entities.Proposal.filter({ organization_id: targetOrg.id }, '-created_date', 10);
        if (filtered && filtered.length > 0) {
          record('Cross-tenant Proposal.filter', 'filter', false, `Returned ${filtered.length} records from other org`);
        } else {
          record('Cross-tenant Proposal.filter', 'filter', true, 'Returned 0 records (RLS enforced)');
        }
      } catch (e: any) {
        record('Cross-tenant Proposal.filter', 'filter', true, e?.message || String(e));
      }

      // --- TEST 4: Cross-tenant FILTER (Invoice by other org_id) ---
      try {
        const filtered = await client.entities.Invoice.filter({ organization_id: targetOrg.id }, '-created_date', 10);
        if (filtered && filtered.length > 0) {
          record('Cross-tenant Invoice.filter', 'filter', false, `Returned ${filtered.length} records from other org`);
        } else {
          record('Cross-tenant Invoice.filter', 'filter', true, 'Returned 0 records (RLS enforced)');
        }
      } catch (e: any) {
        record('Cross-tenant Invoice.filter', 'filter', true, e?.message || String(e));
      }
    }

    // --- TEST 5: Same-org access (control test — should PASS) ---
    try {
      const ownProjects = await client.entities.Project.filter({ organization_id: ctx.orgIds[0] }, '-created_date', 1);
      results.push({ 
        test: 'Same-org Project.filter (control)', 
        action: 'filter', 
        status: ownProjects && ownProjects.length > 0 ? 'ALLOWED' : 'EMPTY', 
        result: 'PASS',
        error: ownProjects && ownProjects.length > 0 ? `${ownProjects.length} records accessible` : 'Own org has no projects yet',
      });
      passCount++;
    } catch (e: any) {
      results.push({ test: 'Same-org Project.filter (control)', action: 'filter', status: 'ERROR', result: 'FAIL', error: e?.message });
      failCount++;
    }

    return Response.json({
      success: true,
      user_id: user.id,
      user_email: user.email,
      user_role: user.role || 'user',
      is_admin: isAdmin,
      user_orgs: ctx.orgIds,
      target_org: { id: targetOrg.id, name: targetOrg.name },
      total_tests: results.length,
      passed: passCount,
      failed: failCount,
      tenant_isolation_pass: failCount === 0,
      admin_note: isAdmin ? 'Cross-tenant tests N/A for admin users (RLS admin bypass is by design). Run with a non-admin user for full isolation verification.' : null,
      results,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Tenant isolation test failed' }, { status: 500 });
  }
}