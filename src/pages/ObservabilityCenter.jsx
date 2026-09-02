import React, { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Gauge, Loader2, RefreshCw, Siren } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, Surface, SecondaryAction, IconSquare, StatusPill } from "@/components/CommercialMobileUI";

export default function ObservabilityCenter() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);

  async function loadReport() {
    setLoading(true); setError("");
    try {
      // Use runRegressionTests as a proxy for system health + pull source/queue data directly
      const [sources, takeoffs, estimates, proposals, esigns, projects, actionItems, gaps] = await Promise.all([
        base44.entities.ScrapeSource.list("-updated_date", 500),
        base44.entities.Takeoff.filter({ approval_state: "unreviewed" }).catch(() => []),
        base44.entities.Estimate.filter({ status: "draft" }).catch(() => []),
        base44.entities.Proposal.filter({ status: "internal_review" }).catch(() => []),
        base44.entities.EsignDocument.filter({ status: "sent" }).catch(() => []),
        base44.entities.Project.list("-created_date", 500),
        base44.entities.ActionItem.filter({ status: "open" }).catch(() => []),
        base44.entities.SystemGap.filter({ status: "open" }).catch(() => []),
      ]);

      const sourceList = sources || [];
      const now = Date.now();

      const sourceHealth = sourceList.map(s => {
        const staleness = s.last_success_date ? Math.floor((now - new Date(s.last_success_date).getTime()) / 86400000) : null;
        let score = 50;
        if (staleness !== null) {
          if (staleness <= 1) score += 30;
          else if (staleness <= 3) score += 25;
          else if (staleness <= 7) score += 15;
          else if (staleness <= 14) score += 5;
          else score -= 10;
        }
        if (s.error_count > 0) score -= Math.min(20, s.error_count * 5);
        if (s.records_retrieved > 0) score += 10;
        if (s.status === "active") score += 10;
        else if (s.status === "error") score -= 20;
        else if (s.status === "paused") score -= 5;
        else if (s.status === "unverified") score -= 10;
        score = Math.max(0, Math.min(100, score));
        let label = "unknown";
        if (s.status === "error" || score < 30) label = "failing";
        else if (score < 60) label = "degraded";
        else if (score >= 60) label = "healthy";
        return { ...s, health_score: score, health_label: label, staleness_days: staleness };
      });

      const projectList = projects || [];
      const overdueBids = projectList.filter(p => {
        if (!p.bid_due_date || p.stage === "lost" || p.stage === "won") return false;
        return new Date(p.bid_due_date) < now && p.stage !== "submitted";
      }).length;

      const queueDepth = {
        pending_takeoffs: (takeoffs || []).length,
        pending_estimates: (estimates || []).length,
        pending_proposal_approvals: (proposals || []).filter(p => p.status === "internal_review").length,
        pending_esign: (esigns || []).filter(e => e.status === "sent").length,
        overdue_bids: overdueBids,
        open_action_items: (actionItems || []).length,
        open_system_gaps: (gaps || []).length,
      };

      const avgHealth = sourceHealth.length > 0
        ? Math.round(sourceHealth.reduce((sum, s) => sum + s.health_score, 0) / sourceHealth.length)
        : 50;
      const queuePenalty = Math.min(30, queueDepth.overdue_bids * 5 + queueDepth.open_system_gaps * 2);
      const overallHealth = Math.max(0, Math.min(100, avgHealth - queuePenalty));

      setReport({ source_health: sourceHealth, queue_depth: queueDepth, overall_health: overallHealth, generated_at: new Date().toISOString() });
    } catch (e) {
      setError(e?.message || "Failed to load observability data");
    } finally {
      setLoading(false);
    }
  }

  async function runClaimAudit() {
    setRunning(true);
    try {
      const result = await base44.functions.invoke("auditClaims", {});
      if (result?.success) {
        alert(`Claim audit complete: ${result.verified} verified, ${result.exaggerated} exaggerated, ${result.unsubstantiated} unsubstantiated out of ${result.total_audited} claims.`);
      }
    } catch (e) {
      setError(e?.message || "Claim audit failed");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => { loadReport(); }, []);

  const healthColor = report?.overall_health >= 70 ? "success" : report?.overall_health >= 40 ? "warning" : "danger";
  const healthLabel = report?.overall_health >= 70 ? "Healthy" : report?.overall_health >= 40 ? "Degraded" : "Critical";

  const queueItems = report ? [
    { label: "Pending takeoffs", value: report.queue_depth.pending_takeoffs, icon: Clock, tone: report.queue_depth.pending_takeoffs > 5 ? "warning" : "neutral" },
    { label: "Pending estimates", value: report.queue_depth.pending_estimates, icon: Clock, tone: report.queue_depth.pending_estimates > 5 ? "warning" : "neutral" },
    { label: "Proposal approvals", value: report.queue_depth.pending_proposal_approvals, icon: Clock, tone: report.queue_depth.pending_proposal_approvals > 0 ? "warning" : "neutral" },
    { label: "E-sign pending", value: report.queue_depth.pending_esign, icon: Clock, tone: report.queue_depth.pending_esign > 0 ? "info" : "neutral" },
    { label: "Overdue bids", value: report.queue_depth.overdue_bids, icon: Siren, tone: report.queue_depth.overdue_bids > 0 ? "danger" : "neutral" },
    { label: "Open action items", value: report.queue_depth.open_action_items, icon: AlertTriangle, tone: report.queue_depth.open_action_items > 5 ? "warning" : "neutral" },
    { label: "Open system gaps", value: report.queue_depth.open_system_gaps, icon: AlertTriangle, tone: report.queue_depth.open_system_gaps > 0 ? "warning" : "neutral" },
  ] : [];

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Dashboard" />
      <IndustrialTitle eyebrow="Operations" compact>Observability Center</IndustrialTitle>

      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#E9A900]" size={32} /></div>
      ) : error ? (
        <Surface className="p-5"><p className="text-sm text-red-600">{error}</p></Surface>
      ) : (
        <>
          {/* Overall Health */}
          <Surface className="mb-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconSquare icon={Gauge} tone={healthColor === "success" ? "success" : "yellow"} />
                <div>
                  <p className="text-sm text-black/60">System Health Score</p>
                  <p className="font-brand text-3xl font-bold">{report?.overall_health}/100</p>
                </div>
              </div>
              <StatusPill tone={healthColor}>{healthLabel}</StatusPill>
            </div>
          </Surface>

          {/* Queue Depth */}
          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="font-brand text-[17px] font-bold uppercase tracking-[.035em]">Pipeline Queues</h2>
            <button onClick={loadReport} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#D99D00]">
              <RefreshCw size={16} />Refresh
            </button>
          </div>
          <Surface className="p-4">
            {queueItems.map((item, i) => (
              <div key={i} className="flex min-h-12 items-center justify-between border-b border-black/[.07] py-2.5 last:border-b-0">
                <div className="flex items-center gap-2">
                  <item.icon size={18} className="text-black/40" />
                  <span className="text-sm text-black/60">{item.label}</span>
                </div>
                <StatusPill tone={item.tone}>{item.value}</StatusPill>
              </div>
            ))}
          </Surface>

          {/* Source Health */}
          <div className="mb-3 mt-6 flex items-center justify-between">
            <h2 className="font-brand text-[17px] font-bold uppercase tracking-[.035em]">Source Health</h2>
          </div>
          {report?.source_health?.length === 0 ? (
            <Surface className="p-5"><p className="text-sm text-black/50">No scrape sources registered.</p></Surface>
          ) : (
            <div className="space-y-2">
              {report?.source_health?.slice(0, 20).map((s, i) => (
                <Surface key={i} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{s.name}</p>
                      <p className="mt-0.5 text-xs text-black/50">
                        {s.staleness_days !== null ? `${s.staleness_days}d stale` : "Never run"} · {s.records_retrieved || 0} records
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{s.health_score}</span>
                      <StatusPill tone={s.health_label === "healthy" ? "success" : s.health_label === "degraded" ? "warning" : "danger"}>
                        {s.health_label}
                      </StatusPill>
                    </div>
                  </div>
                  {s.last_error && (
                    <p className="mt-2 truncate text-xs text-red-500">{s.last_error}</p>
                  )}
                </Surface>
              ))}
            </div>
          )}

          {/* Claim Audit */}
          <div className="mb-3 mt-6">
            <h2 className="font-brand text-[17px] font-bold uppercase tracking-[.035em]">Claim Audit</h2>
          </div>
          <Surface className="p-5">
            <p className="text-sm text-black/60">Verify marketing claims against live database evidence. Writes results to the Claim Ledger for accountability.</p>
            <div className="mt-4">
              <SecondaryAction onClick={runClaimAudit} disabled={running}>
                {running ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />}
                {running ? "Auditing..." : "Run Claim Audit"}
              </SecondaryAction>
            </div>
          </Surface>
        </>
      )}
    </CommercialPage>
  );
}