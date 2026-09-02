import React from "react";

export default function StatCard({ stats = [] }) {
  return (
    <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      <div className="flex items-center justify-around">
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <div className="h-10 w-px bg-[#E0E0E0] dark:bg-white/10" />}
            <div className="flex-1 text-center">
              <p className="text-xl font-black text-black dark:text-white">{s.value}</p>
              <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#666] dark:text-white/50">{s.label}</p>
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}