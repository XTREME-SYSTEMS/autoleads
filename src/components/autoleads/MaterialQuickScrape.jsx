import React, { useState } from "react";
import { Loader2, Search, AlertCircle } from "lucide-react";
import { SCOPE_NAMES } from "@/lib/scopeMaterials";

export default function MaterialQuickScrape({ onScrape, scraping }) {
  const [name, setName] = useState("");
  const [scope, setScope] = useState("");
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-black"><AlertCircle size={18} className="text-[#b0a209]" /> Spec Material Not in Stock?</h2>
      <p className="mt-1 text-sm leading-6 text-black/55">When project specs call out a material you don't carry, scrape its current pricing instantly. Many specs allow an "equal alternate" — this finds it and saves it to your database for next time.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_180px_auto]">
        <input className="h-11 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d]" placeholder="Material name / spec (e.g. 'USG Sheetrock UltraLight 1/2')" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="h-11 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d]" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="">Scope…</option>
          {SCOPE_NAMES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={() => onScrape(name, scope)} disabled={scraping || !name.trim()} className="flex h-11 items-center justify-center gap-2 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:opacity-40">
          {scraping ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Scrape
        </button>
      </div>
    </div>
  );
}