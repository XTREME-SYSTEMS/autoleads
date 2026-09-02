import React, { useState, useEffect } from "react";
import { Activity, AlertTriangle, Flag, Loader2, Rocket, Zap, RefreshCw, CheckCircle2, XCircle, Database, Wrench, Shield, BarChart3, MapPin, Brain } from "lucide-react";
import { base44 } from "@/api/base44Client";

const CONTROLS = [
  { group: 'Pipeline Operations', color: 'blue', items: [
    { fn: 'runAutoScrape', label: 'Auto Scrape Leads', desc: 'Scrape all sources for new opportunities', icon: Zap },
    { fn: 'runFullPipeline', label: 'Full Pipeline', desc: 'Verify → Takeoff → Estimate → Proposal', icon: Rocket },
    { fn: 'autoCleanSystem', label: 'Auto Clean', desc: 'Remove stale/duplicate/example records', icon: Database },
  ]},
  { group: 'Validation & QA', color: 'amber', items: [
    { fn: 'validationGate', label: 'Validation Gate Sweep', desc: 'Run 3-gate validation on all projects', icon: Shield },
    { fn: 'qaMonitor', label: 'QA Monitor', desc: 'Audit emails, proposals, pipeline integrity', icon: Activity },
  ]},
  { group: 'System Health', color: 'emerald', items: [
    { fn: 'runSystemAudit', label: 'System Audit', desc: 'Score system health & identify gaps', icon: BarChart3 },
    { fn: 'runDataIntegrity', label: 'Data Integrity', desc: 'Validate sources & suppress stale data', icon: Database },
    { fn: 'runAutoHeal', label: 'Auto-Heal', desc: 'Fix broken projects & harden security', icon: Wrench },
    { fn: 'runStateCoverageAudit', label: 'State Coverage Audit', desc: 'Audit all 50 states for source coverage', icon: MapPin },
    { fn: 'scoreSourceQuality', label: 'Score Source Quality', desc: 'Evaluate source precision & freshness', icon: BarChart3 },
    { fn: 'recomputeHotLeadTruth', label: 'Harden Hot Leads', desc: 'Recompute hot lead eligibility', icon: Shield },
  ]},
  { group: 'Self-Reflection', color: 'violet', items: [
    { fn: 'selfReflect', label: 'Self-Reflection Cycle', desc: 'Analyze → fix → re-score the pipeline', icon: Brain },
  ]},
];

export default function SimulationDashboard() {
  const [busy, setBusy] = useState({});
  const [results, setResults] = useState([]);
  const [scores, setScores] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const [sc, fl] = await Promise.all([
        base44.entities.SystemScore.list('-created_date', 3).catch(() => []),
        base44.entities.SystemFlag.filter({ status: 'open' }, '-created_date', 50).catch(() => []),
      ]);
      setScores(sc || []); setFlags(fl || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { loadStatus(); }, []);

  const runFn = async (fn, label) => {
    setBusy(b => ({ ...b, [fn]: true }));
    const entry = { fn: label, time: new Date().toLocaleTimeString() };
    try {
      const res = await base44.functions.invoke(fn, {});
      entry.ok = true;
      entry.data = res;
    } catch (err) {
      entry.ok = false;
      entry.error = err?.message || 'Failed';
    }
    setResults(r => [entry, ...r].slice(0, 8));
    setBusy(b => ({ ...b, [fn]: false }));
    loadStatus();
  };

  const runFullCycle = async () => {
    setBusy(b => ({ ...b, cycle: true }));
    const steps = ['runSystemAudit', 'runDataIntegrity', 'runAutoHeal', 'recomputeHotLeadTruth', 'scoreSourceQuality', 'runStateCoverageAudit'];
    for (const fn of steps) {
      try { await base44.functions.invoke(fn, {}); } catch {}
    }
    setBusy(b => ({ ...b, cycle: false }));
    loadStatus();
  };

  const latest = scores[0];
  const colorMap = { blue: 'border-blue-500/30 bg-blue-500/5', amber: 'border-amber-500/30 bg-amber-500/5', emerald: 'border-emerald-500/30 bg-emerald-500/5', violet: 'border-violet-500/30 bg-violet-500/5' };

  return (
    <div className="space-y-5">
      {/* Status bar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'System Health', value: latest?.overall_health_score ?? '—', icon: Activity, sub: latest ? `Data ${latest.data_quality_score} · Sec ${latest.security_score}` : 'No audit yet' },
          { label: 'Open Flags', value: flags.length, icon: Flag, sub: `${flags.filter(f => f.auto_fix_available).length} auto-fixable` },
          { label: 'Pipeline Score', value: latest?.pipeline_efficiency_score ?? '—', icon: Rocket, sub: 'Efficiency metric' },
          { label: 'UI Score', value: latest?.ui_completeness_score ?? '—', icon: BarChart3, sub: 'Completeness' },
        ].map(({ label, value, icon: Icon, sub }) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <Icon size={18} className="text-white/40" />
            <p className="mt-2 text-2xl font-black text-white">{value}</p>
            <p className="text-xs text-white/50">{label}</p>
            <p className="text-[10px] text-white/30">{sub}</p>
          </div>
        ))}
      </div>

      {loading && <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-white/30" size={24} /></div>}

      {/* Full cycle */}
      <div className="rounded-2xl border border-[#f2df0d]/40 bg-[#f2df0d]/5 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black"><Rocket size={20} /></span>
          <div className="flex-1">
            <p className="font-black text-white">Full Auto-Cycle</p>
            <p className="text-xs text-white/50">Analyze → Clean → Heal → Harden → Optimize → State Audit. Runs the entire self-healing pipeline in sequence.</p>
          </div>
        </div>
        <button onClick={runFullCycle} disabled={busy.cycle} className="mt-4 flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-3 text-sm font-black text-black disabled:opacity-50">
          {busy.cycle ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} Run Full Auto-Cycle
        </button>
      </div>

      {/* Control groups */}
      {CONTROLS.map(group => (
        <div key={group.group}>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-white/60">{group.group}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(({ fn, label, desc, icon: Icon }) => (
              <div key={fn} className={`rounded-xl border p-4 ${colorMap[group.color]}`}>
                <div className="flex items-start gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-white"><Icon size={18} /></span>
                  <div className="flex-1">
                    <p className="font-black text-sm text-white">{label}</p>
                    <p className="text-xs text-white/40">{desc}</p>
                  </div>
                </div>
                <button onClick={() => runFn(fn, label)} disabled={busy[fn]} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/10 disabled:opacity-50">
                  {busy[fn] ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />} Run
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Live results */}
      {results.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-wide text-white/60">Live Results</h2>
            <button onClick={() => setResults([])} className="text-xs text-white/40 hover:text-white">Clear</button>
          </div>
          <div className="space-y-2">
            {results.map((r, i) => (
              <div key={i} className={`rounded-lg border p-3 text-sm ${r.ok ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                <div className="flex items-center gap-2">
                  {r.ok ? <CheckCircle2 size={14} className="text-emerald-400" /> : <XCircle size={14} className="text-red-400" />}
                  <span className="font-black text-white">{r.fn}</span>
                  <span className="text-[10px] text-white/30">{r.time}</span>
                </div>
                {r.error && <p className="mt-1 text-xs text-red-400">{r.error}</p>}
                {r.ok && r.data && <p className="mt-1 text-xs text-white/50">{typeof r.data === 'object' ? JSON.stringify(r.data).slice(0, 200) : String(r.data).slice(0, 200)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}