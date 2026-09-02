import React, { useState } from "react";
import { Search, Trash2, RefreshCw } from "lucide-react";
import { SCOPE_NAMES } from "@/lib/scopeMaterials";

export default function MaterialDatabaseTable({ materials, loading, onUpdate, onDelete, onRefresh, refreshing }) {
  const [q, setQ] = useState("");
  const [scope, setScope] = useState("");
  const filtered = (materials || []).filter((m) => {
    const okQ = !q || (m.name || "").toLowerCase().includes(q.toLowerCase()) || (m.manufacturer || "").toLowerCase().includes(q.toLowerCase());
    const okScope = !scope || m.scope === scope;
    return okQ && okScope;
  });
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-black"><Search size={18} className="text-[#b0a209]" /> Material Database</h2>
        <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-bold hover:bg-black/[.02] disabled:opacity-40"><RefreshCw size={14} className={refreshing ? "animate-spin" : ""} /> Refresh Prices</button>
      </div>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search size={16} className="absolute left-3 top-3.5 text-black/35" /><input className="h-11 w-full rounded-lg border border-black/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#f2df0d]" placeholder="Search materials…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <select className="h-11 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d]" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">All scopes</option>
          {SCOPE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="mt-4 overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm">
          <thead className="bg-black/[.02] text-[10px] font-black uppercase text-black/50">
            <tr><th className="p-2 text-left">Material</th><th className="p-2 text-left">Scope</th><th className="p-2 text-left">Unit</th><th className="p-2 text-right">Unit Cost</th><th className="p-2 text-left">Source</th><th className="p-2 w-8"></th></tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-6 text-center text-black/40">Loading…</td></tr> :
             filtered.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-black/40">No materials yet. Ingest from a supplier or add manually.</td></tr> :
             filtered.map((m) => (
              <tr key={m.id} className="border-t border-black/5">
                <td className="p-2 font-bold">{m.name}</td>
                <td className="p-2 text-black/60">{m.scope || "—"}</td>
                <td className="p-2 text-black/60">{m.unit || "EA"}</td>
                <td className="p-2 text-right"><input type="number" className="h-8 w-20 rounded border border-black/10 px-1 text-right text-sm outline-none focus:border-[#f2df0d]" value={m.unit_cost ?? ""} onChange={(e) => onUpdate(m.id, { unit_cost: Number(e.target.value) || null })} /></td>
                <td className="p-2 text-xs text-black/45">{m.source || "manual"}</td>
                <td className="p-2"><button onClick={() => onDelete(m.id)} className="grid h-7 w-7 place-items-center rounded text-black/40 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-black/40">{filtered.length} of {materials.length} materials</p>
    </div>
  );
}