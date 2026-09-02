import React,{useMemo} from "react";
import {CalendarDays,CheckCircle2,Clock3,HardHat,MapPin,Users} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {useEntityList} from "@/hooks/useEntityList";
import {CommercialPage,IndustrialTitle,StatusPill,Surface,fmtDate} from "@/components/CommercialMobileUI";

const tone={scheduled:"info",in_progress:"warning",completed:"success",cancelled:"danger"};
export default function JobStatus(){
  const nav=useNavigate();
  const {records:jobs,loading}=useEntityList("Job",{sort:"start_time",limit:300});
  const {records:projects}=useEntityList("Project",{limit:500});
  const projectMap=useMemo(()=>Object.fromEntries((projects||[]).map(p=>[p.id,p])),[projects]);
  const active=(jobs||[]).filter(j=>j.status!=="cancelled");
  const counts={scheduled:active.filter(j=>j.status==="scheduled").length,in_progress:active.filter(j=>j.status==="in_progress").length,completed:active.filter(j=>j.status==="completed").length};
  return <CommercialPage><IndustrialTitle>Jobs In Progress</IndustrialTitle>
    <div className="grid grid-cols-3 gap-3"><Kpi icon={CalendarDays} value={counts.scheduled} label="Scheduled"/><Kpi icon={HardHat} value={counts.in_progress} label="In Progress" accent/><Kpi icon={CheckCircle2} value={counts.completed} label="Completed" success/></div>
    <div className="mb-3 mt-6 flex items-center justify-between"><h3 className="font-brand text-[18px] font-bold uppercase">Active Jobs</h3><p className="text-xs text-black/45">Real Job records only</p></div>
    {loading?<Surface className="p-8 text-center text-sm text-black/45">Loading job schedule…</Surface>:active.length===0?<Surface className="p-8 text-center"><HardHat size={36} className="mx-auto text-[#D99D00]"/><p className="mt-3 font-brand text-xl font-bold uppercase">No jobs scheduled yet</p><p className="mx-auto mt-2 max-w-md text-sm text-black/50">A won project is not automatically a job. Jobs appear only after a real Job record and start time exist.</p></Surface>:<div className="space-y-4">{active.map(job=>{const p=projectMap[job.project_id];return <Surface key={job.id} className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-brand text-xs font-bold uppercase text-[#D99D00]">{p?.authority||p?.client_name||"Active project"}</p><h2 className="mt-1 text-xl font-bold leading-tight">{job.title}</h2></div><StatusPill tone={tone[job.status]||"neutral"}>{String(job.status||"scheduled").replace("_"," ")}</StatusPill></div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2"><Info icon={CalendarDays} label="Start" value={job.start_time?fmtDate(job.start_time):"Not scheduled"}/><Info icon={Clock3} label="End" value={job.end_time?fmtDate(job.end_time):"Not set"}/><Info icon={Users} label="Crew" value={job.crew_name||"Not assigned"}/><Info icon={MapPin} label="Site" value={job.address||p?.address||"Not published"}/></div>
        {job.notes&&<p className="mt-3 rounded-xl bg-black/[.025] p-3 text-sm leading-6 text-black/60">{job.notes}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>nav(`/projects/${job.project_id}`)} className="min-h-12 rounded-lg border border-black/15 font-brand text-sm font-bold uppercase">Project</button><button onClick={()=>nav('/calendar')} className="min-h-12 rounded-lg bg-[#FFC400] font-brand text-sm font-bold uppercase">Schedule</button></div>
      </Surface>})}</div>}
  </CommercialPage>;
}
function Kpi({icon:Icon,value,label,accent=false,success=false}){return <Surface className="p-4 text-center"><span className={`mx-auto grid h-10 w-10 place-items-center rounded-full ${accent?'bg-[#FFF7DA] text-[#D99D00]':success?'bg-emerald-50 text-emerald-600':'bg-black/[.04]'}`}><Icon size={20}/></span><p className="mt-2 text-2xl font-black">{value}</p><p className="mt-1 font-brand text-[10px] font-bold uppercase text-black/55">{label}</p></Surface>}
function Info({icon:Icon,label,value}){return <div className="flex items-start gap-2 rounded-xl border border-black/[.07] p-3"><Icon size={18} className="mt-0.5 shrink-0 text-[#D99D00]"/><div><p className="font-brand text-[10px] font-bold uppercase text-black/40">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p></div></div>}