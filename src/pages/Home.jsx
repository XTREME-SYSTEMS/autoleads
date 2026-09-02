import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  ArrowRight, BarChart3, Bot, BriefcaseBusiness, Building2, Calculator,
  CheckCircle2, Mail, MapPinned, Menu, Radar, ShieldCheck, Sparkles, X
} from "lucide-react";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";
import HeroCommandCenter from "@/components/brand/HeroCommandCenter";

const modules = [
  [Radar, 'Opportunity Discovery', 'Find public, private, permit, planning, and bid-invitation opportunities with source health and provenance.'],
  [Building2, 'Opportunity Graph', 'Connect projects, owners, designers, contractors, planholders, contacts, prior awards, and relationships.'],
  [BarChart3, 'Explainable Bidability', 'Score trade fit, geography, stage, documents, relationships, deadline, margin, and source confidence independently.'],
  [Calculator, 'Evidence-First Takeoff', 'Link every quantity to plan regions, scale, formula, specification evidence, confidence, review, and approval.'],
  [BriefcaseBusiness, 'Pricing, Estimates & Proposals', 'Learn from private actual costs, prepare estimates, create governed proposal versions, and preserve approvals.'],
  [Mail, 'Bid Inbox & Communication Control', 'Process invitations, create approved drafts, manage suppression, track replies, and schedule safe follow-up.'],
  [Bot, 'Daily Business Autopilot', 'Turn leads, deadlines, reviews, approvals, replies, and source warnings into one prioritized action plan.'],
  [Sparkles, 'Closed-Loop Learning', 'Use verified wins, losses, decline reasons, and job-cost outcomes to improve future recommendations.'],
];

const stats = [
  ['Multi-source', 'Government data ingestion'],
  ['8-step', 'Autonomous pipeline'],
  ['Reviewable', 'Source-evidence tracking'],
  ['24/7', 'Automated monitoring'],
];

const steps = [
  ['01', 'Discover', 'Auto-scrape federal APIs, permits, planning agendas, news feeds, and government portals nationwide.'],
  ['02', 'Qualify', 'AI scores every lead on trade fit, geography, documents, relationships, and margin — explainable, not black-box.'],
  ['03', 'Win', 'Evidence-first takeoffs, private pricing memory, governed proposals, and approval-gated outreach close the loop.'],
];

const builtFor = [
  ['Opportunity Discovery', 'Find public, private, permit, planning, and bid-invitation opportunities with source provenance.'],
  ['Evidence-First Takeoff', 'Link every quantity to plan regions, scale, formula, specification evidence, and review.'],
  ['Governed Communication', 'Approval-gated outreach with receipt tracking — no silent sending, no black-box actions.'],
];

export default function Home() {
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let active = true;
    base44.auth.isAuthenticated().then(a => { if (active && a) nav('/dashboard', { replace: true }); }).catch(() => {});
    return () => { active = false; };
  }, [nav]);

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center px-5">
          <AutoLeadsLogo height={48} dark={false} />
          <nav className="ml-auto hidden items-center gap-7 text-sm font-bold md:flex">
            <a href="#platform" className="hover:text-[#cebe0b]">Platform</a>
            <a href="#how" className="hover:text-[#cebe0b]">How It Works</a>
            <Link to="/pricing" className="hover:text-[#cebe0b]">Pricing</Link>
            <a href="#security" className="hover:text-[#cebe0b]">Security</a>
            <Link to="/login?returnTo=/dashboard" className="hover:text-[#cebe0b]">Log In</Link>
            <Link to="/register?returnTo=/dashboard" className="rounded-lg bg-[#f2df0d] px-5 py-3 font-black text-black hover:bg-[#f4e431] transition">Start Free</Link>
          </nav>
          <button className="ml-auto p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-black/10 bg-white px-5 py-4 md:hidden">
            <nav className="flex flex-col gap-4 text-sm font-bold">
              <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
              <a href="#how" onClick={() => setMenuOpen(false)}>How It Works</a>
              <Link to="/pricing" onClick={() => setMenuOpen(false)}>Pricing</Link>
              <a href="#security" onClick={() => setMenuOpen(false)}>Security</a>
              <Link to="/login?returnTo=/dashboard" onClick={() => setMenuOpen(false)}>Log In</Link>
              <Link to="/register?returnTo=/dashboard" onClick={() => setMenuOpen(false)} className="rounded-lg bg-[#f2df0d] px-5 py-3 text-center">Start Free</Link>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-black/10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_40%,rgba(255,196,0,.18),transparent_32%)]" />
          <div className="mx-auto grid min-h-[640px] max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1.02fr_.98fr]">
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#cebe0b]">Autonomous construction opportunity intelligence</p>
              <h1 className="mt-4 max-w-3xl text-5xl font-black leading-[.98] tracking-[-.045em] sm:text-6xl lg:text-7xl">Find More Projects. <span className="text-[#dac80b]">Win More Work.</span></h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-black/62">AutoLeads gives construction businesses one operating system for opportunity discovery, relationship intelligence, explainable qualification, evidence-first takeoff, private pricing memory, proposals, communication control, and daily execution.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-7 py-4 font-black text-black hover:bg-[#f4e431] transition">Start Free <ArrowRight size={18} /></Link>
                <Link to="/pricing" className="rounded-lg border-2 border-black px-7 py-4 font-black hover:bg-black hover:text-white transition">View Pricing</Link>
              </div>
              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                {[[ShieldCheck, 'Human-approved automation'], [MapPinned, 'National coverage'], [Sparkles, 'AI built for contractors']].map(([I, t]) => (
                  <div key={t} className="flex items-center gap-2 text-sm font-bold"><I size={18} className="text-[#cdbd0b]" />{t}</div>
                ))}
              </div>
            </div>
            <HeroCommandCenter />
          </div>
        </section>

        {/* Stats bar */}
        <section className="bg-[#0b0b0b] text-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
            {stats.map(([n, l]) => (
              <div key={l} className="text-center">
                <p className="text-3xl font-black text-[#f2df0d] sm:text-4xl">{n}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-wider text-white/50">{l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#cebe0b]">How it works</p>
            <h2 className="mt-3 text-4xl font-black">From lead to signed contract in three steps.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-black/55">A governed, autonomous pipeline that turns raw public data into profitable work — without black boxes.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(([num, title, desc]) => (
              <div key={num} className="relative rounded-2xl border border-black/10 p-7">
                <span className="font-brand text-5xl font-black text-[#f2df0d]">{num}</span>
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-black/55">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Platform modules */}
        <section id="platform" className="border-y border-black/10 bg-[#fafafa]">
          <div className="mx-auto max-w-7xl px-5 py-20">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#cebe0b]">Everything a construction business needs</p>
              <h2 className="mt-3 text-4xl font-black">One command center from opportunity to profitable outcome.</h2>
              <p className="mx-auto mt-4 max-w-3xl text-black/55">Modular enough for a small contractor, governed enough to scale across teams, markets, trades, and national operations.</p>
            </div>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {modules.map(([I, t, d]) => (
                <div key={t} className="rounded-2xl border border-black/10 bg-white p-6 transition hover:shadow-lg hover:-translate-y-0.5">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#fcf8ca] text-[#a99c09]"><I size={24} /></span>
                  <h3 className="mt-5 text-lg font-black">{t}</h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Built For */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#cebe0b]">Built for contractors</p>
            <h2 className="mt-3 text-4xl font-black">Designed for construction teams across configured markets.</h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {builtFor.map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-black/10 p-7">
                <h3 className="text-lg font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-black/55">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-y border-black/10 bg-[#0b0b0b] text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[.2em] text-[#f2df0d]">Built for trust</p>
              <h2 className="mt-3 text-4xl font-black">No fake leads. No silent sending. No black-box quantities.</h2>
            </div>
            <div className="grid gap-4 text-sm leading-7 text-white/70">
              <p className="flex gap-3"><CheckCircle2 size={20} className="shrink-0 text-[#f2df0d]" />Every project, company, quantity, price, proposal, and outbound message preserves its source, confidence, reviewer, approval, and receipt.</p>
              <p className="flex gap-3"><CheckCircle2 size={20} className="shrink-0 text-[#f2df0d]" />Live communication remains approval-gated. AI-generated takeoffs remain reviewable. National contractor data is imported only from lawful, documented sources.</p>
              <p className="flex gap-3"><CheckCircle2 size={20} className="shrink-0 text-[#f2df0d]" />Your private pricing memory never leaves your account. Your win/loss data trains your recommendations — not anyone else's.</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <div className="rounded-3xl bg-[#f2df0d] px-8 py-16 text-center">
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Start winning more work today.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg font-medium text-black/70">Start finding, qualifying, and winning construction projects autonomously.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register" className="inline-flex items-center gap-2 rounded-lg bg-black px-8 py-4 font-black text-white hover:bg-black/85 transition">Start Free <ArrowRight size={18} /></Link>
              <Link to="/pricing" className="rounded-lg border-2 border-black px-8 py-4 font-black hover:bg-black hover:text-white transition">See Pricing</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-[#fafafa] px-5 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <AutoLeadsLogo height={36} dark={false} />
              <p className="mt-4 text-sm text-black/50">Autonomous construction opportunity intelligence.</p>
            </div>
            <div>
              <p className="font-black">Platform</p>
              <ul className="mt-3 space-y-2 text-sm text-black/55">
                <li><a href="#platform" className="hover:text-black">Modules</a></li>
                <li><a href="#how" className="hover:text-black">How It Works</a></li>
                <li><Link to="/pricing" className="hover:text-black">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-black">Company</p>
              <ul className="mt-3 space-y-2 text-sm text-black/55">
                <li><Link to="/privacy" className="hover:text-black">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-black">Terms of Service</Link></li>
                <li><Link to="/support" className="hover:text-black">Support</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-black">Get Started</p>
              <ul className="mt-3 space-y-2 text-sm text-black/55">
                <li><Link to="/register" className="hover:text-black">Create Account</Link></li>
                <li><Link to="/login" className="hover:text-black">Log In</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t border-black/10 pt-6 text-center text-sm text-black/45">
            AUTOLEADS · Construction Intelligence · Built by Xtreme AI Systems
          </div>
        </div>
      </footer>
    </div>
  );
}