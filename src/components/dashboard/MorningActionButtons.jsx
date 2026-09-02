import React, { useState } from "react";
import { Zap, Loader2, Check, ArrowRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useOrgId } from "@/hooks/useOrgContext";

// The two "addictive morning" buttons: a fire-themed Leads button that flashes
// when fresh leads exist, and a flashing Auto Takeoff button that bulk-promotes
// every qualified lead to takeoff and kicks off automated takeoff in the
// background using the contractor's approved pricing intelligence.
export default function MorningActionButtons({ leadsCount = 0, qualificationLeads = [], onRefresh, onGoLeads }) {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const runAutoTakeoff = async () => {
    setRunning(true);
    setError(null);
    try {
      const leads = qualificationLeads || [];
      if (leads.length > 0) {
        // Bulk-promote every qualified lead straight to takeoff (instant).
        await base44.entities.Project.updateMany({ stage: "qualification" }, { $set: { stage: "takeoff" } });
      }
      setDone(true);
      if (onRefresh) onRefresh();
      // Fire automated takeoff per lead in the background (don't block the UI).
      if (leads.length > 0) {
        Promise.allSettled(
          leads.map((p) => base44.functions.invoke("autoTakeoff", { project_id: p.id }).catch(() => {}))
        ).then(() => { if (onRefresh) onRefresh(); });
      }
    } catch (e) {
      setError(e?.message || "Auto Takeoff failed");
    } finally {
      setRunning(false);
    }
  };

  const orgId = useOrgId();
  const [scanning, setScanning] = useState(false);
  const hasLeads = leadsCount > 0;

  // ONE button scans everything: commercial + government (runAutoScrape) and
  // residential / social (scrapeSocialLeads via the cloud browser). Fire both
  // in the background and jump straight to the lead feed — leads populate live.
  const scanAll = () => {
    if (scanning) return;
    setScanning(true);
    Promise.allSettled([
      base44.functions.invoke("runAutoScrape", {}).catch(() => {}),
      base44.functions.invoke("scrapeSocialLeads", { organization_id: orgId }).catch(() => {}),
    ]).then(() => { setScanning(false); if (onRefresh) onRefresh(); });
    onGoLeads();
  };

  return (
    <div className="mt-3 space-y-2.5">
      {/* 🔥 ONE-BUTTON FULL SCAN — commercial + gov + residential */}
      <button
        onClick={scanAll}
        className={`relative flex w-full items-center gap-3 overflow-hidden rounded-[14px] px-4 py-4 text-left shadow-[0_10px_28px_rgba(255,196,0,.35)] ${hasLeads ? "animate-flash-step bg-[#FFC400]" : "bg-[#FFC400]/85"}`}
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-black/10 text-2xl leading-none">{scanning ? <Loader2 size={22} className="animate-spin text-black" /> : "🔥"}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-brand text-[20px] font-bold uppercase leading-none tracking-[.02em] text-black">
            {scanning ? "Scanning all sources…" : hasLeads ? `${leadsCount} Fresh Lead${leadsCount === 1 ? "" : "s"}` : "Find Leads"}
          </span>
          <span className="mt-1 block text-[11px] font-bold uppercase tracking-wide text-black/70">
            {scanning ? "Commercial · Gov · Residential" : hasLeads ? "Tap to scan all sources & view" : "Scans commercial, gov & residential"}
          </span>
        </span>
        {hasLeads && !scanning && (
          <span className="absolute right-3 top-3 grid h-6 min-w-6 animate-pulse place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-black text-white">
            {leadsCount > 9 ? "9+" : leadsCount}
          </span>
        )}
        {!scanning && <ArrowRight size={22} className="shrink-0 text-black/60" />}
      </button>

      {/* ⚡ AUTO TAKEOFF — flashes when there are leads to process */}
      <button
        onClick={runAutoTakeoff}
        disabled={running || !hasLeads}
        className={`flex w-full items-center justify-center gap-2 rounded-[14px] px-4 py-3.5 font-brand text-[16px] font-bold uppercase tracking-[.03em] text-white shadow-[0_8px_22px_rgba(16,185,129,.3)] disabled:opacity-50 ${hasLeads && !done ? "animate-flash-step bg-emerald-500" : "bg-emerald-600"}`}
      >
        {running ? <Loader2 size={20} className="animate-spin" /> : done ? <Check size={20} /> : <Zap size={20} />}
        {running ? "Taking off all leads…" : done ? "Takeoff running — review in Takeoffs" : "Auto Takeoff — All Leads"}
      </button>
      {!hasLeads && (
        <p className="text-center text-[10px] font-bold uppercase tracking-wide text-black/35">
          Auto Takeoff lights up when your 4 AM scrape finds leads
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 p-2 text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}