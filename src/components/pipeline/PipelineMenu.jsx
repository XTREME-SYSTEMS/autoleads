import React, { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, ChevronDown, LayoutDashboard } from "lucide-react";
import { PIPELINE_STEPS, HUB_TOOLS } from "@/lib/pipelineSteps";

// Full-screen 8-step navigation overlay for mobile. Every page in the app is reachable
// here, grouped under its pipeline stage — the pipeline is the master hub.
export default function PipelineMenu({ open, onClose }) {
  const [openStep, setOpenStep] = useState(null);
  if (!open) return null;

  const renderTools = (tools) => (
    <div className="grid grid-cols-2 gap-2 p-3">
      {tools.map((t) => {
        const TIcon = t.icon;
        return (
          <Link
            key={t.to}
            to={t.to}
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-[#E0E0E0] bg-white px-3 py-3 text-xs font-bold text-black transition active:scale-[0.98] hover:border-[#FFC107] hover:bg-[#FFFDE7] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white dark:hover:bg-white/5"
          >
            {TIcon ? <TIcon size={14} className="shrink-0 text-[#666] dark:text-white/50" /> : null}
            <span className="min-w-0 flex-1 truncate">{t.label}</span>
          </Link>
        );
      })}
    </div>
  );

  const StepCard = ({ step, isOpen, onToggle }) => {
    const SIcon = step.icon;
    return (
      <div className="overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white dark:border-white/10 dark:bg-[#1a1a1a]">
        <button onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFC107] text-sm font-black text-black shadow-sm">
            {step.number}
          </span>
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-black text-black dark:text-white">{step.title}</span>
            <span className="block text-xs text-[#666] dark:text-white/50">{step.subtitle}</span>
          </span>
          <SIcon size={18} className="shrink-0 text-[#666] dark:text-white/50" />
          <ChevronDown size={18} className={`shrink-0 text-[#666] transition-transform dark:text-white/50 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-[#E0E0E0] dark:border-white/10"
            >
              {renderTools(step.tools)}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 32, stiffness: 320 }}
          className="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-[#F9F9F9] dark:bg-[#0B0B0B]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E0E0E0] bg-[#F9F9F9] px-5 py-4 dark:border-white/10 dark:bg-[#0B0B0B]">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FFC107] text-xs font-black text-black">8</span>
              <h2 className="text-lg font-black text-black dark:text-white">Pipeline Menu</h2>
            </div>
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg bg-black/5 dark:bg-white/10">
              <X size={18} />
            </button>
          </div>

          <div className="px-5 py-4 space-y-3 pb-8">
            {PIPELINE_STEPS.map((step) => (
              <StepCard
                key={step.key}
                step={step}
                isOpen={openStep === step.key}
                onToggle={() => setOpenStep(openStep === step.key ? null : step.key)}
              />
            ))}

            {/* Hub & Admin */}
            <div className="overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white dark:border-white/10 dark:bg-[#1a1a1a]">
              <button
                onClick={() => setOpenStep(openStep === "hub" ? null : "hub")}
                className="flex w-full items-center gap-3 px-4 py-3.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black text-[#FFC107] dark:bg-white dark:text-black">
                  <LayoutDashboard size={16} />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-black text-black dark:text-white">Hub & Admin</span>
                  <span className="block text-xs text-[#666] dark:text-white/50">Setup, reports, system tools</span>
                </span>
                <ChevronDown size={18} className={`shrink-0 text-[#666] transition-transform dark:text-white/50 ${openStep === "hub" ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence initial={false}>
                {openStep === "hub" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-[#E0E0E0] dark:border-white/10"
                  >
                    {renderTools(HUB_TOOLS)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}