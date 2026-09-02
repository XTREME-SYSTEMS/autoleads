import React from "react";
import { Loader2 } from "lucide-react";

export default function StepSection({ number = null, title = "", subtitle = "", children = null, ctaLabel = "", ctaIcon: Icon = null, onCta = undefined, busy = false, disabled = false }) {
  return (
    <div className="border-b border-[#E0E0E0] px-5 py-6 dark:border-white/10">
      <div className="mx-auto max-w-[600px]">
        <div className="mb-4 flex items-center gap-3">
          {number != null && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#FFC107] text-sm font-black text-black shadow-sm">
              {number}
            </span>
          )}
          <div>
            <h2 className="text-xl font-black tracking-tight text-black dark:text-white">{title}</h2>
            {subtitle && <p className="mt-0.5 text-sm text-[#666] dark:text-white/50">{subtitle}</p>}
          </div>
        </div>
        {children}
        {ctaLabel && (
          <button
            onClick={onCta}
            disabled={busy || disabled}
            className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFC107] text-sm font-black text-black shadow-sm transition hover:bg-[#FFD54F] disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : Icon ? <Icon size={18} /> : null}
            {busy ? "WORKING…" : ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}