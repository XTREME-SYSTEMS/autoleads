import React from "react";
import { Check } from "lucide-react";

const STEP_W = 64;
const LINE_OFFSET = STEP_W / 2;

export default function WizardTimeline({ steps, currentStep, completedSteps, onJump }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="relative flex" style={{ minWidth: `${STEP_W * steps.length}px` }}>
        {/* background line (light gold) */}
        <div
          className="absolute h-[3px] rounded-full bg-[#FFE89A]"
          style={{ top: `${LINE_OFFSET - 1}px`, left: `${LINE_OFFSET}px`, right: `${LINE_OFFSET}px` }}
        />
        {/* progress line (solid gold) */}
        <div
          className="absolute h-[3px] rounded-full bg-[#FFC400] transition-all duration-500"
          style={{
            top: `${LINE_OFFSET - 1}px`,
            left: `${LINE_OFFSET}px`,
            width: `calc((100% - ${STEP_W}px) * ${(currentStep - 1) / (steps.length - 1)})`,
          }}
        />
        {steps.map((s) => {
          const isCurrent = s.num === currentStep;
          const isDone = completedSteps.includes(s.key) || s.num < currentStep;
          return (
            <button
              key={s.num}
              onClick={() => onJump(s.num)}
              className="relative z-10 flex shrink-0 flex-col items-center transition active:scale-95"
              style={{ width: `${STEP_W}px` }}
            >
              <div
                className={`relative grid h-10 w-10 place-items-center rounded-full border-[3px] transition-all ${
                  isDone
                    ? "border-[#FFC400] bg-[#FFC400]"
                    : isCurrent
                    ? "border-[#FFC400] bg-[#FFC400] animate-flash-step"
                    : "border-[#FFE89A] bg-white"
                }`}
              >
                {isDone ? (
                  <Check size={18} className="text-black" />
                ) : (
                  <s.icon size={18} className={isCurrent ? "text-black" : "text-black/30"} />
                )}
                <span
                  className={`absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full text-[7px] font-black ${
                    isDone || isCurrent ? "bg-black text-[#FFC400]" : "bg-black/10 text-black/50"
                  }`}
                >
                  {s.num}
                </span>
              </div>
              <p
                className={`mt-1.5 text-center text-[8px] font-bold uppercase leading-tight tracking-wide ${
                  isCurrent ? "text-black" : isDone ? "text-black/60" : "text-black/35"
                }`}
              >
                {s.short}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}