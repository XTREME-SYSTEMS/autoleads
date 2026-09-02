import React from "react";

export default function PageHeader({ eyebrow = "AUTOLEADS Construction Intelligence", title, subtitle = "", actions = null }) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-8">
      <div className="flex-1 min-w-[240px]">
        <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-black/45">{eyebrow}</p>
        <h1 className="font-display text-[30px] md:text-[34px] font-bold tracking-tight mt-1">{title}</h1>
        {subtitle && <p className="text-[14px] text-black/55 mt-1.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}