import React from "react";
import { Flame, MapPin, Calendar, DollarSign, Building2 } from "lucide-react";

const MOCK_LEADS = [
  { title: 'Orange County Convention Center Expansion', value: 2400000, location: 'Orlando, FL', due: 'Sep 15, 2026', trade: 'Epoxy Flooring', stage: 'qualification', hot: true },
  { title: 'Miami-Dade Public School Renovation', value: 850000, location: 'Miami, FL', due: 'Sep 22, 2026', trade: 'Commercial Flooring', stage: 'takeoff', hot: false },
  { title: 'Tampa International Airport Terminal C', value: 5100000, location: 'Tampa, FL', due: 'Oct 1, 2026', trade: 'Industrial Coatings', stage: 'estimating', hot: true },
  { title: 'Jacksonville Riverfront Development', value: 1200000, location: 'Jacksonville, FL', due: 'Sep 30, 2026', trade: 'Waterproofing', stage: 'proposal', hot: false },
  { title: 'Fort Lauderdale Beach Resort', value: 3800000, location: 'Fort Lauderdale, FL', due: 'Oct 10, 2026', trade: 'Decorative Concrete', stage: 'qualification', hot: true },
];

const STAGE_COLORS = {
  qualification: 'bg-blue-500/20 text-blue-400',
  takeoff: 'bg-amber-500/20 text-amber-400',
  estimating: 'bg-violet-500/20 text-violet-400',
  proposal: 'bg-emerald-500/20 text-emerald-400',
};

export default function MockLeads() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
        <p className="text-xs font-bold text-amber-400">⚠ SIMULATION ENVIRONMENT — Mock leads, not live records</p>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Mock Lead Feed</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/60">{MOCK_LEADS.length} leads</span>
      </div>
      <div className="space-y-3">
        {MOCK_LEADS.map((lead, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {lead.hot && <Flame size={16} className="shrink-0 text-[#f2df0d]" />}
                  <h3 className="truncate text-sm font-bold text-white">{lead.title}</h3>
                </div>
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-white/40">
                  <span className="flex items-center gap-1"><MapPin size={12} />{lead.location}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} />{lead.due}</span>
                  <span className="flex items-center gap-1"><Building2 size={12} />{lead.trade}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#f2df0d]">${(lead.value / 1000000).toFixed(1)}M</p>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}