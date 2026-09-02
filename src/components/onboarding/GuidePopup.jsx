import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X } from "lucide-react";

export default function GuidePopup({ step, onContinue, onBack, onClose }) {
  return (
    <AnimatePresence>
      {step && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.35 }}
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={onClose} className="absolute right-4 top-4 text-black/30 hover:text-black/60">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-[#FFC400] text-black">
                <step.icon size={24} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wide text-[#D99D00]">Step {step.num} of 10</p>
                <h3 className="text-lg font-black leading-tight">{step.title}</h3>
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-black/70">{step.guide}</p>
            {step.results && (
              <div className="mt-3 rounded-lg bg-[#FFF7DA] p-3">
                <p className="text-[10px] font-black uppercase text-[#D99D00]">What you get</p>
                <p className="mt-1 text-xs leading-5 text-black/70">{step.results}</p>
              </div>
            )}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={onContinue}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FFC400] px-5 py-3 font-black text-black active:scale-[.98]"
              >
                Continue <ArrowRight size={18} />
              </button>
              <button
                onClick={onBack}
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-black/15 text-black/60 active:scale-[.98]"
              >
                <ArrowLeft size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}