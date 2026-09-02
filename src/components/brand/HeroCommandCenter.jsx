import React from "react";
import { Radar, TrendingUp, FileText, Mail, ArrowUpRight } from "lucide-react";

// Branded hero visual — a stylized "Command Center" dashboard mock
// that replaces the old plain black square with something on-brand.
export default function HeroCommandCenter() {
  return (
    <div className="relative z-10">
      {/* Glow */}
      <div className="absolute -inset-3 -z-10 rounded-[28px] bg-[radial-gradient(circle_at_70%_30%,rgba(255,196,0,.22),transparent_60%)]" />
      <div className="overflow-hidden rounded-3xl border border-black/10 bg-white shadow-[0_24px_60px_-24px_rgba(0,0,0,.28)]">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-black/8 bg-[#0b0b0b] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#f2df0d]">
              <Radar size={16} className="text-black" />
            </span>
            <span className="text-sm font-black tracking-tight text-white">AUTOLEADS</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#f2df0d]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f2df0d]" /> LIVE
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-2 gap-3 p-5">
          {/* Radar / discovery card */}
          <div className="col-span-2 rounded-2xl border border-black/8 bg-[#fafafa] p-4">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-black/50">Opportunity Radar</p>
              <ArrowUpRight size={15} className="text-[#cebe0b]" />
            </div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-3xl font-black tracking-tight">128</span>
              <span className="mb-1 text-xs font-bold text-emerald-600">+12 today</span>
            </div>
            {/* Mini bar chart */}
            <div className="mt-3 flex h-12 items-end gap-1.5">
              {[40, 55, 35, 70, 50, 85, 60, 95].map((h, i) => (
                <div key={i} className="flex-1 rounded-t bg-[#f2df0d]" style={{ height: `${h}%`, opacity: 0.35 + (i / 10) }} />
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div className="rounded-2xl border border-black/8 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fcf8ca] text-[#a99c09]"><FileText size={14} /></span>
              <p className="text-[11px] font-black uppercase tracking-wider text-black/50">Proposals</p>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight">14</p>
            <p className="text-[11px] font-bold text-black/40">Ready to send</p>
          </div>
          <div className="rounded-2xl border border-black/8 bg-white p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fcf8ca] text-[#a99c09]"><Mail size={14} /></span>
              <p className="text-[11px] font-black uppercase tracking-wider text-black/50">Follow-ups</p>
            </div>
            <p className="mt-2 text-2xl font-black tracking-tight">6</p>
            <p className="text-[11px] font-bold text-black/40">Awaiting reply</p>
          </div>

          {/* Win rate strip */}
          <div className="col-span-2 flex items-center justify-between rounded-2xl bg-[#0b0b0b] p-4 text-white">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-[#f2df0d]" />
              <span className="text-xs font-bold text-white/70">Win rate</span>
            </div>
            <span className="text-lg font-black tracking-tight">34%<span className="ml-1 text-xs font-bold text-emerald-400">↑ 6%</span></span>
          </div>
        </div>
      </div>
    </div>
  );
}