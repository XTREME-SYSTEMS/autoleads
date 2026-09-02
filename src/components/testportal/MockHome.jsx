import React from "react";
import { ArrowRight, BriefcaseBusiness, ClipboardCheck, DollarSign, Phone, Flame, FileCheck2, PackageCheck, ShieldCheck, Brain } from "lucide-react";

const MOCK_METRICS = [
  { icon: BriefcaseBusiness, value: 12, label: 'Opportunities' },
  { icon: ClipboardCheck, value: 3, label: 'Approvals' },
  { icon: DollarSign, value: '$45.2K', label: 'Waiting', accent: true },
  { icon: Phone, value: 5, label: 'Follow Ups' },
];

const MOCK_PRIORITY = [
  { title: 'Review hot opportunity', sub: 'Orange County Convention Center Expansion', icon: Flame, priority: 'HIGH' },
  { title: 'Approve bid package', sub: 'Miami-Dade Public School Renovation', icon: ClipboardCheck },
  { title: 'Handle follow up', sub: 'Tampa Airport Terminal C — awaiting reply', icon: Phone },
];

export default function MockHome() {
  return (
    <div className="space-y-4">
      <MockBanner />
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-black uppercase tracking-wide text-[#f2df0d]">Today's Summary</p>
        <div className="mt-3 grid grid-cols-4 gap-1">
          {MOCK_METRICS.map(m => <MockMetric key={m.label} {...m} />)}
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-white/60">Priority Actions</h2>
        <div className="divide-y divide-white/5 rounded-xl border border-white/10 bg-white/5">
          {MOCK_PRIORITY.map((a, i) => (
            <div key={i} className="flex min-h-[68px] items-center gap-3 px-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#f2df0d] text-black"><a.icon size={23} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-white">{a.title}</p>
                  {a.priority && <span className="rounded bg-[#f2df0d] px-1.5 py-0.5 text-[8px] font-black text-black">{a.priority}</span>}
                </div>
                <p className="mt-0.5 truncate text-xs text-white/40">{a.sub}</p>
              </div>
              <ArrowRight size={18} className="shrink-0 text-white/30" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[
          { icon: FileCheck2, label: 'Takeoffs', count: 4 },
          { icon: PackageCheck, label: 'Bid Pkg' },
          { icon: ShieldCheck, label: 'Gates' },
          { icon: Brain, label: 'Reflect' },
        ].map((q, i) => (
          <div key={i} className="flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/5 text-[9px] font-bold uppercase tracking-wide text-white/60">
            <q.icon size={16} className="text-[#f2df0d]" />{q.label}
            {q.count && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#f2df0d] px-1 text-[10px] font-black text-black">{q.count}</span>}
          </div>
        ))}
      </div>
      <button className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#f2df0d] text-sm font-black uppercase tracking-wide text-black">
        🔥 See Fresh Opportunities <ArrowRight size={20} />
      </button>
    </div>
  );
}

function MockMetric({ icon: Icon, value, label, accent }) {
  return (
    <div className="flex flex-col items-center text-center">
      <span className="grid h-8 w-8 place-items-center rounded-full border border-white/15"><Icon size={15} className="text-white/70" /></span>
      <p className={`mt-1.5 text-lg font-black leading-none ${accent ? 'text-[#f2df0d]' : 'text-white'}`}>{value}</p>
      <p className="mt-1 text-[9px] font-bold uppercase leading-tight tracking-wide text-white/40">{label}</p>
    </div>
  );
}

function MockBanner() {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
      <p className="text-xs font-bold text-amber-400">⚠ SIMULATION ENVIRONMENT — Mock data, not live records</p>
    </div>
  );
}