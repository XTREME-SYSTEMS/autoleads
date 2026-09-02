import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function PageStepGuide({ title = "Step-by-Step", steps = [], className = "" }) {
  if (!steps || steps.length === 0) return null;
  return (
    <div className={`rounded-xl border border-black/10 bg-white p-5 ${className}`}>
      <p className="mb-3 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">{title}</p>
      <ol className="space-y-2.5">
        {steps.map((s, i) => {
          const inner = (
            <>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d] text-sm font-black text-black">{i + 1}</span>
              <div className="min-w-0">
                <p className="flex items-center gap-1 text-sm font-black">{s.title}{(s.to || s.onClick) && <ArrowRight size={12} className="text-[#b0a209]" />}</p>
                {s.description && <p className="text-xs text-black/50">{s.description}</p>}
              </div>
            </>
          );
          if (s.to) return <li key={i}><Link to={s.to} className="flex items-start gap-3 rounded-lg p-1 transition hover:bg-black/[.02]">{inner}</Link></li>;
          if (s.onClick) return <li key={i}><button type="button" onClick={s.onClick} className="flex w-full items-start gap-3 rounded-lg p-1 text-left transition hover:bg-black/[.02]">{inner}</button></li>;
          return <li key={i} className="flex items-start gap-3">{inner}</li>;
        })}
      </ol>
    </div>
  );
}