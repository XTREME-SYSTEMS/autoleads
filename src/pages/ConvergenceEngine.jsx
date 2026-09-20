import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Page, PrimaryButton, Card, EmptyState, StatusPanel } from "@/components/autoleads/UiPrimitives";
import { ShieldCheck, ShieldAlert, PlayCircle, CheckCircle2, XCircle, Gauge, Bug, Activity } from "lucide-react";

const severityColor = (s) => ({ P0: "bg-red-100 text-red-700", P1: "bg-amber-100 text-amber-700", P2: "bg-blue-100 text-blue-700", P3: "bg-gray-100 text-gray-600" }[s] || "bg-gray-100 text-gray-600");

export default function ConvergenceEngine() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    setLoading(true); setError(null); setData(null);
    try {
      const res = await base44.functions.invoke("convergenceEngine", {});
      setData(res);
    } catch (e) {
      setError(e?.message || "Convergence run failed");
    } finally {
      setLoading(false);
    }
  };

  const certified = data?.certified;
  const r = data?.broken_twin_receipt;
  const sc = data?.scorecard;

  return (
    <Page
      title="XTREME Convergence Engine"
      eyebrow="Autonomous Convergence System v1.0.0"
      description="Deterministic DISCOVER → MODEL → AUDIT → SCORE → DIAGNOSE → PLAN → REPAIR → TEST → VALIDATE → HARDEN → OPTIMIZE → CHAOS TEST → RESCORE → VERIFIED_100. Runs the 40-fault Broken Twin proof, self-tests the validator, and certifies the package."
      actions={<PrimaryButton onClick={run} disabled={loading}><PlayCircle size={16}/> {loading ? "Converging…" : "Run Convergence Proof"}</PrimaryButton>}
    >
      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {!data && !loading && !error && (
        <EmptyState icon={ShieldCheck} title="No convergence run yet" description="Run the Broken Twin proof to test, score, and validate the convergence engine. The engine must detect, repair, and independently validate all 40 seeded faults with zero false VERIFIED states." action={<PrimaryButton onClick={run}><PlayCircle size={16}/> Run Convergence Proof</PrimaryButton>} />
      )}

      {loading && <StatusPanel state="loading" />}

      {data && !loading && (
        <div className="space-y-5">
          {/* Certification banner */}
          <Card className="p-5">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                {certified ? <ShieldCheck size={40} className="text-emerald-600" /> : <ShieldAlert size={40} className="text-red-600" />}
                <div>
                  <p className="text-xs font-black uppercase tracking-[.18em] text-muted-foreground">Certification State</p>
                  <p className={`text-2xl font-black ${certified ? "text-emerald-600" : "text-red-600"}`}>{data.certification_state}</p>
                  <p className="text-xs text-muted-foreground">Boolean evidence state — not a weighted average. A single mandatory FAIL/UNKNOWN/BLOCKED blocks certification.</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-muted-foreground">Final Diagnostic Score</p>
                <p className="text-5xl font-black tabular-nums">{sc?.final_score}</p>
                <p className="text-xs text-muted-foreground">from {sc?.initial_score} initial · {sc?.elapsed_ms}ms</p>
              </div>
            </div>
          </Card>

          {/* Scorecard metrics */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Injected", value: sc?.injected, icon: Bug },
              { label: "Detected", value: sc?.detected, icon: Bug },
              { label: "Repaired", value: sc?.repaired, icon: CheckCircle2 },
              { label: "Validated", value: sc?.validated, icon: ShieldCheck },
              { label: "False VERIFIED", value: sc?.false_verified, icon: XCircle },
              { label: "Critical Missed", value: sc?.critical_missed, icon: XCircle },
            ].map((m) => (
              <Card key={m.label} className="p-4">
                <m.icon size={18} className="text-muted-foreground" />
                <p className="mt-2 text-2xl font-black tabular-nums">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Self-tests */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-black">Validator Self-Tests</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${data.self_tests.failed === 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{data.self_tests.passed} passed · {data.self_tests.failed} failed</span>
              </div>
              <div className="divide-y divide-border">
                {data.self_tests.results.map((t) => (
                  <div key={t.name} className="flex items-start gap-2 py-2">
                    {t.passed ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" /> : <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />}
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{t.name}</p>
                      {!t.passed && <p className="text-xs text-red-600">expected: {t.expected} · actual: {t.actual}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Package acceptance */}
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-black">Package Acceptance</h2>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${data.package_acceptance.all_pass ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{data.package_acceptance.all_pass ? "COMPLETE" : "INCOMPLETE"}</span>
              </div>
              <div className="divide-y divide-border">
                {data.package_acceptance.items.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 py-2">
                    {a.status === "PASS" ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : <XCircle size={16} className="shrink-0 text-red-600" />}
                    <span className="text-xs font-mono text-muted-foreground">{a.id}</span>
                    <span className="text-sm">{a.label}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Progress ledger */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-black">Convergence Progress Ledger</h2>
              <span className="text-xs text-muted-foreground">{r?.progress_ledger?.length} cycles · seed {r?.seed}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pr-3">#</th>
                    <th className="py-2 pr-3">Fingerprint</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Sev</th>
                    <th className="py-2 pr-3">Repair Path</th>
                    <th className="py-2 pr-3">Validator</th>
                    <th className="py-2 pr-3 text-right">Score</th>
                    <th className="py-2 pr-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {r?.progress_ledger?.map((e) => (
                    <tr key={e.cycle} className="border-b border-border/50">
                      <td className="py-2 pr-3 tabular-nums text-muted-foreground">{e.cycle}</td>
                      <td className="py-2 pr-3 font-mono text-xs">{e.fingerprint_id}</td>
                      <td className="py-2 pr-3">{e.category}</td>
                      <td className="py-2 pr-3"><span className={`rounded px-1.5 py-0.5 text-xs font-bold ${severityColor(e.severity)}`}>{e.severity}</span></td>
                      <td className="py-2 pr-3 text-muted-foreground">{e.repair_path}</td>
                      <td className="py-2 pr-3 text-muted-foreground">{e.validator}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{e.score_before} → <span className="font-bold">{e.score_after}</span></td>
                      <td className="py-2 pr-3"><span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-700">{e.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}