import React from "react";
import {AlertTriangle, ArrowUpRight, CheckCircle2, Circle, Clock3, ShieldCheck, Sparkles} from "lucide-react";

export function ScoreRing({score=0,label="Score",tone="yellow"}){
  const safe=Math.max(0,Math.min(100,Number(score)||0));
  const color=tone==='green'?'#16a34a':tone==='red'?'#dc2626':'#f2df0d';
  return <div className="relative grid h-24 w-24 shrink-0 place-items-center rounded-full" style={{background:`conic-gradient(${color} ${safe*3.6}deg,#ececec 0)`}}><div className="grid h-[74px] w-[74px] place-items-center rounded-full bg-white text-center"><div><div className="text-2xl font-black leading-none">{safe}</div><div className="mt-1 text-[10px] font-bold uppercase tracking-wide text-black/45">{label}</div></div></div></div>
}
export function FactorRow({label,score,max=10,reason,state='good'}){
  const pct=Math.max(0,Math.min(100,(Number(score||0)/Number(max||1))*100));
  const Icon=state==='warning'?AlertTriangle:state==='blocked'?Circle:CheckCircle2;
  const cls=state==='warning'?'text-amber-700':state==='blocked'?'text-black/35':'text-emerald-700';
  return <div className="rounded-xl border border-black/10 p-4"><div className="flex items-start gap-3"><Icon size={18} className={`mt-0.5 ${cls}`}/><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><span className="text-sm font-black">{label}</span><span className="text-xs font-black">{score}/{max}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#f2df0d]" style={{width:`${pct}%`}}/></div>{reason&&<p className="mt-2 text-xs leading-5 text-black/50">{reason}</p>}</div></div></div>
}
export function ActionRow({title,description,due,priority='normal',action='Review',icon:Icon=Sparkles,onClick}){
  return <div className="flex flex-col gap-4 rounded-xl border border-black/10 p-4 sm:flex-row sm:items-center"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${priority==='urgent'?'bg-red-50 text-red-600':priority==='high'?'bg-amber-50 text-amber-700':'bg-[#fdfad7] text-[#a99c09]'}`}><Icon size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{title}</h3>{priority!=='normal'&&<span className="rounded-full bg-black px-2 py-0.5 text-[10px] font-black uppercase text-white">{priority}</span>}</div><p className="mt-1 text-sm leading-6 text-black/50">{description}</p></div><div className="flex items-center justify-between gap-3 sm:block sm:text-right"><span className="inline-flex items-center gap-1 text-xs font-bold text-black/45"><Clock3 size={13}/>{due}</span><button onClick={onClick} className="ml-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#f2df0d] px-4 text-sm font-black">{action}<ArrowUpRight size={15}/></button></div></div>
}
export function ProvenanceBadge({label='Verified source',confidence='High'}){return <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700"><ShieldCheck size={13}/>{label} \u00b7 {confidence}</span>}
export function Node({label,type='Company',active=false}){return <div className={`min-w-[150px] rounded-xl border p-3 shadow-sm ${active?'border-[#f2df0d] bg-[#fdfbe1]':'border-black/10 bg-white'}`}><div className="text-[10px] font-black uppercase tracking-wide text-black/40">{type}</div><div className="mt-1 text-sm font-black">{label}</div></div>}