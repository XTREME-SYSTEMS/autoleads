import React from "react";
import { ArrowLeft, Bell, ChevronRight, MessageSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";

export const AL = {
  yellow: "#FFC400",
  yellowHover: "#FFD126",
  yellowSoft: "#FFF6CC",
  black: "#050708",
  charcoal: "#101214",
  white: "#FFFFFF",
  border: "#E5E7EB",
  muted: "#667085",
  green: "#16A34A",
  red: "#DC2626",
  orange: "#EA8A00",
};

export function money(value, compact=false){
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (compact && Math.abs(n) >= 1000000) return `$${(n/1000000).toFixed(n >= 10000000 ? 1 : 2).replace(/\.0+$/,'')}M`;
  if (compact && Math.abs(n) >= 1000) return `$${(n/1000).toFixed(n >= 100000 ? 0 : 1).replace(/\.0$/,'')}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

export function fmtDate(value){
  if (!value) return "Not published";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}

export function CommercialPage({children, className=""}){
  return <div className={`min-h-screen bg-white text-[#050708] pb-28 lg:pb-10 ${className}`}>
    <div className="mx-auto w-full max-w-[980px] px-5 pt-5 sm:px-7 lg:px-10 lg:pt-8">{children}</div>
  </div>;
}

export function BrandHeader({messageCount=0, notificationCount=0}){
  return <div className="mb-7 flex items-center justify-between">
    <AutoLeadsLogo height={42} light />
    <div className="flex items-center gap-2">
      <HeaderIcon icon={MessageSquare} count={messageCount}/>
      <HeaderIcon icon={Bell} count={notificationCount}/>
    </div>
  </div>;
}

function HeaderIcon({icon:Icon,count}){
  return <button className="relative grid h-11 w-11 place-items-center rounded-full border border-black/10 bg-white text-black" aria-label="Open notifications">
    <Icon size={19}/>
    {count>0&&<span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#FFC400] px-1 text-[10px] font-black text-black">{count>9?'9+':count}</span>}
  </button>;
}

export function BackLink({to="/dashboard", label="Back"}){
  const nav=useNavigate();
  return <button onClick={()=>nav(to)} className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-black/70"><ArrowLeft size={20}/>{label}</button>;
}

export function Greeting({name="Builder", line="Let's win today."}){
  return <div className="mb-2"><p className="text-[22px] font-medium tracking-[-.02em]">Good morning, <span className="text-[#E9A900]">{name}</span></p><p className="mt-1 text-sm text-black/45">☀ {line}</p></div>;
}

export function IndustrialTitle({children, eyebrow="", compact=false}){
  return <div className="mb-6">
    {eyebrow&&<p className="mb-1 font-brand text-[14px] font-bold uppercase tracking-[.08em] text-[#E9A900]">{eyebrow}</p>}
    <h1 className={`font-brand font-bold uppercase leading-[.94] tracking-[-.025em] text-[#050708] ${compact?'text-[38px] sm:text-[44px]':'text-[48px] sm:text-[56px] lg:text-[64px]'}`}>{children}</h1>
    <div className="mt-3 h-[4px] w-[58%] max-w-[390px] rounded-full bg-[#FFC400]"/>
  </div>;
}

export function SectionHeader({title, actionLabel="", onAction}){
  return <div className="mb-3 mt-6 flex items-center justify-between gap-3"><h2 className="font-brand text-[17px] font-bold uppercase tracking-[.035em]">{title}</h2>{actionLabel&&<button onClick={onAction} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#D99D00]">{actionLabel}<ChevronRight size={17}/></button>}</div>;
}

export function Surface({children,className="",onClick}){
  return <section onClick={onClick} className={`rounded-[16px] border border-black/10 bg-white shadow-[0_8px_24px_rgba(15,23,42,.06)] ${onClick?'cursor-pointer':''} ${className}`}>{children}</section>;
}

export function StatusPill({children,tone="neutral"}){
  const styles={
    success:"border-emerald-200 bg-emerald-50 text-emerald-700",
    warning:"border-amber-200 bg-amber-50 text-amber-700",
    danger:"border-red-200 bg-red-50 text-red-700",
    info:"border-blue-200 bg-blue-50 text-blue-700",
    purple:"border-violet-200 bg-violet-50 text-violet-700",
    neutral:"border-black/10 bg-black/[.03] text-black/55",
  };
  return <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-bold ${styles[tone]||styles.neutral}`}>{children}</span>;
}

export function PrimaryAction({children,onClick,disabled=false,className=""}){
  return <button onClick={onClick} disabled={disabled} className={`flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[10px] bg-[#FFC400] px-5 font-brand text-[18px] font-bold uppercase tracking-[.035em] text-black shadow-[0_8px_20px_rgba(255,196,0,.22)] transition hover:bg-[#FFD126] disabled:cursor-not-allowed disabled:opacity-40 ${className}`}>{children}</button>;
}

export function SecondaryAction({children,onClick,disabled=false,className=""}){
  return <button onClick={onClick} disabled={disabled} className={`flex min-h-[52px] items-center justify-center gap-2 rounded-[10px] border border-black/20 bg-white px-4 font-brand text-[15px] font-bold uppercase tracking-[.025em] disabled:opacity-40 ${className}`}>{children}</button>;
}

export function DataRow({label,value,accent=false,children}){
  return <div className="flex min-h-12 items-center justify-between gap-3 border-b border-black/[.07] py-2.5 last:border-b-0"><span className="text-sm text-black/60">{label}</span><span className={`text-right text-sm font-bold ${accent?'text-[#E9A900]':'text-black'}`}>{children||value||'—'}</span></div>;
}

export function IconSquare({icon:Icon,tone="yellow"}){
  const cls=tone==='danger'?'bg-red-50 text-red-600':tone==='success'?'bg-emerald-50 text-emerald-600':'bg-[#FFC400] text-black';
  return <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-[11px] ${cls}`}><Icon size={23}/></span>;
}

export function EmptyCommercial({title,body}){
  return <Surface className="p-8 text-center"><p className="font-brand text-xl font-bold uppercase">{title}</p><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/50">{body}</p></Surface>;
}
