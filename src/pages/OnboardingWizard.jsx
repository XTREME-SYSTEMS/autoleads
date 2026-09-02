import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useOrgContext } from "@/hooks/useOrgContext";
import { Sparkles, Building2, Mail, Radar, Briefcase, DollarSign, Zap, CreditCard, ClipboardList, Rocket, Check, ArrowRight, ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";
import WizardTimeline from "@/components/onboarding/WizardTimeline";
import GuidePopup from "@/components/onboarding/GuidePopup";
import WelcomeStep from "@/components/onboarding/WelcomeStep";

const STEPS = [
  { num: 1, key: "welcome", icon: Sparkles, short: "Welcome", title: "Welcome to AUTOLEADS", guide: "Welcome! We'll walk you through 10 quick steps to set up your autonomous construction pipeline. Each step takes 2-3 minutes.", results: null },
  { num: 2, key: "company", icon: Building2, short: "Company", title: "Company Profile", guide: "Tell us about your business — name, trade, and location. This powers lead matching, bidability scoring, and proposal generation.", results: "Powers lead matching, bidability scoring, and proposal generation with your real company data.", to: "/get-started" },
  { num: 3, key: "contact", icon: Mail, short: "Contact", title: "Connect Gmail & Calendar", guide: "Link your Gmail and Google Calendar. AUTOLEADS uses these to send bids, track replies, and sync deadlines automatically.", results: "Email outreach, bid delivery, and deadline reminders — all running automatically from your own accounts.", to: "/auto-contact-setup" },
  { num: 4, key: "leads", icon: Radar, short: "Leads", title: "Lead Discovery", guide: "Configure your lead scraper — target states, counties, cities, and trades. AUTOLEADS scans 70+ national sources daily.", results: "An active scraper that scans 70+ national bid sources daily for opportunities matching your business.", to: "/auto-leads-setup" },
  { num: 5, key: "bids", icon: Briefcase, short: "Bids", title: "Branding & Templates", guide: "Set up your branding — logo, proposal template, email template, and credentials package.", results: "Ready-to-use branding assets and templates for professional proposals and outreach emails.", to: "/auto-bids-setup" },
  { num: 6, key: "pricing", icon: DollarSign, short: "Pricing", title: "Pricing Intelligence", guide: "Set your labor, material, overhead, and margin targets. AI scrapes local and national pricing for your scopes.", results: "Intelligent pricing ranges per scope, winning bid intelligence, and future outlook — integrated into your estimating.", to: "/auto-pricing-setup" },
  { num: 7, key: "system", icon: Zap, short: "System", title: "Automation Setup", guide: "Choose how often AUTOLEADS scans and what it does automatically — takeoffs, proposals, and outreach.", results: "An autonomous workflow that runs on your schedule (hourly to daily) and surfaces new opportunities constantly.", to: "/auto-system-setup" },
  { num: 8, key: "payments", icon: CreditCard, short: "Payments", title: "Payment Settings", guide: "Set your deposit requirements and payment terms — from no deposit to 50% down.", results: "Configurable deposit options and payment schedules applied to every proposal and contract you send.", to: "/auto-payments-setup" },
  { num: 9, key: "review", icon: ClipboardList, short: "Review", title: "Review Your Setup", guide: "Let's confirm everything is configured before going live. Check your setup status across all steps.", results: null },
  { num: 10, key: "launch", icon: Rocket, short: "Launch", title: "Launch AUTOLEADS", guide: "You're ready! Turn on your autonomous pipeline and start discovering opportunities and winning work.", results: null },
];

const setupSteps = STEPS.filter((s) => s.to);

export default function OnboardingWizard() {
  const { user } = useAuth();
  const { orgId, loading: orgLoading, refresh: refreshOrg } = useOrgContext();
  const nav = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [popupStep, setPopupStep] = useState(null);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  // Resume from saved step (stop-and-go)
  useEffect(() => {
    const saved = localStorage.getItem("autoleads_onboarding_step");
    if (saved) setCurrentStep(Math.min(Number(saved), STEPS.length));
  }, []);

  // Auto-create organization if needed
  useEffect(() => {
    if (orgLoading || orgId || !user) return;
    (async () => {
      try {
        await base44.functions.invoke("setupOrganization", {
          name: user?.full_name ? `${user.full_name.split(" ")[0]}'s Company` : "My Company",
        });
        await refreshOrg();
      } catch { /* may already exist */ }
    })();
  }, [orgLoading, orgId, user, refreshOrg]);

  // Check setup progress (re-checks when returning from a setup page)
  useEffect(() => {
    if (!orgId) return;
    let live = true;
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
        let gmailConnected = false, calendarConnected = false;
        try { await base44.functions.invoke("gmailSync", { check: true }); gmailConnected = true; } catch {}
        try { await base44.functions.invoke("syncCalendar", { check: true }); calendarConnected = true; } catch {}
        if (live) {
          setProgress({
            company: (companies || []).length > 0,
            contact: gmailConnected && calendarConnected,
            leads: (sources || []).some((s) => s.name?.startsWith("Auto Leads Discovery")),
            bids: (brands || []).length > 0,
            pricing: (pricingProfiles || []).length > 0,
            system: (automations || []).length > 0,
            payments: (paymentPrefs || []).length > 0,
          });
        }
      } catch { /* ignore */ } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [orgId, currentStep]);

  // Save current step (stop-and-go)
  useEffect(() => {
    localStorage.setItem("autoleads_onboarding_step", String(currentStep));
  }, [currentStep]);

  const completedSteps = Object.keys(progress).filter((k) => progress[k]);
  const step = STEPS.find((s) => s.num === currentStep);
  const allSetupDone = setupSteps.every((s) => progress[s.key]);

  const handleNext = () => {
    if (currentStep < STEPS.length) setPopupStep(currentStep + 1);
  };
  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };
  const handlePopupContinue = () => {
    if (popupStep) {
      setCurrentStep(popupStep);
      setPopupStep(null);
    }
  };
  const handleJump = (num) => {
    setCurrentStep(num);
  };

  const renderStepContent = () => {
    if (step.key === "welcome")
      return (
        <WelcomeStep
          userName={user?.full_name?.split(" ")[0]}
          onBegin={() => setPopupStep(2)}
        />
      );
    if (step.key === "review")
      return <ReviewStep progress={progress} onJump={handleJump} />;
    if (step.key === "launch")
      return <LaunchStep onLaunch={() => nav("/dashboard")} allDone={allSetupDone} />;
    return (
      <SetupStep step={step} done={progress[step.key]} loading={loading} onConfigure={() => nav(step.to)} />
    );
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header with horizontal timeline */}
      <header className="sticky top-0 z-20 border-b border-black/10 bg-white px-4 pt-4 pb-3 shadow-sm sm:px-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-3 flex items-center justify-between">
            <AutoLeadsLogo height={32} />
            <span className="text-xs font-bold text-black/50">
              {currentStep} of {STEPS.length}
            </span>
          </div>
          <WizardTimeline
            steps={STEPS}
            currentStep={currentStep}
            completedSteps={completedSteps}
            onJump={handleJump}
          />
        </div>
      </header>

      {/* Step content */}
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {renderStepContent()}

        {/* Navigation (hidden on welcome — it has its own Begin button) */}
        {step.key !== "welcome" && (
          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="flex items-center gap-2 rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-bold text-black/60 disabled:opacity-40 active:scale-[.98]"
            >
              <ArrowLeft size={18} /> Back
            </button>
            {currentStep < STEPS.length ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 rounded-xl bg-[#FFC400] px-6 py-3 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] active:scale-[.98]"
              >
                {step.key === "launch" ? "Finish" : "Next"} <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={() => nav("/dashboard")}
                className="flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-[0_4px_12px_rgba(16,185,129,.22)] active:scale-[.98]"
              >
                Go to Dashboard <ArrowRight size={18} />
              </button>
            )}
          </div>
        )}
      </main>

      {/* Center guide popup between steps */}
      <GuidePopup
        step={popupStep ? STEPS.find((s) => s.num === popupStep) : null}
        onContinue={handlePopupContinue}
        onBack={() => setPopupStep(null)}
        onClose={() => setPopupStep(null)}
      />
    </div>
  );
}

/* ---------- Step 2-8: generic setup card ---------- */
function SetupStep({ step, done, loading, onConfigure }) {
  const Icon = step.icon;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className={`grid h-14 w-14 place-items-center rounded-2xl ${done ? "bg-emerald-500 text-white" : "bg-[#FFC400] text-black"}`}>
          {done ? <Check size={28} /> : <Icon size={28} />}
        </span>
        <div>
          <h1 className="text-2xl font-black leading-tight">{step.title}</h1>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-black/65">{step.guide}</p>
      {step.results && (
        <div className="mt-4 rounded-lg border border-black/10 bg-[#FFF7DA]/50 p-4">
          <p className="text-[10px] font-black uppercase text-[#D99D00]">What you get</p>
          <p className="mt-1 text-sm leading-6 text-black/70">{step.results}</p>
        </div>
      )}
      {/* Status */}
      <div className="mt-5 flex items-center gap-3 rounded-xl border border-black/10 bg-white p-4">
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin text-black/40" />
            <span className="text-sm font-bold text-black/50">Checking status…</span>
          </>
        ) : done ? (
          <>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-100">
              <Check size={18} className="text-emerald-600" />
            </span>
            <div>
              <p className="text-sm font-bold text-emerald-700">Completed!</p>
              <p className="text-xs text-black/50">You can revise this anytime.</p>
            </div>
          </>
        ) : (
          <>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-amber-100">
              <Icon size={18} className="text-amber-600" />
            </span>
            <div>
              <p className="text-sm font-bold text-amber-700">Not started yet</p>
              <p className="text-xs text-black/50">Click below to configure.</p>
            </div>
          </>
        )}
      </div>
      {/* Configure button */}
      <button
        onClick={onConfigure}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC400] px-6 py-4 font-black text-black shadow-[0_8px_20px_rgba(255,196,0,.22)] active:scale-[.98]"
      >
        {done ? "Revise Settings" : "Configure Now"} <ExternalLink size={18} />
      </button>
    </div>
  );
}

/* ---------- Step 9: review ---------- */
function ReviewStep({ progress, onJump }) {
  const completed = setupSteps.filter((s) => progress[s.key]).length;
  const allDone = completed === setupSteps.length;
  return (
    <div>
      <h1 className="text-2xl font-black">Review Your Setup</h1>
      <p className="mt-2 text-sm leading-6 text-black/55">
        Here's your setup status across all steps. Make sure everything is configured before launching.
      </p>
      <div className="mt-5 space-y-2">
        {setupSteps.map((s) => {
          const done = progress[s.key];
          return (
            <button
              key={s.key}
              onClick={() => onJump(s.num)}
              className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition active:scale-[.99] ${
                done ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl ${done ? "bg-emerald-500 text-white" : "bg-amber-400 text-black"}`}>
                {done ? <Check size={20} /> : <s.icon size={20} />}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold">{s.title}</p>
                <p className="text-xs text-black/50">{done ? "Completed" : "Not configured"}</p>
              </div>
              {!done && <ArrowRight size={16} className="text-amber-600" />}
            </button>
          );
        })}
      </div>
      {allDone ? (
        <div className="mt-5 rounded-xl border border-emerald-300 bg-emerald-50 p-5 text-center">
          <p className="text-lg font-black text-emerald-700">All steps complete! 🎉</p>
          <p className="mt-1 text-sm text-black/60">You're ready to launch. Proceed to the final step.</p>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-5 text-center">
          <p className="text-sm font-bold text-amber-700">
            {setupSteps.length - completed} step(s) need attention
          </p>
          <p className="mt-1 text-xs text-black/50">
            Tap any incomplete step above to configure it, then come back here.
          </p>
        </div>
      )}
    </div>
  );
}

/* ---------- Step 10: launch ---------- */
function LaunchStep({ onLaunch, allDone }) {
  return (
    <div className="text-center">
      <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#FFC400] shadow-[0_8px_24px_rgba(255,196,0,.3)]">
        <Rocket size={40} className="text-black" />
      </span>
      <h1 className="mt-5 text-3xl font-black">Launch AUTOLEADS</h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/55">
        {allDone
          ? "Your setup is complete. AUTOLEADS is ready to start discovering opportunities, generating takeoffs, and sending bids — autonomously."
          : "Some setup steps are still incomplete. You can launch now and complete them later, or go back and finish them first."}
      </p>
      <button
        onClick={onLaunch}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC400] px-6 py-4 font-black text-black shadow-[0_8px_20px_rgba(255,196,0,.22)] active:scale-[.98]"
      >
        Go to Command Center <ArrowRight size={20} />
      </button>
    </div>
  );
}