import React, { useState } from "react";
import { Loader2, Download, Package } from "lucide-react";

const DEFAULT_URL = "https://www.xtremepolishingsystems.com";

export default function MaterialIngestionPanel({ onIngest, ingesting, count }) {
  const [url, setUrl] = useState(DEFAULT_URL);
  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 font-black"><Package size={18} className="text-[#b0a209]" /> Supplier Ingestion</h2>
      <p className="mt-1 text-sm leading-6 text-black/55">Enter your supplier's website and AI will scrape every product — names, categories, units, and prices — straight into your material database. Defaults to your Xtreme Polishing Systems catalog.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          className="h-11 flex-1 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20"
          placeholder="https://supplier.com/products"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          onClick={() => onIngest(url)}
          disabled={ingesting || !url.trim()}
          className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 text-sm font-black text-black disabled:opacity-40 hover:bg-[#f4e431]"
        >
          {ingesting ? <><Loader2 size={16} className="animate-spin" /> Ingesting…</> : <><Download size={16} /> Ingest Materials</>}
        </button>
      </div>
      {count > 0 && <p className="mt-3 text-xs font-bold text-emerald-600">{count} materials ingested into your database.</p>}
    </div>
  );
}