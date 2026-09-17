import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useOrgId } from "@/hooks/useOrgContext";
import { Page, PrimaryButton, SecondaryButton, Card, EmptyState, StatusPanel } from "@/components/autoleads/UiPrimitives";
import {
  Activity, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Clock,
  FileCheck, GitBranch, Zap, RefreshCw, ArrowRight, Lock, Play, Gauge, Brain
} from "lucide-react";

const STATE_META = {
  SOURCE_DISCOVERED: { label: "Source Discovered", icon: FileCheck, color: "#6b7280" },
  SOURCE_SCRAPED: { label: "Source Scraped", icon: Activity, color: "#6b7280" },
  SOURCE_PARSED: { label: "Source Parsed", icon: GitBranch, color: "#6b7280" },
  LEAD_VALIDATED: { label: "Lead Validated", icon: ShieldCheck, color: "#3b82f6" },
  LEAD_MATCHED: { label: "Lead Matched", icon: ShieldCheck, color: "#3b82f6" },
  LEAD_QUALIFIED: { label: "Lead Qualified", icon: ShieldCheck, color: "#3b82f6" },
  TAKEOFF_COMPLETED: { label: "Takeoff Completed", icon: Gauge, color: "#8b5cf6" },
  ESTIMATE_COMPLETED: { label: "Estimate Completed", icon: Gauge, color: "#8b5cf6" },
  PROPOSAL_GENERATED: { label: "Proposal Generated", icon: FileCheck, color: "#f59e0b" },
  PROPOSAL_VALIDATED: { label: "Proposal Validated", icon: ShieldCheck, color: "#f59e0b" },
  PROPOSAL_APPROVED: { label: "Proposal Approved", icon: CheckCircle2, color: "#f59e0b" },
  BID_SUBMITTED: { label: "Bid Submitted", icon: ArrowRight, color: "#10b981" },
  FOLLOW_UP_SENT: { label: "Follow-Up Sent", icon: Clock, color: "#10b981" },
  RESPONSE_RECEIVED: { label: "Response Received", icon: Activity, color: "#10b981" },
  NEGOTIATION_STARTED: { label: "Negotiation", icon: Brain, color: "#10b981" },
  CONTRACT_SIGNED: { label: "Contract Signed", icon: CheckCircle2, color: "#059669" },
  INVOICE_SENT: { label: "Invoice Sent", icon: FileCheck, color: "#059669" },
  PAYMENT_RECEIVED: { label: "Payment Received", icon: CheckCircle2, color: "#059669" },
  WON: { label: "WON", icon: CheckCircle2, color: "#10b981" },
  LOST: { label: "LOST", icon: XCircle, color: "#ef4444" },
  BLOCKED: { label: "BLOCKED", icon: Lock, color: "#ef4444" },
};

const PIPELINE_ORDER = [
  "SOURCE_DISCOVERED", "SOURCE_SCRAPED", "SOURCE_PARSED",
  "LEAD_VALIDATED", "LEAD_MATCHED", "LEAD_QUALIFIED",
  "TAKEOFF_COMPLETED", "ESTIMATE_COMPLETED",
  "PROPOSAL_GENERATED", "PROPOSAL_VALIDATED", "PROPOSAL_APPROVED",
  "BID_SUBMITTED", "FOLLOW_UP_SENT", "RESPONSE_RECEIVED",
  "NEGOTIATION_STARTED", "CONTRACT_SIGNED",
  "INVOICE_SENT", "PAYMENT_RECEIVED", "WON",
];

function HealthRing({ score, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 95 ? "#10b981" : score >= 80 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-black/5" />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute text-center">
        <span className="text-3xl font-black" style={{ color }}>{score}</span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-black/40">Health</p>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, color = "#0b0b0b" }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${color}15`, color }}>
          <Icon size={18} />
        </span>
        <div>
          <p className="text-2xl font-black">{value}</p>
          <p className="text-[11px] font-bold uppercase tracking-wide text-black/40">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function PipelineVisualizer({ runs }) {
  const stateCounts = PIPELINE_ORDER.reduce((acc, state) => {
    acc[state] = runs.filter((r) => r.current_state === state).length;
    return acc;
  }, {});

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-black">Deterministic Pipeline State Machine</h2>
      <p className="mb-4 text-sm text-black/50">Source → Won Contract · 19 states · Every transition validated with proof</p>
      <div className="flex flex-wrap gap-1.5">
        {PIPELINE_ORDER.map((state, idx) => {
          const meta = STATE_META[state];
          const count = stateCounts[state] || 0;
          const Icon = meta.icon;
          const isLast = idx === PIPELINE_ORDER.length - 1;
          return (
            <React.Fragment key={state}>
              <div className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2" style={{ borderColor: count > 0 ? meta.color : "#e5e5e5", background: count > 0 ? `${meta.color}10` : "white" }}>
                <Icon size={13} style={{ color: meta.color }} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold leading-tight" style={{ color: count > 0 ? meta.color : "#999" }}>{meta.label}</p>
                  {count > 0 && <p className="text-[9px] font-black" style={{ color: meta.color }}>{count} runs</p>}
                </div>
              </div>
              {!isLast && <ArrowRight size={12} className="mt-1 text-black/20" />}
            </React.Fragment>
          );
        })}
      </div>
    </Card>
  );
}

function RunRow({ run, project }) {
  const meta = STATE_META[run.current_state] || STATE_META.BLOCKED;
  const Icon = meta.icon;
  const statusColor = run.status === "completed" ? "#10b981" : run.status === "blocked" ? "#ef4444" : run.status === "paused" ? "#f59e0b" : "#3b82f6";

  return (
    <div className="rounded-lg border border-black/10 p-3 hover:bg-black/[0.02]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{project?.title || run.source_url}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${meta.color}15`, color: meta.color }}>
              <Icon size={10} /> {meta.label}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: `${statusColor}15`, color: statusColor }}>
              {run.status}
            </span>
            {run.human_approval_required && !run.human_approval_given && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <Clock size={10} /> Needs Approval
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-black" style={{ color: meta.color }}>{run.progress_pct || 0}%</p>
          <p className="text-[10px] text-black/40">{run.step_count || 0} steps · {run.validation_pass_count || 0}✓ {run.validation_fail_count || 0}✗</p>
        </div>
      </div>
      {run.blocked_reason && (
        <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-600">{run.blocked_reason}</p>
      )}
    </div>
  );
}

function ProofEntry({ proof }) {
  return (
    <div className="rounded-lg border border-black/10 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {proof.validation_passed ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
          <span className="text-xs font-bold">{STATE_META[proof.state]?.label || proof.state}</span>
        </div>
        <span className="text-[10px] text-black/40">{proof.duration_ms || 0}ms</span>
      </div>
      <p className="mt-1 truncate text-[11px] text-black/50">{proof.evidence_summary || "No evidence recorded"}</p>
      {proof.auto_healed && <span className="mt-1 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-700">AUTO-HEALED</span>}
    </div>
  );
}

export default function DeepArchitecture() {
  const orgId = useOrgId();
  const [runs, setRuns] = useState([]);
  const [proofs, setProofs] = useState([]);
  const [projects, setProjects] = useState({});
  const [audit, setAudit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [orchestrating, setOrchestrating] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [runData, proofData, projData] = await Promise.all([
        base44.entities.DeepPipelineRun.list('-created_date', 100).catch(() => []),
        base44.entities.DeepStepProof.list('-created_date', 50).catch(() => []),
        base44.entities.Project.list('-created_date', 100).catch(() => []),
      ]);
      setRuns(runData || []);
      setProofs(proofData || []);
      const projMap = (projData || []).reduce((acc, p) => { acc[p.id] = p; return acc; }, {});
      setProjects(projMap);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runOrchestrator = async () => {
    setOrchestrating(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("deepOrchestrate", {});
      if (res?.error) setError(res.error);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setOrchestrating(false);
    }
  };

  const runAudit = async () => {
    setAuditing(true);
    setError(null);
    try {
      const res = await base44.functions.invoke("deepAudit", {});
      setAudit(res);
      if (res?.error) setError(res.error);
    } catch (e) {
      setError(e.message);
    } finally {
      setAuditing(false);
    }
  };

  const completedRuns = runs.filter((r) => r.status === "completed" || r.current_state === "WON").length;
  const blockedRuns = runs.filter((r) => r.status === "blocked" || r.current_state === "BLOCKED").length;
  const pausedRuns = runs.filter((r) => r.status === "paused").length;
  const runningRuns = runs.filter((r) => r.status === "running").length;
  const totalProofs = proofs.length;
  const passedProofs = proofs.filter((p) => p.validation_passed).length;
  const proofRate = totalProofs > 0 ? Math.round((passedProofs / totalProofs) * 100) : 100;
  const healthScore = audit?.overall_health_score || (proofRate === 100 && blockedRuns === 0 ? 100 : Math.max(0, 100 - blockedRuns * 5 - (100 - proofRate)));

  return (
    <Page
      backTo="/dashboard"
      title="DEEP Architecture"
      eyebrow="Deterministic End-to-End Pipeline"
      description="Source → Won Contract · Mandatory 100% validation after every action · Persistent audit & self-heal · Proof ledger for every step"
      actions={
        <>
          <SecondaryButton onClick={runAudit} disabled={auditing}>
            {auditing ? <><RefreshCw size={15} className="animate-spin" />Auditing…</> : <><ShieldCheck size={15} />Run Audit</>}
          </SecondaryButton>
          <PrimaryButton onClick={runOrchestrator} disabled={orchestrating}>
            {orchestrating ? <><RefreshCw size={15} className="animate-spin" />Orchestrating…</> : <><Play size={15} />Run Pipeline</>}
          </PrimaryButton>
        </>
      }
    >
      {error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="mb-6 grid gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="flex flex-col items-center justify-center p-6">
          <HealthRing score={healthScore} size={140} />
          <p className="mt-2 text-xs font-bold uppercase tracking-wide text-black/40">System Health</p>
          {audit?.recommendations?.length > 0 && (
            <p className="mt-1 max-w-[200px] text-center text-[11px] text-black/50">{audit.recommendations[0]}</p>
          )}
        </Card>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile icon={GitBranch} label="Pipeline Runs" value={runs.length} color="#3b82f6" />
          <StatTile icon={CheckCircle2} label="Completed" value={completedRuns} color="#10b981" />
          <StatTile icon={Activity} label="Running" value={runningRuns} color="#3b82f6" />
          <StatTile icon={Lock} label="Blocked" value={blockedRuns} color="#ef4444" />
          <StatTile icon={Clock} label="Paused (Approval)" value={pausedRuns} color="#f59e0b" />
          <StatTile icon={FileCheck} label="Proof Records" value={totalProofs} color="#8b5cf6" />
          <StatTile icon={ShieldCheck} label="Validation Rate" value={`${proofRate}%`} color={proofRate === 100 ? "#10b981" : "#f59e0b"} />
          <StatTile icon={Zap} label="Auto-Heals" value={audit?.auto_heal_count || 0} color="#f59e0b" />
        </div>
      </div>

      <div className="mb-6">
        <PipelineVisualizer runs={runs} />
      </div>

      {audit && (
        <Card className="mb-6 p-5">
          <h2 className="mb-3 flex items-center gap-2 font-black"><Brain size={18} className="text-[#b0a209]" />Persistent Audit Report</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div><p className="text-xs text-black/40">Steps Executed</p><p className="text-xl font-black">{audit.total_steps_executed}</p></div>
            <div><p className="text-xs text-black/40">Proofs Recorded</p><p className="text-xl font-black">{audit.total_proofs_recorded}</p></div>
            <div><p className="text-xs text-black/40">Proofs Missing</p><p className="text-xl font-black" style={{ color: audit.proofs_missing > 0 ? "#ef4444" : "#10b981" }}>{audit.proofs_missing}</p></div>
            <div><p className="text-xs text-black/40">Healed This Cycle</p><p className="text-xl font-black">{audit.healed_count || 0}</p></div>
          </div>
          {audit.recommendations?.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-black/40">Recommendations</p>
              {audit.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {rec}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <div>
          <h2 className="mb-3 font-black">Pipeline Runs</h2>
          {loading ? (
            <StatusPanel state="loading" />
          ) : runs.length === 0 ? (
            <EmptyState icon={GitBranch} title="No pipeline runs yet" description="Click Run Pipeline to start the deterministic orchestrator. Every project will be walked through all 19 states with validation and proof at each step." />
          ) : (
            <div className="space-y-2">
              {runs.slice(0, 20).map((run) => (
                <RunRow key={run.id} run={run} project={projects[run.project_id]} />
              ))}
            </div>
          )}
        </div>
        <div>
          <h2 className="mb-3 font-black">Proof Ledger</h2>
          {loading ? (
            <StatusPanel state="loading" />
          ) : proofs.length === 0 ? (
            <EmptyState icon={FileCheck} title="No proof records yet" description="Every pipeline action generates a proof record with validation results and evidence." minHeight="200px" />
          ) : (
            <div className="space-y-2">
              {proofs.slice(0, 15).map((proof) => (
                <ProofEntry key={proof.id} proof={proof} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Page>
  );
}