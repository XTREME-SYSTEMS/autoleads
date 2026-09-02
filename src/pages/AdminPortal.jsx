import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Check, CheckCircle2, Clock, Database,
  Flag, Loader2, Mail, MapPin, Plus, RefreshCw, Rocket, Search, Shield, ShieldCheck,
  Tag, Trash2, UserPlus, Users, Wrench, X, Zap,
} from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";

const TABS = [
  { key: 'overview', label: 'Overview', icon: Activity },
  { key: 'promo', label: 'Promo Codes', icon: Tag },
  { key: 'team', label: 'Team & Access', icon: Users },
  { key: 'flags', label: 'Flags', icon: Flag },
  { key: 'audit', label: 'Audit & Fix', icon: Wrench },
];

export default function AdminPortal() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [refreshKey, setRefreshKey] = useState(0);
  const [busy, setBusy] = useState({});
  const [lastResult, setLastResult] = useState(null);

  // Overview data
  const [scores, setScores] = useState([]);
  const [gaps, setGaps] = useState([]);
  const [flags, setFlags] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Promo form
  const [promoForm, setPromoForm] = useState({ code: '', description: '', discount_type: 'percentage', discount_value: 10, max_uses: 0, valid_until: '', applicable_plans: 'all', notes: '' });
  const [promoLoading, setPromoLoading] = useState(false);

  // Invite form
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member', name: '', access_level: '' });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [accessLevels, setAccessLevels] = useState([]);
  const [showAccessForm, setShowAccessForm] = useState(false);
  const [newLevel, setNewLevel] = useState({ name: '', description: '', category: '', color: '#3b82f6' });

  // Flag fix
  const [fixing, setFixing] = useState({});

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sc, gp, fl, pc, mb, us, al] = await Promise.all([
        base44.entities.SystemScore.list('-created_date', 5).catch(() => []),
        base44.entities.SystemGap.list('-created_date', 50).catch(() => []),
        base44.entities.SystemFlag.list('-created_date', 100).catch(() => []),
        base44.entities.PromoCode.list('-created_date', 50).catch(() => []),
        base44.entities.OrganizationMembership.list('-created_date', 100).catch(() => []),
        base44.entities.User.list('-created_date', 100).catch(() => []),
        base44.entities.AccessLevel.list('sort_order', 50).catch(() => []),
      ]);
      setScores(sc); setGaps(gp); setFlags(fl.filter(f => f.status === 'open' || f.status === 'fixing')); setPromoCodes(pc); setMembers(mb); setUsers(us); setAccessLevels(al || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, [refreshKey]);

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  const invoke = async (name, label) => {
    setBusy(b => ({ ...b, [name]: true })); setLastResult(null);
    try {
      const res = await base44.functions.invoke(name, {});
      setLastResult({ fn: label, ok: true, data: res });
      setRefreshKey(k => k + 1);
    } catch (e) { setLastResult({ fn: label, ok: false, error: e?.message || 'failed' }); }
    finally { setBusy(b => ({ ...b, [name]: false })); }
  };

  const runFullCycle = async () => {
    setBusy(b => ({ ...b, cycle: true }));
    const steps = [
      { fn: 'runSystemAudit', label: 'Analyze' },
      { fn: 'runDataIntegrity', label: 'Clean' },
      { fn: 'runAutoHeal', label: 'Heal' },
      { fn: 'recomputeHotLeadTruth', label: 'Harden' },
      { fn: 'scoreSourceQuality', label: 'Optimize' },
      { fn: 'runStateCoverageAudit', label: 'State Audit' },
      { fn: 'runSystemAudit', label: 'Re-Audit' },
    ];
    const results = [];
    try {
      for (const step of steps) {
        try { await base44.functions.invoke(step.fn, {}); results.push({ step: step.label, ok: true }); } catch { results.push({ step: step.label, ok: false }); }
      }
      setLastResult({ fn: 'Full Cycle', ok: true, data: { steps: results } });
      setRefreshKey(k => k + 1);
    } catch (e) { setLastResult({ fn: 'Full Cycle', ok: false, error: e?.message }); }
    finally { setBusy(b => ({ ...b, cycle: false })); }
  };

  const createPromo = async () => {
    if (!promoForm.code.trim()) return;
    setPromoLoading(true);
    try {
      await base44.functions.invoke('managePromoCodes', { action: 'create', ...promoForm, code: promoForm.code.toUpperCase() });
      setPromoForm({ code: '', description: '', discount_type: 'percentage', discount_value: 10, max_uses: 0, valid_until: '', applicable_plans: 'all', notes: '' });
      await loadAll();
    } catch (e) { alert(e?.message || 'Failed to create promo code'); }
    finally { setPromoLoading(false); }
  };

  const archivePromo = async (p) => {
    try { await base44.functions.invoke('managePromoCodes', { action: 'archive', id: p.id, stripe_promo_id: p.stripe_promo_id }); await loadAll(); } catch (e) { alert(e?.message); }
  };

  const deletePromo = async (p) => {
    if (!confirm(`Delete promo code "${p.code}"?`)) return;
    try { await base44.functions.invoke('managePromoCodes', { action: 'delete', id: p.id, stripe_promo_id: p.stripe_promo_id }); await loadAll(); } catch (e) { alert(e?.message); }
  };

  const inviteEmployee = async () => {
    if (!inviteForm.email.trim()) return;
    setInviteLoading(true); setInviteMsg(null);
    try {
      await base44.users.inviteUser(inviteForm.email.trim(), inviteForm.role === 'admin' ? 'admin' : 'user');
      const orgs = await base44.entities.Organization.list('-created_date', 5);
      if (orgs.length > 0) {
        await base44.entities.OrganizationMembership.create({
          organization_id: orgs[0].id,
          organization_name: orgs[0].name,
          user_email: inviteForm.email.trim(),
          user_name: inviteForm.name || '',
          role: inviteForm.role,
          access_level: inviteForm.access_level || '',
          status: 'invited',
          invited_date: new Date().toISOString(),
        });
      }
      setInviteMsg({ ok: true, text: `Invitation sent to ${inviteForm.email}` });
      setInviteForm({ email: '', role: 'member', name: '', access_level: '' });
      await loadAll();
    } catch (e) { setInviteMsg({ ok: false, text: e?.message || 'Failed to invite' }); }
    finally { setInviteLoading(false); }
  };

  const deleteMembership = async (m) => {
    if (!confirm(`Remove ${m.user_email || m.user_name || 'this member'}?`)) return;
    try { await base44.entities.OrganizationMembership.delete(m.id); await loadAll(); } catch (e) { alert(e?.message); }
  };

  const createAccessLevel = async () => {
    if (!newLevel.name.trim()) return;
    try {
      await base44.entities.AccessLevel.create({
        name: newLevel.name,
        description: newLevel.description,
        level_type: 'custom',
        category: newLevel.category || 'Custom',
        permissions: ['dashboard:read'],
        color: newLevel.color,
        sort_order: 99,
      });
      setNewLevel({ name: '', description: '', category: '', color: '#3b82f6' });
      setShowAccessForm(false);
      await loadAll();
    } catch (e) { alert(e?.message); }
  };

  const deleteAccessLevel = async (al) => {
    if (al.level_type === 'system') { alert('System access levels cannot be deleted.'); return; }
    if (!confirm(`Delete custom access level "${al.name}"?`)) return;
    try { await base44.entities.AccessLevel.delete(al.id); await loadAll(); } catch {}
  };

  const fixFlag = async (flagId) => {
    setFixing(f => ({ ...f, [flagId]: true }));
    try { await base44.functions.invoke('autoFixFlag', { flag_id: flagId }); await loadAll(); } catch { /* ignore */ }
    finally { setFixing(f => ({ ...f, [flagId]: false })); }
  };

  const fixAllFlags = async () => {
    const fixable = flags.filter(f => f.auto_fix_available);
    for (const f of fixable) {
      setFixing(prev => ({ ...prev, [f.id]: true }));
      try { await base44.functions.invoke('autoFixFlag', { flag_id: f.id }); } catch { /* ignore */ }
      setFixing(prev => ({ ...prev, [f.id]: false }));
    }
    await loadAll();
  };

  const latest = scores[0];
  const openGaps = gaps.filter(g => g.status === 'open');

  return (
    <div className="min-h-screen bg-[#fafafa] pb-12">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <BackButton to="/dashboard" />
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><ShieldCheck size={18} /></span>
            <div>
              <h1 className="text-lg font-black">Admin Portal</h1>
              <p className="text-xs text-black/50">Full system control · promo codes · team · flags · audit</p>
            </div>
          </div>
          <button onClick={() => setRefreshKey(k => k + 1)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        {/* Tabs */}
        <div className="mx-auto max-w-7xl px-5">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition ${tab === key ? 'bg-[#f2df0d] text-black' : 'hover:bg-black/5 text-black/60'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-black/30" size={32} /></div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {[
                    { label: 'System Health', value: latest?.overall_health_score ?? '—', icon: Activity, note: latest ? `Data ${latest.data_quality_score} · Sec ${latest.security_score}` : 'No audit yet' },
                    { label: 'Open Gaps', value: openGaps.length, icon: AlertTriangle, note: `${gaps.filter(g => g.status === 'fixed').length} fixed` },
                    { label: 'Open Flags', value: flags.length, icon: Flag, note: `${flags.filter(f => f.auto_fix_available).length} auto-fixable` },
                    { label: 'Promo Codes', value: promoCodes.length, icon: Tag, note: `${promoCodes.filter(p => p.status === 'active').length} active` },
                  ].map(({ label, value, icon: Icon, note }) => (
                    <div key={label} className="rounded-xl border border-black/10 bg-white p-4">
                      <Icon size={18} className="text-black/40" />
                      <p className="mt-2 text-2xl font-black">{value}</p>
                      <p className="text-xs text-black/50">{label}</p>
                      <p className="text-[10px] text-black/30">{note}</p>
                    </div>
                  ))}
                </div>

                {lastResult && (
                  <div className={`rounded-lg border p-3 text-sm ${lastResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    <span className="font-black">{lastResult.fn}</span> {lastResult.ok ? 'completed' : 'failed'}
                    {lastResult.error && <span className="ml-2 text-xs">{lastResult.error}</span>}
                  </div>
                )}

                {/* Quick Actions */}
                <div className="rounded-2xl border border-[#f2df0d]/40 bg-[#fdfbe1] p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Rocket size={20} /></span>
                    <div className="flex-1">
                      <p className="font-black">Full Auto-Cycle: Analyze → Clean → Heal → Harden → Optimize → State Audit → Re-Audit</p>
                      <p className="text-xs text-black/50">One-click production readiness. Runs the entire self-healing pipeline and reports before/after scores.</p>
                    </div>
                  </div>
                  <button onClick={runFullCycle} disabled={busy.cycle} className="mt-4 flex items-center gap-2 rounded-lg bg-[#0b0b0b] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                    {busy.cycle ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} Run Full Auto-Cycle
                  </button>
                </div>

                {/* Zone links — Admin Portal is the single hub for every admin/ops/qa/testing/observability/source page */}
                {[
                  {
                    title: 'Operations & Automation',
                    items: [
                      { to: '/ops-commander', icon: Zap, label: 'Ops Commander', desc: 'Autonomous agent' },
                      { to: '/daily-autopilot', icon: Rocket, label: 'Daily Autopilot', desc: 'Daily pipeline run' },
                      { to: '/ai-command-center', icon: Zap, label: 'AI Command Center', desc: 'Agent conversations' },
                      { to: '/ai-approval-proxy', icon: ShieldCheck, label: 'AI Approval Proxy', desc: 'Agent approvals' },
                      { to: '/bid-package-center', icon: ShieldCheck, label: 'Bid Package Center', desc: 'Package assembly' },
                      { to: '/auto-pipeline', icon: Zap, label: 'Auto Pipeline', desc: 'Pipeline automation' },
                    ],
                  },
                  {
                    title: 'Testing & QA',
                    items: [
                      { to: '/test-agent-portal', icon: Zap, label: 'Test Agent Portal', desc: 'Simulation & testing' },
                      { to: '/system-qa', icon: Activity, label: 'System QA', desc: 'Quality agent' },
                      { to: '/test-runner', icon: Search, label: 'Test Runner', desc: 'Regression tests' },
                      { to: '/validation-gates', icon: Shield, label: 'Validation Gates', desc: 'Gate dashboard' },
                      { to: '/self-reflection', icon: Check, label: 'Self-Reflection', desc: 'Reflection cycles' },
                      { to: '/async-load-test', icon: Activity, label: 'Load Tests', desc: 'Async load testing' },
                    ],
                  },
                  {
                    title: 'Observability & Health',
                    items: [
                      { to: '/system-health', icon: Activity, label: 'System Health', desc: 'Live health' },
                      { to: '/observability', icon: Database, label: 'Observability', desc: 'Metrics & traces' },
                      { to: '/dead-letters', icon: AlertTriangle, label: 'Dead Letters', desc: 'Failed messages' },
                      { to: '/audit', icon: Shield, label: 'Audit Log', desc: 'Activity history' },
                      { to: '/jobs', icon: Activity, label: 'Jobs', desc: 'Background jobs' },
                    ],
                  },
                  {
                    title: 'Data & Sources',
                    items: [
                      { to: '/sources', icon: Search, label: 'Sources', desc: 'Scrape sources' },
                      { to: '/scrapers', icon: Search, label: 'Scrapers', desc: 'Scraper control' },
                      { to: '/state-control', icon: MapPin, label: '50-State Control', desc: 'Coverage by state' },
                      { to: '/source-verification', icon: Shield, label: 'Source Verification', desc: 'Verify queue' },
                      { to: '/canonical-health', icon: Database, label: 'Canonical Health', desc: 'Opportunity health' },
                      { to: '/lead-validation-review', icon: Users, label: 'Lead Validation', desc: 'Review batches' },
                      { to: '/beta-operations', icon: Activity, label: 'Beta Operations', desc: 'Beta controls' },
                      { to: '/controlled-beta-evidence', icon: Shield, label: 'Beta Evidence', desc: 'Evidence corpus' },
                    ],
                  },
                  {
                    title: 'Financial & Growth',
                    items: [
                      { to: '/owner-dashboard', icon: BarChart3, label: 'Owner Dashboard', desc: 'Executive analytics' },
                      { to: '/cost-intelligence', icon: Database, label: 'Cost Intelligence', desc: 'AI cost analysis' },
                      { to: '/api-keys', icon: Tag, label: 'API Keys', desc: 'Sell data access' },
                      { to: '/reports', icon: BarChart3, label: 'Reports', desc: 'Operational reports' },
                      { to: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Pipeline analytics' },
                      { to: '/employee-portal', icon: Users, label: 'Employee Portal', desc: 'Team portal' },
                    ],
                  },
                  {
                    title: 'Governance & Blueprint',
                    items: [
                      { to: '/system-inventory', icon: Database, label: 'System Inventory', desc: 'End-to-end architecture' },
                      { to: '/dna-blueprint', icon: ShieldCheck, label: 'DNA Blueprint', desc: 'Operating system & rules' },
                    ],
                  },
                ].map((section) => (
                  <div key={section.title}>
                    <h3 className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">{section.title}</h3>
                    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      {section.items.map(({ to, icon: Icon, label, desc }) => (
                        <Link key={to} to={to} className="rounded-xl border border-black/10 bg-white p-4 hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                          <Icon size={18} className="text-black/40" />
                          <p className="mt-2 font-black text-sm">{label}</p>
                          <p className="text-xs text-black/40">{desc}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* PROMO CODES TAB */}
            {tab === 'promo' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <h2 className="font-black">Create Promo Code</h2>
                  <p className="text-xs text-black/50">Creates a Stripe coupon + promotion code. Customers enter it at checkout.</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div>
                      <label className="text-xs font-bold text-black/50">Code</label>
                      <input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER50" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm font-bold uppercase" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black/50">Description</label>
                      <input value={promoForm.description} onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} placeholder="Summer sale 50% off" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black/50">Discount Type</label>
                      <select value={promoForm.discount_type} onChange={e => setPromoForm(f => ({ ...f, discount_type: e.target.value }))} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm">
                        <option value="percentage">Percentage Off (%)</option>
                        <option value="fixed_amount">Fixed Amount Off ($)</option>
                        <option value="free_months">Free Months</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black/50">{promoForm.discount_type === 'percentage' ? 'Percentage (0-100)' : promoForm.discount_type === 'fixed_amount' ? 'Amount ($)' : 'Months Free'}</label>
                      <input type="number" value={promoForm.discount_value} onChange={e => setPromoForm(f => ({ ...f, discount_value: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black/50">Max Uses (0=unlimited)</label>
                      <input type="number" value={promoForm.max_uses} onChange={e => setPromoForm(f => ({ ...f, max_uses: Number(e.target.value) }))} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black/50">Valid Until</label>
                      <input type="date" value={promoForm.valid_until?.substring(0,10) || ''} onChange={e => setPromoForm(f => ({ ...f, valid_until: e.target.value ? new Date(e.target.value).toISOString() : '' }))} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <button onClick={createPromo} disabled={promoLoading || !promoForm.code.trim()} className="mt-4 flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black disabled:opacity-50">
                    {promoLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Create Promo Code
                  </button>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <h2 className="font-black">Active Promo Codes ({promoCodes.length})</h2>
                  {promoCodes.length === 0 ? (
                    <p className="mt-4 text-center text-sm text-black/40">No promo codes yet. Create one above.</p>
                  ) : (
                    <div className="mt-4 space-y-2">
                      {promoCodes.map(p => (
                        <div key={p.id} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-black">{p.code}</span>
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
                            </div>
                            <p className="text-xs text-black/50">
                              {p.discount_type === 'percentage' ? `${p.discount_value}% off` : p.discount_type === 'fixed_amount' ? `$${p.discount_value} off` : `${p.discount_value} months free`}
                              {p.max_uses > 0 ? ` · ${p.used_count}/${p.max_uses} used` : ` · ${p.used_count} used`}
                              {p.description ? ` · ${p.description}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-1.5">
                            {p.status === 'active' && (
                              <button onClick={() => archivePromo(p)} className="rounded-lg border border-black/15 px-2.5 py-1.5 text-xs font-bold hover:bg-black/5">Pause</button>
                            )}
                            <button onClick={() => deletePromo(p)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TEAM & ACCESS TAB */}
            {tab === 'team' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <h2 className="font-black">Invite Employee</h2>
                  <p className="text-xs text-black/50">Send an invitation. The employee will receive an email to join the system.</p>
                  {inviteMsg && (
                    <div className={`mt-3 rounded-lg p-3 text-sm ${inviteMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{inviteMsg.text}</div>
                  )}
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-bold text-black/50">Email</label>
                      <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} placeholder="employee@company.com" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black/50">Name (optional)</label>
                      <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-black/50">Access Level</label>
                      <select value={inviteForm.access_level} onChange={e => { const al = accessLevels.find(a => a.id === e.target.value); setInviteForm(f => ({ ...f, access_level: e.target.value, role: al?.name === 'Admin' || al?.name === 'Full Access' ? 'admin' : 'user' })); }} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm">
                        <option value="">— Select access level —</option>
                        {accessLevels.map(al => <option key={al.id} value={al.id}>{al.name} {al.level_type === 'custom' ? '(Custom)' : ''}</option>)}
                      </select>
                    </div>
                  </div>
                  {inviteForm.access_level && (() => { const al = accessLevels.find(a => a.id === inviteForm.access_level); return al ? <p className="mt-2 rounded-lg bg-black/[.03] p-2 text-xs text-black/50">{al.description}</p> : null; })()}
                  <button onClick={inviteEmployee} disabled={inviteLoading || !inviteForm.email.trim()} className="mt-4 flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black disabled:opacity-50">
                    {inviteLoading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />} Send Invitation
                  </button>
                </div>

                {/* Access Level Management */}
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-black">Access Levels ({accessLevels.length})</h2>
                      <p className="text-xs text-black/50">System levels + custom categories. Assign these when inviting team members.</p>
                    </div>
                    <button onClick={() => setShowAccessForm(v => !v)} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
                      <Plus size={14} /> Create Custom
                    </button>
                  </div>
                  {showAccessForm && (
                    <div className="mt-4 grid gap-3 rounded-lg border border-black/10 p-4 sm:grid-cols-4">
                      <input placeholder="Level name" value={newLevel.name} onChange={e => setNewLevel(f => ({ ...f, name: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input placeholder="Category" value={newLevel.category} onChange={e => setNewLevel(f => ({ ...f, category: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <input placeholder="Description" value={newLevel.description} onChange={e => setNewLevel(f => ({ ...f, description: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                      <div className="flex gap-2">
                        <input type="color" value={newLevel.color} onChange={e => setNewLevel(f => ({ ...f, color: e.target.value }))} className="h-10 w-12 rounded-lg border border-black/15" />
                        <button onClick={createAccessLevel} disabled={!newLevel.name.trim()} className="flex-1 rounded-lg bg-[#f2df0d] px-3 py-2 text-xs font-black disabled:opacity-50">Create</button>
                      </div>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {accessLevels.map(al => (
                      <div key={al.id} className="flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: al.color }} />
                        <div>
                          <p className="text-xs font-bold">{al.name}</p>
                          <p className="text-[10px] text-black/40">{al.category || 'General'} · {al.level_type}</p>
                        </div>
                        {al.level_type === 'custom' && <button onClick={() => deleteAccessLevel(al)} className="ml-1 text-red-400 hover:text-red-600"><Trash2 size={12} /></button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <h2 className="font-black">Everyone With Access ({users.length})</h2>
                  <div className="mt-4 space-y-2">
                    {users.map(u => {
                      const membership = members.find(m => m.user_email === u.email);
                      return (
                        <div key={u.id} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#fcf9cf] text-sm font-black text-[#b0a209]">{(u.full_name || u.email || 'U')[0].toUpperCase()}</div>
                            <div>
                              <p className="text-sm font-bold">{u.full_name || 'Unnamed'}</p>
                              <p className="text-xs text-black/40">{u.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-[#f2df0d] text-black' : 'bg-blue-100 text-blue-700'}`}>{u.role || 'user'}</span>
                            {membership && <span className="text-xs text-black/40">{membership.organization_name}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <h2 className="font-black">Invited People & Memberships ({members.length})</h2>
                  <p className="text-xs text-black/50">All invited people — shows joined status. Delete to revoke access.</p>
                  <div className="mt-4 space-y-2">
                    {members.length === 0 ? (
                      <p className="py-8 text-center text-sm text-black/30">No invitations yet. Invite someone above.</p>
                    ) : members.map(m => {
                      const al = accessLevels.find(a => a.id === m.access_level);
                      const joined = m.status === 'active';
                      return (
                        <div key={m.id} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-[#fcf9cf] text-sm font-black text-[#b0a209]">{(m.user_email || m.user_name || 'U')[0].toUpperCase()}</div>
                            <div>
                              <p className="text-sm font-bold">{m.user_name || m.user_email}</p>
                              <p className="text-xs text-black/40">{m.user_email} · {m.organization_name}</p>
                              {m.invited_date && <p className="text-[10px] text-black/30">Invited: {new Date(m.invited_date).toLocaleDateString()}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {al && <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (al.color || '#3b82f6') + '20', color: al.color || '#3b82f6' }}>{al.name}</span>}
                            <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${m.role === 'owner' ? 'bg-[#f2df0d] text-black' : m.role === 'admin' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{m.role}</span>
                            {joined ? (
                              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 size={10} /> Joined</span>
                            ) : (
                              <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black uppercase text-amber-700"><Clock size={10} /> Pending</span>
                            )}
                            <button onClick={() => deleteMembership(m)} className="rounded-lg border border-red-200 px-2 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* FLAGS TAB */}
            {tab === 'flags' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-black">System Flags ({flags.length})</h2>
                    <p className="text-xs text-black/50">Flagged issues with auto-fix capabilities. Run State Audit to generate flags.</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => invoke('runStateCoverageAudit', 'State Audit')} disabled={busy.runStateCoverageAudit} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
                      {busy.runStateCoverageAudit ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />} Run State Audit
                    </button>
                    {flags.some(f => f.auto_fix_available) && (
                      <button onClick={fixAllFlags} className="flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-2 text-xs font-black">
                        <Wrench size={14} /> Fix All Auto-Fixable
                      </button>
                    )}
                  </div>
                </div>

                {flags.length === 0 ? (
                  <div className="rounded-2xl border border-black/10 bg-white p-8 text-center">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                    <p className="mt-3 font-bold text-emerald-600">No open flags</p>
                    <p className="text-xs text-black/40">Run a State Audit to scan for issues.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {flags.map(f => (
                      <div key={f.id} className="rounded-xl border border-black/10 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${f.severity === 'critical' ? 'bg-red-500' : f.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${f.severity === 'critical' ? 'bg-red-100 text-red-700' : f.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{f.severity}</span>
                              <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase">{f.flag_type.replace(/_/g, ' ')}</span>
                              {f.state_code && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{f.state_code}</span>}
                            </div>
                            <p className="mt-2 text-sm font-bold">{f.title}</p>
                            <p className="mt-1 text-xs text-black/50">{f.description}</p>
                            {f.fix_description && (
                              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-emerald-50 p-2 text-xs text-emerald-700">
                                <Wrench size={12} className="mt-0.5 shrink-0" /> {f.fix_description}
                              </div>
                            )}
                          </div>
                          {f.auto_fix_available && (
                            <button onClick={() => fixFlag(f.id)} disabled={fixing[f.id]} className="shrink-0 rounded-lg bg-[#0b0b0b] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                              {fixing[f.id] ? <Loader2 size={12} className="animate-spin" /> : 'Auto-Fix'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* AUDIT & FIX TAB */}
            {tab === 'audit' && (
              <div className="space-y-5">
                <div className="rounded-2xl border border-[#f2df0d]/40 bg-[#fdfbe1] p-5">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Rocket size={20} /></span>
                    <div className="flex-1">
                      <p className="font-black">Full Auto-Cycle</p>
                      <p className="text-xs text-black/50">Analyze → Auto Clean → Fix & Heal → Harden → Optimize → State Audit → Re-Audit. Runs the entire self-healing pipeline.</p>
                    </div>
                  </div>
                  <button onClick={runFullCycle} disabled={busy.cycle} className="mt-4 flex items-center gap-2 rounded-lg bg-[#0b0b0b] px-5 py-3 text-sm font-black text-white disabled:opacity-50">
                    {busy.cycle ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />} Run Full Auto-Cycle
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  {[
                    { icon: Activity, title: 'Analyze', desc: 'Score system health', fn: 'runSystemAudit', label: 'System Audit' },
                    { icon: Database, title: 'Auto Clean', desc: 'Validate sources, suppress stale data', fn: 'runDataIntegrity', label: 'Data Integrity' },
                    { icon: Wrench, title: 'Fix & Heal', desc: 'Fix broken projects, harden security', fn: 'runAutoHeal', label: 'Auto-Heal' },
                    { icon: Shield, title: 'Harden', desc: 'Recompute hot lead truth & eligibility', fn: 'recomputeHotLeadTruth', label: 'Harden' },
                    { icon: BarChart3, title: 'Optimize', desc: 'Score source quality', fn: 'scoreSourceQuality', label: 'Optimize' },
                    { icon: MapPin, title: 'State Audit', desc: 'Audit all 50 states for coverage', fn: 'runStateCoverageAudit', label: 'State Audit' },
                  ].map(({ icon: Icon, title, desc, fn, label }) => (
                    <div key={fn} className="rounded-xl border border-black/10 bg-white p-4">
                      <div className="flex items-start gap-2.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Icon size={18} /></span>
                        <div className="flex-1">
                          <p className="font-black text-sm">{title}</p>
                          <p className="text-xs text-black/50">{desc}</p>
                        </div>
                      </div>
                      <button onClick={() => invoke(fn, label)} disabled={busy[fn]} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5 disabled:opacity-50">
                        {busy[fn] ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />} Run {label}
                      </button>
                    </div>
                  ))}
                </div>

                {lastResult && (
                  <div className={`rounded-lg border p-3 text-sm ${lastResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
                    <span className="font-black">{lastResult.fn}</span> {lastResult.ok ? 'completed' : 'failed'}
                    {lastResult.data?.steps && (
                      <div className="mt-2 space-y-1">
                        {lastResult.data.steps.map((s, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {s.ok ? <Check size={12} className="text-emerald-600" /> : <X size={12} className="text-red-500" />} {s.step}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}