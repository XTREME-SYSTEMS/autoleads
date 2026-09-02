import React from "react";

export default function EmptyState({ title = "No verified records yet", description = "", action = null }) {
  return (
    <div className="rounded-xl border border-dashed border-black/15 bg-white p-10 text-center">
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="text-[13px] text-black/50 mt-1.5 max-w-md mx-auto leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}