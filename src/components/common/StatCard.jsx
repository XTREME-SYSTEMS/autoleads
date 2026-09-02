import React from "react";

export default function StatCard({ icon: Icon = null, label = "", value = "—", note = "" }) {
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      {Icon && (
        <div className="w-9 h-9 rounded-lg bg-black/[0.04] grid place-items-center mb-4">
          <Icon className="w-4 h-4 text-black/70" />
        </div>
      )}
      <p className="text-[12px] text-black/55">{label}</p>
      <p className="text-[26px] font-bold tracking-tight mt-1">{value ?? "—"}</p>
      {note && <p className="text-[11px] text-black/40 mt-0.5">{note}</p>}
    </div>
  );
}