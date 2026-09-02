import React,{useMemo} from "react";
import {AlertTriangle,ArrowRight,BriefcaseBusiness,CheckCircle2,CircleDollarSign,FileCheck2,Gavel,HardHat,Search,Send,Timer,Workflow} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useEntityList} from "@/hooks/useEntityList";
import {CommercialPage,IndustrialTitle,StatusPill,Surface,money} from "@/components/CommercialMobileUI";

const STAGES=[
  {key:"qualification",label:"Qualified",icon:Search},
  {key:"takeoff",label:"Takeoff",icon:BriefcaseBusiness},
  {key:"estimating",label:"Estimating",icon:CircleDollarSign},
  {key:"proposal",label:"Bid Ready",icon:FileCheck2},
  {key:"submitted",label:"Submitted",icon:Send},
  {key:"won",label:"Won",icon:Gavel},
  {key:"scheduled",label:"Scheduled",icon:Timer},
  {key:"in_progress",label:"In Progress",icon:HardHat},
  {key:"completed",label:"Completed",icon:CheckCircle2},
  {key:"lost",label:"Lost",icon:AlertTriangle},
];

export default function AutoPipeline(){
  const nav=useNavigate();
  const {records:projects,loading}=useEntityList("Project",{sort:"-created_date",limit:500});
  const {records:proposals}=useEntityList("Proposal",{limit:500});
  const {records:jobs}=useEntityList("Job",{limit:500});
  const {records:actions}=useEntityList("ActionItem",{filter:{status:"open"},limit:300});
  const clean=(projects||[]).filter(p=>p.data_class!=="NON_PRODUCTION_EXAMPLE");
  const projectMap=useMemo(()=>Object.fromEntries(clean.map(p=>[p.id,p])),[clean]);
  const totals=useMemo(()=>STAGES.map(stage=>{const rows=clean.filter(p=>p.stage===stage.key);return {...stage,rows,count:rows.length,value:rows.reduce((s,p)=>s+Number(p.value||0),0)}}),[clean]);
  const proposalValue=(proposals||[]).filter(p=>["approved","delivered","responded"].includes(p.status)).reduce((s,p)=>s+Number(p.total_value||0),0);
  const wonValue=clean.filter(p=>["won","scheduled","in_progress","completed"].includes(p.stage)).reduce((s,p)=>s+Number(p.value||0),0);
  const stuck=(actions||[]).filter(a=>["critical","high"].includes(a.priority));
  const nextProjects=clean.filter(p=>!["lost","completed"].includes(p.stage)).sort((a,b)=>{const ad=a.bid_due_date?new Date(a.bid_due_date).getTime():Infinity;const bd=b.bid_due_date?new Date(b.bid_due_date).getTime():Infinity;return ad-bd}).slice(0,6);

  return <CommercialPage><IndustrialTitle>Pipeline Command</IndustrialTitle>
    <div className="grid grid-cols-3 gap-3"><Kpi label="Active Projects" value={String(clean.filter(p=>!["lost","completed"].includes(p.stage)).length)}/><Kpi label="Approved / Sent Bids" value={money(proposalValue,true)} accent/><Kpi label="Won Contract Value" value={money(wonValue,true)} success/></div>
    {stuck.length>0&&<Surface className="mt-4 flex items-start gap-3 border-red-200 bg-red-50 p-4"><AlertTriangle size={22} className="mt-0.5 shrink-0 text-red-600"/><div><p className="font-semibold text-red-900">{stuck.length} high-priority item{stuck.length===1?"":"s"} need attention</p><button onClick={()=>nav('/tasks')} className="mt-1 text-sm font-bold text-red-700">Open action queue →</button></div></Surface>}

    <h3 className="mb-3 mt-6 font-brand text-[18px] font-bold uppercase">Operating Stages</h3>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{totals.map(stage=>{const Icon=stage.icon;return <button key={stage.key} onClick={()=>nav(stage.key==="lost"?'/bids':stage.key==="in_progress"||stage.key==="scheduled"||stage.key==="completed"?'/jobs':'/bids')} className="rounded-2xl border border-black/10 bg-white p-4 text-left shadow-[0_8px_20px_rgba(15,23,42,.05)]"><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#FFF7DA] text-[#D99D00]"><Icon size={22}/></span><p className="mt-3 font-brand text-sm font-bold uppercase">{stage.label}</p><p className="mt-1 text-2xl font-black">{stage.count}</p><p className="text-xs font-semibold text-black/45">{money(stage.value,true)}</p></button>})}</div>

    <div className="mb-3 mt-6 flex items-center justify-between"><h3 className="font-brand text-[18px] font-bold uppercase">What Needs Attention Next</h3><Workflow size={20} className="text-[#D99D00]"/></div>
    <Surface className="divide-y divide-black/[.07]">{loading?<div className="p-6 text-center text-sm text-black/45">Loading real pipeline state…</div>:nextProjects.length===0?<div className="p-6 text-center text-sm text-black/45">No active projects.</div>:nextProjects.map(p=><button key={p.id} onClick={()=>nav(`/projects/${p.id}`)} className="flex min-h-[82px] w-full items-center gap-3 px-4 text-left"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate font-semibold">{p.title}</p><StatusPill tone={p.stage==="submitted"?"info":p.stage==="won"?"success":"warning"}>{p.stage}</StatusPill></div><p className="mt-1 text-sm text-black/45">{p.authority||p.client_name||p.jurisdiction||"Authority not published"} · {money(p.value,true)}</p></div><ArrowRight size={19} className="shrink-0 text-black/35"/></button>)}</Surface>

    <Surface className="mt-4 p-4"><p className="font-brand text-xs font-bold uppercase text-[#D99D00]">Job State Truth</p><p className="mt-1 text-sm text-black/60">{(jobs||[]).length} Job record{(jobs||[]).length===1?"":"s"} exist. Scheduling is driven by Job.start_time, never by bid due date.</p>{(jobs||[]).slice(0,3).map(j=><p key={j.id} className="mt-2 text-sm font-semibold">{j.title} · {j.status} · {projectMap[j.project_id]?.title||"Linked project"}</p>)}</Surface>
  </CommercialPage>;
}
function Kpi({label,value,accent=false,success=false}){return <Surface className="p-4 text-center"><p className={`text-[24px] font-black ${accent?'text-[#D99D00]':success?'text-emerald-600':''}`}>{value}</p><p className="mt-2 font-brand text-[10px] font-bold uppercase leading-tight text-black/55">{label}</p></Surface>}