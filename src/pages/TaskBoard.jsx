import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Clock3, Filter, Plus } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton, SectionTitle } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";

const STAGES = [
  { key: "open", label: "Open" },
  { key: "in_progress", label: "In Progress" },
  { key: "done", label: "Done" },
];

export default function TaskBoard() {
  const nav = useNavigate();
  const { records, loading } = useEntityList("AgentTask", { sort: "-created_date", limit: 100 });
  const [filter, setFilter] = useState("all");

  const tasks = (records || []).filter((t) => filter === "all" || t.status === filter);

  return (
    <Page backTo="/dashboard" eyebrow="Autopilot Task Board" title="Task Board" description="Track action items, reviews, approvals, and follow-ups across the construction workflow."
      actions={<><SecondaryButton><Filter size={16}/>Filter</SecondaryButton><PrimaryButton onClick={()=>nav('/daily-autopilot')}><Plus size={17}/>New action</PrimaryButton></>}>
      <div className="mb-4 flex gap-2">
        {["all","open","in_progress","done","snoozed"].map((f)=>
          <button key={f} onClick={()=>setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${filter===f?'bg-black text-white':'border border-black/10'}`}>{f.replace('_',' ').toUpperCase()}</button>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {STAGES.map((stage) => {
          const items = tasks.filter((t) => t.status === stage.key);
          return (
            <Card key={stage.key} className="p-4">
              <SectionTitle title={stage.label} action={<span className="text-xs text-black/40">{items.length}</span>}/>
              {loading ? <div className="py-8 text-center text-sm text-black/40">Loading…</div> :
               items.length === 0 ? <EmptyState icon={CheckCircle2} title="No tasks" description="Actions will appear here as the autopilot generates them." minHeight="180px"/> :
               <div className="space-y-3">
                 {items.map((t) => (
                   <div key={t.id} className="rounded-xl border border-black/10 p-4">
                     <div className="flex items-start justify-between gap-2">
                       <h3 className="text-sm font-black">{t.title}</h3>
                       <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${t.priority==='critical'?'bg-red-50 text-red-600':t.priority==='high'?'bg-amber-50 text-amber-700':'bg-black/5 text-black/50'}`}>{t.priority}</span>
                     </div>
                     {t.description && <p className="mt-1 text-xs leading-5 text-black/50">{t.description}</p>}
                     <div className="mt-3 flex items-center justify-between">
                       <span className="inline-flex items-center gap-1 text-xs text-black/40"><Clock3 size={13}/>{t.due_date||'No due date'}</span>
                       {t.linked_route && <button onClick={()=>nav(t.linked_route)} className="text-xs font-black text-[#a09308]">Open →</button>}
                     </div>
                   </div>
                 ))}
               </div>}
            </Card>
          );
        })}
      </div>
    </Page>
  );
}