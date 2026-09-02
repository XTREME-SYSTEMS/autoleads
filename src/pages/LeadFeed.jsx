import React,{useEffect,useMemo,useState} from "react";
import {Building2,CalendarDays,CheckCircle2,ChevronRight,Download,Flame,Loader2,MapPin,Play,ShieldCheck,Trash2,Users} from "lucide-react";
import {useNavigate} from "react-router-dom";
import {base44} from "@/api/base44Client";
import {useEntityList} from "@/hooks/useEntityList";
import {useOrgContext} from "@/hooks/useOrgContext";
import {BackLink,CommercialPage,IndustrialTitle,PrimaryAction,StatusPill,Surface,fmtDate,money} from "@/components/CommercialMobileUI";
import MultiSelectDropdown from "@/components/pipeline/MultiSelectDropdown";
import ProjectDetailsPanel from "@/components/leadfeed/ProjectDetailsPanel";
import {US_STATES,getCounties,getCities,TRADES} from "@/lib/geoData";
import {LEAD_CATEGORIES,categorizeProject,categoryMeta} from "@/lib/leadCategory";
import {useOrgTradeFilter} from "@/hooks/useOrgTradeFilter";

const ACTIVE=["qualification","takeoff","estimating","proposal","submitted"];
export default function LeadFeed(){
  const nav=useNavigate();   const [refreshKey,setRefreshKey]=useState(0);
  const {records,loading}=useEntityList("Project",{sort:"-bid_due_date",limit:250,refreshKey});
  const [busy,setBusy]=useState(null); const [selected,setSelected]=useState(new Set()); const [gathering,setGathering]=useState(false); const [passTarget,setPassTarget]=useState(null); const [reason,setReason]=useState(""); const [selState,setSelState]=useState(""); const [selCities,setSelCities]=useState([]); const [selTrades,setSelTrades]=useState([]); const [scraping,setScraping]=useState(false);   const [expanded,setExpanded]=useState(new Set()); const [cat,setCat]=useState("residential"); const [deleting,setDeleting]=useState(false); const [confirmDeleteAll,setConfirmDeleteAll]=useState(false);
  const {orgId}=useOrgContext();
  const {matchesTrade}=useOrgTradeFilter();
  useEffect(()=>{if(!orgId)return;let live=true;(async()=>{const org=await base44.entities.Organization.get(orgId).catch(()=>null);if(!live||!org)return;const tokens=[...new Set((org.trade||"").toLowerCase().split(/[,/]+/).flatMap(s=>s.trim().split(/\s+/)).map(s=>s.trim()).filter(s=>s.length>=4))];if(tokens.length)setSelTrades(tokens);})();return()=>{live=false}},[orgId]);
  const runScrape=async()=>{setScraping(true);try{base44.functions.invoke('runAutoScrape',{}).catch(()=>{});}finally{setTimeout(()=>setScraping(false),12000)}};
  const cityOptions=useMemo(()=>{if(!selState)return[];const s=new Set();getCounties(selState).forEach(c=>getCities(selState,c).forEach(ci=>s.add(ci)));return[...s].sort().map(c=>({value:c,label:c}))},[selState]);
  const tradeOptions=useMemo(()=>TRADES.map(t=>({value:t,label:t})),[]);
  const categorized=useMemo(()=>(records||[]).filter(p=>ACTIVE.includes(p.stage)&&p.data_class!=="NON_PRODUCTION_EXAMPLE").map(p=>({...p,_category:categorizeProject(p)})),[records]);
  const counts=useMemo(()=>{const c={residential:0,commercial:0,gov:0};(categorized||[]).forEach(p=>{c[p._category]=(c[p._category]||0)+1});return c},[categorized]);
  const projects=useMemo(()=>(categorized||[]).filter(p=>{
    if(!matchesTrade(p))return false;
    // Exclude expired leads (bid due date before today)
    if(p.bid_due_date){const due=new Date(p.bid_due_date);const today=new Date();today.setHours(0,0,0,0);if(due<today)return false}
    // Exclude jobs missing specs and information
    const hasInfo=Boolean((p.specs||"").trim()||(p.description||"").trim()||(p.contract_info||"").trim());
    if(!hasInfo)return false;
    if(cat&&p._category!==cat)return false;
    if(selState){const hay=`${p.jurisdiction||""} ${p.address||""}`.toLowerCase();const stateName=(US_STATES.find(s=>s.code===selState)||{}).name||"";if(!hay.includes(selState.toLowerCase())&&!hay.includes(stateName.toLowerCase()))return false}
    if(selCities.length){const hay=`${p.jurisdiction||""} ${p.address||""}`.toLowerCase();if(!selCities.some(c=>hay.includes(c.toLowerCase())))return false}
    if(selTrades.length){const hay=`${p.trade||""} ${p.title||""} ${p.project_type||""}`.toLowerCase();if(!selTrades.some(t=>hay.includes(t.toLowerCase())))return false}
    return true
  }).sort((a,b)=>(Number(b.bidability_score||0)-Number(a.bidability_score||0))||(Number(b.value||0)-Number(a.value||0))),[categorized,cat,selState,selCities,selTrades,matchesTrade]);
  const activeFilters=[selState,...selCities,...selTrades].filter(Boolean).length;
  const clearFilters=()=>{setSelState("");setSelCities([]);setSelTrades([])};
  const toggleSelect=(id)=>{setSelected(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next})};
  const selectAll=()=>{setSelected(new Set(projects.map(p=>p.id)))};
  const clearSel=()=>{setSelected(new Set())};
  const toggleExpand=(id)=>{setExpanded(prev=>{const next=new Set(prev);if(next.has(id))next.delete(id);else next.add(id);return next})};
  const gatherAll=async()=>{if(selected.size===0)return;setGathering(true);try{await base44.functions.invoke('batchGatherProjectDetails',{project_ids:[...selected]});clearSel();nav('/takeoff-evidence')}finally{setGathering(false)}};
  const allSelected=projects.length>0&&selected.size===projects.length;
  const pursue=async(p)=>{setBusy(p.id);try{await base44.entities.PipelineEvent.create({organization_id:p.organization_id,project_id:p.id,step:"lead",status:"completed",event_type:"pursue",message:"Operator chose to pursue this opportunity.",occurred_at:new Date().toISOString()});if(p.stage==="qualification")await base44.entities.Project.update(p.id,{stage:"takeoff"});nav(`/projects/${p.id}`)}finally{setBusy(null)}};
  const decline=async()=>{if(!passTarget||!reason.trim())return;setBusy(passTarget.id);try{await base44.entities.PipelineEvent.create({organization_id:passTarget.organization_id,project_id:passTarget.id,step:"lead",status:"completed",event_type:"decline_reason",message:reason.trim(),occurred_at:new Date().toISOString()});await base44.entities.Project.update(passTarget.id,{stage:"lost"});setPassTarget(null);setReason("")}finally{setBusy(null)}};
  const deleteLead=async(p)=>{if(!confirm(`Delete "${p.title}"? This cannot be undone.`))return;setBusy(p.id);try{await base44.entities.Project.delete(p.id);setRefreshKey(k=>k+1)}catch(e){alert('Delete failed: '+(e?.message||'unknown error'))}finally{setBusy(null)}};
  const deleteAllVisible=async()=>{setDeleting(true);try{const ids=projects.map(p=>p.id);let ok=0,fail=0;for(const id of ids){try{await base44.entities.Project.delete(id);ok++}catch{fail++}}setConfirmDeleteAll(false);setRefreshKey(k=>k+1);alert(`Deleted ${ok} lead${ok===1?'':'s'}${fail?`, ${fail} failed`:''}.`)}catch(e){alert('Delete all failed: '+(e?.message||'unknown error'))}finally{setDeleting(false)}};
  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/><IndustrialTitle compact>Hot Opportunities</IndustrialTitle>
    <Surface className="mb-4 p-4">
      <div className="grid gap-3">
        <label>
          <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-black/55">State</span>
          <select value={selState} onChange={e=>{setSelState(e.target.value);setSelCities([])}} className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm font-medium outline-none focus:border-[#FFC400] focus:ring-2 focus:ring-[#FFC400]/20">
            <option value="">All States</option>
            {US_STATES.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
        </label>
        <MultiSelectDropdown label="City" options={cityOptions} selected={selCities} onChange={setSelCities} placeholder={selState?"Select cities":"Select state first"} disabled={!selState} searchable/>
        <MultiSelectDropdown label="Trade" options={tradeOptions} selected={selTrades} onChange={setSelTrades} placeholder="Select trades" searchable/>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        {activeFilters>0&&<button onClick={clearFilters} className="text-xs font-bold text-[#D99D00]">Clear filters ({activeFilters})</button>}
        <button onClick={runScrape} disabled={scraping} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#FFC400] px-4 font-brand text-sm font-bold uppercase tracking-wide text-black disabled:opacity-50">{scraping?<><Loader2 size={16} className="animate-spin"/>Getting leads…</>:<><Play size={16}/>Get Leads</>}</button>
      </div>
    </Surface>
    <div className="mb-3 grid grid-cols-3 gap-2">
      {LEAD_CATEGORIES.map(c=>{const isActive=cat===c.key;const isRes=c.key==="residential";return <button key={c.key} onClick={()=>setCat(c.key)} className={`relative flex flex-col items-center gap-0.5 rounded-xl border-2 p-2.5 text-center transition ${isActive?"border-[#FFC400] bg-[#FFF7DA]":"border-black/10 bg-white hover:border-black/20"}`}>
        {isRes&&<span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FFC400] px-1.5 text-[8px] font-black uppercase tracking-wide text-black shadow">Priority 1</span>}
        <span className="text-base leading-none">{c.icon}</span>
        <span className="font-brand text-[11px] font-bold uppercase tracking-wide">{c.label}</span>
        <span className="text-[11px] font-bold text-black/45">{counts[c.key]||0}</span>
      </button>;})}
    </div>
    <Surface className="mb-4 p-3"><div className="flex items-center gap-2.5"><span className="text-xl">{categoryMeta(cat).icon}</span><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-wide text-black/45">{categoryMeta(cat).label} · {categoryMeta(cat).closeSpeed}</p><p className="text-[13px] font-semibold leading-tight">{categoryMeta(cat).payment}</p></div></div></Surface>
    <div className="mb-3 flex items-center justify-between">
      <p className="font-brand text-[15px] font-bold uppercase"><Flame className="mr-2 inline text-[#E9A900]" size={18}/>{projects.length} {categoryMeta(cat).label.toLowerCase()} opportunities</p>
      {projects.length>0&&<div className="flex items-center gap-3"><label className="flex cursor-pointer items-center gap-2 text-xs font-bold"><input type="checkbox" checked={allSelected} onChange={allSelected?clearSel:selectAll} className="h-5 w-5 cursor-pointer accent-[#FFC400]"/>Select All</label><button onClick={()=>setConfirmDeleteAll(true)} className="inline-flex items-center gap-1 text-xs font-bold text-red-600"><Trash2 size={13}/>Delete All</button></div>}
    </div>
    {selected.size>0&&(
      <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#FFF7DA] p-3 shadow-lg ring-2 ring-[#FFC400]">
        <p className="text-sm font-bold">{selected.size} selected</p>
        <button onClick={gatherAll} disabled={gathering} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#FFC400] px-4 font-brand text-sm font-bold uppercase text-black shadow-md disabled:opacity-50">
          {gathering?<><Loader2 size={16} className="animate-spin"/>Gathering…</>:<><Download size={16}/>Gather All Details</>}
        </button>
        <button onClick={clearSel} className="text-xs font-bold text-black/40">Clear</button>
      </div>
    )}
    {loading?<Surface className="p-8 text-center text-sm text-black/45">Loading current opportunities…</Surface>:projects.length===0?<Surface className="p-8 text-center"><p className="font-brand text-xl font-bold uppercase">No verified opportunities yet</p><p className="mt-2 text-sm text-black/50">AUTOLEADS will place commercial and government opportunities here when source evidence is available.</p></Surface>:<div className="space-y-4">{projects.map(p=>{
      const isSel=selected.has(p.id);
      return <Surface key={p.id} className={`overflow-hidden relative ${isSel?'ring-2 ring-[#FFC400]':''}`}>
        <div className="absolute left-3 top-4 z-10">
          <input type="checkbox" checked={isSel} onChange={()=>toggleSelect(p.id)} className="h-6 w-6 cursor-pointer rounded border-2 border-black/20 accent-[#FFC400]" onClick={e=>e.stopPropagation()}/>
        </div>
        <button onClick={()=>nav(`/projects/${p.id}`)} className="w-full p-4 pl-14 text-left"><div className="flex items-start gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#FFF7DA] text-black"><Building2 size={27}/></span><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><div><h2 className="text-[19px] font-bold leading-tight">{p.title}</h2><p className="mt-1 flex items-center gap-1 text-sm text-black/50"><MapPin size={14}/>{p.jurisdiction||p.address||"Location not published"}</p></div><div className="text-right"><p className="font-brand text-[25px] font-bold text-[#E9A900]">{money(p.value,true)}</p><ChevronRight size={19} className="ml-auto mt-1 text-black/35"/></div></div><p className="mt-2 flex items-center gap-1 text-xs text-black/50"><CalendarDays size={13}/>Due {fmtDate(p.bid_due_date)}</p></div></div>
        <div className="mt-3 flex flex-wrap gap-1.5">{p.verification_status==="verified"&&<StatusPill tone="success"><ShieldCheck size={11}/>Verified</StatusPill>}{Number(p.bidability_score||0)>=70&&<StatusPill tone="warning"><CheckCircle2 size={11}/>Good Fit</StatusPill>}{p.trade&&<StatusPill tone="info">{p.trade}</StatusPill>}{p.authority&&<StatusPill tone="purple"><Users size={11}/>{p.authority}</StatusPill>}</div>
      </button><button onClick={()=>toggleExpand(p.id)} className="flex min-h-11 w-full items-center justify-center gap-1.5 border-t border-black/[.06] text-xs font-bold uppercase tracking-wide text-[#D99D00]">{expanded.has(p.id)?'Hide Details':'View Full Details'} <ChevronRight size={14} className={`transition ${expanded.has(p.id)?'rotate-90':''}`}/></button>{expanded.has(p.id)&&<ProjectDetailsPanel project={p}/>}<div className="grid grid-cols-[auto_1fr_2fr] gap-2 border-t border-black/[.06] p-3"><button onClick={()=>deleteLead(p)} disabled={busy===p.id} title="Delete lead" className="grid min-h-12 w-12 place-items-center rounded-lg border border-red-200 text-red-600 disabled:opacity-40"><Trash2 size={17}/></button><button onClick={()=>{setPassTarget(p);setReason("")}} className="min-h-12 rounded-lg border border-black/15 font-brand text-sm font-bold uppercase">Pass</button><button onClick={()=>pursue(p)} disabled={busy===p.id} className="min-h-12 rounded-lg bg-[#FFC400] font-brand text-base font-bold uppercase disabled:opacity-40">🔥 {busy===p.id?'Working…':'Pursue'}</button></div>
    </Surface>})}</div>}
    {passTarget&&<div className="fixed inset-0 z-[100] flex items-end bg-black/45 p-4 sm:items-center sm:justify-center" onClick={()=>setPassTarget(null)}><div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={e=>e.stopPropagation()}><p className="font-brand text-2xl font-bold uppercase">Why pass?</p><p className="mt-1 text-sm text-black/50">This reason becomes pipeline evidence so future opportunity ranking can improve.</p><div className="mt-4 grid grid-cols-2 gap-2">{["Outside service area","Trade mismatch","Low margin potential","Schedule conflict","Bonding / requirement issue","Not bidding this owner"].map(r=><button key={r} onClick={()=>setReason(r)} className={`min-h-12 rounded-lg border px-3 text-left text-sm ${reason===r?'border-[#FFC400] bg-[#FFF7DA]':'border-black/10'}`}>{r}</button>)}</div><textarea value={reason} onChange={e=>setReason(e.target.value)} className="mt-3 min-h-20 w-full rounded-lg border border-black/15 p-3 text-sm" placeholder="Or enter a reason…"/><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>setPassTarget(null)} className="min-h-12 rounded-lg border border-black/15 font-bold">Cancel</button><PrimaryAction onClick={decline} disabled={!reason.trim()||busy===passTarget.id}>Confirm Pass</PrimaryAction></div></div></div>}
    {confirmDeleteAll&&<div className="fixed inset-0 z-[100] flex items-end bg-black/45 p-4 sm:items-center sm:justify-center" onClick={()=>setConfirmDeleteAll(false)}><div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={e=>e.stopPropagation()}><p className="font-brand text-2xl font-bold uppercase text-red-600">Delete all leads?</p><p className="mt-1 text-sm text-black/50">This permanently deletes all {projects.length} visible lead{projects.length===1?'':'s'} in the current view. This cannot be undone.</p><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={()=>setConfirmDeleteAll(false)} disabled={deleting} className="min-h-12 rounded-lg border border-black/15 font-bold">Cancel</button><button onClick={deleteAllVisible} disabled={deleting} className="min-h-12 rounded-lg bg-red-600 font-brand text-base font-bold uppercase text-white disabled:opacity-50">{deleting?<><Loader2 size={16} className="animate-spin"/>Deleting…</>:'Delete All'}</button></div></div></div>}
  </CommercialPage>;
}