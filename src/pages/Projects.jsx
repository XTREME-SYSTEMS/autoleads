import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, FileSearch, MapPin, Plus, Search, ShieldCheck, ShieldAlert } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import PullToRefresh from "@/components/autoleads/PullToRefresh";
import { useEntityList } from "@/hooks/useEntityList";

const STAGE_COLORS = {
  qualification: "bg-blue-50 text-blue-700",
  takeoff: "bg-amber-50 text-amber-700",
  estimating: "bg-purple-50 text-purple-700",
  proposal: "bg-cyan-50 text-cyan-700",
  submitted: "bg-orange-50 text-orange-700",
  won: "bg-emerald-50 text-emerald-700",
  lost: "bg-red-50 text-red-600",
};

const VERIFY_BADGE = {
  verified: { icon: ShieldCheck, cls: "text-emerald-600" },
  unverified: { icon: ShieldAlert, cls: "text-amber-600" },
  failed: { icon: ShieldAlert, cls: "text-red-600" },
};

export default function Projects() {
  const nav = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { records, loading } = useEntityList("Project", { sort: "-created_date", limit: 100, refreshKey });
  const [q, setQ] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(false);
  const projects = (records || []).filter((p) => {
    if (onlyVerified && p.verification_status !== "verified") return false;
    if (q && !(p.title||"").toLowerCase().includes(q.toLowerCase()) && !(p.jurisdiction||"").toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <PullToRefresh onRefresh={() => setRefreshKey(k => k + 1)}>
    <Page backTo="/dashboard" eyebrow="Project Pipeline" title="Projects" description="Manage verified construction projects with provenance, participants, trades, deadlines, plans, and workflow status."
      actions={<PrimaryButton onClick={()=>nav('/leads/new')}><Plus size={17}/>New Project</PrimaryButton>}>
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-3.5 text-black/35"/>
            <input className={`${inputClass} pl-10`} placeholder="Search projects, jurisdictions…" value={q} onChange={(e)=>setQ(e.target.value)}/>
          </div>
          <button onClick={()=>setOnlyVerified(v=>!v)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-bold ${onlyVerified ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-black/10 bg-white text-black/60"}`}>
            <ShieldCheck size={15}/> {onlyVerified ? "Showing verified only" : "Verified only"}
          </button>
        </div>
      </Card>
      <div className="mt-5">
        {loading ? <div className="py-12 text-center text-sm text-black/40">Loading projects…</div> :
         projects.length === 0 ? <Card><EmptyState icon={FileSearch} title="No projects yet" description="Create a new project or run lead discovery to populate the pipeline." action={<PrimaryButton onClick={()=>nav('/leads/new')}>New Project</PrimaryButton>} minHeight="320px"/></Card> :
         <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
           {projects.map((p) => {
             const vMeta = VERIFY_BADGE[p.verification_status] || VERIFY_BADGE.unverified;
             const VIcon = vMeta.icon;
             return (
              <Card key={p.id} className="cursor-pointer p-5 transition hover:border-[#f2df0d]" onClick={()=>nav(`/projects/${p.id}`)}>
                <div className="flex items-start justify-between">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Building2 size={20}/></span>
                  <div className="flex items-center gap-1.5">
                    <VIcon size={14} className={vMeta.cls} title={p.verification_status} />
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STAGE_COLORS[p.stage]||"bg-black/5"}`}>{p.stage}</span>
                  </div>
                </div>
                <h3 className="mt-4 break-words font-black">{p.title}</h3>
                {p.client_name && <p className="mt-1 break-words text-sm text-black/50">{p.client_name}</p>}
                <div className="mt-4 flex items-center justify-between gap-2 text-xs text-black/45">
                  <span className="inline-flex min-w-0 items-center gap-1 truncate"><MapPin size={13} className="shrink-0"/>{p.jurisdiction||"—"}</span>
                  {p.bid_due_date && <span className="shrink-0">{p.bid_due_date}</span>}
                </div>
                {p.value != null && <p className="mt-3 text-lg font-black">${Number(p.value).toLocaleString()}</p>}
              </Card>
             );
           })}
         </div>}
      </div>
    </Page>
    </PullToRefresh>
  );
}