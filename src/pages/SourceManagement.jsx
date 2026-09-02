import React, { useState } from "react";
import { Globe2, Plus, RefreshCw, Search, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";

const STATUS_COLORS = {
  active: "bg-emerald-50 text-emerald-700",
  paused: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-600",
  unverified: "bg-black/5 text-black/50",
};

export default function SourceManagement() {
  const { records, loading } = useEntityList("ScrapeSource", { sort: "-created_date", limit: 100 });
  const [q, setQ] = useState("");
  const sources = (records || []).filter((s) => !q || (s.name||"").toLowerCase().includes(q.toLowerCase()) || (s.url||"").toLowerCase().includes(q.toLowerCase()));

  return (
    <Page backTo="/dashboard" eyebrow="Source Governance" title="Source Management" description="Register lawful project sources, access rules, cadence, health, coverage, parsers, retries, and receipts."
      actions={<><SecondaryButton><RefreshCw size={16}/>Refresh</SecondaryButton><PrimaryButton><Plus size={17}/>Register Source</PrimaryButton></>}>
      <Card className="p-4">
        <div className="relative">
          <Search size={17} className="absolute left-3 top-3.5 text-black/35"/>
          <input className={`${inputClass} pl-10`} placeholder="Search sources by name or URL…" value={q} onChange={(e)=>setQ(e.target.value)}/>
        </div>
      </Card>
      <div className="mt-5">
        {loading ? <div className="py-12 text-center text-sm text-black/40">Loading sources…</div> :
         sources.length === 0 ? <Card><EmptyState icon={Globe2} title="No sources registered" description="Register a lawful public portal, aggregator, or API to begin automated lead discovery." action={<PrimaryButton>Register Source</PrimaryButton>} minHeight="320px"/></Card> :
         <Card className="overflow-hidden">
           <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-black/10 px-5 py-3 text-xs font-black uppercase text-black/40">
             <span>Source</span><span>Type</span><span>Jurisdiction</span><span>Status</span><span>Records</span>
           </div>
           <div className="divide-y divide-black/5">
             {sources.map((s) => (
               <div key={s.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-4 px-5 py-4">
                 <div><p className="font-black">{s.name}</p>{s.url && <p className="truncate text-xs text-black/40">{s.url}</p>}</div>
                 <span className="text-sm text-black/60">{s.source_type?.replace('_',' ')}</span>
                 <span className="text-sm text-black/60">{s.jurisdiction||"—"}</span>
                 <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-black ${STATUS_COLORS[s.status]||STATUS_COLORS.unverified}`}>
                   {s.status==='error' && <TriangleAlert size={12}/>}
                   {s.status==='active' && <ShieldCheck size={12}/>}
                   {s.status}
                 </span>
                 <span className="text-sm font-black">{s.records_retrieved||0}</span>
               </div>
             ))}
           </div>
         </Card>}
      </div>
    </Page>
  );
}