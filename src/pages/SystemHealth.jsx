import React, { useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Gauge, Lightbulb, Shield, TrendingUp, Zap } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton, SectionTitle, StatusPanel } from "@/components/autoleads/UiPrimitives";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";

const SEVERITY_COLOR = {
  critical: "bg-red-50 text-red-700 border-red-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-blue-50 text-blue-700 border-blue-200",
};

const CATEGORY_LABEL = {
  stub_page: "Stub Page",
  broken_navigation: "Broken Nav",
  data_integrity: "Data Issue",
  missing_workflow: "Missing Workflow",
  non_functional_ui: "UI Issue",
  security: "Security",
  performance: "Performance",
  other: "Other",
};

function ScoreCard({ icon: Icon, label, score, color }) {
  const tone = score >= 75 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: color + "20", color }}><Icon size={20} /></span>
        <span className={`text-3xl font-black ${tone}`}>{score ?? "—"}</span>
      </div>
      <p className="mt-3 text-xs font-black uppercase tracking-wide text-black/50">{label}</p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-black/5">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(score || 0, 100)}%`, background: color }} />
      </div>
    </Card>
  );
}

export default function SystemHealth() {
  const [running, setRunning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { records: scores, loading: scoresLoading } = useEntityList("SystemScore", { sort: "-created_date", limit: 30, refreshKey });
  const { records: gaps, loading: gapsLoading } = useEntityList("SystemGap", { sort: "-created_date", limit: 50, refreshKey });
  const { records: benchmarks } = useEntityList("Benchmark", { sort: "-created_date", limit: 20, refreshKey });
  const { records: recommendations, loading: recsLoading } = useEntityList("Recommendation", { sort: "-priority", limit: 100, refreshKey });

  const recsByStatus = {
    proposed: (recommendations || []).filter(r => r.status === "proposed"),
    in_progress: (recommendations || []).filter(r => r.status === "in_progress"),
    done: (recommendations || []).filter(r => r.status === "done"),
  };

  const cycleRecStatus = async (rec) => {
    const next = rec.status === "proposed" ? "in_progress" : rec.status === "in_progress" ? "done" : "proposed";
    try { await base44.entities.Recommendation.update(rec.id, { status: next }); setRefreshKey(k => k + 1); } catch {}
  };

  const latest = (scores || [])[0];
  const openGaps = (gaps || []).filter(g => g.status === "open");

  // Parse recursive audit breakdown for extra dimensions
  let extraScores = { user_experience: null, completeness: null };
  try {
    if (latest?.score_breakdown) {
      const bd = JSON.parse(latest.score_breakdown);
      if (bd.user_experience != null) extraScores.user_experience = bd.user_experience;
      if (bd.completeness != null) extraScores.completeness = bd.completeness;
    }
  } catch {}

  const chartData = (scores || []).slice(0, 20).reverse().map((s, i) => ({
    run: i + 1,
    overall: s.overall_health_score,
    data: s.data_quality_score,
    pipeline: s.pipeline_efficiency_score,
    security: s.security_score,
    ui: s.ui_completeness_score,
  }));

  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState(null);
  const [recursiveRunning, setRecursiveRunning] = useState(false);
  const [recursiveResult, setRecursiveResult] = useState(null);

  const runNow = async () => {
    setRunning(true);
    try {
      await base44.functions.invoke("runSystemAudit", {});
      await base44.functions.invoke("runDataIntegrity", {});
      await base44.functions.invoke("runAutoHeal", {});
      await base44.functions.invoke("runUiAudit", {});
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert("Audit failed: " + (e?.message || "try again"));
    } finally { setRunning(false); }
  };

  const fixAndSeal = async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const integrity = await base44.functions.invoke("runDataIntegrity", {});
      const heal = await base44.functions.invoke("runAutoHeal", {});
      await base44.functions.invoke("runSystemAudit", {});
      setFixResult({
        purged: (integrity?.purged || 0) + (heal?.purged || 0),
        fixed: heal?.fixed || 0,
        hardened: heal?.hardened || 0,
        optimized: heal?.optimized || 0,
        enriched: integrity?.enriched || 0,
      });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert("Fix & Heal failed: " + (e?.message || "try again"));
    } finally { setFixing(false); }
  };

  const runRecursiveAudit = async () => {
    setRecursiveRunning(true);
    setRecursiveResult(null);
    try {
      const result = await base44.functions.invoke("runRecursiveAudit", {});
      setRecursiveResult(result);
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert("Recursive audit failed: " + (e?.message || "try again"));
    } finally { setRecursiveRunning(false); }
  };

  return (
    <Page backTo="/dashboard" eyebrow="Autonomous System" title="System Health" description="Self-reflection, scoring, benchmarking, and self-healing — runs automatically every 2 hours."
      actions={<><SecondaryButton onClick={runNow} disabled={running || fixing || recursiveRunning}>{running ? "Running…" : "Run Audit"}</SecondaryButton><SecondaryButton onClick={runRecursiveAudit} disabled={running || fixing || recursiveRunning}>{recursiveRunning ? "Auditing…" : "Recursive Deep Audit"}</SecondaryButton><PrimaryButton onClick={fixAndSeal} disabled={running || fixing || recursiveRunning}>{fixing ? "Healing…" : "Fix & Heal"}</PrimaryButton></>}>

      {fixResult && (
        <Card className="mb-5 border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span className="text-sm font-black text-emerald-800">Fix & Heal complete</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs font-bold text-emerald-700">
            <span>{fixResult.fixed} fixed</span>
            <span>{fixResult.hardened} hardened</span>
            <span>{fixResult.optimized} optimized</span>
            <span>{fixResult.enriched} enriched</span>
            <span>{fixResult.purged} purged</span>
          </div>
        </Card>
      )}

      {recursiveResult && (
        <Card className={`mb-5 p-5 ${recursiveResult.achieved_100 ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {recursiveResult.achieved_100 ? <CheckCircle2 size={20} className="text-emerald-600" /> : <AlertTriangle size={20} className="text-amber-600" />}
              <span className="text-sm font-black text-emerald-800">Recursive Deep Audit — {recursiveResult.achieved_100 ? "100/100 ACHIEVED" : `${recursiveResult.final_score}/100`}</span>
            </div>
            <span className="text-xs font-bold text-black/50">{recursiveResult.iterations_run} iteration{recursiveResult.iterations_run !== 1 ? "s" : ""} · {recursiveResult.total_tests} tests · {recursiveResult.total_fixes_applied} fixes</span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Data Quality", val: recursiveResult.final_scores?.data_quality },
              { label: "Pipeline", val: recursiveResult.final_scores?.pipeline },
              { label: "Security", val: recursiveResult.final_scores?.security },
              { label: "UI", val: recursiveResult.final_scores?.ui },
              { label: "User Exp", val: recursiveResult.final_scores?.user_experience },
              { label: "Completeness", val: recursiveResult.final_scores?.completeness },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-black/10 bg-white p-3 text-center">
                <p className="text-2xl font-black text-emerald-600">{s.val ?? "—"}</p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-black/40">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {(recursiveResult.iteration_logs || []).map(log => (
              <div key={log.iteration} className="rounded-lg border border-black/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wide text-black/50">Iteration {log.iteration}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${log.scores.overall === 100 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{log.scores.overall}/100</span>
                </div>
                <p className="mt-2 text-xs leading-5 text-black/70">{log.reflection}</p>
                <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-bold text-black/50">
                  <span className="text-emerald-600">{log.test_summary.pass} pass</span>
                  <span className="text-amber-600">{log.test_summary.warn} warn</span>
                  <span className="text-red-600">{log.test_summary.fail} fail</span>
                  {log.fixes.length > 0 && <span className="text-blue-600">{log.fixes.length} fixes applied</span>}
                </div>
                {log.fixes.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {log.fixes.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-1.5 text-[11px] text-black/60">
                        <CheckCircle2 size={12} className="mt-0.5 shrink-0 text-emerald-500" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {scoresLoading ? <StatusPanel state="loading" /> : !latest ? (
        <Card><EmptyState icon={Activity} title="No audit runs yet" description="The System Autopilot runs every 2 hours. Run an audit now to see scores." action={<PrimaryButton onClick={runNow} disabled={running}>Run First Audit</PrimaryButton>} minHeight="300px" /></Card>
      ) : (
        <>
          {/* Score Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            <ScoreCard icon={Gauge} label="Overall" score={latest.overall_health_score} color="#0b0b0b" />
            <ScoreCard icon={Activity} label="Data Quality" score={latest.data_quality_score} color="#3b82f6" />
            <ScoreCard icon={TrendingUp} label="Pipeline" score={latest.pipeline_efficiency_score} color="#8b5cf6" />
            <ScoreCard icon={Shield} label="Security" score={latest.security_score} color="#10b981" />
            <ScoreCard icon={Zap} label="UI Complete" score={latest.ui_completeness_score} color="#f59e0b" />
            <ScoreCard icon={Lightbulb} label="User Exp" score={extraScores.user_experience} color="#ec4899" />
            <ScoreCard icon={CheckCircle2} label="Completeness" score={extraScores.completeness} color="#6366f1" />
          </div>

          {/* Benchmark Rank + Open Gaps */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-black/50"><TrendingUp size={18} /><span className="text-xs font-black uppercase tracking-wide">Benchmark Rank</span></div>
              <p className="mt-3 text-2xl font-black">{latest.benchmark_rank || "Not ranked"}</p>
              <p className="mt-1 text-sm text-black/40">{(benchmarks || []).length} competitors indexed</p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-black/50"><AlertTriangle size={18} /><span className="text-xs font-black uppercase tracking-wide">Open System Gaps</span></div>
              <p className="mt-3 text-2xl font-black">{openGaps.length}</p>
              <p className="mt-1 text-sm text-black/40">{openGaps.length === 0 ? "All clear" : "Needs attention"}</p>
            </Card>
          </div>

          {/* Score History Chart */}
          <div className="mt-5">
            <SectionTitle title="Score History" />
            <Card className="p-5">
              {chartData.length < 2 ? (
                <p className="py-8 text-center text-sm text-black/40">Need at least 2 audit runs to show a trend.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                    <XAxis dataKey="run" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="overall" stroke="#0b0b0b" strokeWidth={2.5} name="Overall" />
                    <Line type="monotone" dataKey="data" stroke="#3b82f6" strokeWidth={1.5} name="Data" />
                    <Line type="monotone" dataKey="pipeline" stroke="#8b5cf6" strokeWidth={1.5} name="Pipeline" />
                    <Line type="monotone" dataKey="security" stroke="#10b981" strokeWidth={1.5} name="Security" />
                    <Line type="monotone" dataKey="ui" stroke="#f59e0b" strokeWidth={1.5} name="UI" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          {/* Recommendations Roadmap */}
          <div className="mt-5">
            <SectionTitle title="Recommendations Roadmap" action={<span className="text-xs text-black/40">{recsByStatus.proposed.length} proposed · {recsByStatus.in_progress.length} in progress · {recsByStatus.done.length} done</span>} />
            {recsLoading ? <StatusPanel state="loading" /> : (recommendations || []).length === 0 ? (
              <Card><EmptyState icon={Lightbulb} title="No recommendations yet" description="Recommendations from system audits appear here." minHeight="180px" /></Card>
            ) : (
              <div className="space-y-2">
                {(recommendations || []).slice(0, 30).map(r => {
                  const statusTone = r.status === "done" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : r.status === "in_progress" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-black/[.03] text-black/50 border-black/10";
                  const prioTone = r.priority === "critical" ? "bg-red-50 text-red-700 border-red-200" : r.priority === "high" ? "bg-orange-50 text-orange-700 border-orange-200" : r.priority === "medium" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200";
                  return (
                    <Card key={r.id} className="flex items-start gap-3 p-4">
                      <button onClick={() => cycleRecStatus(r)} className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase transition hover:opacity-70 ${statusTone}`}>
                        {r.status === "in_progress" ? "in progress" : r.status}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black">{r.title}</p>
                          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-black uppercase ${prioTone}`}>{r.priority}</span>
                        </div>
                        {r.description && <p className="mt-0.5 text-xs text-black/50">{r.description}</p>}
                        {r.impact && <p className="mt-1 text-[11px] font-bold text-[#b0a209]">Impact: {r.impact}</p>}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* System Gaps */}
          <div className="mt-5">
            <SectionTitle title="System Gaps" action={<span className="text-xs text-black/40">{openGaps.length} open</span>} />
            {gapsLoading ? <StatusPanel state="loading" /> : openGaps.length === 0 ? (
              <Card><EmptyState icon={CheckCircle2} title="No open gaps" description="The system is healthy — all checks passed." minHeight="180px" /></Card>
            ) : (
              <div className="space-y-2">
                {openGaps.slice(0, 20).map(g => (
                  <Card key={g.id} className="flex items-start gap-3 p-4">
                    <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${SEVERITY_COLOR[g.severity] || SEVERITY_COLOR.low}`}>
                      {g.severity}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black">{g.title}</p>
                      <p className="mt-0.5 text-xs text-black/50">{g.description}</p>
                      <span className="mt-1 inline-block text-[10px] font-bold text-black/35">{CATEGORY_LABEL[g.category] || g.category}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </Page>
  );
}