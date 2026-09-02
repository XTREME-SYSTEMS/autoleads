import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Activity, AlertCircle, AlertTriangle, Bot, Brain, Bug, Check, CheckCircle2, Clock,
  Database, FileSearch, Gauge, Loader2, PlayCircle, Radar, Rocket,
  Shield, Sparkles, TestTube, TrendingUp, Wrench, X, Zap,
} from "lucide-react";
import { Card, Page, SecondaryButton, StatCard } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";
import AdminAgentConsole from "@/components/autoleads/AdminAgentConsole";

function ActionButton({ icon: Icon, label, onClick, disabled = false, loading = false, tone = "default" }) {
  const tones = {
    default: "border-black/15 bg-white hover:bg-black/[.02]",
    primary: "border-[#f2df0d]/40 bg-[#fdfbe1] hover:bg-[#fcf9cf]",
    dark: "border-black bg-[#0b0b0b] text-white hover:bg-black/85",
    danger: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  };
  return (
    <button onClick={onClick} disabled={disabled || loading} className={`flex items-center gap-2 rounded-lg border px-3.5 py-2.5 text-xs font-bold transition disabled:opacity-40 ${tones[tone]}`}>
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      <span>{loading ? "Running…" : label}</span>
    </button>
  );
}

function ControlPanel({ icon: Icon, title, description, children }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start gap-2.5">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Icon size={18} /></span>
        <div>
          <p className="font-black">{title}</p>
          <p className="text-xs text-black/50">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </Card>
  );
}

const ADMIN_EMAIL = "jeremy@nationalconcretepolishing.net";

export default function Admin() {
  const { user } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState(/** @type {any} */ ({}));
  const [lastResult, setLastResult] = useState(null);
  const [userTest, setUserTest] = useState(null);
  const [deepAudit, setDeepAudit] = useState(null);

  const { records: scores } = useEntityList("SystemScore", { sort: "-created_date", limit: 1, refreshKey });
  const { records: gaps } = useEntityList("SystemGap", { sort: "-created_date", limit: 100, refreshKey });
  const { records: sources } = useEntityList("ScrapeSource", { sort: "-created_date", limit: 50, refreshKey });
  const { records: projects } = useEntityList("Project", { limit: 500, refreshKey });
  const { records: proposals } = useEntityList("Proposal", { limit: 500, refreshKey });

  const latest = (scores || [])[0];
  const openGaps = (gaps || []).filter(g => g.status === "open");
  const fixedGaps = (gaps || []).filter(g => g.status === "fixed");
  const errorSources = (sources || []).filter(s => s.status === "error");
  const activeSources = (sources || []).filter(s => s.status === "active");
  const unverifiedProjects = (projects || []).filter(p => p.verification_status === "unverified");

  const invoke = async (name, label) => {
    setBusy(b => ({ ...b, [name]: true }));
    setLastResult(null);
    try {
      const res = await base44.functions.invoke(name, {});
      setLastResult({ fn: label, ok: true, data: res });
      setRefreshKey(k => k + 1);
    } catch (e) {
      setLastResult({ fn: label, ok: false, error: e?.message || "failed" });
    } finally {
      setBusy(b => ({ ...b, [name]: false }));
    }
  };

  const runDeepAuditCycle = async () => {
    setBusy(b => ({ ...b, deepAudit: true }));
    setDeepAudit(null);
    const steps = [
      { fn: "runSystemAudit", label: "Deep Audit" },
      { fn: "runDataIntegrity", label: "Auto Clean" },
      { fn: "runAutoHeal", label: "Fix & Heal" },
      { fn: "runUiAudit", label: "UI Audit" },
      { fn: "runBenchmarkResearch", label: "Benchmark" },
      { fn: "runSystemAudit", label: "Re-Audit" },
    ];
    const results = [];
    try {
      for (const step of steps) {
        const res = await base44.functions.invoke(step.fn, {});
        results.push({ step: step.label, ok: true, data: res });
      }
      setDeepAudit({ ok: true, steps: results });
      setRefreshKey(k => k + 1);
    } catch (e) {
      setDeepAudit({ ok: false, error: e?.message, steps: results });
    } finally {
      setBusy(b => ({ ...b, deepAudit: false }));
    }
  };

  const runUserTestNow = async () => {
    setBusy(b => ({ ...b, userTest: true }));
    setUserTest(null);
    try {
      const res = await base44.functions.invoke("runUserTest", {});
      setUserTest(res);
    } catch (e) {
      setUserTest({ error: e?.message || "failed" });
    } finally {
      setBusy(b => ({ ...b, userTest: false }));
    }
  };

  const health = latest?.overall_health_score;
  const _healthTone = health == null ? "text-black/30" : health >= 75 ? "text-emerald-600" : health >= 50 ? "text-amber-600" : "text-red-600";

  if (user && user.email !== ADMIN_EMAIL) return <Navigate to="/dashboard" replace />;

  return (
    <Page backTo="/dashboard" eyebrow="Operations" title="Admin Control Center"
      description="Full system control — scrapers, AI pipeline, health, audit, fix & heal, and autonomous agent command. No developer needed."
      actions={<SecondaryButton onClick={() => setRefreshKey(k => k + 1)} disabled={busy.refresh}><Activity size={14} /> Refresh</SecondaryButton>}>

      {/* System Overview Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Gauge} title="System Health" value={health ?? "—"} note={latest ? `Data ${latest.data_quality_score} · Sec ${latest.security_score}` : "No audit yet"} />
        <StatCard icon={AlertTriangle} title="Open Gaps" value={openGaps.length} note={`${fixedGaps.length} fixed`} />
        <StatCard icon={Radar} title="Scrape Sources" value={sources.length} note={`${activeSources.length} active · ${errorSources.length} error`} />
        <StatCard icon={Database} title="Projects" value={projects.length} note={`${unverifiedProjects.length} unverified · ${proposals.length} proposals`} />
      </div>

      {/* Last Result Banner */}
      {lastResult && (
        <div className={`mt-4 rounded-lg border p-3 text-sm ${lastResult.ok ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}>
          <span className="font-black">{lastResult.fn}</span> {lastResult.ok ? "completed" : "failed"}
          {lastResult.ok && lastResult.data ? <span className="ml-2 text-xs opacity-70">{JSON.stringify(lastResult.data).slice(0, 200)}</span> : null}
          {lastResult.error ? <span className="ml-2 text-xs">{lastResult.error}</span> : null}
        </div>
      )}

      {/* Control Panels */}
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <ControlPanel icon={Radar} title="Scrapers & Sources" description="Discover and run lead scraping cycles">
          <ActionButton icon={Radar} label="Run Auto-Scrape" onClick={() => invoke("runAutoScrape", "Auto-Scrape")} loading={busy.runAutoScrape} tone="primary" />
          <ActionButton icon={FileSearch} label="Discover Sources" onClick={() => invoke("discoverSources", "Discover Sources")} loading={busy.discoverSources} />
          <Link to="/sources" className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-xs font-bold hover:bg-black/[.02]"><Wrench size={14} /> Manage Sources</Link>
        </ControlPanel>

        <ControlPanel icon={Brain} title="AI Pipeline" description="Verify, takeoff, estimate, and propose autonomously">
          <ActionButton icon={Rocket} label="Run Full Pipeline" onClick={() => invoke("runFullPipeline", "Full Pipeline")} loading={busy.runFullPipeline} tone="dark" />
          <ActionButton icon={Zap} label="Auto Takeoff" onClick={() => invoke("autoTakeoff", "Auto Takeoff")} loading={busy.autoTakeoff} />
          <ActionButton icon={FileSearch} label="Auto Proposals" onClick={() => invoke("autoProposals", "Auto Proposals")} loading={busy.autoProposals} />
          <ActionButton icon={CheckCircle2} label="Verify Projects" onClick={() => invoke("verifyProject", "Verify Project")} loading={busy.verifyProject} disabled />
        </ControlPanel>

        <ControlPanel icon={Gauge} title="Audit & Benchmark" description="Score the system and research competitors">
          <ActionButton icon={Activity} label="System Audit" onClick={() => invoke("runSystemAudit", "System Audit")} loading={busy.runSystemAudit} tone="primary" />
          <ActionButton icon={Bug} label="UI Audit" onClick={() => invoke("runUiAudit", "UI Audit")} loading={busy.runUiAudit} />
          <ActionButton icon={TrendingUp} label="Benchmark Research" onClick={() => invoke("runBenchmarkResearch", "Benchmark")} loading={busy.runBenchmarkResearch} />
          <Link to="/system-health" className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-xs font-bold hover:bg-black/[.02]"><Activity size={14} /> Health Page</Link>
        </ControlPanel>

        <ControlPanel icon={Wrench} title="Fix & Heal" description="Purge stale data, enrich fields, fix broken records, harden security">
          <ActionButton icon={Wrench} label="Fix & Heal Now" onClick={async () => {
            setBusy(b => ({ ...b, heal: true }));
            try {
              await base44.functions.invoke("runDataIntegrity", {});
              await base44.functions.invoke("runAutoHeal", {});
              await base44.functions.invoke("runSystemAudit", {});
              setLastResult({ fn: "Fix & Heal", ok: true, data: { status: "complete" } });
              setRefreshKey(k => k + 1);
            } catch (e) { setLastResult({ fn: "Fix & Heal", ok: false, error: e?.message }); }
            finally { setBusy(b => ({ ...b, heal: false })); }
          }} loading={busy.heal} tone="dark" />
          <ActionButton icon={Database} label="Data Integrity" onClick={() => invoke("runDataIntegrity", "Data Integrity")} loading={busy.runDataIntegrity} />
          <ActionButton icon={Shield} label="Auto-Heal" onClick={() => invoke("runAutoHeal", "Auto-Heal")} loading={busy.runAutoHeal} />
        </ControlPanel>
      </div>

      {/* Deep Audit & Auto-Evolve */}
      <Card className="mt-5 p-5 border-[#f2df0d]/40 bg-[#fdfbe1]">
        <div className="mb-3 flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Rocket size={18} /></span>
          <div className="flex-1">
            <p className="font-black">Deep Audit & Auto-Evolve</p>
            <p className="text-xs text-black/50">One-click full cycle: Audit → Auto Clean → Fix & Heal → Harden → Optimize → Enhance → Evolve → Re-Audit. Runs the entire self-healing pipeline and reports before/after scores.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton icon={Rocket} label="Run Full Deep Audit & Auto-Evolve" onClick={runDeepAuditCycle} loading={busy.deepAudit} tone="dark" />
          {deepAudit && (
            <span className={`text-xs font-bold ${deepAudit.ok ? "text-emerald-700" : "text-red-700"}`}>
              {deepAudit.ok ? `✓ Complete — ${deepAudit.steps.length} steps run` : `✗ ${deepAudit.error || "Failed"}`}
            </span>
          )}
        </div>
        {deepAudit && deepAudit.steps && (
          <div className="mt-3 space-y-1.5">
            {deepAudit.steps.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                {s.ok ? <CheckCircle2 size={13} className="text-emerald-600" /> : <AlertCircle size={13} className="text-red-500" />}
                <span className="font-bold">{s.step}</span>
                {s.data?.overall != null && <span className="text-black/50">Score: {s.data.overall}</span>}
                {s.data?.purged != null && <span className="text-black/50">Purged: {s.data.purged}</span>}
                {s.data?.fixed != null && <span className="text-black/50">Fixed: {s.data.fixed}</span>}
                {s.data?.hardened != null && <span className="text-black/50">Hardened: {s.data.hardened}</span>}
                {s.data?.enhanced != null && <span className="text-black/50">Enhanced: {s.data.enhanced}</span>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Test as User */}
      <Card className="mt-5 p-5">
        <div className="mb-3 flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><TestTube size={18} /></span>
          <div className="flex-1">
            <p className="font-black">Test as User</p>
            <p className="text-xs text-black/50">Simulates a user journey through the entire system — checks data visibility, pipeline flow, onboarding completeness, and every page a user would see. Reports what works and what's empty from a user's perspective.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ActionButton icon={PlayCircle} label="Run User Test" onClick={runUserTestNow} loading={busy.userTest} tone="primary" />
          {userTest && !userTest.error && (
            <span className="text-xs font-bold">
              UX Score: <span className={userTest.user_experience_score >= 75 ? "text-emerald-700" : userTest.user_experience_score >= 50 ? "text-amber-600" : "text-red-600"}>{userTest.user_experience_score}/100</span>
              <span className="ml-2 text-black/50">{userTest.summary.pass} pass · {userTest.summary.warn} warn · {userTest.summary.fail} fail</span>
            </span>
          )}
        </div>
        {userTest && !userTest.error && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">System Checks</p>
              <div className="space-y-1">
                {userTest.tests.map((t, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {t.status === "pass" ? <Check size={13} className="text-emerald-600" /> : t.status === "warn" ? <AlertCircle size={13} className="text-amber-500" /> : <X size={13} className="text-red-500" />}
                    <span className="font-medium">{t.name}</span>
                    <span className="text-black/40">{t.details}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">User Journey Simulation</p>
              <div className="space-y-1">
                {userTest.journey.map((j, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {j.status === "pass" ? <Check size={13} className="text-emerald-600" /> : j.status === "warn" ? <AlertCircle size={13} className="text-amber-500" /> : <X size={13} className="text-red-500" />}
                    <span className="font-medium">{j.step}</span>
                    <span className="text-black/40">{j.note}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {userTest?.error && <p className="mt-2 text-xs text-red-600">{userTest.error}</p>}
      </Card>

      {/* Cron Schedule */}
      <Card className="mt-5 p-5">
        <div className="mb-3 flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Clock size={18} /></span>
          <div className="flex-1">
            <p className="font-black">Automated Cron Schedule</p>
            <p className="text-xs text-black/50">The System Autopilot workflow runs automatically every 2 hours — audit, benchmark, clean, heal, harden, optimize, enhance, evolve, and UI audit. No manual action needed.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-black/10 bg-black/[.02] p-3">
            <p className="text-xs font-black uppercase text-black/40">Schedule</p>
            <p className="mt-1 text-sm font-bold">Every 2 hours</p>
            <p className="text-xs text-black/50">0 */2 * * *</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[.02] p-3">
            <p className="text-xs font-black uppercase text-black/40">Workflow</p>
            <p className="mt-1 text-sm font-bold">System Autopilot</p>
            <p className="text-xs text-black/50">5-step autonomous cycle</p>
          </div>
          <div className="rounded-lg border border-black/10 bg-black/[.02] p-3">
            <p className="text-xs font-black uppercase text-black/40">Timezone</p>
            <p className="mt-1 text-sm font-bold">America/New_York</p>
            <p className="text-xs text-black/50">Never ends</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/auto-system-setup" className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-xs font-bold hover:bg-black/[.02]"><Zap size={14} /> Automation Settings</Link>
          <Link to="/system-health" className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3.5 py-2.5 text-xs font-bold hover:bg-black/[.02]"><Activity size={14} /> View Health History</Link>
        </div>
      </Card>

      {/* Agent Command Console + Quick Links */}
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AdminAgentConsole />
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2"><Sparkles size={16} className="text-[#b0a209]" /><p className="font-black">Admin Modules</p></div>
            <div className="space-y-2">
              {[
                { to: "/system-qa", icon: Bug, label: "System QA Agent" },
                { to: "/test-runner", icon: TestTube, label: "Test Runner" },
                { to: "/sources", icon: Radar, label: "Source Management" },
                { to: "/jobs", icon: Activity, label: "Job Status" },
                { to: "/ai-command-center", icon: Bot, label: "Full Agent Chat" },
                { to: "/system-health", icon: Gauge, label: "System Health" },
                { to: "/audit", icon: FileSearch, label: "Audit Log" },
                { to: "/settings/integrations", icon: Zap, label: "Integrations" },
                { to: "/settings/security", icon: Shield, label: "Security & RLS" },
                { to: "/settings/ai-autonomy", icon: Brain, label: "AI Autonomy" },
              ].map(m => (
                <Link key={m.to} to={m.to} className="flex items-center gap-2.5 rounded-lg border border-black/10 px-3 py-2.5 text-sm font-medium transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                  <m.icon size={15} className="text-black/50" /> {m.label}
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Source Status Table */}
      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-black">Scraper Status</h2>
          <Link to="/sources" className="text-xs font-bold text-black/50 hover:text-black">Manage all →</Link>
        </div>
        <Card className="divide-y divide-black/5">
          {sources.length === 0 ? (
            <p className="p-6 text-center text-sm text-black/40">No sources configured. Run Discover Sources or add one in Source Management.</p>
          ) : sources.slice(0, 10).map(s => (
            <div key={s.id} className="flex items-center justify-between p-3.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{s.name}</p>
                <p className="truncate text-xs text-black/40">{s.url}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-black/40">{s.records_retrieved || 0} recs</span>
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${s.status === "active" ? "bg-emerald-100 text-emerald-700" : s.status === "error" ? "bg-red-100 text-red-700" : s.status === "paused" ? "bg-gray-100 text-gray-600" : "bg-amber-100 text-amber-700"}`}>{s.status}</span>
              </div>
            </div>
          ))}
        </Card>
      </div>

      {/* Open Gaps */}
      {openGaps.length > 0 && (
        <div className="mt-5">
          <h2 className="mb-3 font-black">Open System Gaps ({openGaps.length})</h2>
          <Card className="divide-y divide-black/5">
            {openGaps.slice(0, 15).map(g => (
              <div key={g.id} className="flex items-start justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{g.title}</p>
                  <p className="truncate text-xs text-black/40">{g.description}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${g.severity === "critical" ? "bg-red-100 text-red-700" : g.severity === "high" ? "bg-orange-100 text-orange-700" : "bg-amber-100 text-amber-700"}`}>{g.severity}</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </Page>
  );
}