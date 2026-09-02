import React from "react";
import { DollarSign, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";

const MOCK_INVOICES = [
  { id: 'INV-001', project: 'Convention Center Expansion', amount: 48000, status: 'paid', date: 'Aug 20, 2026' },
  { id: 'INV-002', project: 'Miami-Dade School Renovation', amount: 12500, status: 'pending', date: 'Aug 28, 2026' },
  { id: 'INV-003', project: 'Airport Terminal C', amount: 95000, status: 'overdue', date: 'Aug 10, 2026' },
  { id: 'INV-004', project: 'Riverfront Development', amount: 24000, status: 'draft', date: 'Sep 1, 2026' },
];

const STATUS_STYLES = {
  paid: { icon: CheckCircle2, cls: 'text-emerald-400 bg-emerald-500/20' },
  pending: { icon: Clock, cls: 'text-amber-400 bg-amber-500/20' },
  overdue: { icon: AlertCircle, cls: 'text-red-400 bg-red-500/20' },
  draft: { icon: FileText, cls: 'text-white/40 bg-white/10' },
};

export default function MockMoney() {
  const total = MOCK_INVOICES.reduce((s, i) => s + i.amount, 0);
  const paid = MOCK_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0);
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
        <p className="text-xs font-bold text-amber-400">⚠ SIMULATION ENVIRONMENT — Mock invoices, not live records</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <DollarSign size={18} className="text-white/40" />
          <p className="mt-2 text-xl font-black text-white">${(total / 1000).toFixed(1)}K</p>
          <p className="text-xs text-white/40">Total Billed</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <CheckCircle2 size={18} className="text-emerald-400" />
          <p className="mt-2 text-xl font-black text-emerald-400">${(paid / 1000).toFixed(1)}K</p>
          <p className="text-xs text-white/40">Collected</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <Clock size={18} className="text-amber-400" />
          <p className="mt-2 text-xl font-black text-amber-400">${((total - paid) / 1000).toFixed(1)}K</p>
          <p className="text-xs text-white/40">Outstanding</p>
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-black uppercase tracking-wide text-white/60">Mock Invoices</h2>
        <div className="space-y-2">
          {MOCK_INVOICES.map(inv => {
            const st = STATUS_STYLES[inv.status];
            return (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-3">
                  <span className={`grid h-10 w-10 place-items-center rounded-lg ${st.cls}`}><st.icon size={18} /></span>
                  <div>
                    <p className="text-sm font-bold text-white">{inv.id}</p>
                    <p className="text-xs text-white/40">{inv.project}</p>
                    <p className="text-[10px] text-white/30">{inv.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">${inv.amount.toLocaleString()}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${st.cls}`}>{inv.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}