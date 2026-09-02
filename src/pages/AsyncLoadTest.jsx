import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Page, Card, StatusPanel, SectionTitle, PrimaryButton, SecondaryButton, StatCard } from "@/components/autoleads/UiPrimitives";
import { Zap, Activity, Clock, AlertTriangle, CheckCircle2, Loader2, Gauge } from "lucide-react";

export default function AsyncLoadTest() {
  const [runs, setRuns] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [createResult, setCreateResult] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [runList, batchList] = await Promise.all([
        base44.entities.LoadTestRun.list("-created_date", 20),
        base44.entities.LoadTestBatch.list("-created_date", 100),
      ]);
      setRuns(runList.filter(r => r.data_class === "NON_PRODUCTION_EXAMPLE" || r.data_class === "production"));
      setBatches(batchList.filter(b => b.data_class === "NON_PRODUCTION_EXAMPLE" || b.data_class === "production"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const createRun = async (target) => {
    setCreating(true);
    setCreateResult(null);
    try {
      const res = await fetch("/functions/runAsyncLoadTest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_org_contexts: target, batch_size: 100, concurrency: 5 })
      });
      if (res.ok) setCreateResult(await res.json());
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setCreating(false);
    }
  };

  const processNextBatch = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/functions/processLoadTestBatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ worker_id: "ui-worker" })
      });
      if (res.ok) await res.json();
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const processAllBatches = async () => {
    setProcessing(true);
    try {
      // Process batches sequentially (in a real system, workers would do this in parallel)
      let hasMore = true;
      while (hasMore) {
        const res = await fetch("/functions/processLoadTestBatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ worker_id: "ui-worker" })
        });
        const result = await res.json();
        hasMore = result.status === "BATCH_PROCESSED";
        await loadData();
        if (result.batch_status === "DEAD_LETTER") {
          console.log("Dead letter batch:", result);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(false);
    }
  };

  const currentRun = runs[0];
  const runBatches = currentRun ? batches.filter(b => b.run_id === currentRun.id) : [];

  return (
    <Page
      title="Async Load Test Harness"
      description="Asynchronous queue-based load testing. Staged scale waves: 1,000 → 2,500 → 5,000 org contexts. Persistent batches with lease/claim, retry, and dead-letter recovery."
      eyebrow="Scale Validation"
      actions={
        <div className="flex gap-2">
          <SecondaryButton onClick={processNextBatch} disabled={processing}>
            {processing ? <Loader2 size={14} className="animate-spin"/> : <Zap size={14}/>}
            Process 1 Batch
          </SecondaryButton>
          <PrimaryButton onClick={processAllBatches} disabled={processing}>
            {processing ? <Loader2 size={14} className="animate-spin"/> : <Activity size={14}/>}
            Process All
          </PrimaryButton>
        </div>
      }
    >
      <StatusPanel state={loading ? "loading" : "empty"}>
        <div className="space-y-4">
          {/* Create Run */}
          <Card className="p-5">
            <SectionTitle title="Create Scale Wave" />
            <p className="mb-3 text-xs text-muted-foreground">Staged execution: must pass 1,000 before 2,500, must pass 2,500 before 5,000.</p>
            <div className="flex flex-wrap gap-2">
              {[1000, 2500, 5000].map(target => (
                <button
                  key={target}
                  onClick={() => createRun(target)}
                  disabled={creating}
                  className="rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-50"
                >
                  {creating ? "Creating..." : `${target.toLocaleString()} Contexts`}
                </button>
              ))}
            </div>
            {createResult && (
              <div className="mt-3 rounded-lg bg-emerald-50 p-3">
                <p className="text-sm font-bold text-emerald-700">
                  Run queued: {createResult.run_id} with {createResult.total_batches} batches
                </p>
              </div>
            )}
          </Card>

          {/* Current Run */}
          {currentRun && (
            <Card className="p-5">
              <SectionTitle title={`Current Run: ${currentRun.run_id}`} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard icon={Gauge} title="Status" value={currentRun.status} note="Run state" />
                <StatCard icon={Activity} title="Batches" value={`${currentRun.completed_batches || 0}/${currentRun.total_batches || 0}`} note="Completed/Total" />
                <StatCard icon={CheckCircle2} title="Operations" value={`${currentRun.completed_operations || 0}/${currentRun.total_operations || 0}`} note="Completed/Total" />
                <StatCard icon={AlertTriangle} title="Error Rate" value={`${currentRun.error_rate || 0}%`} note="Failed ops" />
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs font-bold text-muted-foreground">P50 Latency</p>
                  <p className="text-lg font-black">{currentRun.p50_latency_ms || "—"}ms</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs font-bold text-muted-foreground">P95 Latency</p>
                  <p className="text-lg font-black">{currentRun.p95_latency_ms || "—"}ms</p>
                </div>
                <div className="rounded-lg border border-border p-3 text-center">
                  <p className="text-xs font-bold text-muted-foreground">P99 Latency</p>
                  <p className="text-lg font-black">{currentRun.p99_latency_ms || "—"}ms</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div><p className="text-xs font-bold text-muted-foreground">Throughput</p><p className="text-sm font-black">{currentRun.throughput_ops_per_sec || "—"} ops/s</p></div>
                <div><p className="text-xs font-bold text-muted-foreground">Dead Letters</p><p className="text-sm font-black">{currentRun.dead_letter_count || 0}</p></div>
                <div><p className="text-xs font-bold text-muted-foreground">Rate Limits</p><p className="text-sm font-black">{currentRun.rate_limit_count || 0}</p></div>
                <div><p className="text-xs font-bold text-muted-foreground">Retries</p><p className="text-sm font-black">{currentRun.retry_count || 0}</p></div>
              </div>
            </Card>
          )}

          {/* Batch Queue */}
          {runBatches.length > 0 && (
            <Card className="p-5">
              <SectionTitle title="Batch Queue" />
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {runBatches.slice(0, 50).map(batch => (
                  <div key={batch.id} className="flex items-center justify-between rounded-lg border border-border p-2 text-xs">
                    <span className="font-bold">Batch #{batch.batch_number}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{batch.org_contexts} ctx</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                        batch.status === "COMPLETE" ? "bg-emerald-100 text-emerald-700" :
                        batch.status === "RUNNING" || batch.status === "LEASED" ? "bg-blue-100 text-blue-700" :
                        batch.status === "DEAD_LETTER" ? "bg-red-100 text-red-700" :
                        batch.status === "FAILED" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>{batch.status}</span>
                      {batch.p50_latency_ms && <span className="text-muted-foreground">P50: {batch.p50_latency_ms}ms</span>}
                      {batch.failure_injection && <AlertTriangle size={12} className="text-amber-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Scale Wave Guidance */}
          <Card className="p-5">
            <SectionTitle title="Scale Wave Progression" />
            <div className="space-y-2">
              {[
                { wave: "1,000 contexts", status: runs.find(r => r.target_org_contexts === 1000)?.status || "NOT RUN" },
                { wave: "2,500 contexts", status: runs.find(r => r.target_org_contexts === 2500)?.status || "NOT RUN" },
                { wave: "5,000 contexts", status: runs.find(r => r.target_org_contexts === 5000)?.status || "NOT RUN" },
              ].map(w => (
                <div key={w.wave} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <span className="text-sm font-bold">{w.wave}</span>
                  <span className={`text-xs font-black ${
                    w.status === "COMPLETE" ? "text-emerald-600" :
                    w.status === "RUNNING" ? "text-blue-600" :
                    w.status === "PARTIAL" ? "text-amber-600" :
                    "text-muted-foreground"
                  }`}>{w.status}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Always report TESTED SCALE separately from PROJECTED SCALE. Do not call "5,000 feasible" equivalent to "5,000 tested."
            </p>
          </Card>
        </div>
      </StatusPanel>
    </Page>
  );
}