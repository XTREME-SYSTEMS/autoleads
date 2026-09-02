import React, { useState } from "react";
import { Check, Loader2, ShieldCheck, Zap, Star } from "lucide-react";
import { Link } from "react-router-dom";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";
import { base44 } from "@/api/base44Client";

const plans = [
  {
    key: 'free', name: 'Free', price: 0, tagline: 'Test the platform',
    description: 'Explore the core workflow with no commitment.',
    features: ['Single user', 'Core project workspace', 'Assistant access', '1 active project', 'Community support'],
  },
  {
    key: 'starter', name: 'Starter', price: 100, tagline: 'Get started',
    description: 'For small estimating teams getting started.',
    features: ['Up to 3 users', 'Project discovery', 'Contractor workspace', 'Proposal drafts', 'Email support', '10 active projects'],
  },
  {
    key: 'pro', name: 'Pro', price: 149, tagline: 'Most popular', popular: true,
    description: 'For growing construction teams.',
    features: ['Up to 10 users', 'AI-assisted takeoff', 'Pricing intelligence', 'Approval workflows', 'Priority support', '50 active projects', 'Automated scraping'],
  },
  {
    key: 'elite', name: 'Elite', price: 299, tagline: 'Scale up',
    description: 'For established teams running a full pipeline.',
    features: ['Up to 25 users', 'Full autonomous pipeline', 'Advanced analytics', 'Bid leveling & outcome learning', 'Team roles & permissions', 'Unlimited projects', 'API access'],
  },
  {
    key: 'enterprise', name: 'Enterprise', price: 499, tagline: 'National scale',
    description: 'For national organizations.',
    features: ['Unlimited users', 'Custom governance', 'Integration planning', 'Dedicated implementation', 'SLA support', 'National coverage', 'Custom AI training'],
  },
];

const faqs = [
  ['Can I try AutoLeads for free?', 'Yes. The Free plan lets you explore the core workflow with one active project — no credit card required. Upgrade anytime.'],
  ['Can I change plans later?', 'Absolutely. You can upgrade, downgrade, or cancel at any time from your billing settings. Changes take effect immediately.'],
  ['Is my data private?', 'Your private pricing memory and win/loss data never leave your account. We only import contractor data from lawful, documented sources.'],
  ['What payment methods do you accept?', 'All major credit and debit cards via Stripe. Enterprise plans can arrange ACH or invoice billing.'],
  ['Do you offer support?', 'Free and Starter include email support. Pro and Elite get priority support. Enterprise includes a dedicated implementation manager and SLA.'],
];

export default function Pricing() {
  const [loading, setLoading] = useState("");
  const [err, setErr] = useState("");

  const subscribe = async (planKey) => {
    if (window.self !== window.top) { setErr("Checkout works only from the published app. Open in a new tab."); return; }
    if (planKey === 'free') { window.location.href = '/register'; return; }
    setLoading(planKey); setErr("");
    try {
      const res = await base44.functions.invoke('createCheckoutSession', { plan: planKey, origin: window.location.origin });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      if (data?.checkout_url) window.location.href = data.checkout_url;
    } catch (e) {
      setErr(e?.message || 'Could not start checkout');
    } finally { setLoading(""); }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="h-20 bg-black text-white">
        <div className="mx-auto flex h-full max-w-7xl items-center px-5">
          <AutoLeadsLogo height={38} light={false} />
          <nav className="ml-auto flex items-center gap-5 text-sm font-bold">
            <Link to="/" className="hover:text-[#f2df0d]">Home</Link>
            <Link to="/login" className="hover:text-[#f2df0d]">Log In</Link>
            <Link to="/register" className="rounded-lg bg-[#f2df0d] px-4 py-2 text-black hover:bg-[#f4e431] transition">Start Free</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-16">
        {/* Header */}
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-[.2em] text-[#cdbd0b]">Pricing plans</p>
          <h1 className="mt-3 text-5xl font-black tracking-tight">Simple Plans. <span className="text-[#dac80b]">Powerful Results.</span></h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-black/55">From free to enterprise — pick the plan that matches your team and scale up anytime.</p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#fcf8ca] px-4 py-2 text-sm font-bold text-[#a99c09]">
            <Zap size={16} /> Start free today — no credit card required
          </div>
          {err && <p className="mt-4 text-sm font-bold text-red-600">{err}</p>}
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid gap-4 lg:grid-cols-5">
          {plans.map(p => (
            <section key={p.key} className={`relative flex flex-col rounded-2xl border bg-white p-6 transition hover:shadow-lg ${p.popular ? 'border-[#f2df0d] shadow-xl ring-2 ring-[#f2df0d]/30' : 'border-black/10'}`}>
              {p.popular && (
                <div className="absolute inset-x-0 top-0 rounded-t-2xl bg-[#f2df0d] py-1.5 text-center text-xs font-black">MOST POPULAR</div>
              )}
              <div className={p.popular ? 'mt-5' : ''}>
                <p className="text-xs font-black uppercase tracking-wider text-[#cebe0b]">{p.tagline}</p>
                <h2 className="mt-1 text-2xl font-black">{p.name}</h2>
                <p className="mt-2 min-h-10 text-sm text-black/55">{p.description}</p>
              </div>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-black">${p.price}</span>
                <span className="text-sm font-bold text-black/40">/mo</span>
              </div>
              <button
                onClick={() => subscribe(p.key)}
                disabled={loading === p.key}
                className={`mt-5 block rounded-lg py-3 text-center text-sm font-black transition disabled:opacity-50 ${p.popular ? 'bg-[#f2df0d] hover:bg-[#f4e431]' : 'border-2 border-[#f2df0d] hover:bg-[#f2df0d]/10'}`}
              >
                {loading === p.key ? <Loader2 size={16} className="mx-auto animate-spin" /> : p.price === 0 ? 'Get Started' : 'Subscribe'}
              </button>
              <ul className="mt-6 space-y-3">
                {p.features.map(f => (
                  <li key={f} className="flex gap-2 text-sm">
                    <Check size={17} className="shrink-0 text-[#cdbd0b]" />
                    <span className="text-black/75">{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm font-bold text-black/50">
          <span className="flex items-center gap-2"><ShieldCheck size={18} className="text-[#cdbd0b]" />Secure Stripe checkout</span>
          <span className="flex items-center gap-2"><Star size={18} className="text-[#cdbd0b]" />Cancel anytime</span>
          <span className="flex items-center gap-2"><Zap size={18} className="text-[#cdbd0b]" />Instant access</span>
        </div>

        {/* FAQ */}
        <section className="mt-20">
          <div className="text-center">
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#cebe0b]">FAQ</p>
            <h2 className="mt-3 text-3xl font-black">Frequently asked questions</h2>
          </div>
          <div className="mx-auto mt-10 max-w-3xl space-y-4">
            {faqs.map(([q, a]) => (
              <div key={q} className="rounded-2xl border border-black/10 p-6">
                <h3 className="text-lg font-black">{q}</h3>
                <p className="mt-2 text-sm leading-6 text-black/60">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mt-20 rounded-3xl bg-[#f2df0d] px-8 py-14 text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Ready to find your next project?</h2>
          <p className="mx-auto mt-3 max-w-xl font-medium text-black/70">Start free today. No credit card required.</p>
          <Link to="/register" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-black px-8 py-4 font-black text-white hover:bg-black/85 transition">
            Create Free Account
          </Link>
        </section>
      </main>

      <footer className="border-t border-black/10 bg-[#fafafa] px-5 py-8 text-center text-sm text-black/45">
        AUTOLEADS · Construction Intelligence · Built by Xtreme AI Systems
      </footer>
    </div>
  );
}