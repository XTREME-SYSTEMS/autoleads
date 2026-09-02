import React, { useState } from "react";
import { Plus, Trash2, MapPin, Building2, Globe, Layers, Landmark } from "lucide-react";

const GEO_LEVELS = [
  { key: "city", label: "City", icon: MapPin },
  { key: "county", label: "County", icon: Building2 },
  { key: "state", label: "State", icon: Landmark },
  { key: "region", label: "Region", icon: Layers },
  { key: "national", label: "National", icon: Globe },
];

const cellInput = "h-9 w-full rounded-md border border-black/15 bg-white px-2 text-sm outline-none focus:border-[#f2df0d] focus:ring-1 focus:ring-[#f2df0d]/20";

export default function GeoPricingTable({ pricing, setPricing }) {
  const [activeLevel, setActiveLevel] = useState("city");

  const updateRow = (i, field, value) => setPricing(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s));
  const addRow = () => setPricing(prev => [...prev, { scope: "", unit: "SF", city_low: "", city_mid: "", city_high: "", county_low: "", county_mid: "", county_high: "", state_low: "", state_mid: "", state_high: "", region_low: "", region_mid: "", region_high: "", national_low: "", national_mid: "", national_high: "" }]);
  const removeRow = (i) => setPricing(prev => prev.filter((_, idx) => idx !== i));

  const lvl = activeLevel;
  const lowKey = `${lvl}_low`, midKey = `${lvl}_mid`, highKey = `${lvl}_high`;

  return (
    <div className="space-y-3">
      {/* Geo level tabs */}
      <div className="flex flex-wrap gap-1.5">
        {GEO_LEVELS.map(g => (
          <button key={g.key} onClick={() => setActiveLevel(g.key)} className={`flex items-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-black transition ${activeLevel === g.key ? "border-[#f2df0d] bg-[#fdfbe1] text-[#b0a209]" : "border-black/10 bg-white text-black/50 hover:border-black/20"}`}>
            <g.icon size={14} />{g.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-black/10">
        <table className="w-full text-sm">
          <thead className="bg-black/[.02] text-xs font-black uppercase text-black/50">
            <tr>
              <th className="p-2 text-left">Scope</th>
              <th className="p-2 text-left">Unit</th>
              <th className="p-2 text-right">Low ($)</th>
              <th className="p-2 text-right">Mid ($)</th>
              <th className="p-2 text-right">High ($)</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {pricing.map((s, i) => (
              <tr key={i} className="border-t border-black/5">
                <td className="p-2"><input className={cellInput} value={s.scope || ""} onChange={e => updateRow(i, "scope", e.target.value)} placeholder="Scope name" /></td>
                <td className="p-2"><input className={cellInput + " w-20"} value={s.unit || ""} onChange={e => updateRow(i, "unit", e.target.value)} placeholder="SF" /></td>
                <td className="p-2"><input type="number" className={cellInput + " w-24 text-right"} value={s[lowKey] ?? ""} onChange={e => updateRow(i, lowKey, e.target.value)} placeholder="0" /></td>
                <td className="p-2"><input type="number" className={cellInput + " w-24 text-right"} value={s[midKey] ?? ""} onChange={e => updateRow(i, midKey, e.target.value)} placeholder="0" /></td>
                <td className="p-2"><input type="number" className={cellInput + " w-24 text-right"} value={s[highKey] ?? ""} onChange={e => updateRow(i, highKey, e.target.value)} placeholder="0" /></td>
                <td className="p-2"><button onClick={() => removeRow(i)} className="grid h-9 w-9 place-items-center rounded-md text-black/40 hover:bg-red-50 hover:text-red-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} className="flex items-center gap-1.5 rounded-lg border border-dashed border-black/20 px-3 py-2 text-xs font-bold text-black/50 hover:border-[#f2df0d] hover:bg-[#fdfbe1]"><Plus size={14} /> Add scope</button>
    </div>
  );
}