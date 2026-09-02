import React, { useState, useEffect, useCallback } from "react";
import { RefreshCw, Activity, AlertTriangle, CheckCircle2, Mail, Brain, TrendingUp, TrendingDown, Minus, ShieldCheck, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import { CommercialPage, BrandHeader, BackLink, IndustrialTitle, SectionHeader, Surface, StatusPill, PrimaryAction, DataRow, IconSquare } from "@/components/autoleads/CommercialMobileUI";

export default function SelfReflectionDashboard() {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [expandedLog, setExpandedLog] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.SelfReflectionLog.list('-created_date', 20);
      setLogs(data || []);
    } catch (err) {
      toast({ title: "Error loading reflections", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const runReflection = async () => {
    setRunning(true);
    toast({ title: "Reflection started", description: "Running in background — results will appear shortly." });
    try {
      await base44.functions.invoke('selfReflect', { triggered_by: 'manual' });
    } catch (err) {
      // Function takes ~3min — timeout is expected, it keeps running server-side
    }
    // Poll for the new log entry every 15s for up to 5min
    const startedAt = Date.now();
    const initialCount = logs.length;
    const poll = async () => {
      if (Date.now() - startedAt > 300000) { setRunning(false); return; }
      try {
        const data = await base44.entities.SelfReflectionLog.list('-created_date', 20);
        if ((data || []).length > initialCount) {
          setLogs(data || []);
          setRunning(false);
          toast({ title: "Self-reflection complete", description: "New cycle results are ready." });
          return;
        }
      } catch {}
      setTimeout(poll, 15000);
    };
    setTimeout(poll, 15000);
  };

  const latest = logs[0];
  const scoreTrend = logs.slice(0, 10).reverse();

  const parseJSON = (str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback; }
  };

  const ScoreTrendChart = () => {
    if (scoreTrend.length < 2) return <p className="text-sm text-black/40">Need at least 2 cycles to show trend.</p>;
    const maxScore = 100;
    const width = 320;
    const height = 100;
    const padding = 10;
    const points = scoreTrend.map((log, i) => {
      const post = parseJSON(log.post_scores || log.pre_scores || '{}', {});
      const score = post.overall ?? 0;
      const x = padding + (i / (scoreTrend.length - 1)) * (width - 2 * padding);
      const y = height - padding - (score / maxScore) * (height - 2 * padding);
      return { x, y, score, cycle: log.cycle_number };
    });
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
        <path d={path} fill="none" stroke="#FFC400" strokeWidth="2.5" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#D99D00" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" className="fill-black/50" style={{ fontSize: '9px', fontWeight: 700 }}>{p.score}</text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <CommercialPage>
      <BrandHeader />
      <BackLink to="/dashboard" label="Dashboard" />
      <IndustrialTitle eyebrow="Autonomous Self-Reflection" compact>Reflect. Fix. Evolve.</IndustrialTitle>

      {/* Run button */}
      <PrimaryAction onClick={runReflection} disabled={running} className="mb-6">
        {running ? <><RefreshCw size={20} className="animate-spin" /> Reflecting...</> : <><Sparkles size={20} /> Run Reflection Now</>}
      </PrimaryAction>

      {/* Latest cycle summary */}
      {latest ? (
        <>
          <SectionHeader title={`Latest Cycle #${latest.cycle_number || '—'}`} />
          <Surface className="mb-4 p-4">
            <div className="mb-3 flex items-center justify-between">
              <StatusPill tone={latest.status === 'completed' ? 'success' : latest.status === 'failed' ? 'danger' : 'warning'}>
                {latest.status === 'completed' ? <><CheckCircle2 size={11} /> Completed</> : latest.status === 'failed' ? <><AlertTriangle size={11} /> Failed</> : <><RefreshCw size={11} className="animate-spin" /> Running</>}
              </StatusPill>
              <span className="text-xs text-black/40">{latest.duration_seconds ? `${latest.duration_seconds}s` : ''}</span>
            </div>

            {/* Score delta */}
            {(() => {
              const pre = parseJSON(latest.pre_scores || '{}', {});
              const post = parseJSON(latest.post_scores || '{}', {});
              const delta = latest.score_delta ?? 0;
              const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
              const deltaColor = delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-black/40';
              return (
                <div className="mb-4 rounded-xl border border-black/10 bg-black/[.02] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-black/60">System Score</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-black/40">{pre.overall ?? '—'}</span>
                      <span className="text-black/30">→</span>
                      <span className="text-lg font-black">{post.overall ?? '—'}</span>
                      <span className={`flex items-center gap-0.5 text-sm font-bold ${deltaColor}`}>
                        <DeltaIcon size={15} />{delta > 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Data', val: post.data_quality },
                      { label: 'Pipeline', val: post.pipeline },
                      { label: 'Security', val: post.security },
                      { label: 'UI', val: post.ui },
                    ].map(s => (
                      <div key={s.label} className="rounded-lg bg-white p-1.5">
                        <p className="text-[9px] font-bold uppercase text-black/40">{s.label}</p>
                        <p className="text-sm font-black">{s.val ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2">
              <StatBox icon={Activity} label="Flags Created" value={latest.flags_created ?? 0} tone="warning" />
              <StatBox icon={CheckCircle2} label="Flags Fixed" value={latest.flags_fixed ?? 0} tone="success" />
              <StatBox icon={AlertTriangle} label="Flags Remaining" value={latest.flags_remaining ?? 0} tone={latest.flags_remaining > 0 ? 'danger' : 'success'} />
              <StatBox icon={Mail} label="Email Responses" value={latest.email_responses_found ?? 0} tone="info" />
            </div>
          </Surface>

          {/* LLM Analysis */}
          {latest.llm_analysis && (
            <>
              <SectionHeader title="AI Self-Reflection" />
              <Surface className="mb-4 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <IconSquare icon={Brain} tone="yellow" />
                  <p className="text-sm font-bold">Analysis</p>
                </div>
                <p className="text-sm leading-relaxed text-black/70 whitespace-pre-wrap">{latest.llm_analysis}</p>
              </Surface>
            </>
          )}

          {/* Issues & Fixes */}
          {expandedLog === latest.id ? (
            <>
              <SectionHeader title="Issues & Fixes" actionLabel="Hide" onAction={() => setExpandedLog(null)} />
              <Surface className="mb-4 p-4">
                {(() => {
                  const issues = parseJSON(latest.issues_identified || '[]', []);
                  const fixes = parseJSON(latest.fixes_applied || '[]', []);
                  return (
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase text-red-600">Issues ({issues.length})</p>
                        {issues.length === 0 ? <p className="text-sm text-black/40">No issues identified.</p> :
                          issues.map((iss, i) => <p key={i} className="text-xs text-black/60 py-0.5">• {iss.detail || iss.error || iss.phase || JSON.stringify(iss)}</p>)}
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-bold uppercase text-emerald-600">Fixes ({fixes.length})</p>
                        {fixes.length === 0 ? <p className="text-sm text-black/40">No fixes applied.</p> :
                          fixes.map((fix, i) => <p key={i} className="text-xs text-black/60 py-0.5">• {fix.detail || fix.action || fix.type || JSON.stringify(fix).slice(0, 100)}</p>)}
                      </div>
                    </div>
                  );
                })()}
              </Surface>
            </>
          ) : (
            <button onClick={() => setExpandedLog(latest.id)} className="mb-4 w-full rounded-xl border border-black/10 py-2.5 text-sm font-semibold text-black/60">
              View Issues & Fixes Details
            </button>
          )}
        </>
      ) : (
        <Surface className="mb-6 p-8 text-center">
          <ShieldCheck size={32} className="mx-auto mb-2 text-black/20" />
          <p className="text-sm text-black/40">No reflection cycles yet. Run one to get started.</p>
        </Surface>
      )}

      {/* Score Trend */}
      {logs.length > 0 && (
        <>
          <SectionHeader title="Score Trend" />
          <Surface className="mb-4 p-4">
            <ScoreTrendChart />
          </Surface>
        </>
      )}

      {/* History */}
      {logs.length > 1 && (
        <>
          <SectionHeader title="Reflection History" />
          <div className="space-y-2">
            {logs.slice(1).map(log => {
              const post = parseJSON(log.post_scores || '{}', {});
              const delta = log.score_delta ?? 0;
              return (
                <Surface key={log.id} className="p-3" onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-brand text-sm font-bold">#{log.cycle_number}</span>
                      <StatusPill tone={log.status === 'completed' ? 'success' : 'danger'}>
                        {log.status}
                      </StatusPill>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-bold">{post.overall ?? '—'}</span>
                      <span className={delta >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                        {delta > 0 ? '+' : ''}{delta}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex gap-3 text-xs text-black/40">
                    <span>{log.flags_fixed ?? 0} fixed</span>
                    <span>{log.flags_remaining ?? 0} remaining</span>
                    <span>{log.email_responses_found ?? 0} emails</span>
                  </div>
                  {expandedLog === log.id && log.llm_analysis && (
                    <p className="mt-2 border-t border-black/10 pt-2 text-xs text-black/60 whitespace-pre-wrap">{log.llm_analysis}</p>
                  )}
                </Surface>
              );
            })}
          </div>
        </>
      )}

      {loading && <p className="py-8 text-center text-sm text-black/40">Loading reflections...</p>}
    </CommercialPage>
  );
}

function StatBox({ icon: Icon, label, value, tone }) {
  const colors = {
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    danger: 'border-red-200 bg-red-50 text-red-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  };
  return (
    <div className={`rounded-xl border p-2.5 ${colors[tone] || colors.info}`}>
      <Icon size={16} className="mb-1" />
      <p className="text-xl font-black">{value}</p>
      <p className="text-[10px] font-bold uppercase opacity-70">{label}</p>
    </div>
  );
}