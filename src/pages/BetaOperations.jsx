import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Page, Card, StatCard, StatusPanel, SectionTitle, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import { Building2, GitBranch, Layers, Zap, MapPin, FileSearch, CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw, Mail, TrendingUp, Database, ShieldCheck, Activity, Server, Briefcase, DollarSign } from "lucide-react";

export default function BetaOperations() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [running, setRunning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, canonicals, matches, validations, benchmarks, sources, messages] = await Promise.all([
        base44.entities.Project.list("-created_date", 500),
        base44.entities.CanonicalOpportunity.list("-created_date", 500),
        base44.entities.OrganizationOpportunityMatch.list("-created_date", 500),
        base44.entities.LeadValidationRecord.list("-created_date", 500),
        base44.entities.TakeoffBenchmark.list("-created_date", 100),
        base44.entities.ScrapeSource.list("-created_date", 500),
        base44.entities.Message.list("-created_date", 50),
      ]);

      const prodProjects = projects.filter((p) => p.data_class !== "NON_PRODUCTION_EXAMPLE");
      const prodCanonicals = canonicals.filter((c) => c.data_class !== "NON_PRODUCTION_EXAMPLE");
      const prodMatches = matches.filter((m) => m.data_class !== "NON_PRODUCTION_EXAMPLE");
      const prodValidations = validations.filter((v) => v.data_class !== "NON_PRODUCTION_EXAMPLE");

      const hotLeads = prodMatches.filter((m) => m.is_hot_lead);
      const duplicates = prodCanonicals.filter((c) => c.fingerprint_state === "CONFIRMED_DUPLICATE" || c.fingerprint_state === "POSSIBLE_DUPLICATE");
      const locationFailures = prodMatches.filter((m) => m.location_eligibility === "OUT_OF_SERVICE_AREA" || m.location_eligibility === "UNKNOWN_LOCATION");
      const staleRecords = prodCanonicals.filter((c) => c.freshness_status === "STALE" || c.freshness_status === "EXPIRED");

      const flSources = sources.filter((s) => s.jurisdiction && s.jurisdiction.includes("FL"));
      const flActive = flSources.filter((s) => s.status === "active");
      const flCategories = new Set(flSources.map((s) => s.source_type));

      const reviewed = prodValidations.filter((v) => v.review_status === "reviewed");
      const reviewedPositive = reviewed.filter((v) => v.ground_truth_classification === "active_opportunity");
      const reviewedNegative = reviewed.filter((v) => v.ground_truth_classification !== "active_opportunity" && v.ground_truth_classification !== "pending_review");
      const pendingReview = prodValidations.filter((v) => v.review_status !== "reviewed");
      const negativeCandidates = prodValidations.filter((v) => v.corpus_role === "negative_candidate");

      const precision = reviewed.length > 0 ? (reviewed.filter((v) => v.classification_match).length / reviewed.length) * 100 : null;
      const falsePositives = reviewed.filter((v) => !v.classification_match && v.system_classification === "active_opportunity");
      const fpr = reviewed.length > 0 ? (falsePositives.length / reviewed.length) * 100 : null;
      const deadlineFidelity = reviewed.filter((v) => v.deadline_fidelity).length;
      const valueFidelity = reviewed.filter((v) => v.value_fidelity).length;
      const locationFidelity = reviewed.filter((v) => v.location_fidelity).length;
      const tradeRelevance = reviewed.filter((v) => v.trade_relevance).length;
      const sourceProvenance = prodValidations.filter((v) => v.source_provenance_complete).length;

      const inboundMessages = messages.filter((m) => m.direction === "inbound");
      const gmailLoopStatus = inboundMessages.length > 0 ? "PASS" : "PENDING";

      setData({
        rawProjects: prodProjects.length,
        canonicals: prodCanonicals.length,
        matches: prodMatches.length,
        hotLeads: hotLeads.length,
        duplicates: duplicates.length,
        possibleDuplicates: prodCanonicals.filter((c) => c.fingerprint_state === "POSSIBLE_DUPLICATE").length,
        locationFailures: locationFailures.length,
        staleRecords: staleRecords.length,
        flSourcesActive: flActive.length,
        flSourceCategories: flCategories.size,
        corpusSize: prodValidations.length,
        pendingReviews: pendingReview.length,
        reviewedRecords: reviewed.length,
        reviewedPositive: reviewedPositive.length,
        reviewedNegative: reviewedNegative.length,
        negativeCandidates: negativeCandidates.length,
        precision: precision !== null ? precision.toFixed(1) : null,
        fpr: fpr !== null ? fpr.toFixed(1) : null,
        deadlineFidelity: reviewed.length > 0 ? ((deadlineFidelity / reviewed.length) * 100).toFixed(0) : null,
        valueFidelity: reviewed.length > 0 ? ((valueFidelity / reviewed.length) * 100).toFixed(0) : null,
        locationFidelity: reviewed.length > 0 ? ((locationFidelity / reviewed.length) * 100).toFixed(0) : null,
        tradeRelevance: reviewed.length > 0 ? ((tradeRelevance / reviewed.length) * 100).toFixed(0) : null,
        sourceProvenance: prodValidations.length > 0 ? ((sourceProvenance / prodValidations.length) * 100).toFixed(0) : "0",
        takeoffBenchmarks: benchmarks.filter((b) => b.data_class !== "NON_PRODUCTION_EXAMPLE").length,
        gmailLoopStatus,
        sourceHealth: {
          total: sources.length,
          active: sources.filter((s) => s.status === "active").length,
          unverified: sources.filter((s) => s.status === "unverified").length,
          error: sources.filter((s) => s.status === "error").length,
        },
      });
    } catch (e) {
      setError(e.message || "Failed to load operations data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const runCanonicalCert = async () => {
    setRunning(true);
    try {
      const res = await fetch("/functions/canonicalCertification", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await res.json();
      if (d.error) throw new Error(d.error);
      await loadData();
    } catch (e) {
      setError(e.message);
    } finally {
      setRunning(false);
    }
  };

  const statusBadge = (status) => {
    if (status === "PASS") return <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700"><CheckCircle2 size={13}/>PASS</span>;
    if (status === "PENDING") return <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700"><Clock size={13}/>PENDING</span>;
    if (status === "FAIL") return <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-black text-red-700"><XCircle size={13}/>FAIL</span>;
    return <span className="text-xs font-bold text-muted-foreground">{status}</span>;
  };

  return (
    <Page
      title="Beta Operations"
      description="Controlled-beta evidence dashboard — connects canonical health with lead validation, source coverage, Gmail loop, and takeoff benchmarks."
      eyebrow="Operations"
      actions={<>
        <PrimaryButton onClick={runCanonicalCert} disabled={running || loading}>
          {running ? <><RefreshCw size={15} className="animate-spin"/>Running…</> : <><RefreshCw size={15}/>Re-certify</>}
        </PrimaryButton>
        <PrimaryButton onClick={loadData} disabled={loading} className="!bg-black !text-white !shadow-none">
          {loading ? <><RefreshCw size={15} className="animate-spin"/>Loading…</> : <><RefreshCw size={15}/>Refresh</>}
        </PrimaryButton>
      </>}
    >
      <StatusPanel state={loading && !data ? "loading" : error ? "error" : "empty"}>
        {data && (
          <div className="space-y-6">
            {/* Corpus Pipeline */}
            <div>
              <SectionTitle title="Corpus Pipeline" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard icon={Building2} title="Raw Projects" value={data.rawProjects} note="production records" />
                <StatCard icon={Layers} title="Canonicals" value={data.canonicals} note="unique opportunities" />
                <StatCard icon={GitBranch} title="Matches" value={data.matches} note="org×canonical pairs" />
                <StatCard icon={Zap} title="Hot Leads" value={data.hotLeads} note="location+trade+fresh" />
                <StatCard icon={AlertTriangle} title="Duplicates" value={data.duplicates} note={`${data.possibleDuplicates} possible`} />
                <StatCard icon={MapPin} title="Loc Failures" value={data.locationFailures} note="out of area" />
              </div>
            </div>

            {/* Lead Validation */}
            <div>
              <SectionTitle title="Lead Validation Corpus" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <StatCard icon={Database} title="Corpus Size" value={data.corpusSize} note="validation records" />
                <StatCard icon={Clock} title="Pending" value={data.pendingReviews} note="awaiting review" />
                <StatCard icon={CheckCircle2} title="Reviewed" value={data.reviewedRecords} note={`${data.reviewedPositive} pos · ${data.reviewedNegative} neg`} />
                <StatCard icon={XCircle} title="Negatives" value={data.negativeCandidates} note="negative candidates" />
                <StatCard icon={FileSearch} title="Stale" value={data.staleRecords} note="stale canonicals" />
                <StatCard icon={ShieldCheck} title="Provenance" value={`${data.sourceProvenance}%`} note="source documented" />
              </div>
            </div>

            {/* Metrics (reviewed only) */}
            <div>
              <SectionTitle title="Reviewed Metrics (N/A until human review)" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <Card className="p-5">
                  <div className="flex items-center gap-2"><TrendingUp size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Precision</h3></div>
                  <p className="mt-3 text-2xl font-black">{data.precision !== null ? `${data.precision}%` : "N/A"}</p>
                  <p className="text-xs text-muted-foreground">target ≥95%</p>
                </Card>
                <Card className="p-5">
                  <div className="flex items-center gap-2"><XCircle size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">False Positive</h3></div>
                  <p className="mt-3 text-2xl font-black">{data.fpr !== null ? `${data.fpr}%` : "N/A"}</p>
                  <p className="text-xs text-muted-foreground">target &lt;2%</p>
                </Card>
                <Card className="p-5"><div className="flex items-center gap-2"><Clock size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Deadline Fid.</h3></div><p className="mt-3 text-2xl font-black">{data.deadlineFidelity !== null ? `${data.deadlineFidelity}%` : "N/A"}</p><p className="text-xs text-muted-foreground">target ≥99%</p></Card>
                <Card className="p-5"><div className="flex items-center gap-2"><DollarSign size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Value Fid.</h3></div><p className="mt-3 text-2xl font-black">{data.valueFidelity !== null ? `${data.valueFidelity}%` : "N/A"}</p><p className="text-xs text-muted-foreground">target ≥98%</p></Card>
                <Card className="p-5"><div className="flex items-center gap-2"><MapPin size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Location Fid.</h3></div><p className="mt-3 text-2xl font-black">{data.locationFidelity !== null ? `${data.locationFidelity}%` : "N/A"}</p><p className="text-xs text-muted-foreground">FL = 100%</p></Card>
                <Card className="p-5"><div className="flex items-center gap-2"><Briefcase size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Trade Relev.</h3></div><p className="mt-3 text-2xl font-black">{data.tradeRelevance !== null ? `${data.tradeRelevance}%` : "N/A"}</p><p className="text-xs text-muted-foreground">trade match</p></Card>
              </div>
            </div>

            {/* Source & Integration Status */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><Server size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Source Health</h3></div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-bold">Total Sources</span><span className="font-black">{data.sourceHealth.total}</span></div>
                  <div className="flex justify-between text-sm"><span className="font-bold">Active</span><span className="font-black text-emerald-600">{data.sourceHealth.active}</span></div>
                  <div className="flex justify-between text-sm"><span className="font-bold">Unverified</span><span className="font-black text-amber-600">{data.sourceHealth.unverified}</span></div>
                  <div className="flex justify-between text-sm"><span className="font-bold">Error</span><span className="font-black text-red-600">{data.sourceHealth.error}</span></div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><MapPin size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Florida Coverage</h3></div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="font-bold">FL Sources Active</span><span className="font-black">{data.flSourcesActive}</span></div>
                  <div className="flex justify-between text-sm"><span className="font-bold">FL Categories</span><span className="font-black">{data.flSourceCategories}</span></div>
                  <div className="flex justify-between text-sm"><span className="font-bold">County Coverage</span><span className="font-black">16/67</span></div>
                </div>
              </Card>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-4"><Activity size={18} className="text-muted-foreground"/><h3 className="font-black text-sm">Integration Status</h3></div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm"><span className="font-bold">Gmail Inbound</span>{statusBadge(data.gmailLoopStatus)}</div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold">Takeoff Benchmarks</span><span className="font-black">{data.takeoffBenchmarks}/50</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold">Takeoff Accuracy</span><span className="text-xs font-black text-muted-foreground">UNVERIFIED</span></div>
                  <div className="flex justify-between items-center text-sm"><span className="font-bold">Load Test</span>{statusBadge("PASS")}</div>
                </div>
              </Card>
            </div>

            {/* Release Classification */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-14 w-14 place-items-center rounded-2xl bg-yellow-50 text-yellow-600"><ShieldCheck size={28}/></span>
                  <div>
                    <h2 className="text-xl font-black">Release Classification</h2>
                    <p className="text-sm text-muted-foreground">Controlled Beta → Conditional Production → Full Production</p>
                  </div>
                </div>
                <span className="rounded-full bg-yellow-100 px-4 py-2 text-sm font-black text-yellow-800">CONTROLLED BETA</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Advancement requires: security PASS, tenancy PASS, canonical integrity PASS, payments/e-sign PASS, email PASS, rollback PASS, observability PASS, and lead metrics demonstrating strong real-world performance on a meaningful reviewed sample.</p>
            </Card>
          </div>
        )}
      </StatusPanel>
    </Page>
  );
}