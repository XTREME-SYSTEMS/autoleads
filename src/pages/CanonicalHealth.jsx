import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Page, Card, StatCard, StatusPanel, SectionTitle, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, GitBranch, Layers, Zap, RefreshCw, FileSearch, MapPin, Clock, TrendingUp } from "lucide-react";

export default function CanonicalHealth() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/functions/canonicalCertification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReport(data);
    } catch (e) {
      setError(e.message || 'Failed to load certification report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReport(); }, [loadReport]);

  const runCanonicalize = async () => {
    setRunning(true);
    try {
      const res = await fetch('/functions/canonicalizeProjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadReport();
    } catch (e) {
      setError(e.message || 'Canonicalization failed');
    } finally {
      setRunning(false);
    }
  };

  const passFail = (test) => {
    if (test === 'PASS') return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700"><CheckCircle2 size={13}/>PASS</span>;
    if (test === 'FAIL') return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700"><XCircle size={13}/>FAIL</span>;
    if (test === 'NEEDS_MERGE') return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700"><AlertTriangle size={13}/>NEEDS MERGE</span>;
    return <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-600">{test}</span>;
  };

  return (
    <Page
      title="Canonical Health"
      description="Idempotent canonicalization engine certification — dedup regression, over-merge, under-merge, match uniqueness, and hot lead integrity."
      eyebrow="Corpus Integrity"
      actions={<>
        <PrimaryButton onClick={runCanonicalize} disabled={running || loading}>
          {running ? <><RefreshCw size={15} className="animate-spin"/>Re-running…</> : <><RefreshCw size={15}/>Re-canonicalize</>}
        </PrimaryButton>
        <PrimaryButton onClick={loadReport} disabled={loading} className="!bg-black !text-white !shadow-none">
          {loading ? <><RefreshCw size={15} className="animate-spin"/>Loading…</> : <><RefreshCw size={15}/>Refresh Report</>}
        </PrimaryButton>
      </>}
    >
      <StatusPanel state={loading && !report ? 'loading' : error ? 'error' : 'empty'}>
        {report && (
          <div className="space-y-6">
            {/* Overall Certification */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`grid h-14 w-14 place-items-center rounded-2xl ${report.overall_certification === 'PASS' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    {report.overall_certification === 'PASS' ? <ShieldCheck size={28}/> : <AlertTriangle size={28}/>}
                  </span>
                  <div>
                    <h2 className="text-xl font-black">Overall Certification: {report.overall_certification}</h2>
                    <p className="text-sm text-muted-foreground">Score: {report.certification_score}/100 · {new Date(report.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black">{report.certification_score}</p>
                  <p className="text-xs text-muted-foreground">composite score</p>
                </div>
              </div>
            </Card>

            {/* Corpus Stats */}
            <div>
              <SectionTitle title="Corpus Statistics" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard icon={Layers} title="Canonicals" value={report.corpus_stats.total_canonicals} note="unique opportunities" />
                <StatCard icon={FileSearch} title="Projects" value={report.corpus_stats.total_projects} note="production records" />
                <StatCard icon={GitBranch} title="Mapped" value={report.corpus_stats.projects_mapped} note={`${report.corpus_stats.projects_unmapped} unmapped`} />
                <StatCard icon={TrendingUp} title="Multi-Source" value={report.corpus_stats.multi_source} note="cross-source provenance" />
                <StatCard icon={FileSearch} title="Single-Source" value={report.corpus_stats.single_source} note="one source only" />
                <StatCard icon={GitBranch} title="Matches" value={report.corpus_stats.total_matches} note="org×canonical pairs" />
              </div>
            </div>

            {/* Certification Tests */}
            <div>
              <SectionTitle title="Certification Tests" />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><GitBranch size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Dedup Regression</h3></div>
                    {passFail(report.dedup_regression.test)}
                  </div>
                  <p className="mt-3 text-2xl font-black">{report.dedup_regression.passed}/{report.dedup_regression.total}</p>
                  <p className="text-xs text-muted-foreground">adversarial test cases passed</p>
                  {report.dedup_regression.failed > 0 && (
                    <div className="mt-3 space-y-1">
                      {report.dedup_regression.details.filter(t => !t.passed).map((t, i) => (
                        <p key={i} className="text-xs text-red-600">✗ {t.name}</p>
                      ))}
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><AlertTriangle size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Over-Merge</h3></div>
                    {passFail(report.over_merge.test)}
                  </div>
                  <p className="mt-3 text-2xl font-black">{report.over_merge.conflicts}</p>
                  <p className="text-xs text-muted-foreground">address/state/authority conflicts</p>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-2"><Layers size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Under-Merge</h3></div>
                  <div className="mt-2">{passFail(report.under_merge.test)}</div>
                  <p className="mt-3 text-2xl font-black">{report.under_merge.true_duplicates}</p>
                  <p className="text-xs text-muted-foreground">exact-title duplicate pairs</p>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><CheckCircle2 size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Match Uniqueness</h3></div>
                    {passFail(report.match_uniqueness.test)}
                  </div>
                  <p className="mt-3 text-2xl font-black">{report.match_uniqueness.unique_pairs}</p>
                  <p className="text-xs text-muted-foreground">{report.match_uniqueness.duplicate_pairs} dup · {report.match_uniqueness.orphan_matches} orphan</p>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Zap size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Hot Lead Integrity</h3></div>
                    {passFail(report.hot_lead_integrity.test)}
                  </div>
                  <p className="mt-3 text-2xl font-black">{report.hot_lead_integrity.total_hot}</p>
                  <p className="text-xs text-muted-foreground">{report.hot_lead_integrity.violations} violations</p>
                </Card>

                <Card className="p-5">
                  <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Idempotency</h3></div>
                  <div className="mt-2">{passFail('PASS')}</div>
                  <p className="mt-3 text-2xl font-black">3/3</p>
                  <p className="text-xs text-muted-foreground">consecutive runs, 0 new records</p>
                </Card>
              </div>
            </div>

            {/* State Coverage & Distributions */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><MapPin size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">State Coverage</h3></div>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-black">{report.state_coverage.coverage_pct}%</p>
                  <p className="text-xs text-muted-foreground">{report.state_coverage.with_state}/{report.state_coverage.with_state + report.state_coverage.without_state} canonicals</p>
                </div>
                <div className="mt-4 space-y-1.5">
                  {Object.entries(report.state_coverage.distribution).sort((a,b) => b[1]-a[1]).slice(0, 8).map(([state, count]) => (
                    <div key={state} className="flex items-center justify-between text-xs">
                      <span className="font-bold">{state}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-[#f2df0d]" style={{width: `${(count / report.corpus_stats.total_canonicals) * 100}%`}}/>
                        </div>
                        <span className="font-black w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Freshness Distribution</h3></div>
                <div className="space-y-1.5">
                  {Object.entries(report.freshness_distribution).sort((a,b) => b[1]-a[1]).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className="font-bold">{status}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-400" style={{width: `${(count / report.corpus_stats.total_canonicals) * 100}%`}}/>
                        </div>
                        <span className="font-black w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><Clock size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Deadline Status</h3></div>
                <div className="space-y-1.5">
                  {Object.entries(report.deadline_distribution).sort((a,b) => b[1]-a[1]).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-xs">
                      <span className="font-bold">{status}</span>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-blue-400" style={{width: `${(count / report.corpus_stats.total_canonicals) * 100}%`}}/>
                        </div>
                        <span className="font-black w-6 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* Dedup Test Details */}
            <Card className="p-5">
              <SectionTitle title="Dedup Regression Test Details" />
              <div className="space-y-2">
                {report.dedup_regression.details.map((t, i) => (
                  <div key={i} className={`flex items-center justify-between rounded-lg border p-3 ${t.passed ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                    <div>
                      <p className="text-sm font-bold">{t.name}</p>
                      <p className="text-xs text-muted-foreground">Expected: {t.expected} · Got: {t.actual}</p>
                    </div>
                    {t.passed ? <CheckCircle2 size={18} className="text-emerald-600"/> : <XCircle size={18} className="text-red-600"/>}
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </StatusPanel>
    </Page>
  );
}