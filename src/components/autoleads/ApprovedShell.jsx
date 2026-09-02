import React,{useState} from "react";
import {AnimatePresence,motion} from "framer-motion";
import {Bell,CalendarDays,CircleDollarSign,FlaskConical,HardHat,Home,Menu,Radar,Settings,ShieldCheck,Workflow,X} from "lucide-react";
import {Link,NavLink,Outlet,useLocation,useNavigate} from "react-router-dom";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";
import AccountMenu from "@/components/autoleads/AccountMenu";
import PipelineMenu from "@/components/pipeline/PipelineMenu";
import {base44} from "@/api/base44Client";
import {useAuth} from "@/lib/AuthContext";

const MOBILE=[
  {to:"/dashboard",label:"Home",Icon:Home,prefix:"/dashboard"},
  {to:"/leads",label:"Leads",Icon:Radar,prefix:"/leads"},
  {to:"/money",label:"Money",Icon:CircleDollarSign,prefix:"/money"},
  {to:"/calendar",label:"Calendar",Icon:CalendarDays,prefix:"/calendar"},
];
const DESKTOP=[
  ["/dashboard","Home",Home],
  ["/leads","Leads",Radar],
  ["/auto-pipeline","Pipeline",Workflow],
  ["/jobs","Jobs",HardHat],
  ["/money","Money",CircleDollarSign],
  ["/calendar","Calendar",CalendarDays],
];

export default function ApprovedShell(){
  const {pathname}=useLocation();const nav=useNavigate();const {user}=useAuth();
  const [moreOpen,setMoreOpen]=useState(false);const [menuOpen,setMenuOpen]=useState(false);
  const active=(prefix)=>pathname===prefix||pathname.startsWith(prefix+"/");
  const mobileKnown=MOBILE.some(t=>active(t.prefix));
  return <div className="min-h-screen bg-white text-[#050708]">
    <header className="safe-area-top sticky top-0 z-50 border-b border-black/[.07] bg-white/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[66px] max-w-[1500px] items-center px-4 sm:px-6 lg:px-8">
        <Link to="/dashboard" className="shrink-0"><AutoLeadsLogo height={39}/></Link>
        <nav className="ml-8 hidden h-full items-center lg:flex">{DESKTOP.map(([to,label,Icon])=><NavLink key={to} to={to} className={`relative flex h-full items-center gap-2 px-4 text-sm font-bold ${active(to)?'text-black':'text-black/45 hover:text-black'}`}><Icon size={17}/>{label}{active(to)&&<span className="absolute inset-x-4 bottom-0 h-[3px] bg-[#FFC400]"/>}</NavLink>)}</nav>
        <div className="ml-auto flex items-center gap-1.5"><Link to="/settings" className={`hidden h-10 w-10 place-items-center rounded-full border lg:grid ${active('/settings')?'border-[#f2df0d] bg-[#fdfbe1] text-black':'border-black/10 text-black/55'}`} title="Settings"><Settings size={18}/></Link><Link to="/admin-portal" className={`hidden h-10 w-10 place-items-center rounded-full border lg:grid ${active('/admin-portal')?'border-[#f2df0d] bg-[#fdfbe1] text-black':'border-black/10 text-black/55'}`} title="Admin Portal"><ShieldCheck size={18}/></Link><Link to="/notifications" className="grid h-10 w-10 place-items-center rounded-full border border-black/10 text-black/55"><Bell size={18}/></Link><div className="hidden lg:block"><AccountMenu/></div><button onClick={()=>setMenuOpen(v=>!v)} className="grid h-10 w-10 place-items-center rounded-full border border-black/10 lg:hidden">{menuOpen?<X size={18}/>:<Menu size={18}/>}</button></div>
      </div>
      {menuOpen&&<div className="absolute inset-x-0 top-[66px] border-t border-black/[.07] bg-white p-3 shadow-xl lg:hidden"><div className="mx-auto max-w-xl">{[["/onboarding","Setup Hub",Home],["/auto-pipeline","Pipeline",Workflow],["/bids","Bids",Workflow],["/settings","Settings",Settings],["/admin-portal","Admin Portal",ShieldCheck],["/test-agent-portal","Test Agent",FlaskConical],["/owner-dashboard","Owner Dashboard",CircleDollarSign],["/cost-intelligence","Cost Intelligence",CircleDollarSign],["/api-keys","API Keys",CircleDollarSign]].map(([to,label,Icon])=><button key={to} onClick={()=>{setMenuOpen(false);nav(to)}} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold hover:bg-black/[.03]"><Icon size={19} className="text-[#D99D00]"/>{label}</button>)}<div className="mt-2 border-t border-black/[.06] pt-2"><p className="px-4 py-2 text-xs text-black/40">{user?.email||"Signed in"}</p><button onClick={async()=>{setMenuOpen(false);await base44.auth.logout('/login')}} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-left text-sm font-semibold text-red-600"><X size={19}/>Sign out</button></div></div></div>}
    </header>

    <main className="min-h-[calc(100vh-66px)] overflow-x-hidden pb-[90px] lg:pb-0"><AnimatePresence mode="wait"><motion.div key={pathname} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:.16}}><Outlet/></motion.div></AnimatePresence></main>

    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-black/[.08] bg-white shadow-[0_-8px_24px_rgba(0,0,0,.04)] lg:hidden">{MOBILE.map(tab=>{const Icon=tab.Icon;const isActive=active(tab.prefix);return <button key={tab.to} onClick={()=>nav(tab.to)} className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-[10px] font-bold ${isActive?'text-[#D99D00]':'text-black/40'}`}><Icon size={21}/>{tab.label}{isActive&&<span className="absolute bottom-0 h-[3px] w-8 rounded-full bg-[#FFC400]"/>}</button>})}<button onClick={()=>setMoreOpen(true)} className={`flex min-h-[64px] flex-col items-center justify-center gap-1 text-[10px] font-bold ${!mobileKnown?'text-[#D99D00]':'text-black/40'}`}><Menu size={21}/>More</button></nav>
    <PipelineMenu open={moreOpen} onClose={()=>setMoreOpen(false)}/>
  </div>;
}