import React from "react";
import { Flame, ClipboardCheck, PackageCheck, Send, Phone, Trophy, CalendarDays, CheckCircle2, Receipt, Users, Check } from "lucide-react";
import { Surface } from "@/components/CommercialMobileUI";

// The 10-step pipeline. Every project, job, and protocol syncs to these stages.
const STEPS = [
  { num: 1, icon: Flame, short: "Leads", stages: ["qualification"], route: "/leads" },
  { num: 2, icon: ClipboardCheck, short: "Takeoff", stages: ["takeoff"], route: "/takeoff-review" },
  { num: 3, icon: PackageCheck, short: "Bid Pkg", stages: ["estimating", "proposal"], route: "/bid-final-review" },
  { num: 4, icon: Send, short: "Send", stages: ["submitted"], route: "/sent-bids" },
  { num: 5, icon: Phone, short: "Follow Up", stages: ["follow_up"], route: "/follow-ups" },
  { num: 6, icon: Trophy, short: "Close", stages: ["won"], route: "/proposals" },
  { num: 7, icon: CalendarDays, short: "Schedule", stages: ["scheduled"], route: "/calendar" },
  { num: 8, icon: CheckCircle2, short: "Walkthrough", stages: ["in_progress", "completed"], route: "/projects" },
  { num: 9, icon: Receipt, short: "Invoice", stages: ["invoiced"], route: "/invoices" },
  { num: 10, icon: Users, short: "Referral", stages: ["referral"], route: "/follow-ups" },
];

const STEP_W = 64; // px per step column
const LINE_OFFSET = STEP_W / 2; // circle center

export default function PipelineTimeline({ projects = [], onNavigate, loading = false }) {
  const steps = STEPS.map((s) => ({
    ...s,
    count: projects.filter((p) => s.stages.includes(p.stage)).length,
  }));
  const activeStep = steps.find((s) => s.count > 0)?.num || 0;

  return (
    <Surface className="p-4">
      <div className="flex items-center justify-between">
        <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-[#E9A900]">Pipeline Timeline</p>
        <span className="rounded-full bg-[#FFC400] px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-black">
          {activeStep ? `Step ${activeStep} active` : "All clear"}
        </span>
      </div>
      <p className="mt-1 text-[10px] font-semibold text-black/45">
        Every project syncs to these 10 stages — swipe and tap any step.
      </p>

      <div className="mt-4 overflow-x-auto pb-2">
        <div className="relative flex" style={{ minWidth: `${STEP_W * 10}px` }}>
          {/* background line (light gold) */}
          <div
            className="absolute h-[3px] rounded-full bg-[#FFE89A]"
            style={{ top: `${LINE_OFFSET - 1}px`, left: `${LINE_OFFSET}px`, right: `${LINE_OFFSET}px` }}
          />
          {/* progress line (solid gold) */}
          {activeStep > 0 && (
            <div
              className="absolute h-[3px] rounded-full bg-[#FFC400]"
              style={{
                top: `${LINE_OFFSET - 1}px`,
                left: `${LINE_OFFSET}px`,
                width: `calc((100% - ${STEP_W}px) * ${(activeStep - 1) / 9})`,
              }}
            />
          )}

          {steps.map((s) => {
            const isActive = s.num === activeStep;
            const isDone = activeStep > 0 && s.num < activeStep;
            const hasProjects = !isActive && !isDone && s.count > 0;
            return (
              <button
                key={s.num}
                onClick={() => onNavigate(s.route)}
                className="relative z-10 flex shrink-0 flex-col items-center transition active:scale-95"
                style={{ width: `${STEP_W}px` }}
              >
                <div
                  className={`relative grid h-10 w-10 place-items-center rounded-full border-[3px] transition-all ${
                    isDone
                      ? "border-[#FFC400] bg-[#FFC400]"
                      : isActive
                      ? "border-[#FFC400] bg-[#FFC400] animate-flash-step"
                      : hasProjects
                      ? "border-[#FFC400] bg-[#FFF7DA]"
                      : "border-[#FFE89A] bg-white"
                  }`}
                >
                  {isDone ? (
                    <Check size={18} className="text-black" />
                  ) : (
                    <s.icon size={18} className={isActive ? "text-black" : hasProjects ? "text-[#D99D00]" : "text-black/30"} />
                  )}
                  <span
                    className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[7px] font-black ${
                      isDone || isActive ? "bg-black text-[#FFC400]" : hasProjects ? "bg-[#FFC400] text-black" : "bg-black/10 text-black/50"
                    }`}
                  >
                    {s.num}
                  </span>
                </div>
                <p
                  className={`mt-1.5 text-center text-[8px] font-bold uppercase leading-tight tracking-wide ${
                    isActive ? "text-black" : isDone ? "text-black/60" : hasProjects ? "text-black/75" : "text-black/35"
                  }`}
                >
                  {s.short}
                </p>
                {s.count > 0 && (
                  <span
                    className={`mt-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                      isActive
                        ? "bg-[#FFC400] text-black"
                        : isDone
                        ? "bg-emerald-100 text-emerald-700"
                        : hasProjects
                        ? "bg-[#FFF7DA] text-[#D99D00]"
                        : "bg-black/5 text-black/50"
                    }`}
                  >
                    {s.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {loading && <p className="mt-2 text-center text-[10px] text-black/35">Loading…</p>}
      </div>
    </Surface>
  );
}