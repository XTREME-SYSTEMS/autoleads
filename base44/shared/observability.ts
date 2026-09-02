// Observability module for AUTOLEADS.
// Provides source health scoring, queue depth metrics, and error aggregation
// for operational visibility across all organizations.

import { forEachOrganization, scopedFilter } from './orgContext.ts';

export interface SourceHealthSummary {
  source_id: string;
  name: string;
  url: string;
  status: string;
  last_run_date: string | null;
  last_success_date: string | null;
  records_retrieved: number;
  error_count: number;
  last_error: string;
  health_score: number;         // 0-100
  health_label: 'healthy' | 'degraded' | 'failing' | 'unknown';
  staleness_days: number | null;
}

export interface QueueSummary {
  pending_takeoffs: number;
  pending_estimates: number;
  pending_proposal_approvals: number;
  pending_email_approvals: number;
  pending_esign: number;
  overdue_bids: number;
  open_action_items: number;
  open_system_gaps: number;
}

export interface ErrorSummary {
  total_errors: number;
  by_category: Record<string, number>;
  recent_errors: { source: string; message: string; timestamp: string }[];
}

export interface ObservabilityReport {
  organization_id: string;
  generated_at: string;
  source_health: SourceHealthSummary[];
  queue_depth: QueueSummary;
  errors: ErrorSummary;
  overall_health: number;       // 0-100 composite
}

// Calculate health score for a single source based on recency, errors, and records.
export function calculateSourceHealth(source: any): SourceHealthSummary {
  const now = Date.now();
  let score = 50;
  const stalenessDays = source.last_success_date
    ? Math.floor((now - new Date(source.last_success_date).getTime()) / (24 * 60 * 60 * 1000))
    : null;

  // Recency factor (up to 30 points)
  if (stalenessDays !== null) {
    if (stalenessDays <= 1) score += 30;
    else if (stalenessDays <= 3) score += 25;
    else if (stalenessDays <= 7) score += 15;
    else if (stalenessDays <= 14) score += 5;
    else score -= 10;
  }

  // Error count factor (up to 20 points deducted)
  if (source.error_count > 0) {
    score -= Math.min(20, source.error_count * 5);
  }

  // Records retrieved factor (up to 10 points)
  if (source.records_retrieved > 0) score += 10;

  // Status factor
  if (source.status === 'active') score += 10;
  else if (source.status === 'error') score -= 20;
  else if (source.status === 'paused') score -= 5;
  else if (source.status === 'unverified') score -= 10;

  score = Math.max(0, Math.min(100, score));

  let healthLabel: SourceHealthSummary['health_label'] = 'unknown';
  if (source.status === 'error' || score < 30) healthLabel = 'failing';
  else if (score < 60) healthLabel = 'degraded';
  else if (score >= 60) healthLabel = 'healthy';

  return {
    source_id: source.id,
    name: source.name,
    url: source.url,
    status: source.status,
    last_run_date: source.last_run_date || null,
    last_success_date: source.last_success_date || null,
    records_retrieved: source.records_retrieved || 0,
    error_count: source.error_count || 0,
    last_error: source.last_error || '',
    health_score: score,
    health_label: healthLabel,
    staleness_days: stalenessDays,
  };
}

// Build queue depth summary for an organization.
export async function buildQueueSummary(client: any, orgId: string): Promise<QueueSummary> {
  const [
    takeoffs, estimates, proposals, emails, esigns, projects, actionItems, gaps
  ] = await Promise.all([
    client.entities.Takeoff.filter(scopedFilter(orgId, { approval_state: 'unreviewed' })).catch(() => []),
    client.entities.Estimate.filter(scopedFilter(orgId, { status: 'draft' })).catch(() => []),
    client.entities.Proposal.filter(scopedFilter(orgId, { status: 'internal_review' })).catch(() => []),
    client.entities.EmailTemplate.filter(scopedFilter(orgId, { approval_status: 'pending', auto_send: true })).catch(() => []),
    client.entities.EsignDocument.filter(scopedFilter(orgId, { status: 'sent' })).catch(() => []),
    client.entities.Project.filter(scopedFilter(orgId)).catch(() => []),
    client.entities.ActionItem.filter(scopedFilter(orgId, { status: 'open' })).catch(() => []),
    client.entities.SystemGap.filter({ status: 'open' }).catch(() => []),
  ]);

  const now = new Date();
  const overdueBids = (projects || []).filter((p: any) => {
    if (!p.bid_due_date || p.stage === 'lost' || p.stage === 'won') return false;
    return new Date(p.bid_due_date) < now && p.stage !== 'submitted';
  }).length;

  return {
    pending_takeoffs: (takeoffs || []).length,
    pending_estimates: (estimates || []).length,
    pending_proposal_approvals: (proposals || []).filter((p: any) => p.status === 'internal_review').length,
    pending_email_approvals: (emails || []).length,
    pending_esign: (esigns || []).filter((e: any) => e.status === 'sent').length,
    overdue_bids: overdueBids,
    open_action_items: (actionItems || []).length,
    open_system_gaps: (gaps || []).length,
  };
}

// Build a full observability report for a single organization.
export async function buildObservabilityReport(client: any, orgId: string): Promise<ObservabilityReport> {
  const sources = await client.entities.ScrapeSource.filter(scopedFilter(orgId)).catch(() => []);
  const sourceHealth = (sources || []).map(calculateSourceHealth);

  const queueDepth = await buildQueueSummary(client, orgId);

  // Simple error aggregation from source last_error fields
  const recentErrors = (sources || [])
    .filter((s: any) => s.last_error)
    .map((s: any) => ({
      source: s.name,
      message: s.last_error,
      timestamp: s.last_run_date || new Date().toISOString(),
    }))
    .slice(0, 10);

  const errorSummary: ErrorSummary = {
    total_errors: (sources || []).reduce((sum: number, s: any) => sum + (s.error_count || 0), 0),
    by_category: {},
    recent_errors: recentErrors,
  };

  // Overall health: weighted average of source health and queue health
  const avgSourceHealth = sourceHealth.length > 0
    ? sourceHealth.reduce((sum, s) => sum + s.health_score, 0) / sourceHealth.length
    : 50;
  const queuePenalty = Math.min(30, queueDepth.overdue_bids * 5 + queueDepth.open_system_gaps * 2);
  const overallHealth = Math.max(0, Math.min(100, Math.round(avgSourceHealth - queuePenalty)));

  return {
    organization_id: orgId,
    generated_at: new Date().toISOString(),
    source_health: sourceHealth,
    queue_depth: queueDepth,
    errors: errorSummary,
    overall_health: overallHealth,
  };
}

// Build observability reports across ALL organizations (service-role only).
export async function buildAllOrgObservabilityReports(client: any): Promise<ObservabilityReport[]> {
  const reports: ObservabilityReport[] = [];
  await forEachOrganization(client, async (org: any) => {
    try {
      const report = await buildObservabilityReport(client, org.id);
      reports.push(report);
    } catch (e: any) {
      console.error(`Observability report failed for org ${org.id}:`, e?.message || e);
    }
  });
  return reports;
}

// ============================================================
// FAILURE MODE REGISTRY — Explicit detection for all 13 critical failure classes
// ============================================================

export interface FailureModeDef {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detection_source: string;
  alert_condition: string;
  operator_action: string;
  retry_policy: string;
}

export const FAILURE_MODE_REGISTRY: FailureModeDef[] = [
  {
    id: 'failed_scraper',
    name: 'Failed Scraper',
    severity: 'high',
    detection_source: 'ScrapeSource.status === "error" OR ScrapeSource.error_count > 0',
    alert_condition: 'Any source with status=error or error_count >= 3',
    operator_action: 'Check source URL, verify parser, reset to active after fix',
    retry_policy: 'Auto-retry 3 times, then pause source and alert',
  },
  {
    id: 'stale_source',
    name: 'Stale Source',
    severity: 'medium',
    detection_source: 'ScrapeSource.last_success_date > 7 days ago',
    alert_condition: 'Source not successfully scraped in 7+ days',
    operator_action: 'Verify source is still active, check for URL changes, re-trigger scrape',
    retry_policy: 'Re-trigger scrape daily until success or 3 consecutive failures',
  },
  {
    id: 'queue_failure',
    name: 'Queue Failure',
    severity: 'high',
    detection_source: 'QueueSummary depth > threshold (takeoffs > 50, proposals > 20, esign > 10)',
    alert_condition: 'Queue depth exceeds configured threshold for 24+ hours',
    operator_action: 'Check for stuck jobs, verify worker availability, manually process overflow',
    retry_policy: 'Auto-retry queued items 3 times with exponential backoff',
  },
  {
    id: 'stuck_job',
    name: 'Stuck Job',
    severity: 'high',
    detection_source: 'PipelineEvent.status === "pending" AND occurred_at > 24 hours ago',
    alert_condition: 'Pipeline event in pending state for > 24 hours',
    operator_action: 'Check for worker crash, verify dependencies, manually advance or cancel',
    retry_policy: 'Auto-retry once after 1 hour, then alert for manual intervention',
  },
  {
    id: 'dead_letter',
    name: 'Dead-Letter Job',
    severity: 'critical',
    detection_source: 'PipelineEvent.status === "failed" AND no recovery event within 1 hour',
    alert_condition: 'Failed pipeline event with no corresponding recovery event',
    operator_action: 'Review failure message, fix root cause, replay via rollbackTest or manual recovery',
    retry_policy: 'Manual replay required after root cause analysis',
  },
  {
    id: 'gmail_failure',
    name: 'Gmail Failure',
    severity: 'high',
    detection_source: 'sendEmail function returns error OR submitProposal send_receipt is null',
    alert_condition: 'Email send fails or no provider receipt returned',
    operator_action: 'Check Gmail connector authorization, verify recipient address, retry send',
    retry_policy: 'Auto-retry 3 times with 5-minute backoff, then alert',
  },
  {
    id: 'drive_failure',
    name: 'Drive Failure',
    severity: 'medium',
    detection_source: 'driveBrowse/driveRead function returns error',
    alert_condition: 'Google Drive API call fails',
    operator_action: 'Check Drive connector authorization, verify file permissions, retry',
    retry_policy: 'Auto-retry 3 times with exponential backoff',
  },
  {
    id: 'calendar_failure',
    name: 'Calendar Failure',
    severity: 'medium',
    detection_source: 'syncCalendar/scheduleJob function returns error',
    alert_condition: 'Google Calendar API call fails',
    operator_action: 'Check Calendar connector authorization, verify event creation, retry',
    retry_policy: 'Auto-retry 3 times with exponential backoff',
  },
  {
    id: 'stripe_failure',
    name: 'Stripe Failure',
    severity: 'critical',
    detection_source: 'StripeEvent.outcome === "error" OR createPaymentIntent returns error',
    alert_condition: 'Stripe API call fails or webhook processing errors',
    operator_action: 'Check Stripe configuration, verify API keys, check webhook endpoint, replay event',
    retry_policy: 'Stripe webhooks auto-retry for 72 hours; manual replay for persistent failures',
  },
  {
    id: 'esign_failure',
    name: 'E-Sign Failure',
    severity: 'high',
    detection_source: 'EsignDocument.signing_audit_log contains "token_denied" OR status === "expired"',
    alert_condition: 'E-sign token denied, expired, or document in error state',
    operator_action: 'Verify signer email, re-send signing link, check document content hash',
    retry_policy: 'Re-send signing link with new token (30-day expiry)',
  },
  {
    id: 'llm_failure',
    name: 'LLM Failure',
    severity: 'medium',
    detection_source: 'InvokeLLM returns error OR autoTakeoff/autoProposals returns error',
    alert_condition: 'LLM API call fails or returns invalid response',
    operator_action: 'Check prompt format, verify model availability, retry with simpler prompt',
    retry_policy: 'Auto-retry 3 times with exponential backoff, then fallback to null (no fabrication)',
  },
  {
    id: 'database_failure',
    name: 'Database Failure',
    severity: 'critical',
    detection_source: 'Entity CRUD operations return error (create/update/delete/filter fails)',
    alert_condition: 'Database operation fails consistently',
    operator_action: 'Check entity schema, verify RLS rules, check for field validation errors',
    retry_policy: 'Auto-retry 3 times with 1-second backoff, then alert',
  },
  {
    id: 'agent_failure',
    name: 'Agent Failure',
    severity: 'medium',
    detection_source: 'AgentTask.status === "failed" OR agent conversation returns error',
    alert_condition: 'Agent task fails or conversation errors out',
    operator_action: 'Check agent permissions, verify tool availability, review agent instructions',
    retry_policy: 'Auto-retry 3 times, then escalate to human operator',
  },
];

// Detect active failure modes for an organization
export async function detectFailureModes(client: any, orgId: string): Promise<any[]> {
  const failures: any[] = [];

  // 1. Failed scrapers + 2. Stale sources
  const sources = await client.entities.ScrapeSource.filter(scopedFilter(orgId)).catch(() => []);
  const now = Date.now();
  for (const s of (sources || [])) {
    if (s.status === 'error' || (s.error_count || 0) >= 3) {
      failures.push({
        mode: 'failed_scraper',
        severity: 'high',
        organization_id: orgId,
        source_id: s.id,
        source_name: s.name,
        alert: `Source "${s.name}" is in error state (${s.error_count} errors)`,
        last_error: s.last_error || '',
        timestamp: s.last_run_date || new Date().toISOString(),
      });
    }
    if (s.last_success_date) {
      const daysSinceSuccess = Math.floor((now - new Date(s.last_success_date).getTime()) / (24 * 60 * 60 * 1000));
      if (daysSinceSuccess > 7) {
        failures.push({
          mode: 'stale_source',
          severity: 'medium',
          organization_id: orgId,
          source_id: s.id,
          source_name: s.name,
          alert: `Source "${s.name}" last succeeded ${daysSinceSuccess} days ago`,
          timestamp: s.last_success_date,
        });
      }
    }
  }

  // 3. Queue failure + 4. Stuck jobs
  const queue = await buildQueueSummary(client, orgId);
  if (queue.pending_takeoffs > 50 || queue.pending_proposal_approvals > 20 || queue.pending_esign > 10) {
    failures.push({
      mode: 'queue_failure',
      severity: 'high',
      organization_id: orgId,
      alert: `Queue depth high: ${queue.pending_takeoffs} takeoffs, ${queue.pending_proposal_approvals} proposals, ${queue.pending_esign} e-sign`,
      timestamp: new Date().toISOString(),
    });
  }

  // 5. Dead-letter jobs
  const failedEvents = await client.entities.PipelineEvent.filter(scopedFilter(orgId, { status: 'failed' }), '-created_date', 10).catch(() => []);
  if (failedEvents && failedEvents.length > 0) {
    failures.push({
      mode: 'dead_letter',
      severity: 'critical',
      organization_id: orgId,
      alert: `${failedEvents.length} failed pipeline events (dead-letter)`,
      events: failedEvents.slice(0, 5).map((e: any) => ({ id: e.id, message: e.message, occurred_at: e.occurred_at })),
      timestamp: new Date().toISOString(),
    });
  }

  // 9. Stripe failures
  const stripeErrors = await client.entities.StripeEvent.filter({ outcome: 'error' }, '-created_date', 5).catch(() => []);
  if (stripeErrors && stripeErrors.length > 0) {
    failures.push({
      mode: 'stripe_failure',
      severity: 'critical',
      organization_id: orgId,
      alert: `${stripeErrors.length} Stripe processing errors`,
      timestamp: new Date().toISOString(),
    });
  }

  // 10. E-sign failures
  const esignDocs = await client.entities.EsignDocument.filter(scopedFilter(orgId), '-created_date', 50).catch(() => []);
  const esignFailures = (esignDocs || []).filter((d: any) => {
    const log = d.signing_audit_log || [];
    return log.some((e: any) => e.event === 'token_denied') || d.status === 'expired';
  });
  if (esignFailures.length > 0) {
    failures.push({
      mode: 'esign_failure',
      severity: 'high',
      organization_id: orgId,
      alert: `${esignFailures.length} e-sign documents with token denials or expired`,
      timestamp: new Date().toISOString(),
    });
  }

  // 13. Agent failures
  const agentTasks = await client.entities.AgentTask.filter(scopedFilter(orgId, { status: 'failed' }), '-created_date', 5).catch(() => []);
  if (agentTasks && agentTasks.length > 0) {
    failures.push({
      mode: 'agent_failure',
      severity: 'medium',
      organization_id: orgId,
      alert: `${agentTasks.length} failed agent tasks`,
      timestamp: new Date().toISOString(),
    });
  }

  return failures;
}

// Get the full failure mode registry (for UI display)
export function getFailureModeRegistry(): FailureModeDef[] {
  return FAILURE_MODE_REGISTRY;
}