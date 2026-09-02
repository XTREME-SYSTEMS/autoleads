import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Page, Card, StatusPanel, SectionTitle, PrimaryButton, SecondaryButton, StatCard } from "@/components/autoleads/UiPrimitives";
import { Building2, CheckCircle2, AlertTriangle, Globe, MapPin, Zap, ShieldCheck, Loader2 } from "lucide-react";

const PRIORITY_ORDER = [
  "state_procurement", "fdot", "county_procurement", "city_procurement",
  "school_district", "university", "airport", "port", "transit",
  "water_wastewater", "special_district", "housing_authority", "public_works",
  "permit", "aggregator", "other"
];

const STATUS_COLORS = {
  UNVERIFIED: "bg-gray-100 text-gray-700",
  VERIFYING: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  DEGRADED: "bg-amber-100 text-amber-700",
  AUTH_REQUIRED: "bg-purple-100 text-purple-700",
  LICENSE_REQUIRED: "bg-orange-100 text-orange-700",
  UNSUPPORTED: "bg-red-100 text-red-700",
  FAILED: "bg-red-100 text-red-700",
  QUARANTINED: "bg-gray-200 text-gray-600",
};

export default function SourceVerification() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [filter, setFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [initResult, setInitResult] = useState(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const all = await base44.entities.SourceVerificationQueue.list("-created_date", 500);
      setQueue(all.filter(q => q.data_class !== "NON_PRODUCTION_EXAMPLE"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const initQueue = async () => {
    setInitializing(true);
    try {
      const res = await fetch("/functions/initSourceVerificationQueue", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: "{}"
      });
      if (res.ok) setInitResult(await res.json());
      await loadQueue();
    } catch (e) {
      console.error(e);
    } finally {
      setInitializing(false);
    }
  };

  const verifySource = async (item) => {
    setVerifying(item.id);
    try {
      // Test read-only access to the source URL
      const testRes = await fetch("/functions/browserScrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: item.url, test_mode: true })
      });
      const testResult = testRes.ok ? await testRes.json() : { success: false };

      const healthReceipt = {
        http_status: testRes.status,
        readable: testResult?.success || false,
        tested_at: new Date().toISOString(),
      };

      const newStatus = testResult?.success ? "ACTIVE" : "UNSUPPORTED";
      const accessClass = testResult?.success ? "public_readonly" : "UNSUPPORTED";

      await base44.entities.SourceVerificationQueue.update(item.id, {
        verification_status: newStatus,
        access_classification: accessClass,
        active_bid_capability: item.data_type === "active_bid" && testResult?.success,
        health_receipt: JSON.stringify(healthReceipt),
        last_verified_at: new Date().toISOString(),
        verified_by: "admin",
      });

      await loadQueue();
    } catch (e) {
      // If fetch fails, mark as FAILED
      await base44.entities.SourceVerificationQueue.update(item.id, {
        verification_status: "FAILED",
        health_receipt: JSON.stringify({ error: e.message, tested_at: new Date().toISOString() }),
        last_verified_at: new Date().toISOString(),
      });
      await loadQueue();
    } finally {
      setVerifying(null);
    }
  };

  const filtered = queue.filter(q => {
    if (filter !== "all" && q.verification_status !== filter) return false;
    if (priorityFilter !== "all" && q.priority !== priorityFilter) return false;
    return true;
  });

  const stats = {
    total: queue.length,
    active: queue.filter(q => q.verification_status === "ACTIVE").length,
    unverified: queue.filter(q => q.verification_status === "UNVERIFIED").length,
    failed: queue.filter(q => q.verification_status === "FAILED" || q.verification_status === "UNSUPPORTED").length,
  };

  return (
    <Page
      title="Florida Source Verification"
      description="Queue of Florida sources requiring verification before activation. Each source must pass read-only testing before becoming ACTIVE."
      eyebrow="Source Verification"
      actions={<PrimaryButton onClick={initQueue} disabled={initializing}>{initializing ? "Initializing..." : "Init Queue"}</PrimaryButton>}
    >
      <StatusPanel state={loading ? "loading" : "empty"}>
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Building2} title="Total" value={stats.total} note="FL sources queued" />
            <StatCard icon={CheckCircle2} title="Active" value={stats.active} note="Verified" />
            <StatCard icon={AlertTriangle} title="Unverified" value={stats.unverified} note="Need testing" />
            <StatCard icon={AlertTriangle} title="Failed" value={stats.failed} note="Unsupported" />
          </div>

          {initResult && (
            <Card className="p-4 bg-blue-50 border-0">
              <p className="text-sm font-bold text-blue-700">
                Queue initialized: {initResult.new_entries_created} new entries, {initResult.already_queued} already queued
              </p>
            </Card>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold">
              <option value="all">All Statuses</option>
              <option value="UNVERIFIED">Unverified</option>
              <option value="ACTIVE">Active</option>
              <option value="FAILED">Failed</option>
              <option value="UNSUPPORTED">Unsupported</option>
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-bold">
              <option value="all">All Priorities</option>
              {PRIORITY_ORDER.map(p => <option key={p} value={p}>{p.replace(/_/g, " ")}</option>)}
            </select>
          </div>

          {/* Queue Items */}
          <div className="space-y-2">
            {filtered.map(item => (
              <Card key={item.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe size={14} className="text-muted-foreground flex-shrink-0" />
                      <p className="text-sm font-black truncate">{item.source_name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold">
                        <MapPin size={10}/> {item.jurisdiction || "—"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                        {item.priority?.replace(/_/g, " ") || "other"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                        {item.platform || "unknown"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-bold">
                        {item.data_type || "unknown"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${STATUS_COLORS[item.verification_status] || STATUS_COLORS.UNVERIFIED}`}>
                      {item.verification_status}
                    </span>
                    {item.verification_status === "UNVERIFIED" && (
                      <button
                        onClick={() => verifySource(item)}
                        disabled={verifying === item.id}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black disabled:opacity-50"
                      >
                        {verifying === item.id ? <Loader2 size={12} className="animate-spin"/> : <ShieldCheck size={12}/>}
                        Verify
                      </button>
                    )}
                  </div>
                </div>
                {item.active_bid_capability && (
                  <div className="mt-2 flex items-center gap-1">
                    <Zap size={12} className="text-emerald-600" />
                    <span className="text-[10px] font-bold text-emerald-700">ACTIVE-BID CAPABLE</span>
                  </div>
                )}
              </Card>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="grid place-items-center p-12 text-center">
                <Building2 size={32} className="text-muted-foreground" />
                <p className="mt-3 text-sm font-bold">No sources match filters</p>
                <p className="text-xs text-muted-foreground">Initialize the queue or adjust filters.</p>
              </div>
            )}
          </div>
        </div>
      </StatusPanel>
    </Page>
  );
}