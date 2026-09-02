import React from "react";
import { Sparkles, Flame, ClipboardCheck, PackageCheck, Send, Trophy, CalendarDays, CheckCircle2, Receipt, Users, ArrowRight, Compass } from "lucide-react";

const ACHIEVEMENTS = [
  { icon: Flame, title: "Discover Leads", desc: "Daily automated scanning of 70+ bid sources across all 50 states" },
  { icon: ClipboardCheck, title: "AI Takeoffs", desc: "Material and labor estimates generated from project documents" },
  { icon: PackageCheck, title: "Bid Packages", desc: "Professional proposals with your branding, ready to send" },
  { icon: Send, title: "Email Outreach", desc: "Automated bid delivery and follow-up tracking" },
  { icon: Trophy, title: "Close Deals", desc: "Win more work with intelligent, competitive bidding" },
  { icon: CalendarDays, title: "Schedule Jobs", desc: "Won projects sync to your calendar automatically" },
  { icon: CheckCircle2, title: "Final Walkthrough", desc: "Track projects through to completion" },
  { icon: Receipt, title: "Invoicing", desc: "Automated invoice generation for completed work" },
  { icon: Users, title: "Referrals", desc: "Turn satisfied clients into your next pipeline" },
];

export default function WelcomeStep({ userName, onBegin }) {
  return (
    <div>
      {/* Hero */}
      <div className="text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[#FFC400] shadow-[0_8px_20px_rgba(255,196,0,.22)]">
          <Sparkles size={30} className="text-black" />
        </span>
        <h1 className="mt-5 text-3xl font-black tracking-[-.03em] sm:text-4xl">
          {userName ? `Welcome, ${userName}!` : "Welcome to AUTOLEADS!"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-black/55">
          Your autonomous preconstruction operating system. Let's set up your pipeline to discover opportunities, win bids, and grow your business — automatically.
        </p>
      </div>

      {/* What is AUTOLEADS */}
      <div className="mt-8 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Sparkles size={18} className="text-[#D99D00]" /> What is AUTOLEADS?
        </h2>
        <p className="mt-2 text-sm leading-6 text-black/65">
          AUTOLEADS is an AI-powered platform that empowers construction businesses to discover project opportunities, manage bid invitations, and optimize the entire estimating and proposal workflow — from lead discovery to final invoice and referrals.
        </p>
      </div>

      {/* What we'll achieve */}
      <div className="mt-5 rounded-2xl border border-black/10 bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Trophy size={18} className="text-[#D99D00]" /> What We'll Achieve Together
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {ACHIEVEMENTS.map((a) => (
            <div key={a.title} className="flex items-start gap-3 rounded-lg border border-black/5 bg-[#FFF7DA]/50 p-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#FFC400] text-black">
                <a.icon size={18} />
              </span>
              <div>
                <p className="text-sm font-bold">{a.title}</p>
                <p className="mt-0.5 text-xs leading-5 text-black/55">{a.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="mt-5 rounded-2xl border border-[#FFC400] bg-[#FFF7DA] p-5">
        <h2 className="flex items-center gap-2 text-lg font-black">
          <Compass size={18} className="text-[#D99D00]" /> How This Onboarding Works
        </h2>
        <ul className="mt-3 space-y-2.5 text-sm leading-6 text-black/70">
          <li className="flex gap-2"><span className="font-black text-[#D99D00]">①</span> Follow the 10-step timeline at the top — scroll left or right to see all steps.</li>
          <li className="flex gap-2"><span className="font-black text-[#D99D00]">②</span> Between each step, a quick guide pops up to explain what's next.</li>
          <li className="flex gap-2"><span className="font-black text-[#D99D00]">③</span> Stop anytime — your progress is saved. Come back and resume where you left off.</li>
          <li className="flex gap-2"><span className="font-black text-[#D99D00]">④</span> Need to change something? Tap any circle in the timeline to revise a step.</li>
        </ul>
      </div>

      {/* Begin button */}
      <button
        onClick={onBegin}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC400] px-6 py-4 font-black text-black shadow-[0_8px_20px_rgba(255,196,0,.22)] active:scale-[.98]"
      >
        Begin Setup <ArrowRight size={20} />
      </button>
    </div>
  );
}