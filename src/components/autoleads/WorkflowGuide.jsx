import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Radar, Inbox, Target, FileCheck2, DollarSign, FileText, Send, Mail, TrendingUp,
  Check, ArrowRight, Building2, Image as ImageIcon, Briefcase, Smartphone, Settings, Sparkles
} from "lucide-react";

const STEPS = [
  { num: 1, title: "Find Work", desc: "Discover new project opportunities from verified sources", icon: Radar, route: "/leads" },
  { num: 2, title: "Review Invitations", desc: "Process incoming bid invitations from your inbox", icon: Inbox, route: "/bid-inbox" },
  { num: 3, title: "Score Opportunities", desc: "Qualify and score opportunities for fit and bidability", icon: Target, route: "/bidability" },
  { num: 4, title: "Analyze Plans", desc: "Review takeoffs, measurements, and plan evidence", icon: FileCheck2, route: "/takeoff-evidence" },
  { num: 5, title: "Price the Work", desc: "Build estimates using your private pricing memory", icon: DollarSign, route: "/pricing-memory" },
  { num: 6, title: "Build Proposal", desc: "Create and review proposals for clients", icon: FileText, route: "/proposals" },
  { num: 7, title: "Submit Bid", desc: "Track submitted bids and their status", icon: Send, route: "/bids" },
  { num: 8, title: "Follow Up", desc: "Reach out to clients and track communications", icon: Mail, route: "/outreach" },
  { num: 9, title: "Track Results", desc: "Analyze wins, losses, and improve your process", icon: TrendingUp, route: "/outcome-learning" },
];

const ASSETS = [
  { key: "company", label: "Company Profile", icon: Building2, route: "/settings/company" },
  { key: "logo", label: "Logo & Branding", icon: ImageIcon, route: "/settings/branding" },
  { key: "proposal", label: "Proposal Template", icon: FileText, route: "/settings/proposals" },
  { key: "email", label: "Email Templates", icon: Mail, route: "/email-templates" },
  { key: "package", label: "Credentials Package", icon: Briefcase, route: "/proposal-packages" },
  { key: "images", label: "Project Images", icon: ImageIcon, route: "/auto-app-setup" },
  { key: "app", label: "Contractor App", icon: Smartphone, route: "/auto-app-setup" },
  { key: "automation", label: "Automation Settings", icon: Settings, route: "/settings/ai-autonomy" },
];

export default function WorkflowGuide({ stepStatus, assets }) {
  const nav = useNavigate();
  const nextStep = STEPS.find((s) => stepStatus[s.num] !== "done") || STEPS[STEPS.length - 1];
  const completedCount = STEPS.filter((s) => stepStatus[s.num] === "done").length;
  const progress = Math.round((completedCount / STEPS.length) * 100);

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-5 rounded-xl border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-black">Your Workflow Progress</span>
          <span className="text-sm font-bold text-black/50">{completedCount} of {STEPS.length} steps · {progress}%</span>
        </div>
        <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/5">
          <div className="h-full rounded-full bg-[#f2df0d] transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Next action banner */}
      <div className="rounded-xl border-2 border-[#f2df0d] bg-[#fdfbe1] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#f2df0d] text-black">
            <nextStep.icon size={26} />
          </span>
          <div className="flex-1">
            <p className="text-xs font-black uppercase tracking-wider text-[#b0a209]">Start Here · Next Step</p>
            <h3 className="text-xl font-black">Step {nextStep.num}: {nextStep.title}</h3>
            <p className="text-sm text-black/60">{nextStep.desc}</p>
          </div>
          <button onClick={() => nav(nextStep.route)} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-6 py-3 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">
            Go to Step {nextStep.num} <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Step grid */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((step) => {
          const status = stepStatus[step.num] || "todo";
          const isDone = status === "done";
          const isNext = step.num === nextStep.num;
          return (
            <button
              key={step.num}
              onClick={() => nav(step.route)}
              className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
                isNext ? "border-[#f2df0d] bg-[#fdfbe1]" : isDone ? "border-emerald-200 bg-emerald-50" : "border-black/10 bg-white hover:border-black/20"
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-black ${
                isDone ? "bg-emerald-500 text-white" : isNext ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/40"
              }`}>
                {isDone ? <Check size={18} /> : step.num}
              </span>
              <div className="min-w-0">
                <p className={`text-sm font-black ${isDone ? "text-emerald-700" : isNext ? "text-black" : "text-black/70"}`}>{step.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-black/50">{step.desc}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Setup Assets */}
      <div className="mt-8">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={18} className="text-[#b0a209]" />
          <h2 className="font-black">Your Setup Assets</h2>
          <span className="text-sm font-bold text-black/40">Everything you created during onboarding</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ASSETS.map((a) => {
            const exists = assets[a.key];
            return (
              <button
                key={a.key}
                onClick={() => nav(a.route)}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
                  exists ? "border-emerald-200 bg-emerald-50 hover:bg-emerald-100" : "border-black/10 bg-white hover:border-black/20"
                }`}
              >
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${exists ? "bg-emerald-100 text-emerald-600" : "bg-black/5 text-black/40"}`}>
                  <a.icon size={18} />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{a.label}</p>
                  <p className={`text-xs font-black ${exists ? "text-emerald-600" : "text-black/40"}`}>
                    {exists ? "✓ Created" : "Not set up"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}