import React, { useState } from "react";
import { Building2, Filter, Search } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";
import MobileSelect from "@/components/autoleads/MobileSelect";

const REL_COLORS = {
  none: "bg-black/5 text-black/40",
  weak: "bg-amber-50 text-amber-700",
  moderate: "bg-blue-50 text-blue-700",
  strong: "bg-emerald-50 text-emerald-700",
};

export default function ContractorDirectory(){
  const {records, loading} = useEntityList("CompanyProfile", {sort: "-created_date", limit: 100});
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const contractors = (records||[]).filter((c)=>!q || (c.name||"").toLowerCase().includes(q.toLowerCase()) || (c.trade||"").toLowerCase().includes(q.toLowerCase()));

  return <Page backTo="/dashboard" title="Contractor Directory" description="Find and connect with provenance-backed contractors for your projects.">
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-[1.8fr_1fr_1fr_auto]"><div className="relative"><Search className="absolute left-3 top-3.5 text-black/35" size={17}/><input className={`${inputClass} pl-10`} placeholder="Search by trade, company, or keyword…" value={q} onChange={(e)=>setQ(e.target.value)}/></div><MobileSelect className={inputClass} value="" onChange={() => {}}><option value="">All Trades</option></MobileSelect><MobileSelect className={inputClass} value="" onChange={() => {}}><option value="">All Locations</option></MobileSelect><button className="grid h-11 w-11 place-items-center rounded-lg border border-black/15"><Filter size={18}/></button></div></Card>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
      <Card>
        <div className="border-b border-black/10 px-5 py-4"><button className="border-b-2 border-[#f2df0d] pb-3 text-sm font-black">All Contractors</button><button className="ml-6 pb-3 text-sm text-black/45">My Connections</button></div>
        {loading ? <div className="py-12 text-center text-sm text-black/40">Loading…</div> :
         contractors.length === 0 ? <EmptyState icon={Building2} title="No contractors yet" description="Import or lawfully discover contractor records, then verify provenance before outreach." action={<PrimaryButton>Search Contractors</PrimaryButton>}/> :
         <div className="divide-y divide-black/5">
           {contractors.map((c)=>(
             <button key={c.id} onClick={()=>setSelected(c)} className={`flex w-full items-center gap-3 p-4 text-left hover:bg-black/[.02] ${selected?.id===c.id?'bg-[#fdfbe1]':''}`}>
               <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Building2 size={18}/></span>
               <div className="min-w-0 flex-1">
                 <h3 className="truncate text-sm font-black">{c.name}</h3>
                 <p className="truncate text-xs text-black/50">{c.trade||"—"} · {[c.city,c.state].filter(Boolean).join(", ")||"No address"}</p>
               </div>
               <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${REL_COLORS[c.relationship_strength]||REL_COLORS.none}`}>{c.relationship_strength||"none"}</span>
             </button>
           ))}
         </div>}
      </Card>
      <Card>
        <div className="border-b border-black/10 px-5 py-4 font-black">Contractor Details</div>
        {selected ? (
          <div className="p-5">
            <h3 className="font-black">{selected.name}</h3>
            <p className="mt-1 text-sm text-black/50">{selected.trade}</p>
            <div className="mt-4 space-y-2 text-sm">
              {selected.website && <p className="text-blue-600">{selected.website}</p>}
              {selected.phone && <p>{selected.phone}</p>}
              {selected.email && <p>{selected.email}</p>}
              {selected.address && <p className="text-black/50">{selected.address}</p>}
              {selected.license_number && <p><span className="font-bold">License:</span> {selected.license_number}</p>}
              {selected.bonding_capacity!=null && <p><span className="font-bold">Bonding:</span> ${Number(selected.bonding_capacity).toLocaleString()}</p>}
              {selected.prior_awards!=null && <p><span className="font-bold">Prior awards:</span> {selected.prior_awards}</p>}
            </div>
            {selected.confidence!=null && <div className="mt-4"><div className="h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#f2df0d]" style={{width:`${Math.round(selected.confidence*100)}%`}}/></div><p className="mt-1 text-xs text-black/40">Source confidence: {Math.round(selected.confidence*100)}%</p></div>}
          </div>
        ) : <EmptyState icon={Building2} title="Select a contractor" description="Choose a verified contractor record to review licenses, sources, projects, and contacts."/>}
      </Card>
    </div>
  </Page>;
}