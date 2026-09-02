import React, { useState } from "react";
import { Filter, Search, UserRound } from "lucide-react";
import { Card, EmptyState, Page, inputClass } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";
import MobileSelect from "@/components/autoleads/MobileSelect";

const ROLE_COLORS = {
  owner: "bg-purple-50 text-purple-700",
  architect: "bg-blue-50 text-blue-700",
  engineer: "bg-cyan-50 text-cyan-700",
  gc: "bg-emerald-50 text-emerald-700",
  subcontractor: "bg-amber-50 text-amber-700",
  supplier: "bg-orange-50 text-orange-700",
  other: "bg-black/5 text-black/50",
};

export default function ContactDirectory(){
  const {records, loading} = useEntityList("Contact", {sort: "-created_date", limit: 100});
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const contacts = (records||[]).filter((c)=>!q || (c.full_name||"").toLowerCase().includes(q.toLowerCase()) || (c.company_name||"").toLowerCase().includes(q.toLowerCase()));

  return <Page backTo="/dashboard" title="Contact Directory" description="Browse provenance-backed contacts — owners, architects, engineers, GCs, subcontractors, and suppliers.">
    <Card className="p-4"><div className="grid gap-3 md:grid-cols-[1.8fr_1fr_auto]"><div className="relative"><Search className="absolute left-3 top-3.5 text-black/35" size={17}/><input className={`${inputClass} pl-10`} placeholder="Search by name or company…" value={q} onChange={(e)=>setQ(e.target.value)}/></div><MobileSelect className={inputClass} value="" onChange={() => {}}><option value="">All Roles</option><option value="owner">Owner</option><option value="architect">Architect</option><option value="engineer">Engineer</option><option value="gc">GC</option><option value="subcontractor">Subcontractor</option><option value="supplier">Supplier</option></MobileSelect><button className="grid h-11 w-11 place-items-center rounded-lg border border-black/15"><Filter size={18}/></button></div></Card>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
      <Card>
        <div className="border-b border-black/10 px-5 py-4 font-black">All Contacts</div>
        {loading ? <div className="py-12 text-center text-sm text-black/40">Loading…</div> :
         contacts.length === 0 ? <EmptyState icon={UserRound} title="No contacts yet" description="Import or discover contacts from verified project and company records." minHeight="320px"/> :
         <div className="divide-y divide-black/5">
           {contacts.map((c)=>(
             <button key={c.id} onClick={()=>setSelected(c)} className={`flex w-full items-center gap-3 p-4 text-left hover:bg-black/[.02] ${selected?.id===c.id?'bg-[#fdfbe1]':''}`}>
               <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fcf9cf] text-[#b0a209]"><UserRound size={18}/></span>
               <div className="min-w-0 flex-1">
                 <h3 className="truncate text-sm font-black">{c.full_name}</h3>
                 <p className="truncate text-xs text-black/50">{c.title||c.role||"—"} · {c.company_name||"—"}</p>
               </div>
               <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${ROLE_COLORS[c.role]||ROLE_COLORS.other}`}>{c.role}</span>
             </button>
           ))}
         </div>}
      </Card>
      <Card>
        <div className="border-b border-black/10 px-5 py-4 font-black">Contact Details</div>
        {selected ? (
          <div className="p-5">
            <h3 className="font-black">{selected.full_name}</h3>
            <p className="mt-1 text-sm text-black/50">{selected.title}</p>
            <p className="text-sm text-black/50">{selected.company_name}</p>
            <div className="mt-4 space-y-2 text-sm">
              {selected.email && <p className="text-blue-600">{selected.email}</p>}
              {selected.phone && <p>{selected.phone}</p>}
              {selected.last_contact_date && <p className="text-black/50">Last contact: {selected.last_contact_date}</p>}
            </div>
            {selected.confidence!=null && <div className="mt-4"><div className="h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#f2df0d]" style={{width:`${Math.round(selected.confidence*100)}%`}}/></div><p className="mt-1 text-xs text-black/40">Source confidence: {Math.round(selected.confidence*100)}%</p></div>}
          </div>
        ) : <EmptyState icon={UserRound} title="Select a contact" description="Choose a verified contact to review their role, company, and relationship history."/>}
      </Card>
    </div>
  </Page>;
}