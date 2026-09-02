import React from "react";

export default function Section({ title, action = null, children = null, className = "" }) {
  return (
    <section className={`rounded-xl border border-black/10 bg-white ${className}`}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-black/[0.07]">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}