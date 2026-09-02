import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Activity, AlertTriangle, ArrowRight, Boxes, Building2, CheckCircle2, Cpu, Database,
  GitBranch, Globe, Layers, Link2, Loader2, MapPin, Network, Plug, Rocket, Route,
  ShieldCheck, Workflow, X, Zap,
} from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";

// ---- Authored system inventory (from end-to-end analysis) ----
const ARCHITECTURE = [
  { icon: Layers, label: "Frontend", value: "React 18 + Vite", detail: "Tailwind · shadcn/ui · framer-motion · recharts · leaflet · three.js" },
  { icon: Cpu, label: "Backend", value: "85+ Functions", detail: "Deno/TypeScript HTTP handlers · Base44 SDK · service-role + user contexts" },
  { icon: Workflow, label: "Workflows", value: "25+ Automations", detail: "CNCF Serverless Workflow · scheduled + entity + connector triggers" },
  { icon: Database, label: "Data Layer", value: "40+ Entities", detail: "JSON schemas · Row-Level Security · realtime subscriptions · org-scoped" },
  { icon: Network, label: "Integrations", value: "Core + OAuth", detail: "InvokeLLM · SendEmail · UploadFile · Gmail · Calendar · Drive · Stripe" },
  { icon: Globe, label: "External Engines", value: "Cloud Browser", detail: "Railway Playwright + Browserbase · SAM.gov · web-search LLM" },
];

const CONNECTED = [
  { name: "Gmail", status: "authorized", scopes: "gmail.send · gmail.readonly", note: "App-user — sends as the logged-in user" },
  { name: "Google Calendar", status: "authorized", scopes: "calendar", note: "Bid deadline syncing" },
  { name: "Google Drive", status: "authorized", scopes: "drive.readonly", note: "Read-only — cannot auto-save files" },
  { name: "Stripe", status: "authorized", scopes: "test mode", note: "Claimed · sandbox · 8 products · not live" },
  { name: "HubSpot", status: "registered", scopes: "—", note: "Registered but unauthorized — dead connector" },
  { name: "Google Sheets", status: "registered", scopes: "—", note: "Registered but unauthorized — dead connector" },
  { name: "Google Docs", status: "registered", scopes: "—", note: "Registered but unauthorized — dead connector" },
  { name: "Google Tasks", status: "registered", scopes: "—", note: "Registered but unauthorized — dead connector" },
  { name: "Supabase", status: "registered", scopes: "—", note: "Workspace connector · mode: all" },
  { name: "Railway Browser", status: "configured", scopes: "x-api-key", note: "Health OK · cloud browser engine non-functional" },
  { name: "Browserbase", status: "configured", scopes: "project key", note: "Cloud browser fallback · not wired" },
  { name: "SAM.gov", status: "configured", scopes: "api key", note: "Federal opportunities · quota resets midnight UTC" },
];

const PIPELINE = [
  { n: 1, k: "qualification", label: "Qualification", desc: "Is this a real, pursuable opportunity?" },
  { n: 2, k: "takeoff", label: "Takeoff", desc: "Measure it — AI quantity extraction" },
  { n: 3, k: "estimating", label: "Estimating", desc: "Price it — winning-bid intelligence" },
  { n: 4, k: "proposal", label: "Proposal", desc: "Package it — logo-branded, 24-hr" },
  { n: 5, k: "submitted", label: "Submitted", desc: "Send it — email or portal" },
  { n: 6, k: "follow_up", label: "Follow-Up", desc: "Chase it — automated cadence" },
  { n: 7, k: "won", label: "Won", desc: "Win it — outcome tracking" },
  { n: 8, k: "scheduled", label: "Scheduled", desc: "Plan it — calendar sync" },
  { n: 9, k: "in_progress", label: "In Progress", desc: "Build it — change orders" },
  { n: 10, k: "completed", label: "Completed", desc: "Close → Invoice → Referral" },
];

const FAULTS = [
  { sev: "critical", title: "Cloud browser non-functional", fix: "Complete Railway Playwright engine integration — blocks deep social/residential/permit scraping" },
  { sev: "critical", title: "No custom domain connected", fix: "Connect custom domain → unlocks autonomous SendEmail to non-registered contractors from workflows" },
  { sev: "high", title: "Gmail is app-user only", fix: "Workflows can't send via Gmail (no user). Use SendEmail (needs custom domain) or reauthorize as shared" },
  { sev: "high", title: "4 dead connectors", fix: "HubSpot, Sheets, Docs, Tasks registered but unauthorized — authorize or remove" },
  { sev: "high", title: "Stripe in test mode", fix: "Go live: Dashboard → Integrations → Stripe → provide live API keys" },
  { sev: "medium", title: "Google Drive read-only", fix: "Reauthorize with drive.file scope to enable automated file saves" },
  { sev: "medium", title: "Onboarding fragmentation", fix: "7 setup pages (AutoLeads/Bids/App/Pricing/System/Payments + GetStarted + Wizard) — consolidate into one guided flow" },
  { sev: "medium", title: "Lead view sprawl", fix: "6 overlapping lead views (LeadDiscovery, LeadFeed, SocialLeads, LeadPipeline, NewLead, BidBoard) — consolidate to LeadFeed" },
  { sev: "medium", title: "Admin surface sprawl", fix: "7 admin surfaces (Admin, AdminPortal, OpsCommander, AgentCommandCenter, SystemHealth, Observability, BetaOps) — unify under AdminPortal" },
  { sev: "low", title: "PWA manifest not linked", fix: "Re-link /manifest.json + service worker in index.html for installable app" },
  { sev: "low", title: "Push notifications need native build", fix: "Build iOS/Android native app + configure push credentials" },
];

const NEXT_STEPS = [
  "Connect a custom domain → zero-human autonomous email",
  "Complete the cloud browser engine → 50-state deep scraping",
  "Authorize or remove the 4 dead connectors",
  "Go live with Stripe → start collecting revenue",
  "Consolidate onboarding into one guided wizard",
  "Consolidate lead views into a single LeadFeed",
  "Build native app → push notifications + mobile install",
];

const CAPABILITIES = [
  "50-state coverage engine", "10-step autonomous pipeline", "AI-driven takeoff & estimating",
  "Logo-branded 24-hr proposals", "Self-healing audit cycle", "Self-reflection loops",
  "Validation gates (intake → takeoff → bid package)", "Source quality scoring",
  "Contractor outreach engine (intro + 3 follow-ups)", "Cost intelligence", "API key monetization",
  "Realtime lead subscriptions", "E-signature contracts", "Change order management",
];

function StatusDot({ status }) {
  const c = status === "authorized" ? "bg-emerald-500" : status === "configured" ? "bg-blue-500" : "bg-amber-500";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} />;
}

export default function SystemInventory() {
  const [health, setHealth] = useState(null);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [sc, fl] = await Promise.all([
        base44.entities.SystemScore.list("-created_date", 1).catch(() => []),
        base44.entities.SystemFlag.list("-created_date", 100).catch(() => []),
      ]);
      setHealth(sc[0] || null);
      setFlags(fl.filter((f) => f.status === "open" || f.status === "fixing"));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] pb-16">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <BackButton to="/admin-portal" />
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Boxes size={18} /></span>
          <div>
            <h1 className="text-lg font-black">System Inventory</h1>
            <p className="text-xs text-black/50">End-to-end architecture · connected accounts · pipeline · faults · next autonomous steps</p>
          </div>
          <Link to="/dna-blueprint" className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-2 text-xs font-black">
            <GitBranch size={14} /> DNA Blueprint
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-5 py-6">
        {/* LIVE HEALTH */}
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Overall Health", value: health?.overall_health_score ?? "—", icon: Activity },
            { label: "Data Quality", value: health?.data_quality_score ?? "—", icon: Database },
            { label: "Security", value: health?.security_score ?? "—", icon: ShieldCheck },
            { label: "Open Flags", value: flags.length, icon: AlertTriangle },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="card-3d p-4">
              <Icon size={18} className="text-black/40" />
              <p className="mt-2 text-2xl font-black">{loading ? <Loader2 size={18} className="animate-spin text-black/30" /> : value}</p>
              <p className="text-xs text-black/50">{label}</p>
            </div>
          ))}
        </section>

        {/* ARCHITECTURE */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-wide"><Cpu size={16} className="text-[#b0a209]" /> Architecture</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ARCHITECTURE.map((a) => (
              <div key={a.label} className="card-3d p-4">
                <div className="flex items-center gap-2"><a.icon size={18} className="text-[#b0a209]" /><span className="text-xs font-black uppercase tracking-wide text-black/50">{a.label}</span></div>
                <p className="mt-2 font-black">{a.value}</p>
                <p className="text-xs text-black/50">{a.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CONNECTED ACCOUNTS */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-wide"><Plug size={16} className="text-[#b0a209]" /> Connected Accounts</h2>
          <div className="card-3d overflow-hidden">
            {CONNECTED.map((c, i) => (
              <div key={c.name} className={`flex items-center gap-3 p-3.5 ${i > 0 ? "border-t border-black/5" : ""}`}>
                <StatusDot status={c.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{c.name}</p>
                  <p className="truncate text-xs text-black/50">{c.note}</p>
                </div>
                <div className="hidden text-right sm:block">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${c.status === "authorized" ? "bg-emerald-100 text-emerald-700" : c.status === "configured" ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span>
                  <p className="mt-0.5 text-[10px] text-black/40">{c.scopes}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PIPELINE */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-wide"><Route size={16} className="text-[#b0a209]" /> The 10-Step Pipeline</h2>
          <div className="card-3d p-5">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {PIPELINE.map((s, i) => (
                <React.Fragment key={s.n}>
                  <div className="min-w-[140px] flex-1 rounded-lg border border-black/10 bg-[#fcf9cf] p-3">
                    <div className="flex items-center gap-1.5">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-[#0b0b0b] text-[10px] font-black text-[#f2df0d]">{s.n}</span>
                      <span className="text-xs font-black uppercase">{s.label}</span>
                    </div>
                    <p className="mt-1.5 text-[11px] text-black/50">{s.desc}</p>
                  </div>
                  {i < PIPELINE.length - 1 && <ArrowRight size={14} className="mt-3 shrink-0 text-black/20" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* FAULTS */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-wide"><AlertTriangle size={16} className="text-red-500" /> Faults & Redundancies</h2>
          <div className="space-y-2">
            {FAULTS.map((f) => (
              <div key={f.title} className="card-3d p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${f.sev === "critical" ? "bg-red-100 text-red-700" : f.sev === "high" ? "bg-orange-100 text-orange-700" : f.sev === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{f.sev}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold">{f.title}</p>
                    <p className="mt-0.5 flex items-start gap-1.5 text-xs text-emerald-700"><CheckCircle2 size={12} className="mt-0.5 shrink-0" /> {f.fix}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* NEXT STEPS + CAPABILITIES */}
        <section className="grid gap-5 lg:grid-cols-2">
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-wide"><Rocket size={16} className="text-[#b0a209]" /> Next Autonomous Steps</h2>
            <div className="card-3d p-5">
              <ol className="space-y-2.5">
                {NEXT_STEPS.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0b0b0b] text-[10px] font-black text-[#f2df0d]">{i + 1}</span>
                    <span className="text-black/70">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <div>
            <h2 className="mb-3 flex items-center gap-2 font-brand text-sm font-bold uppercase tracking-wide"><Zap size={16} className="text-[#b0a209]" /> Max Capability</h2>
            <div className="card-3d p-5">
              <div className="flex flex-wrap gap-2">
                {CAPABILITIES.map((c) => (
                  <span key={c} className="rounded-full border border-[#f2df0d]/40 bg-[#fdfbe1] px-3 py-1.5 text-xs font-bold text-black/70">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}