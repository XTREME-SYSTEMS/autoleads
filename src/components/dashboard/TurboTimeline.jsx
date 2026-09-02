import React, { useState } from "react";
import { Flame, ClipboardCheck, PackageCheck, Send, Phone, Trophy, CalendarDays, CheckCircle2, Receipt, Users, Check, Loader2, Zap, SkipForward, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Surface } from "@/components/CommercialMobileUI";
import TurboApprovalGate from "@/components/dashboard/TurboApprovalGate";

// The 10-step pipeline — same stages as PipelineTimeline. Each circle glows
// green (emerald) when the system has completed that step for a project, so
// you can watch the work happen in real time as projects advance.
const STEPS = [
  { num: 1, key: "leads", icon: Flame, label: "Leads", stages: ["qualification"], route: "/leads" },
  { num: 2, key: "takeoff", icon: ClipboardCheck, label: "Takeoffs", stages: ["takeoff"], route: "/takeoff-review" },
  { num: 3, key: "bidpkg", icon: PackageCheck, label: "Bid Pkg", stages: ["estimating", "proposal"], route: "/bid-final-review" },
  { num: 4, key: "email", icon: Send, label: "Send", stages: ["submitted"], route: "/sent-bids" },
  { num: 5, key: "followup", icon: Phone, label: "Follow Up", stages: ["follow_up"], route: "/follow-ups" },
  { num: 6, key: "close", icon: Trophy, label: "Close", stages: ["won"], route: "/proposals" },
  { num: 7, key: "schedule", icon: CalendarDays, label: "Schedule", stages: ["scheduled"], route: "/calendar" },
  { num: 8, key: "walkthrough", icon: CheckCircle2, label: "Walkthrough", stages: ["in_progress", "completed"], route: "/projects" },
  { num: 9, key: "invoice", icon: Receipt, label: "Invoice", stages: ["invoiced"], route: "/invoices" },
  { num: 10, key: "referral", icon: Users, label: "Referral", stages: ["referral"], route: "/follow-ups" },
];

export default function TurboTimeline({ metrics, projects = [], onRefresh }) {
  const [autoFlowRunning, setAutoFlowRunning] = useState(false);
  const [autoFlowDone, setAutoFlowDone] = useState(false);
  const [error, setError] = useState(null);

  const runAutoFlow = async () => {
    setAutoFlowRunning(true);
    setError(null);
    try {
      const leads = metrics?.qualificationLeads || [];
      if (leads.length > 0) {
        await base44.entities.Project.updateMany({ stage: "qualification" }, { $set: { stage: "takeoff" } });
      }
      setAutoFlowDone(true);
      if (onRefresh) onRefresh();
      if (leads.length > 0) {
        Promise.allSettled(
          leads.map((p) => base44.functions.invoke("autoTakeoff", { project_id: p.id }).catch(() => {}))
        ).then(() => { if (onRefresh) onRefresh(); });
      }
    } catch (e) {
      setError(`Auto Flow failed: ${e.message}`);
    } finally {
      setAutoFlowRunning(false);
    }
  };

  // Per-step counts from the live projects list
  const steps = STEPS.map((s) => ({
    ...s,
    count: (projects || []).filter((p) => s.stages.includes(p.stage)).length,
  }));
  const activeStep = steps.find((s) => s.count > 0)?.num || 0;

  const circleState = (s) => {
    if (autoFlowDone && s.num === 1) return "bypassed";
    if (s.num < activeStep) return "done";
    if (s.num === activeStep) return "active";
    return "pending";
  };

  return (
    <Surface className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-[#E9A900]">Auto Flow Pipeline</p>
          <p className="mt-0.5 text-[10px] font-semibold text-black/45">Watch each step glow green as it completes.</p>
        </div>
        <button
          onClick={runAutoFlow}
          disabled={autoFlowRunning}
          className="flex shrink-0 flex-col items-center justify-center rounded-[10px] bg-emerald-500 px-4 py-2 shadow-[0_6px_16px_rgba(16,185,129,.3)] disabled:opacity-50 active:scale-95"
        >
          <span className="flex items-center gap-1 font-brand text-[15px] font-bold uppercase tracking-wide text-white">
            {autoFlowRunning ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16}/>} Auto Flow
          </span>
          <span className="text-[8px] font-bold uppercase tracking-wide text-white/80">skip to takeoffs</span>
        </button>
      </div>

      <div className="mt-3 rounded-lg bg-emerald-50/60 p-3">
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-600"/>
          <p className="font-brand text-[11px] font-bold uppercase tracking-wide text-emerald-700">Why Auto Flow?</p>
        </div>
        <p className="mt-1.5 text-[11px] leading-5 text-black/65">
          <strong className="text-black">Benefits:</strong> Skips manual lead review and fast-tracks you straight to takeoffs — saving hours. Every lead matching your approved trades, scopes, and service areas is auto-promoted instantly.
        </p>
        <p className="mt-1.5 text-[11px] leading-5 text-black/65">
          <strong className="text-black">Trade-offs:</strong> You won't see each lead's full description and details upfront — but all of those details are preserved inside the takeoff documents for your review.
        </p>
        <p className="mt-1.5 text-[11px] font-bold text-emerald-700">✓ No risk — nothing is sent or committed until you review each takeoff.</p>
      </div>

      {/* 1-10 timeline */}
      <div className="relative mt-4 pl-2">
        <div className="absolute left-[22px] top-3 bottom-3 w-[3px] rounded-full bg-black/10" />
        <div
          className="absolute left-[22px] top-3 w-[3px] rounded-full bg-emerald-500 transition-all duration-500"
          style={{ height: activeStep > 0 ? `${((activeStep - 1) / 9) * 100}%` : '0%' }}
        />
        <div className="space-y-2.5">
          {steps.map((s) => {
            const state = circleState(s);
            const isDone = state === "done";
            const isBypassed = state === "bypassed";
            const isActive = state === "active";
            return (
              <div key={s.num} className="relative flex items-center gap-3">
                <div
                  className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border-[3px] transition-all ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500 animate-pulse-emerald"
                      : isBypassed
                      ? "border-emerald-400 bg-emerald-50"
                      : isActive
                      ? "border-[#FFC400] bg-[#FFC400] animate-flash-step"
                      : "border-black/15 bg-white"
                  }`}
                >
                  {isDone ? (
                    <Check size={18} className="text-white"/>
                  ) : isBypassed ? (
                    <SkipForward size={18} className="text-emerald-500"/>
                  ) : isActive ? (
                    autoFlowRunning && s.num === 2 ? <Loader2 size={18} className="animate-spin text-black"/> : <s.icon size={18} className="text-black"/>
                  ) : (
                    <s.icon size={18} className="text-black/30"/>
                  )}
                  <span className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[8px] font-black ${isDone || isBypassed || isActive ? "bg-black text-white" : "bg-black/10 text-black/50"}`}>
                    {s.num}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[13px] font-bold ${isDone || isBypassed || isActive ? "text-black" : "text-black/40"}`}>
                    {s.label}
                    {isDone && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black text-emerald-700">DONE</span>}
                    {isBypassed && <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[8px] font-black text-emerald-700">BYPASSED</span>}
                    {isActive && <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[8px] font-black text-amber-700">YOU ARE HERE</span>}
                  </p>
                  <p className="text-[10px] text-black/40">
                    {state === "pending" && "Waiting…"}
                    {state === "done" && "Completed"}
                    {state === "bypassed" && "Skipped by Auto Flow"}
                    {state === "active" && s.num === 2 && autoFlowRunning && "Promoting leads → takeoffs…"}
                    {state === "active" && !(s.num === 2 && autoFlowRunning) && "In progress"}
                  </p>
                </div>
                {s.count > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${isDone ? "bg-emerald-100 text-emerald-700" : isActive ? "bg-[#FFC400] text-black" : "bg-black/5 text-black"}`}>
                    {s.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg bg-red-50 p-2 text-[11px] font-semibold text-red-600">{error}</p>}

      <TurboApprovalGate onSent={onRefresh} />
    </Surface>
  );
}