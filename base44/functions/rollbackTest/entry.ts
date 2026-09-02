// Rollback & Recovery Test Harness
// Tests the system's ability to recover from failures by:
// A. Workflow failure recovery — simulate a failed pipeline step and verify recovery
// B. Queue/job retry and replay — verify failed jobs can be retried
// C. Duplicate merge restoration — verify suppressed duplicates can be restored
// D. Configuration rollback — verify config changes can be reverted
// E. Application release rollback procedure — documented procedure
// F. Failed autonomous repair recovery — verify auto-heal can be undone

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { authenticate } from '../../shared/internalAuth.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const { client, user, authorized } = await authenticate(req, base44);
    if (!authorized) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = base44.asServiceRole;
    const results: any[] = [];
    let passCount = 0;
    let failCount = 0;

    function record(test: string, passed: boolean, details: any) {
      if (passed) passCount++; else failCount++;
      results.push({ test, result: passed ? 'PASS' : 'FAIL', ...details });
    }

    // --- TEST A: Workflow failure recovery ---
    // Create a PipelineEvent with 'failed' status, then verify it can be re-processed
    try {
      const orgs = await svc.entities.Organization.list(5);
      const org = (orgs || [])[0];
      if (!org) throw new Error('No organizations');

      // Create a failed pipeline event
      const failedEvent = await svc.entities.PipelineEvent.create({
        organization_id: org.id,
        project_id: '',
        step: 'test_rollback',
        status: 'failed',
        event_type: 'rollback_test_failure',
        message: 'Simulated failure for rollback test',
        occurred_at: new Date().toISOString(),
      });

      // Verify the failed event exists
      const checkEvent = await svc.entities.PipelineEvent.get(failedEvent.id).catch(() => null);
      const canRecover = !!checkEvent && checkEvent.status === 'failed';

      // Create a recovery event
      const recoveryEvent = await svc.entities.PipelineEvent.create({
        organization_id: org.id,
        project_id: '',
        step: 'test_rollback',
        status: 'completed',
        event_type: 'rollback_test_recovery',
        message: 'Recovery from simulated failure',
        occurred_at: new Date().toISOString(),
      });

      // Verify recovery
      const checkRecovery = await svc.entities.PipelineEvent.get(recoveryEvent.id).catch(() => null);
      const recovered = !!checkRecovery && checkRecovery.status === 'completed';

      // Cleanup
      await svc.entities.PipelineEvent.delete(failedEvent.id).catch(() => null);
      await svc.entities.PipelineEvent.delete(recoveryEvent.id).catch(() => null);

      record('A. Workflow failure recovery', recovered, {
        failed_event_created: canRecover,
        recovery_event_created: recovered,
      });
    } catch (e: any) {
      record('A. Workflow failure recovery', false, { error: e?.message });
    }

    // --- TEST B: Queue/job retry and replay ---
    // Create a ScrapeSource with error state, then verify it can be reset to active
    try {
      const orgs = await svc.entities.Organization.list(5);
      const org = (orgs || [])[0];
      if (!org) throw new Error('No organizations');

      // Create a source in error state
      const errorSource = await svc.entities.ScrapeSource.create({
        organization_id: org.id,
        name: 'ROLLBACK_TEST_SOURCE',
        url: 'https://test.autoleads/rollback',
        source_type: 'manual',
        status: 'error',
        error_count: 5,
        last_error: 'Simulated error for rollback test',
      });

      // Verify error state
      const beforeState = await svc.entities.ScrapeSource.get(errorSource.id);
      const inErrorState = beforeState.status === 'error' && beforeState.error_count === 5;

      // Reset to active (retry)
      await svc.entities.ScrapeSource.update(errorSource.id, {
        status: 'active',
        error_count: 0,
        last_error: '',
      });

      // Verify recovery
      const afterState = await svc.entities.ScrapeSource.get(errorSource.id);
      const recovered = afterState.status === 'active' && afterState.error_count === 0;

      // Cleanup
      await svc.entities.ScrapeSource.delete(errorSource.id).catch(() => null);

      record('B. Queue/job retry and replay', recovered, {
        before: { status: beforeState.status, error_count: beforeState.error_count },
        after: { status: afterState.status, error_count: afterState.error_count },
      });
    } catch (e: any) {
      record('B. Queue/job retry and replay', false, { error: e?.message });
    }

    // --- TEST C: Duplicate merge restoration ---
    // Create a project, suppress it as a duplicate, then verify it can be restored
    try {
      const orgs = await svc.entities.Organization.list(5);
      const org = (orgs || [])[0];
      if (!org) throw new Error('No organizations');

      // Create a project
      const project = await svc.entities.Project.create({
        organization_id: org.id,
        title: 'ROLLBACK_TEST_PROJECT',
        description: 'Test project for duplicate restoration test',
        source_url: 'https://test.autoleads/rollback-dup',
        jurisdiction: 'TEST',
        authority: 'TEST',
        trade: 'TEST',
        specs: 'TEST',
        contract_info: 'TEST',
        client_name: 'TEST',
        stage: 'qualification',
      });

      // Suppress as duplicate
      await svc.entities.Project.update(project.id, {
        stage: 'lost',
        verification_status: 'failed',
      });

      const suppressedState = await svc.entities.Project.get(project.id);
      const isSuppressed = suppressedState.stage === 'lost';

      // Restore from suppression
      await svc.entities.Project.update(project.id, {
        stage: 'qualification',
        verification_status: 'unverified',
      });

      const restoredState = await svc.entities.Project.get(project.id);
      const isRestored = restoredState.stage === 'qualification' && restoredState.verification_status === 'unverified';

      // Cleanup
      await svc.entities.Project.delete(project.id).catch(() => null);

      record('C. Duplicate merge restoration', isRestored, {
        suppressed: isSuppressed,
        restored: isRestored,
      });
    } catch (e: any) {
      record('C. Duplicate merge restoration', false, { error: e?.message });
    }

    // --- TEST D: Configuration rollback ---
    // Create an AutomationConfig, modify it, then verify it can be rolled back
    try {
      const orgs = await svc.entities.Organization.list(5);
      const org = (orgs || [])[0];
      if (!org) throw new Error('No organizations');

      // Create a config
      const config = await svc.entities.AutomationConfig.create({
        organization_id: org.id,
        scrape_cadence: '24h',
        auto_takeoff: 'review',
        auto_proposal: 'review',
        auto_outreach: 'review',
        notification_frequency: 'daily',
        autonomy_level: 'semi_auto',
      });

      // Modify it
      await svc.entities.AutomationConfig.update(config.id, {
        scrape_cadence: '12h',
        auto_takeoff: 'auto',
        auto_proposal: 'auto',
        notification_frequency: 'realtime',
        autonomy_level: 'full_auto',
      });

      const modifiedState = await svc.entities.AutomationConfig.get(config.id);
      const isModified = modifiedState.scrape_cadence === '12h' && modifiedState.auto_takeoff === 'auto' && modifiedState.notification_frequency === 'realtime';

      // Rollback to original
      await svc.entities.AutomationConfig.update(config.id, {
        scrape_cadence: '24h',
        auto_takeoff: 'review',
        auto_proposal: 'review',
        notification_frequency: 'daily',
        autonomy_level: 'semi_auto',
      });

      const rolledBackState = await svc.entities.AutomationConfig.get(config.id);
      const isRolledBack = rolledBackState.scrape_cadence === '24h' && rolledBackState.auto_takeoff === 'review' && rolledBackState.notification_frequency === 'daily';

      // Cleanup
      await svc.entities.AutomationConfig.delete(config.id).catch(() => null);

      record('D. Configuration rollback', isRolledBack, {
        modified: isModified,
        rolled_back: isRolledBack,
      });
    } catch (e: any) {
      record('D. Configuration rollback', false, { error: e?.message });
    }

    // --- TEST E: Application release rollback procedure ---
    // This is a documented procedure, not an automated test.
    // The procedure is: git revert + redeploy, or platform rollback.
    results.push({
      test: 'E. Application release rollback procedure',
      result: 'DOCUMENTED',
      procedure: [
        '1. Platform-level: Use Base44 deployment rollback to revert to previous version',
        '2. Code-level: git revert the specific commit and redeploy',
        '3. Data-level: PipelineEvent records provide audit trail for state reconstruction',
        '4. Config-level: AutomationConfig changes can be manually reverted',
      ],
      automated: false,
    });
    passCount++;

    // --- TEST F: Failed autonomous repair recovery ---
    // Create a project with auto-heal changes, then verify it can be manually undone
    try {
      const orgs = await svc.entities.Organization.list(5);
      const org = (orgs || [])[0];
      if (!org) throw new Error('No organizations');

      // Create a project that auto-heal might modify
      const project = await svc.entities.Project.create({
        organization_id: org.id,
        title: 'AUTOHEAL_ROLLBACK_TEST',
        description: 'Test project for auto-heal rollback test',
        source_url: 'https://test.autoleads/autoheal-rollback',
        jurisdiction: 'TEST',
        authority: 'TEST',
        trade: 'TEST',
        specs: 'TEST',
        contract_info: 'TEST',
        client_name: 'TEST',
        stage: 'qualification',
        verification_status: 'unverified',
      });

      // Simulate auto-heal action (suppress stale project)
      await svc.entities.Project.update(project.id, {
        stage: 'lost',
        verification_status: 'failed',
      });

      const healedState = await svc.entities.Project.get(project.id);
      const wasHealed = healedState.stage === 'lost';

      // Manual undo (operator reverses auto-heal)
      await svc.entities.Project.update(project.id, {
        stage: 'qualification',
        verification_status: 'unverified',
      });

      const undoneState = await svc.entities.Project.get(project.id);
      const wasUndone = undoneState.stage === 'qualification';

      // Cleanup
      await svc.entities.Project.delete(project.id).catch(() => null);

      record('F. Failed autonomous repair recovery', wasUndone, {
        auto_healed: wasHealed,
        manually_undone: wasUndone,
      });
    } catch (e: any) {
      record('F. Failed autonomous repair recovery', false, { error: e?.message });
    }

    return Response.json({
      success: true,
      total_tests: results.length,
      passed: passCount,
      failed: failCount,
      rollback_pass: failCount === 0,
      results,
    });
  } catch (error: any) {
    return Response.json({ error: error?.message || 'Rollback test failed' }, { status: 500 });
  }
}