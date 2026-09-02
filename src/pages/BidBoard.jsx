import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BriefcaseBusiness, CalendarDays, FileText, Plus, Search, Zap } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";
import ProposalCreator from "@/components/autoleads/ProposalCreator";
import PageStepGuide from "@/components/autoleads/PageStepGuide";

const STAGES = [
  { key: "qualification", label: "Qualification" },
  { key: "takeoff", label: "Takeoff" },
  { key: "estimating", label: "Estimating" },
  { key: "proposal", label: "Proposal" },
  { key: "submitted", label: "Submitted" },
  { key: "won", label: "Won" },
];

export default function BidBoard(){
  const nav = useNavigate();
  const {records, loading} = useEntityList("Project", {sort: "-created_date", limit: 200});
  const [q, setQ] = useState("");
  const all = records || [];
  const filtered = all.filter((p)=>!q || (p.title||"").toLowerCase().includes(q.toLowerCase()) || (p.client_name||"").toLowerCase().includes(q.toLowerCase()));

  const [showCreator, setShowCreator] = useState(true);

  return <Page backTo="/dashboard" eyebrow="Auto Bids" title="Bid Board" description="Convert qualified opportunities into controlled takeoffs, estimates, proposals, approvals, submissions, and follow-ups." actions={<><SecondaryButton onClick={()=>setShowCreator(v=>!v)}><Zap size={16}/>{showCreator?'Hide':'Show'} Proposal Creator</SecondaryButton><SecondaryButton><CalendarDays size={16}/>Bid Calendar</SecondaryButton><PrimaryButton onClick={()=>nav('/leads/new')}><Plus size={16}/>Create Bid</PrimaryButton></>}>
    <PageStepGuide className="mb-5" title="How to use this page — Step-by-Step" steps={[{title:"Review qualified opportunities",description:"Leads pulled in from Auto Scrape show up in the Qualification column."},{title:"Run the Proposal Creator",description:"Generate a draft proposal from a job description using your pricing and materials."},{title:"Move bids through stages",description:"Qualification → Takeoff → Estimating → Proposal → Submitted → Won."},{title:"Open any bid for full detail",description:"Click a card to open takeoff, estimate, and proposal tools."}]} />
    {showCreator && <div className="mb-6"><ProposalCreator/></div>}
    <Card className="mb-5 p-4"><div className="relative max-w-xl"><Search size={17} className="absolute left-3 top-3.5 text-black/35"/><input className={`${inputClass} pl-10`} placeholder="Search bids, projects, GCs, or due dates…" value={q} onChange={(e)=>setQ(e.target.value)}/></div></Card>
    <div className="grid gap-3 overflow-x-auto pb-2 lg:grid-cols-6">
      {STAGES.map((s)=>{
        const items = filtered.filter((p)=>p.stage===s.key);
        return (
          <Card key={s.key} className="min-w-[230px]">
            <div className="flex items-center justify-between border-b border-black/10 px-4 py-3"><span className="text-sm font-black">{s.label}</span><span className="rounded-full bg-[#fbf6bc] px-2 py-1 text-[10px]">{items.length}</span></div>
            {loading ? <div className="py-8 text-center text-sm text-black/40">Loading…</div> :
             items.length === 0 ? <EmptyState icon={s.key==='proposal'?FileText:BriefcaseBusiness} title="No bids" description={`No bids in ${s.label.toLowerCase()}.`} minHeight="200px"/> :
             <div className="space-y-2 p-3">
               {items.map((p)=>(
                 <div key={p.id} className="cursor-pointer rounded-lg border border-black/10 p-3 hover:border-[#f2df0d]" onClick={()=>nav(`/projects/${p.id}`)}>
                   <h3 className="text-sm font-black leading-tight">{p.title}</h3>
                   {p.client_name && <p className="mt-1 text-xs text-black/45">{p.client_name}</p>}
                   {p.value!=null && <p className="mt-2 text-sm font-black">${Number(p.value).toLocaleString()}</p>}
                   {p.bid_due_date && <p className="mt-1 text-xs text-[#a09308]">Due {p.bid_due_date}</p>}
                 </div>
               ))}
             </div>}
          </Card>
        );
      })}
    </div>
  </Page>;
}