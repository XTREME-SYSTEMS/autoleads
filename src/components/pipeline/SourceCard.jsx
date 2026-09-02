import React from "react";

export default function SourceCard({ icon: Icon, label, status, records }) {
  const statusCls = status === "active" ? "text-[#28A745]" : status === "error" ? "text-red-500" : "text-[#666]";
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-[#E0E0E0] bg-white p-4 text-center shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      {Icon && <span className="grid h-10 w-10 place-items-center rounded-full bg-[#FFF8E1] text-[#FFC107]"><Icon size={20} /></span>}
      <span className="line-clamp-1 text-xs font-bold text-black dark:text-white">{label}</span>
      {records != null && <span className="text-[10px] text-[#666] dark:text-white/50">{records} found</span>}
      {status && <span className={`text-[10px] font-bold ${statusCls}`}>{status}</span>}
    </div>
  );
}