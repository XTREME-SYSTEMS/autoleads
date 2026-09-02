import React, { useState } from "react";
import { Calculator, Plus, X } from "lucide-react";

export default function MaterialCalculator({ materials }) {
  const [rows, setRows] = useState(/** @type {any[]} */ ([]));
  const [matId, setMatId] = useState("");
  const [qty, setQty] = useState("");

  const add = () => {
    const m = materials.find((x) => x.id === matId);
    if (!m) return;
    setRows((p) => [...p, { id: m.id, name: m.name, unit: m.unit || "EA", unit_cost: m.unit_cost || 0, qty: Number(qty) || 1 }]);
    setMatId(""); setQty("");
  };
  const remove = (i) => setRows((p) => p.filter((_, idx) => idx !== i));
  const update = (i, field, v) => setRows((p) => p.map((r, idx) => idx === i ? { ...r, [field]: Number(v) || 0 } : r));
  const total = rows.reduce((s, r) => s + r.qty * r.unit_cost, 0);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-black"><Calculator size={18} className="text-[#b0a209]" /> Material Cost Calculator</h2>
      <p className="mt-1 text-sm leading-6 text-black/55">Build a quick material cost estimate from your database. This is the same cost data the Proposal Creator pulls when generating bids.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <select className="h-11 flex-1 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d]" value={matId} onChange={(e) => setMatId(e.target.value)}>
          <option value="">Select a material…</option>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name} — ${m.unit_cost ?? 0}/{m.unit || "EA"}</option>)}
        </select>
        <input type="number" className="h-11 w-28 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d]" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
        <button onClick={add} disabled={!matId} className="flex h-11 items-center justify-center gap-1.5 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:opacity-40"><Plus size={16} /> Add</button>
      </div>
      {rows.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-lg border border-black/10">
          <table className="w-full text-sm">
            <thead className="bg-black/[.02] text-[10px] font-black uppercase text-black/50"><tr><th className="p-2 text-left">Material</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Unit $</th><th className="p-2 text-right">Total</th><th className="p-2 w-8"></th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-black/5">
                  <td className="p-2 font-bold">{r.name}</td>
                  <td className="p-2 text-right"><input type="number" className="h-8 w-16 rounded border border-black/10 px-1 text-right text-sm outline-none focus:border-[#f2df0d]" value={r.qty} onChange={(e) => update(i, "qty", e.target.value)} /></td>
                  <td className="p-2 text-right"><input type="number" className="h-8 w-20 rounded border border-black/10 px-1 text-right text-sm outline-none focus:border-[#f2df0d]" value={r.unit_cost} onChange={(e) => update(i, "unit_cost", e.target.value)} /></td>
                  <td className="p-2 text-right font-black">${(r.qty * r.unit_cost).toFixed(2)}</td>
                  <td className="p-2"><button onClick={() => remove(i)} className="grid h-7 w-7 place-items-center rounded text-black/40 hover:bg-red-50 hover:text-red-500"><X size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end border-t border-black/10 bg-black/[.02] px-3 py-2 text-sm font-black">Material Total: ${total.toFixed(2)}</div>
        </div>
      )}
    </div>
  );
}