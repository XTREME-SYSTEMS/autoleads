import React from "react";
import { ArrowRight } from "lucide-react";

export default function RecordCard({ icon: Icon = null, title = "", meta = "", value = null, status = "", statusCls = "", footer = null, onClick = undefined, actionLabel = "View", children = null, className = "" }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-black/10 bg-white transition hover:border-[#f2df0d] hover:shadow-lg ${className}`}>
      <button onClick={onClick} className="group flex w-full flex-col p-6 text-left">
        <div className="flex items-start justify-between gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#fcf9cf] text-[#b0a209]">{Icon && <Icon size={24}/>}</span>
          {status && <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${statusCls}`}>{status}</span>}
        </div>
        <h3 className="mt-4 break-words text-lg font-black leading-tight">{title}</h3>
        {meta && <p className="mt-1 truncate text-sm text-black/50">{meta}</p>}
        {value != null && <p className="mt-3 text-2xl font-black">{value}</p>}
        {footer}
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-[#b0a209]">{actionLabel} <ArrowRight size={15} className="transition group-hover:translate-x-1"/></span>
      </button>
      {children}
    </div>
  );
}