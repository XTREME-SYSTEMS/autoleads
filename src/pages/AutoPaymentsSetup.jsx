import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import AppHeader from "@/components/autoleads/AppHeader";
import BackButton from "@/components/autoleads/BackButton";
import { DollarSign, Loader2, Check, CreditCard, Building2, ArrowRight, Percent } from "lucide-react";
import { useOrgId } from "@/hooks/useOrgContext";

const DEPOSIT_OPTIONS = [
  { value: 0, label: 'No Deposit', desc: 'Paid when complete' },
  { value: 10, label: '10% Down', desc: '10% deposit, balance on completion' },
  { value: 30, label: '30% Down', desc: '30% deposit, balance on milestones' },
  { value: 50, label: '50% Down', desc: '50% deposit, balance on completion' },
];

const SCHEDULE_OPTIONS = [
  { value: 'paid_when_complete', label: 'Paid When Complete', desc: 'Full payment upon project completion' },
  { value: 'milestone', label: 'Milestone-Based', desc: 'Payments tied to project milestones' },
  { value: 'net_15', label: 'Net 15', desc: 'Payment due 15 days after invoice' },
  { value: 'net_30', label: 'Net 30', desc: 'Payment due 30 days after invoice' },
  { value: 'net_60', label: 'Net 60', desc: 'Payment due 60 days after invoice' },
];

const METHODS = [
  { value: 'credit', label: 'Credit Card', icon: CreditCard },
  { value: 'debit', label: 'Debit Card', icon: CreditCard },
  { value: 'ach', label: 'ACH Transfer', icon: Building2 },
  { value: 'cash', label: 'Cash', icon: DollarSign },
  { value: 'check', label: 'Check', icon: DollarSign },
];

export default function AutoPaymentsSetup() {
  const nav = useNavigate();
  const orgId = useOrgId();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pref, setPref] = useState({
    deposit_required: true,
    deposit_pct: 10,
    payment_schedule: 'milestone',
    accepted_methods: ['credit', 'debit', 'ach'],
    terms_net_days: 30,
  });

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const existing = await base44.entities.PaymentPreference.filter({ organization_id: orgId }).catch(() => []);
        if (existing && existing.length > 0) {
          setPref({
            deposit_required: existing[0].deposit_required ?? true,
            deposit_pct: existing[0].deposit_pct ?? 10,
            payment_schedule: existing[0].payment_schedule ?? 'milestone',
            accepted_methods: existing[0].accepted_methods || ['credit', 'debit', 'ach'],
            terms_net_days: existing[0].terms_net_days ?? 30,
          });
        }
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const toggleMethod = (method) => {
    setPref(p => ({
      ...p,
      accepted_methods: p.accepted_methods.includes(method)
        ? p.accepted_methods.filter(m => m !== method)
        : [...p.accepted_methods, method]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const existing = await base44.entities.PaymentPreference.filter({ organization_id: orgId }).catch(() => []);
      if (existing && existing.length > 0) {
        await base44.entities.PaymentPreference.update(existing[0].id, pref);
      } else {
        await base44.entities.PaymentPreference.create({ ...pref, organization_id: orgId });
      }
      setSaved(true);
      setTimeout(() => nav('/onboarding'), 1500);
    } catch (e) {
      alert('Failed to save: ' + (e?.message || 'try again'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#f5f5f5]"><AppHeader /><div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#f2df0d]" size={32} /></div></div>;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <BackButton to="/onboarding" className="mb-4" />
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f2df0d]"><DollarSign size={26} className="text-black" /></span>
          <h1 className="mt-4 text-2xl font-black tracking-[-.03em] sm:text-3xl">Payment Preferences</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/55">Set your deposit requirements and payment terms. These preferences will be applied to every proposal and contract you send.</p>
        </div>

        {/* Deposit options */}
        <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="flex items-center gap-2 font-black"><Percent size={18} className="text-[#b0a209]" /> Deposit Requirement</h2>
          <p className="mt-1 text-xs text-black/50">Choose how much deposit you require before starting work.</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {DEPOSIT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPref(p => ({ ...p, deposit_pct: opt.value, deposit_required: opt.value > 0 }))}
                className={`rounded-xl border-2 p-4 text-left transition ${pref.deposit_pct === opt.value ? 'border-[#f2df0d] bg-[#fdfbe1]' : 'border-black/10 bg-white hover:border-black/20'}`}
              >
                <p className="font-black">{opt.label}</p>
                <p className="mt-0.5 text-xs text-black/50">{opt.desc}</p>
                {pref.deposit_pct === opt.value && <Check size={16} className="mt-2 text-[#b0a209]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Payment schedule */}
        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="flex items-center gap-2 font-black"><DollarSign size={18} className="text-[#b0a209]" /> Payment Schedule</h2>
          <p className="mt-1 text-xs text-black/50">When do you expect payment after invoicing?</p>
          <div className="mt-4 space-y-2">
            {SCHEDULE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPref(p => ({ ...p, payment_schedule: opt.value }))}
                className={`flex w-full items-center justify-between rounded-xl border-2 p-3 text-left transition ${pref.payment_schedule === opt.value ? 'border-[#f2df0d] bg-[#fdfbe1]' : 'border-black/10 bg-white hover:border-black/20'}`}
              >
                <div>
                  <p className="text-sm font-bold">{opt.label}</p>
                  <p className="text-xs text-black/50">{opt.desc}</p>
                </div>
                {pref.payment_schedule === opt.value && <Check size={18} className="text-[#b0a209]" />}
              </button>
            ))}
          </div>
        </div>

        {/* Accepted methods */}
        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="flex items-center gap-2 font-black"><CreditCard size={18} className="text-[#b0a209]" /> Accepted Payment Methods</h2>
          <p className="mt-1 text-xs text-black/50">Select which payment methods you accept from clients.</p>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {METHODS.map(m => {
              const Icon = m.icon;
              const selected = pref.accepted_methods.includes(m.value);
              return (
                <button
                  key={m.value}
                  onClick={() => toggleMethod(m.value)}
                  className={`flex items-center gap-2 rounded-xl border-2 p-3 text-sm font-bold transition ${selected ? 'border-[#f2df0d] bg-[#fdfbe1] text-black' : 'border-black/10 bg-white text-black/50 hover:border-black/20'}`}
                >
                  <Icon size={16} /> {m.label}
                  {selected && <Check size={14} className="ml-auto text-[#b0a209]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="mt-6">
          {saved ? (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center">
              <Check size={28} className="mx-auto text-emerald-500" />
              <p className="mt-2 font-black text-emerald-700">Payment preferences saved!</p>
              <p className="text-xs text-emerald-600">Redirecting to onboarding…</p>
            </div>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#f2df0d] px-6 py-3.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431] disabled:opacity-40"
            >
              {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : <>Save & Continue <ArrowRight size={16} /></>}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}