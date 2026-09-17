import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import {
  Activity, ShieldCheck, Database, GitBranch, Monitor, Users, CheckCircle,
  AlertTriangle, XCircle, Loader2, RefreshCw, TrendingUp, Target, Zap, FileCheck
} from "lucide-react";
import { Page, Card, PrimaryButton, SecondaryButton, EmptyState } from "@/components/autoleads/UiPrimitives";

const AUDIT_FUNCTIONS = [
  { key: "recursive", name: "Recursive Audit", fn: "runRecursiveAudit", icon: RefreshCw, color: "#f2df0d" },
  { key: "system", name: "System Audit", fn: "runSystemAudit", icon: ShieldCheck, color: "#10b981" },
  { key: "ui", name: "UI Audit", fn: "runUiAudit", icon: Monitor, color: "#3b82f6" },
  { key: "critic", name: "Critic Review", fn: "runCriticReview", icon: AlertTriangle, color: "#f59e0b" },
  { key: "regression", name: "Regression Tests", fn: "runRegressionTests", icon: FileCheck, color: "#8b5cf6" },
  { key: "integrity", name: "Data Integrity", fn: "runDataIntegrity", icon: Database, color: "#ec4899" },
];

function ScoreRing({ score, size = 120 }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 90 ? "#10b981" : score >= 75 ? "#f2df0d" : score >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-2xl font-black" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max = 100 }) {
  const pct = Math.round((value / max) * 100);
  const color = pct >= 90 ? "bg-emerald-500" : pct >= 75 ? "bg-[#f2df0d]" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold capitalize text-black/60">{label.replace(/_/g, " ")}</span>
        <span className="font-black">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-black/10">
        <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SystemValidationDashboard() {
  const [results, setResults] = useState({});
  const [running, setRunning] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  const loadHistory = useCallback(async () => {
    try {
      const scores = await base44.entities.SystemScore.list("-created_date", 20);
      setHistory(scores || []);
    } catch {}
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const runAudit = async (key, fn) => {
    setRunning(key);
    setError("");
    try {
      const res = await base44.functions.invoke(fn, {});
      setResults(prev => ({ ...prev, [key]: { data: res, timestamp: new Date().toISOString() } }));
    } catch (e) {
      setError(e.message || `Failed to run ${fn}`);
    } finally { setRunning(null); }
  };

  const runAll = async () => {
    for (const audit of AUDIT_FUNCTIONS) {
      await runAudit(audit.key, audit.fn);
    }
  };

  const recursiveData = results.recursive?.data;
  const systemData = results.system?.data;
  const uiData = results.ui?.data;
  const criticData = results.critic?.data;
  const regressionData = results.regression?.data;
  const integrityData = results.integrity?.data;

  const overallScore = recursiveData?.final_score ?? systemData?.overall ?? 0;

  return (
    <Page
      title="System Validation Dashboard"
      eyebrow="Forensic Audit"
      description="Deep forensic audit and recursive sweep across all system dimensions. Run all audits to identify weaknesses, fix them, and track growth toward 90%+."
      actions={
        <>
          <SecondaryButton onClick={loadHistory} disabled={running === "history"}>
            {running === "history" ? <Loader2 size={15} className="animate-spin" /> : <TrendingUp size={15} />}Load History
          </SecondaryButton>
          <PrimaryButton onClick={runAll} disabled={!!running}>
            {running ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            {running ? `Running ${running}…` : "Run All Audits"}
          </PrimaryButton>
        </>
      }
    >
      {/* Overall Score Hero */}
      <Card className="mb-6 overflow-hidden">
        <div className="grid gap-6 p-6 sm:grid-cols-[auto_1fr]">
          <div className="flex flex-col items-center justify-center">
            <ScoreRing score={overallScore} size={140} />
            <p className="mt-2 text-xs font-black uppercase tracking-wide text-black/40">Overall Score</p>
            <span className={`mt-1 rounded-full px-3 py-0.5 text-[11px] font-black ${
              overallScore >= 90 ? "bg-emerald-50 text-emerald-700" :
              overallScore >= 75 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
            }`}>
              {overallScore >= 90 ? "TARGET MET" : `${90 - overallScore} pts to 90%`}
            </span>
          </div>
          <div>
            <h2 className="mb-4 text-lg font-black">Score Breakdown</h2>
            {recursiveData?.final_scores ? (
              <div className="grid gap-x-6 sm:grid-cols-2">
                {Object.entries(recursiveData.final_scores).map(([k, v]) => (
                  k !== "overall" && <ScoreBar key={k} label={k} value={v} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-black/40">Run the Recursive Audit to see score breakdown.</p>
            )}
            {recursiveData && (
              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <span className="rounded-lg bg-black/5 px-3 py-1.5 font-bold">
                  Iterations: {recursiveData.iterations_run}
                </span>
                <span className="rounded-lg bg-black/5 px-3 py-1.5 font-bold">
                  Tests: {recursiveData.total_tests}
                </span>
                <span className="rounded-lg bg-black/5 px-3 py-1.5 font-bold">
                  Fixes Applied: {recursiveData.total_fixes_applied}
                </span>
                {recursiveData.achieved_100 && (
                  <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-bold text-emerald-700">
                    ✓ Perfect Score
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </Card>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Audit Cards Grid */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AUDIT_FUNCTIONS.map(audit => {
          const res = results[audit.key]?.data;
          const isRunning = running === audit.key;
          const Icon = audit.icon;
          let score = null;
          let summary = "";
          if (audit.key === "recursive" && res?.final_score != null) { score = res.final_score; summary = `${res.total_tests} tests, ${res.total_fixes_applied} fixes`; }
          else if (audit.key === "system" && res?.overall != null) { score = res.overall; summary = res.benchmark_rank || ""; }
          else if (audit.key === "ui" && res?.uiScore != null) { score = res.uiScore; summary = `${res.pagesWithData}/${res.totalRoutes} pages with data`; }
          else if (audit.key === "critic" && res?.results?.length > 0) { score = Math.round(res.results.reduce((a, r) => a + r.avg_score, 0) / res.results.length); summary = `${res.results[0].flags_created} flags created`; }
          else if (audit.key === "regression" && res?.total != null) { score = Math.round((res.passed / res.total) * 100); summary = `${res.passed}/${res.total} passed`; }
          else if (audit.key === "integrity" && res?.validated != null) { score = res.validated > 0 ? 85 : 0; summary = `${res.validated} validated, ${res.incomplete} incomplete`; }

          return (
            <Card key={audit.key} className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${audit.color}20`, color: audit.color }}>
                    <Icon size={18} />
                  </span>
                  <h3 className="text-sm font-black">{audit.name}</h3>
                </div>
                {score != null && (
                  <span className={`text-lg font-black ${
                    score >= 90 ? "text-emerald-600" : score >= 75 ? "text-[#b0a209]" : score >= 50 ? "text-amber-600" : "text-red-500"
                  }`}>{score}</span>
                )}
              </div>
              {isRunning ? (
                <div className="flex items-center gap-2 py-4 text-sm text-black/40">
                  <Loader2 size={15} className="animate-spin" /> Running…
                </div>
              ) : res ? (
                <div>
                  <p className="text-xs text-black/50">{summary}</p>
                  {audit.key === "critic" && res.results?.[0]?.top_issues && (
                    <ul className="mt-2 space-y-1">
                      {res.results[0].top_issues.slice(0, 3).map((issue, i) => (
                        <li key={i} className="flex gap-1.5 text-[11px] text-black/60">
                          <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-500" />{issue}
                        </li>
                      ))}
                    </ul>
                  )}
                  {audit.key === "recursive" && res.iteration_logs && (
                    <div className="mt-2 space-y-1">
                      {res.iteration_logs.map((log, i) => (
                        <div key={i} className="flex items-center gap-2 text-[11px] text-black/50">
                          <span className="font-bold">Iter {log.iteration}:</span>
                          <span>{log.test_summary.pass}✓ {log.test_summary.warn}⚠ {log.test_summary.fail}✗</span>
                          {log.fixes.length > 0 && <span className="text-emerald-600">+{log.fixes.length} fixes</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => runAudit(audit.key, audit.fn)} className="text-xs font-bold text-[#b0a209] hover:underline">
                  Run audit →
                </button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Iteration History */}
      {recursiveData?.iteration_logs && (
        <Card className="mb-6 p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-black/40">Recursive Iteration Log</h2>
          <div className="space-y-3">
            {recursiveData.iteration_logs.map((log, i) => (
              <div key={i} className="rounded-lg border border-black/10 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-black">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f2df0d] text-xs">{log.iteration}</span>
                    Iteration {log.iteration}
                  </span>
                  <span className="text-2xl font-black">{log.scores.overall}</span>
                </div>
                <p className="mb-2 text-xs text-black/50">{log.reflection}</p>
                {log.fixes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {log.fixes.map((fix, j) => (
                      <span key={j} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                        ✓ {fix}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Score History Chart */}
      {history.length > 0 && (
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-black/40">Score History (Last 20 Runs)</h2>
          <div className="flex items-end gap-1 overflow-x-auto" style={{ height: 120 }}>
            {history.slice(0, 20).reverse().map((s, i) => (
              <div key={s.id || i} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: 30 }}>
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max(2, (s.overall_health_score || 0) * 1)}px`,
                    background: (s.overall_health_score || 0) >= 90 ? "#10b981" : (s.overall_health_score || 0) >= 75 ? "#f2df0d" : "#f59e0b",
                  }}
                  title={`Score: ${s.overall_health_score}`}
                />
                <span className="text-[9px] font-bold text-black/40">{s.overall_health_score}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Regression Test Details */}
      {regressionData?.results && (
        <Card className="mt-6 p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-black/40">
            Regression Tests ({regressionData.passed}/{regressionData.total} passed)
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {regressionData.results.map((t, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border border-black/5 p-2.5">
                {t.passed ? <CheckCircle size={15} className="mt-0.5 shrink-0 text-emerald-500" /> : <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />}
                <div>
                  <p className="text-xs font-bold">{t.name}</p>
                  <p className="text-[11px] text-black/40">{t.details}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Page>
  );
}