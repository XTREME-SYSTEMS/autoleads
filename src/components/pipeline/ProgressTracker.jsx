import React from "react";
import { Check } from "lucide-react";

const STEPS = ["SCRAPE", "TAKE OFF", "AUTO BID", "EMAIL", "FOLLOW UP", "CONTRACT", "PAYMENT", "SCHEDULE"];

export default function ProgressTracker({ currentStep = 0 }) {
  return (
    <div className="sticky top-0 z-40 border-b border-[#E0E0E0] bg-white dark:border-white/10 dark:bg-[#0B0B0B]">
      <div className="overflow-x-auto px-4 py-3">
        <div className="flex min-w-[680px] items-start">
          {STEPS.map((label, idx) => {
            const isDone = idx < currentStep;
            const isActive = idx === currentStep;
            return (
              <React.Fragment key={label}>
                <div className="flex w-[80px] shrink-0 flex-col items-center text-center">
                  <div className={`grid h-8 w-8 place-items-center rounded-full border-2 text-xs font-black transition-all ${
                    isDone ? "border-[#FFC107] bg-[#FFC107] text-black" :
                    isActive ? "border-[#FFC107] bg-[#F5F5F5] text-black animate-pulse-green" :
                    "border-[#E0E0E0] bg-white text-[#666] dark:border-white/15 dark:bg-[#1a1a1a]"
                  }`}>
                    {isDone ? <Check size={14} /> : idx + 1}
                  </div>
                  <span className={`mt-1.5 text-[9px] font-bold uppercase tracking-wide ${
                    isDone || isActive ? "text-black dark:text-[#FFC107]" : "text-[#666] dark:text-white/40"
                  }`}>{label}</span>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`mt-4 h-0.5 flex-1 rounded-full ${idx < currentStep ? "bg-[#FFC107]" : "bg-[#E0E0E0] dark:bg-white/10"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}