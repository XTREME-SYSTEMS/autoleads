import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useOrgContext } from "@/hooks/useOrgContext";
import AppHeader from "@/components/autoleads/AppHeader";
import BackButton from "@/components/autoleads/BackButton";
import FloatingAssistant from "@/components/autoleads/FloatingAssistant";
import { ArrowRight, Check, Briefcase, Radar, Sparkles, Building2, Zap, Loader2, DollarSign, Mail } from "lucide-react";

const STEPS = [
  {
    key: "company",
    step: 1,
    icon: Building2,
    title: "Auto Setup",
    purpose: "Tell us about your business — name, trade, location, and credentials.",
    results: "Powers lead matching, bidability scoring, and proposal generation with your real company data.",
    to: "/get-started",
  },
  {
    key: "contact",
    step: 2,
    icon: Mail,
    title: "Auto Contact",
    purpose: "Connect your Gmail and Google Calendar so AUTOLEADS can send bids, sync your inbox, and track deadlines.",
    results: "Email outreach, bid delivery, and deadline reminders — all running automatically from your own accounts.",
    to: "/auto-contact-setup",
  },
  {
    key: "leads",
    step: 3,
    icon: Radar,
    title: "Auto Leads",
    purpose: "Configure your lead discovery scraper — target states, counties, cities, and trades.",
    results: "An active scraper that scans 70+ national bid sources daily for opportunities matching your business.",
    to: "/auto-leads-setup",
  },
  {
    key: "bids",
    step: 4,
    icon: Briefcase,
    title: "Auto Bids",
    purpose: "Set up your branding — logo, proposal template, email template, and credentials package.",
    results: "Ready-to-use branding assets and templates for professional proposals and outreach emails.",
    to: "/auto-bids-setup",
  },
  {
    key: "pricing",
    step: 5,
    icon: DollarSign,
    title: "Auto Pricing",
    purpose: "Set your labor, material, overhead, and margin targets — then AI scrapes local and national pricing for all your scopes.",
    results: "Intelligent pricing ranges per scope, winning bid intelligence, and future outlook — all integrated into your estimating.",
    to: "/auto-pricing-setup",
  },
  {
    key: "system",
    step: 6,
    icon: Zap,
    title: "Automation Setup",
    purpose: "Choose how often AUTOLEADS scans for leads and what it does automatically — takeoffs, proposals, and outreach.",
    results: "An autonomous workflow that runs on your schedule (hourly to daily) and gives you a reason to check back constantly for new opportunities.",
    to: "/auto-system-setup",
  },
  {
    key: "payments",
    step: 7,
    icon: DollarSign,
    title: "Auto Payments",
    purpose: "Set your deposit requirements and payment terms — from no deposit to 50% down.",
    results: "Configurable deposit options and payment schedules (credit, debit, ACH) applied to every proposal and contract you send.",
    to: "/auto-payments-setup",
  },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { orgId, loading: orgLoading, refresh: refreshOrg } = useOrgContext();
  const nav = useNavigate();
  const [progress, setProgress] = useState(/** @type {any} */ ({}));
  const [loading, setLoading] = useState(true);

  // Auto-create organization if user doesn't have one
  useEffect(() => {
    if (orgLoading || orgId || !user) return;
    (async () => {
      try {
        await base44.functions.invoke('setupOrganization', {
          name: user?.full_name ? `${user.full_name.split(' ')[0]}'s Company` : 'My Company',
        });
        await refreshOrg();
      } catch { /* may already exist */ }
    })();
  }, [orgLoading, orgId, user, refreshOrg]);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const [companies, sources, brands, automations, pricingProfiles, paymentPrefs] = await Promise.all([
          base44.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.ScrapeSource.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.BrandAsset.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.AutomationConfig.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.PricingProfile.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.PaymentPreference.filter({ organization_id: orgId }).catch(() => []),
        ]);
        // Check Gmail + Calendar connection status
        let gmailConnected = false, calendarConnected = false;
        try { await base44.functions.invoke('gmailSync', { check: true }); gmailConnected = true; } catch {}
        try { await base44.functions.invoke('syncCalendar', { check: true }); calendarConnected = true; } catch {}
        setProgress({
          company: (companies || []).length > 0,
          contact: gmailConnected && calendarConnected,
          leads: (sources || []).some(s => s.name?.startsWith("Auto Leads Discovery")),
          bids: (brands || []).length > 0,
          pricing: (pricingProfiles || []).length > 0,
          system: (automations || []).length > 0,
          payments: (paymentPrefs || []).length > 0,
        });
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const completedCount = Object.values(progress).filter(Boolean).length;
  const allDone = completedCount === STEPS.length;
  const firstIncomplete = STEPS.find(s => !progress[s.key]);

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <AppHeader />

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <BackButton to="/dashboard" className="mb-4" />
        {/* Welcome hero */}
        <div className="text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#f2df0d]">
            <Sparkles size={30} className="text-black" />
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-[-.03em] sm:text-4xl">
            {user?.full_name ? `Welcome, ${user.full_name.split(" ")[0]}!` : "Welcome to AUTOLEADS!"}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/55">
            {allDone
              ? "Your setup is complete. You're ready to discover opportunities and win more work."
              : "Complete these 7 quick setup steps to activate your construction intelligence workflow. Each step takes 2–3 minutes."}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mx-auto mt-8 max-w-md">
          <div className="flex items-center justify-between text-xs font-bold text-black/50">
            <span>Setup Progress</span>
            <span>{completedCount} of {STEPS.length} complete</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10">
            <div className="h-full rounded-full bg-[#f2df0d] transition-all duration-500" style={{ width: `${(completedCount / STEPS.length) * 100}%` }} />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="mt-12 flex items-center justify-center gap-2 text-sm text-black/40">
            <Loader2 size={18} className="animate-spin" /> Checking your setup…
          </div>
        )}

        {/* Step cards */}
        {!loading && (
          <div className="mt-10 space-y-4">
            {STEPS.map((step) => {
              const done = progress[step.key];
              const isNext = firstIncomplete?.key === step.key;
              const Icon = step.icon;
              return (
                <div
                  key={step.key}
                  className={`rounded-2xl border-l-4 bg-white p-5 shadow-sm transition sm:p-6 ${done ? "border-l-emerald-500 border-emerald-200" : isNext ? "border-l-[#f2df0d] border-[#f2df0d] ring-2 ring-[#f2df0d]/20" : "border-l-gray-300 border-black/10"}`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    {/* Step number / icon */}
                    <div className="flex items-center gap-3">
                      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${done ? "bg-emerald-500 text-white" : isNext ? "bg-[#f2df0d] text-black" : "bg-gray-100 text-gray-400"}`}>
                        {done ? <Check size={24} /> : <Icon size={24} />}
                      </span>
                      <div className="sm:hidden">
                        <span className="text-[11px] font-black uppercase tracking-wide text-[#cebe0b]">Step {step.step}</span>
                        <h3 className="text-lg font-black">{step.title}</h3>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="hidden sm:block">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-black uppercase tracking-wide text-[#cebe0b]">Step {step.step}</span>
                          {done && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-black uppercase text-white">Complete</span>}
                          {isNext && <span className="rounded-full bg-[#f2df0d] px-2 py-0.5 text-[10px] font-black uppercase text-black">Start Here</span>}
                          {!done && !isNext && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-400">Not Started</span>}
                        </div>
                        <h3 className="mt-1 text-lg font-black">{step.title}</h3>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-black/60">{step.purpose}</p>
                      <div className="mt-3 rounded-lg border border-black/10 bg-black/[.02] p-3">
                        <p className="text-[11px] font-black uppercase tracking-wide text-black/40">What you get</p>
                        <p className="mt-1 text-sm leading-6 text-black/70">{step.results}</p>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="shrink-0 sm:pl-2">
                      <Link to={step.to}>
                        <button className={`flex w-full items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-black transition sm:w-auto ${done ? "border border-black/15 bg-white text-black hover:bg-black/[.02]" : "bg-[#f2df0d] text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]"}`}>
                          {done ? "Redo" : isNext ? "Start" : "Begin"} <ArrowRight size={15} />
                        </button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Completion CTA */}
        {!loading && allDone && (
          <div className="mt-8 rounded-2xl border border-emerald-300 bg-emerald-50 p-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500">
              <Check size={28} className="text-white" />
            </span>
            <h2 className="mt-4 text-xl font-black">Your system is fully functional! 🎉</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/60">All 7 setup steps are complete. AUTOLEADS is now running autonomously.</p>
            <div className="mx-auto mt-4 max-w-sm space-y-2 text-left">
              {[
                { label: "Company profile active", color: "text-emerald-600" },
                { label: "Gmail & Calendar connected", color: "text-emerald-600" },
                { label: "Lead scraper scanning", color: "text-emerald-600" },
                { label: "Branding & templates ready", color: "text-emerald-600" },
                { label: "Pricing intelligence active", color: "text-emerald-600" },
                { label: "Automated workflow live", color: "text-emerald-600" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-sm font-bold text-emerald-700">
                  <Check size={16} className="text-emerald-500" /> {t.label}
                </div>
              ))}
            </div>
            <button onClick={() => nav("/dashboard")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-[0_4px_12px_rgba(16,185,129,.22)] hover:bg-emerald-600">
              Go to Command Center <ArrowRight size={16} />
            </button>
          </div>
        )}
      </main>
      <FloatingAssistant />
    </div>
  );
}