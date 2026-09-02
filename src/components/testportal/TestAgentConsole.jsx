import React, { useState } from "react";
import { Bot, Loader2, Play, Terminal, CheckCircle2, XCircle, FlaskConical, Bug, Rocket, Shield, Database, Brain, Activity, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

const AGENT_FUNCTIONS = [
  { group: 'Test & Simulation', icon: FlaskConical, color: 'violet', items: [
    { fn: 'runUserTest', label: 'User Test', desc: 'Run end-to-end user simulation' },
    { fn: 'runRegressionTests', label: 'Regression Tests', desc: 'Run full regression test suite' },
    { fn: 'runAsyncLoadTest', label: 'Async Load Test', desc: 'Queue async load test batches' },
    { fn: 'tenantIsolationTest', label: 'Tenant Isolation Test', desc: 'Verify multi-tenant data isolation' },
    { fn: 'stripeReplayTest', label: 'Stripe Replay Test', desc: 'Replay Stripe webhook events' },
    { fn: 'rollbackTest', label: 'Rollback Test', desc: 'Test data rollback procedures' },
  ]},
  { group: 'Pipeline Agent', icon: Rocket, color: 'blue', items: [
    { fn: 'runAutoScrape', label: 'Auto Scrape', desc: 'Scrape all sources for leads' },
    { fn: 'runFullPipeline', label: 'Full Pipeline', desc: 'Verify → Takeoff → Estimate → Proposal' },
    { fn: 'autoTakeoff', label: 'Auto Takeoff', desc: 'Generate takeoffs from specs' },
    { fn: 'autoProposals', label: 'Auto Proposals', desc: 'Generate proposal drafts' },
    { fn: 'autoFollowUp', label: 'Auto Follow-Up', desc: 'Send follow-up emails' },
    { fn: 'autoCleanSystem', label: 'Auto Clean', desc: 'Clean stale/duplicate records' },
  ]},
  { group: 'Validation Agent', icon: Shield, color: 'amber', items: [
    { fn: 'validationGate', label: 'Validation Gate Sweep', desc: '3-gate validation on all projects' },
    { fn: 'qaMonitor', label: 'QA Monitor', desc: 'Audit emails, proposals, pipeline' },
    { fn: 'validateTakeoff', label: 'Validate Takeoff', desc: 'Validate takeoff accuracy' },
    { fn: 'validateBidPackage', label: 'Validate Bid Package', desc: 'Validate bid package completeness' },
    { fn: 'enforceTakeoffEvidence', label: 'Enforce Takeoff Evidence', desc: 'Ensure takeoff evidence exists' },
  ]},
  { group: 'System Agent', icon: Activity, color: 'emerald', items: [
    { fn: 'runSystemAudit', label: 'System Audit', desc: 'Score system health' },
    { fn: 'runDataIntegrity', label: 'Data Integrity', desc: 'Validate data sources' },
    { fn: 'runAutoHeal', label: 'Auto-Heal', desc: 'Fix broken projects' },
    { fn: 'runStateCoverageAudit', label: 'State Coverage', desc: 'Audit 50-state coverage' },
    { fn: 'scoreSourceQuality', label: 'Source Quality', desc: 'Score source precision' },
    { fn: 'recomputeHotLeadTruth', label: 'Harden Hot Leads', desc: 'Recompute eligibility' },
    { fn: 'canonicalizeProjects', label: 'Canonicalize', desc: 'Deduplicate projects' },
    { fn: 'runRecursiveAudit', label: 'Recursive Audit', desc: 'Deep forensic audit' },
  ]},
  { group: 'Reflection Agent', icon: Brain, color: 'violet', items: [
    { fn: 'selfReflect', label: 'Self-Reflection', desc: 'Analyze → fix → re-score pipeline' },
    { fn: 'trackBidOutcomes', label: 'Track Bid Outcomes', desc: 'Record win/loss outcomes' },
    { fn: 'runTakeoffBenchmark', label: 'Takeoff Benchmark', desc: 'Benchmark takeoff accuracy' },
    { fn: 'runBenchmarkResearch', label: 'Benchmark Research', desc: 'Research pricing benchmarks' },
  ]},
];

const COLOR_CLASSES = {
  violet: 'border-violet-500/30 bg-violet-500/5',
  blue: 'border-blue-500/30 bg-blue-500/5',
  amber: 'border-amber-500/30 bg-amber-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
};

export default function TestAgentConsole() {
  const [busy, setBusy] = useState({});
  const [log, setLog] = useState([]);

  const runAgent = async (fn, label) => {
    setBusy(b => ({ ...b, [fn]: true }));
    const entry = { fn: label, time: new Date().toLocaleTimeString(), status: 'running' };
    setLog(l => [entry, ...l].slice(0, 15));
    try {
      const res = await base44.functions.invoke(fn, {});
      entry.status = 'success';
      entry.data = res;
    } catch (err) {
      entry.status = 'error';
      entry.error = err?.message || 'Failed';
    }
    setLog(l => l.map(e => e === entry ? { ...entry } : e));
    setBusy(b => ({ ...b, [fn]: false }));
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-[#f2df0d]/40 bg-[#f2df0d]/5 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f2df0d] text-black"><Bot size={24} /></span>
          <div className="flex-1">
            <p className="font-black text-white">Test Agent Console — Live System</p>
            <p className="text-xs text-white/50">This tab connects to the <span className="text-[#f2df0d]">actual AUTOLEADS system</span>. All operations run real backend functions against live data.</p>
          </div>
        </div>
      </div>

      {/* Agent function groups */}
      {AGENT_FUNCTIONS.map(group => (
        <div key={group.group}>
          <div className="mb-3 flex items-center gap-2">
            <group.icon size={16} className="text-white/60" />
            <h2 className="text-sm font-black uppercase tracking-wide text-white/60">{group.group}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(({ fn, label, desc }) => (
              <div key={fn} className={`rounded-xl border p-4 ${COLOR_CLASSES[group.color]}`}>
                <div className="flex-1">
                  <p className="font-black text-sm text-white">{label}</p>
                  <p className="text-xs text-white/40">{desc}</p>
                </div>
                <button onClick={() => runAgent(fn, label)} disabled={busy[fn]} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20 disabled:opacity-50">
                  {busy[fn] ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} Execute
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Live console log */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Terminal size={16} className="text-white/60" />
          <h2 className="text-sm font-black uppercase tracking-wide text-white/60">Agent Log</h2>
          {log.length > 0 && <button onClick={() => setLog([])} className="ml-auto text-xs text-white/40 hover:text-white">Clear</button>}
        </div>
        <div className="rounded-xl border border-white/10 bg-black/40 p-4 font-mono">
          {log.length === 0 ? (
            <p className="text-xs text-white/30">$ awaiting agent commands...</p>
          ) : (
            <div className="space-y-1.5">
              {log.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className="text-white/30">[{e.time}]</span>
                  {e.status === 'running' && <Loader2 size={12} className="mt-0.5 animate-spin text-amber-400" />}
                  {e.status === 'success' && <CheckCircle2 size={12} className="mt-0.5 text-emerald-400" />}
                  {e.status === 'error' && <XCircle size={12} className="mt-0.5 text-red-400" />}
                  <span className="font-bold text-white">{e.fn}</span>
                  {e.status === 'running' && <span className="text-amber-400">running...</span>}
                  {e.status === 'error' && <span className="text-red-400">→ {e.error}</span>}
                  {e.status === 'success' && e.data && <span className="text-emerald-400/60">→ {JSON.stringify(e.data).slice(0, 120)}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}