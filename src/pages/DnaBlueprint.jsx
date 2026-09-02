import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, Award, BookOpen, Brain, Building2, CheckCircle2, Dna, Eye, FileCheck2,
  Fingerprint, Flame, GitBranch, Heart, Layers, Lock, MapPin, Radio, Rocket,
  ScrollText, ShieldCheck, Sparkles, Target, Timer, Zap,
} from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";

// The AUTOLEADS operating system — our DNA, our rules, our commitment.
// This is the blueprint every record, function, workflow, and user action lives by.

const PRINCIPLES = [
  { icon: Zap, n: "01", title: "Autonomy First", rule: "Every repetitive task must be automated. If a human does it twice, the system learns to do it the third time." },
  { icon: ShieldCheck, n: "02", title: "Truth Over Trust", rule: "Server-authoritative truth only. Never trust stale client state. Recompute, verify, validate — always." },
  { icon: FileCheck2, n: "03", title: "Evidence-Based", rule: "Every lead, takeoff, estimate, and proposal must carry traceable provenance. No data without a source URL." },
  { icon: Brain, n: "04", title: "Self-Healing", rule: "The system audits, flags, and fixes its own faults in a continuous improvement loop — analyze, clean, heal, harden, optimize." },
  { icon: Building2, n: "05", title: "Commercial & Government Focus", rule: "Real revenue lives in commercial and government bids. Residential is intelligence, not the core product." },
  { icon: Timer, n: "06", title: "Speed Wins", rule: "Full proposals in 24 hours — guaranteed. We mobilize on a moment's notice. Speed is the competitive moat." },
  { icon: Lock, n: "07", title: "Tenant Isolation", rule: "Every organization's data is sacred. Row-Level Security is enforced on every entity. Zero cross-tenant leakage, ever." },
  { icon: Eye, n: "08", title: "Radical Simplicity", rule: "Our users are construction professionals, not technologists. One button, one job. Extreme simplicity always." },
  { icon: Flame, n: "09", title: "The Morning Addiction", rule: "Users wake up to fresh leads. The first interaction of the day must be magical — addictive, immediate, valuable." },
  { icon: Sparkles, n: "10", title: "Never Stop Learning", rule: "Self-reflection, outcome tracking, and source-quality scoring make the system smarter every single day." },
];

const HELIX = [
  { n: 1, k: "qualification", icon: Radio, q: "Is this real?", a: "Verify it" },
  { n: 2, k: "takeoff", icon: Layers, q: "How much?", a: "Measure it" },
  { n: 3, k: "estimating", icon: Target, q: "What price?", a: "Price it" },
  { n: 4, k: "proposal", icon: FileCheck2, q: "What package?", a: "Build it" },
  { n: 5, k: "submitted", icon: Rocket, q: "Delivered?", a: "Send it" },
  { n: 6, k: "follow_up", icon: Radio, q: "Heard back?", a: "Chase it" },
  { n: 7, k: "won", icon: Award, q: "Did we win?", a: "Win it" },
  { n: 8, k: "scheduled", icon: MapPin, q: "When?", a: "Plan it" },
  { n: 9, k: "in_progress", icon: Building2, q: "Building?", a: "Build it" },
  { n: 10, k: "completed", icon: Heart, q: "Closed?", a: "Close → Bill → Refer" },
];

const RULES = [
  "Every record has a source_url.",
  "Every proposal is logo-branded.",
  "Every bid has a deadline.",
  "Every takeoff has evidence.",
  "Every flag has a fix.",
  "Every cycle has a reflection.",
  "Every user belongs to an organization.",
  "Every dollar is tracked.",
  "Every automation is idempotent.",
  "Every failure is logged, not swallowed.",
];

const COMMITMENT = [
  "We will replace manual estimating labor with autonomous intelligence.",
  "We will give every contractor their mornings back.",
  "We will never ship a lead we cannot trace to a source.",
  "We will win on speed, not on price-gouging.",
  "We will protect every tenant's data as if it were our own.",
  "We will make the complex feel like one button.",
];

export default function DnaBlueprint() {
  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0b0b0b]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-4">
          <BackButton to="/admin-portal" />
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f2df0d] text-[#0b0b0b]"><Dna size={18} /></span>
          <div>
            <h1 className="font-brand text-lg font-bold uppercase tracking-wide">DNA Blueprint</h1>
            <p className="text-xs text-white/40">The operating system · our rules to live and stand by</p>
          </div>
          <Link to="/system-inventory" className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-2 text-xs font-bold hover:bg-white/5">
            <Boxes /> System Inventory
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-10">
        {/* HERO */}
        <section className="relative overflow-hidden rounded-3xl border border-[#f2df0d]/30 bg-gradient-to-br from-[#1a1a1a] via-[#0b0b0b] to-[#1a1a1a] p-8 sm:p-12">
          <div className="absolute -right-10 -top-10 opacity-10"><Dna size={200} className="text-[#f2df0d]" /></div>
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f2df0d]/40 bg-[#f2df0d]/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-[#f2df0d]"><Fingerprint size={12} /> The Constitution</span>
            <h2 className="mt-4 font-brand text-4xl font-bold uppercase leading-[.95] tracking-tight sm:text-5xl">AUTO<span className="text-[#f2df0d]">LEADS</span> DNA</h2>
            <p className="mt-3 max-w-xl text-sm text-white/60">This is our blueprint — the operating system, the visual commitment, and the rules we live and stand by. Every function, workflow, entity, and user action in this system answers to this document.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Autonomy", "Truth", "Evidence", "Speed", "Simplicity", "Isolation"].map((t) => (
                <span key={t} className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-bold text-white/70">{t}</span>
              ))}
            </div>
          </div>
        </section>

        {/* THE 10 PRINCIPLES */}
        <section className="mt-10">
          <h3 className="mb-4 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-widest text-[#f2df0d]"><ScrollText size={16} /> The 10 Principles</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p.n} className="group rounded-2xl border border-white/10 bg-white/[.03] p-5 transition hover:border-[#f2df0d]/40 hover:bg-[#f2df0d]/[.04]">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#f2df0d] text-[#0b0b0b]"><p.icon size={20} /></span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#f2df0d]/70">{p.n}</span>
                      <h4 className="font-brand text-base font-bold uppercase tracking-wide">{p.title}</h4>
                    </div>
                    <p className="mt-1.5 text-sm text-white/60">{p.rule}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* THE DNA HELIX — 10-STEP PIPELINE */}
        <section className="mt-10">
          <h3 className="mb-4 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-widest text-[#f2df0d]"><GitBranch size={16} /> The DNA Helix — 10-Step Pipeline</h3>
          <div className="rounded-2xl border border-white/10 bg-white/[.02] p-6">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {HELIX.map((s) => (
                <div key={s.n} className="relative rounded-xl border border-white/10 bg-[#0b0b0b] p-4">
                  <div className="flex items-center justify-between">
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f2df0d] text-sm font-black text-[#0b0b0b]">{s.n}</span>
                    <s.icon size={16} className="text-white/30" />
                  </div>
                  <p className="mt-2 font-brand text-xs font-bold uppercase tracking-wide text-[#f2df0d]">{s.k}</p>
                  <p className="mt-1 text-[11px] text-white/50">{s.q}</p>
                  <p className="mt-0.5 text-xs font-bold text-white/80">{s.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RULES + COMMITMENT */}
        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-widest text-[#f2df0d]"><CheckCircle2 size={16} /> Rules to Live By</h3>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <ul className="space-y-2.5">
                {RULES.map((r) => (
                  <li key={r} className="flex items-start gap-2.5 text-sm text-white/75">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#f2df0d]" /> {r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-widest text-[#f2df0d]"><Heart size={16} /> Our Commitment</h3>
            <div className="rounded-2xl border border-[#f2df0d]/30 bg-[#f2df0d]/[.05] p-5">
              <ul className="space-y-3">
                {COMMITMENT.map((c) => (
                  <li key={c} className="flex items-start gap-2.5 text-sm text-white/80">
                    <Sparkles size={15} className="mt-0.5 shrink-0 text-[#f2df0d]" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* GOVERNANCE SIGNATURE */}
        <section className="mt-10 rounded-2xl border border-white/10 bg-gradient-to-r from-[#f2df0d]/10 via-transparent to-[#f2df0d]/10 p-6 text-center">
          <BookOpen size={24} className="mx-auto text-[#f2df0d]" />
          <p className="mt-3 font-brand text-lg font-bold uppercase tracking-wide">This is how we build. This is how we win.</p>
          <p className="mt-1 text-xs text-white/50">AUTOLEADS Operating System · Governed by the 10 Principles · Enforced by Row-Level Security · Sustained by Self-Reflection</p>
          <Link to="/system-inventory" className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-xs font-black text-[#0b0b0b]">
            View System Inventory <ArrowRight size={14} />
          </Link>
        </section>
      </main>
    </div>
  );
}

function Boxes() {
  return <span className="text-white/70">⬡</span>;
}