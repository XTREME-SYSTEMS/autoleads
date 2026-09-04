import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import {
  Activity, AlertTriangle, ArrowRight, Check, CheckCircle2, Clock, Database,
  FileCode, FlaskConical, Globe, Layers, Loader2, Play, Rocket, Server,
  Shield, Sparkles, Webhook, Wrench, X, Zap, BookOpen,
} from "lucide-react";

// Capability catalog — derived from the system's actual entities, functions,
// pages, workflows, and integrations. The "missing" list is benchmarked
// against Procore, Buildertrend, ConstructConnect, Dodge, PlanGrid, etc.

const CURRENT_CAPABILITIES = [
  // Data & Entities
  { category: 'Data', icon: Database, name: 'Project Management', desc: 'Full project lifecycle from lead to completion with 40+ fields', status: 'full', score: 95 },
  { category: 'Data', icon: Database, name: 'Contractor CRM', desc: 'Contractor directory with outreach tracking', status: 'full', score: 90 },
  { category: 'Data', icon: Database, name: 'Proposal Management', desc: 'Proposals with items, versions, e-signature', status: 'full', score: 90 },
  { category: 'Data', icon: Database, name: 'Takeoff System', desc: 'Automated takeoff with measurements and evidence', status: 'full', score: 85 },
  { category: 'Data', icon: Database, name: 'Estimate System', desc: 'Cost estimates with labor, material, margin', status: 'full', score: 85 },
  { category: 'Data', icon: Database, name: 'Pricing Intelligence', desc: 'PricingProfile with winning bid history and tiers', status: 'full', score: 80 },
  { category: 'Data', icon: Database, name: 'Organization Scoping', desc: 'Multi-tenant with RLS on every org entity', status: 'full', score: 95 },
  { category: 'Data', icon: Database, name: 'Change Orders', desc: 'Change order management with revisions', status: 'full', score: 85 },
  { category: 'Data', icon: Database, name: 'Invoicing & Payments', desc: 'Invoices, Stripe payments, payment preferences', status: 'full', score: 85 },
  { category: 'Data', icon: Database, name: 'E-Signatures', desc: 'EsignDocument with signed contract tracking', status: 'full', score: 80 },
  { category: 'Data', icon: Database, name: 'Cost Intelligence', desc: 'CostMetric tracking with AI recommendations', status: 'full', score: 80 },
  { category: 'Data', icon: Database, name: 'Customer Archetypes', desc: '8 customer archetypes with routing pipelines', status: 'full', score: 75 },

  // Scraping & Sources
  { category: 'Scraping', icon: Globe, name: 'Permit Scraping', desc: 'County/city building permit portals', status: 'full', score: 80 },
  { category: 'Scraping', icon: Globe, name: 'Social Lead Scraping', desc: 'Craigslist, Reddit, Facebook groups', status: 'full', score: 75 },
  { category: 'Scraping', icon: Globe, name: 'FDOT Scraping', desc: 'Florida DOT bid opportunities', status: 'full', score: 85 },
  { category: 'Scraping', icon: Globe, name: 'Federal API Scraping', desc: 'SAM.gov, USAspending, Grants.gov', status: 'partial', score: 60 },
  { category: 'Scraping', icon: Globe, name: 'Agenda Scraping', desc: 'City council / county commission agendas', status: 'full', score: 70 },
  { category: 'Scraping', icon: Globe, name: 'News Feed Scraping', desc: 'Construction news and development announcements', status: 'full', score: 70 },
  { category: 'Scraping', icon: Globe, name: 'Contractor Discovery', desc: 'License board and association directory scraping', status: 'full', score: 75 },
  { category: 'Scraping', icon: Globe, name: 'Cloud Browser Engine', desc: 'Self-hosted Playwright engine for JS-heavy sites', status: 'partial', score: 65 },
  { category: 'Scraping', icon: Globe, name: 'Source Verification', desc: 'Automated source reachability validation', status: 'full', score: 80 },
  { category: 'Scraping', icon: Globe, name: '50-State Coverage', desc: 'Sources cataloged for all 50 states', status: 'partial', score: 55 },
  { category: 'Scraping', icon: Globe, name: 'Source Quality Scoring', desc: 'Precision, freshness, accuracy per source', status: 'full', score: 80 },

  // AI & Automation
  { category: 'AI', icon: Sparkles, name: 'AI Takeoff', desc: 'LLM-powered measurement extraction from documents', status: 'full', score: 80 },
  { category: 'AI', icon: Sparkles, name: 'AI Proposals', desc: 'Automated proposal generation with scope and pricing', status: 'full', score: 80 },
  { category: 'AI', icon: Sparkles, name: 'Critic Agent', desc: 'Adversarial review of takeoffs and proposals', status: 'full', score: 75 },
  { category: 'AI', icon: Sparkles, name: 'Triple Validation', desc: 'Three-pass validation (structural, dimensional, scope)', status: 'full', score: 80 },
  { category: 'AI', icon: Sparkles, name: 'Self-Reflection', desc: 'LLM analysis of pipeline quality with action plan', status: 'full', score: 75 },
  { category: 'AI', icon: Sparkles, name: 'Customer Classification', desc: '8-archetype routing based on source patterns', status: 'full', score: 75 },
  { category: 'AI', icon: Sparkles, name: 'Location Eligibility', desc: 'Server-authoritative service area determination', status: 'full', score: 85 },
  { category: 'AI', icon: Sparkles, name: 'Bidability Scoring', desc: '0-100 score for how pursuable a lead is', status: 'full', score: 80 },
  { category: 'AI', icon: Sparkles, name: 'Source Translation', desc: 'Raw HTML → readable markdown with template detection', status: 'full', score: 80 },
  { category: 'AI', icon: Sparkles, name: 'PDF Generation', desc: 'Clean PDF documents from translated sources', status: 'full', score: 75 },

  // Workflows & Automation
  { category: 'Automation', icon: Webhook, name: 'Nightly Source Validation', desc: 'Scheduled source health check and pruning', status: 'full', score: 85 },
  { category: 'Automation', icon: Webhook, name: 'Daily Autopilot', desc: 'Full pipeline run on schedule', status: 'full', score: 80 },
  { category: 'Automation', icon: Webhook, name: 'Self-Reflection Cycle', desc: 'Scheduled self-analysis and improvement', status: 'full', score: 75 },
  { category: 'Automation', icon: Webhook, name: 'Critic & Hardening Sweep', desc: 'Adversarial review + auto-heal', status: 'full', score: 75 },
  { category: 'Automation', icon: Webhook, name: 'Email Alert Notifications', desc: 'Automated email alerts for new leads', status: 'full', score: 80 },
  { category: 'Automation', icon: Webhook, name: 'Contractor Outreach Engine', desc: 'Automated intro + follow-up email sequences', status: 'full', score: 80 },
  { category: 'Automation', icon: Webhook, name: 'Bid Outcome Tracking', desc: 'Track won/lost bids and learn from outcomes', status: 'full', score: 70 },
  { category: 'Automation', icon: Webhook, name: 'QA Monitor Daily', desc: 'Daily quality assurance scan', status: 'full', score: 75 },

  // Integrations
  { category: 'Integrations', icon: Webhook, name: 'Stripe Payments', desc: 'Checkout, subscriptions, invoices, webhooks', status: 'full', score: 85 },
  { category: 'Integrations', icon: Webhook, name: 'Gmail Integration', desc: 'Send + read emails, bid ingestion', status: 'full', score: 80 },
  { category: 'Integrations', icon: Webhook, name: 'Google Calendar', desc: 'Project scheduling and sync', status: 'full', score: 80 },
  { category: 'Integrations', icon: Webhook, name: 'Google Drive', desc: 'Document storage and bid scanning', status: 'partial', score: 65 },
  { category: 'Integrations', icon: Webhook, name: 'Google Sheets', desc: 'Cost sync to spreadsheets', status: 'full', score: 75 },
  { category: 'Integrations', icon: Webhook, name: 'HubSpot CRM', desc: 'Contact and deal sync', status: 'partial', score: 50 },

  // Security & Admin
  { category: 'Security', icon: Shield, name: 'Row-Level Security', desc: 'Per-entity RLS with org scoping', status: 'full', score: 90 },
  { category: 'Security', icon: Shield, name: 'Access Levels', desc: 'Custom access levels with permissions', status: 'full', score: 85 },
  { category: 'Security', icon: Shield, name: 'API Keys', desc: 'Tiered API keys with rate limiting', status: 'full', score: 80 },
  { category: 'Security', icon: Shield, name: 'Audit Logs', desc: 'Superadmin audit trail', status: 'full', score: 75 },
  { category: 'Security', icon: Shield, name: 'Promo Codes', desc: 'Stripe-backed promotional codes', status: 'full', score: 80 },

  // AI Team
  { category: 'AI Team', icon: Sparkles, name: 'System QA Agent', desc: 'Monitors system health and auto-heals', status: 'full', score: 75 },
  { category: 'AI Team', icon: Sparkles, name: 'QA Monitor Agent', desc: 'Monitors validation gates and takeoff quality', status: 'full', score: 75 },
  { category: 'AI Team', icon: Sparkles, name: 'Ops Commander Agent', desc: 'Monitors scraping and pipeline operations', status: 'full', score: 70 },
  { category: 'AI Team', icon: Sparkles, name: 'Expert Approval Proxy', desc: 'Reviews and approves proposals', status: 'full', score: 70 },
  { category: 'AI Team', icon: Sparkles, name: 'System Agent', desc: 'Coordinates all agents and escalates', status: 'full', score: 70 },
];

const MISSING_CAPABILITIES = [
  // Project Management
  { category: 'Project Management', name: 'Gantt Chart Scheduling', desc: 'Visual Gantt chart with critical path analysis', benchmark: 'Procore, Buildertrend', priority: 'high', effort: 'medium' },
  { category: 'Project Management', name: 'RFI Management', desc: 'Request for Information tracking and response', benchmark: 'Procore', priority: 'high', effort: 'medium' },
  { category: 'Project Management', name: 'Submittal Management', desc: 'Submittal tracking and approval workflow', benchmark: 'Procore', priority: 'medium', effort: 'medium' },
  { category: 'Project Management', name: 'Punch List', desc: 'Field punch list with photo documentation', benchmark: 'Procore, Buildertrend', priority: 'high', effort: 'medium' },
  { category: 'Project Management', name: 'Daily Logs', desc: 'Daily field reports with weather, crew, progress', benchmark: 'Procore, Buildertrend', priority: 'medium', effort: 'low' },
  { category: 'Project Management', name: 'Resource Allocation', desc: 'Crew and equipment scheduling across projects', benchmark: 'Buildertrend', priority: 'medium', effort: 'high' },

  // Financial
  { category: 'Financial', name: 'Job Costing', desc: 'Real-time job cost tracking vs budget', benchmark: 'Procore, Buildertrend', priority: 'high', effort: 'high' },
  { category: 'Financial', name: 'Purchase Orders', desc: 'PO creation, tracking, and reconciliation', benchmark: 'Procore, Buildertrend', priority: 'high', effort: 'medium' },
  { category: 'Financial', name: 'Progress Billing', desc: 'AIA-style progress billing with schedules of values', benchmark: 'Procore', priority: 'medium', effort: 'high' },
  { category: 'Financial', name: 'Lien Waivers', desc: 'Conditional and unconditional lien waiver tracking', benchmark: 'Procore', priority: 'medium', effort: 'medium' },
  { category: 'Financial', name: 'QuickBooks Sync', desc: 'Two-way sync with QuickBooks Online', benchmark: 'Buildertrend, JobTread', priority: 'high', effort: 'high' },
  { category: 'Financial', name: 'Payroll Integration', desc: 'Time tracking → payroll export', benchmark: 'Buildertrend', priority: 'low', effort: 'high' },

  // Document Management
  { category: 'Document Management', name: 'Plan Versioning', desc: 'Version-controlled plan sets with sheet comparison', benchmark: 'PlanGrid, Procore', priority: 'high', effort: 'high' },
  { category: 'Document Management', name: 'Sheet Comparison', desc: 'Visual diff between plan versions', benchmark: 'PlanGrid', priority: 'medium', effort: 'high' },
  { category: 'Document Management', name: 'Markup & Redlining', desc: 'Collaborative drawing markup', benchmark: 'PlanGrid, Procore', priority: 'medium', effort: 'high' },
  { category: 'Document Management', name: 'Offline Mode', desc: 'Mobile offline document access', benchmark: 'PlanGrid, Procore', priority: 'low', effort: 'high' },
  { category: 'Document Management', name: 'OCR', desc: 'Optical character recognition on scanned documents', benchmark: 'Procore', priority: 'medium', effort: 'medium' },

  // Field
  { category: 'Field', name: 'Mobile Forms', desc: 'Custom mobile forms for field data collection', benchmark: 'Procore, Buildertrend', priority: 'medium', effort: 'medium' },
  { category: 'Field', name: 'GPS Check-In', desc: 'Crew GPS-based time tracking', benchmark: 'Buildertrend', priority: 'low', effort: 'medium' },
  { category: 'Field', name: 'Safety Inspections', desc: 'Digital safety inspection forms', benchmark: 'Procore', priority: 'low', effort: 'medium' },
  { category: 'Field', name: 'Equipment Tracking', desc: 'Track equipment location and utilization', benchmark: 'Buildertrend', priority: 'low', effort: 'medium' },

  // Client Portal
  { category: 'Client Portal', name: 'Selection Management', desc: 'Client selection of materials, finishes, colors', benchmark: 'Buildertrend, CoConstruct', priority: 'high', effort: 'medium' },
  { category: 'Client Portal', name: 'Client Change Order Approval', desc: 'Client-facing change order approval flow', benchmark: 'Buildertrend, CoConstruct', priority: 'medium', effort: 'low' },
  { category: 'Client Portal', name: 'Client Payment Portal', desc: 'Client-facing payment portal', benchmark: 'Buildertrend, CoConstruct', priority: 'medium', effort: 'medium' },
  { category: 'Client Portal', name: 'Project Timeline Sharing', desc: 'Share project timeline with client', benchmark: 'Buildertrend', priority: 'low', effort: 'low' },

  // Estimating
  { category: 'Estimating', name: 'Assembly-Based Estimating', desc: 'Pre-built assemblies with labor + material + equipment', benchmark: 'Procore, JobTread', priority: 'high', effort: 'high' },
  { category: 'Estimating', name: 'RSMeans Integration', desc: 'Industry-standard unit cost database', benchmark: 'Procore', priority: 'medium', effort: 'medium' },
  { category: 'Estimating', name: 'What-If Scenarios', desc: 'Multiple estimate scenarios for comparison', benchmark: 'JobTread', priority: 'medium', effort: 'low' },
  { category: 'Estimating', name: 'Historical Cost Tracking', desc: 'Track actual vs estimated costs over time', benchmark: 'Procore', priority: 'medium', effort: 'medium' },

  // Bid Management
  { category: 'Bid Management', name: 'Bid Calendar', desc: 'Visual calendar of all upcoming bid due dates', benchmark: 'ConstructConnect, BuildingConnected', priority: 'high', effort: 'low' },
  { category: 'Bid Management', name: 'Bid Leveling', desc: 'Compare multiple bids side-by-side (scope matrix)', benchmark: 'ConstructConnect', priority: 'high', effort: 'medium' },
  { category: 'Bid Management', name: 'Competitor Tracking', desc: 'Track which competitors are bidding on what', benchmark: 'Dodge', priority: 'medium', effort: 'medium' },
  { category: 'Bid Management', name: 'Prequalification', desc: 'Subcontractor prequalification with financials', benchmark: 'BuildingConnected', priority: 'low', effort: 'high' },

  // Lead Intelligence
  { category: 'Lead Intelligence', name: 'Early-Stage Planning Alerts', desc: 'Alerts for projects in planning/pre-construction phase', benchmark: 'Dodge', priority: 'high', effort: 'medium' },
  { category: 'Lead Intelligence', name: 'Market Analysis Reports', desc: 'Geographic and sector market trend reports', benchmark: 'Dodge', priority: 'medium', effort: 'medium' },
  { category: 'Lead Intelligence', name: 'Competitor Intelligence', desc: 'Track competitor wins, losses, and pricing', benchmark: 'Dodge', priority: 'medium', effort: 'high' },

  // Collaboration
  { category: 'Collaboration', name: 'Team Chat', desc: 'In-app team messaging', benchmark: 'Procore, Buildertrend', priority: 'low', effort: 'high' },
  { category: 'Collaboration', name: 'Comment Threads', desc: 'Threaded comments on records', benchmark: 'Procore', priority: 'low', effort: 'medium' },
  { category: 'Collaboration', name: '@Mentions', desc: 'Mention team members in comments', benchmark: 'Procore', priority: 'low', effort: 'low' },

  // Reporting
  { category: 'Reporting', name: 'Custom Dashboards', desc: 'User-configurable dashboard widgets', benchmark: 'Procore, Buildertrend', priority: 'medium', effort: 'medium' },
  { category: 'Reporting', name: 'Scheduled Reports', desc: 'Automated email reports on schedule', benchmark: 'Procore', priority: 'medium', effort: 'low' },
  { category: 'Reporting', name: 'KPI Tracking', desc: 'Track win rate, pipeline value, conversion metrics', benchmark: 'Buildertrend', priority: 'high', effort: 'medium' },

  // AI/ML
  { category: 'AI/ML', name: 'Automated Plan Takeoff (Visual)', desc: 'AI-powered visual takeoff from PDF plans', benchmark: 'Procore (Togal.ai)', priority: 'high', effort: 'high' },
  { category: 'AI/ML', name: 'Cost Prediction', desc: 'ML model predicting project costs from scope', benchmark: 'Procore', priority: 'medium', effort: 'high' },
  { category: 'AI/ML', name: 'Risk Assessment', desc: 'AI risk scoring for projects and bids', benchmark: '—', priority: 'medium', effort: 'medium' },
  { category: 'AI/ML', name: 'Schedule Optimization', desc: 'AI-optimized project scheduling', benchmark: '—', priority: 'low', effort: 'high' },
  { category: 'AI/ML', name: 'Bid Recommendations', desc: 'AI recommends which bids to pursue', benchmark: '—', priority: 'high', effort: 'medium' },

  // Integrations
  { category: 'Integrations', name: 'Slack Integration', desc: 'Notifications to Slack channels', benchmark: 'Procore', priority: 'low', effort: 'low' },
  { category: 'Integrations', name: 'Microsoft Teams', desc: 'Notifications to Teams channels', benchmark: 'Procore', priority: 'low', effort: 'low' },
  { category: 'Integrations', name: 'Sage Integration', desc: 'Sync with Sage accounting', benchmark: 'Procore', priority: 'low', effort: 'high' },
  { category: 'Integrations', name: 'Box/Dropbox', desc: 'Document sync with cloud storage', benchmark: 'Procore', priority: 'low', effort: 'medium' },
];

export default function CapabilityMatrix() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('current');
  const [gaps, setGaps] = useState([]);
  const [flags, setFlags] = useState([]);
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});

  useEffect(() => {
    (async () => {
      try {
        const [gp, fl, sc] = await Promise.all([
          base44.entities.SystemGap.list('-created_date', 100).catch(() => []),
          base44.entities.SystemFlag.list('-created_date', 100).catch(() => []),
          base44.entities.SystemScore.list('-created_date', 5).catch(() => []),
        ]);
        setGaps(gp); setFlags(fl.filter(f => f.status === 'open' || f.status === 'fixing')); setScores(sc);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const invoke = async (name, label) => {
    setBusy(b => ({ ...b, [name]: true }));
    try { await base44.functions.invoke(name, {}); } catch { /* ignore */ }
    finally { setBusy(b => ({ ...b, [name]: false })); }
  };

  const categories = useMemo(() => {
    const cats = {};
    CURRENT_CAPABILITIES.forEach(c => { if (!cats[c.category]) cats[c.category] = []; cats[c.category].push(c); });
    return Object.entries(cats);
  }, []);

  const missingCategories = useMemo(() => {
    const cats = {};
    MISSING_CAPABILITIES.forEach(c => { if (!cats[c.category]) cats[c.category] = []; cats[c.category].push(c); });
    return Object.entries(cats);
  }, []);

  const avgScore = Math.round(CURRENT_CAPABILITIES.reduce((s, c) => s + c.score, 0) / CURRENT_CAPABILITIES.length);
  const fullCount = CURRENT_CAPABILITIES.filter(c => c.status === 'full').length;
  const partialCount = CURRENT_CAPABILITIES.filter(c => c.status === 'partial').length;

  const priorityColor = { high: '#dc2626', medium: '#f59e0b', low: '#6b7280' };
  const effortColor = { high: '#dc2626', medium: '#f59e0b', low: '#10b981' };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b0b0b] text-[#f2df0d]"><Layers size={22} /></span>
            <div>
              <h1 className="text-xl font-black">Capability Matrix</h1>
              <p className="text-xs text-black/50">Every capability the system has, every capability it's missing, and all gaps</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => navigate('/prompt-library')} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
                <BookOpen size={14} /> Prompt Library
              </button>
              <button onClick={() => navigate('/system-test-suite')} className="flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-2 text-xs font-black">
                <Zap size={14} /> Test Suite
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Summary cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <CheckCircle2 size={18} className="text-emerald-500" />
            <p className="mt-2 text-2xl font-black">{CURRENT_CAPABILITIES.length}</p>
            <p className="text-xs text-black/50">Current Capabilities</p>
            <p className="text-[10px] text-black/30">{fullCount} full · {partialCount} partial</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <p className="mt-2 text-2xl font-black">{MISSING_CAPABILITIES.length}</p>
            <p className="text-xs text-black/50">Missing Capabilities</p>
            <p className="text-[10px] text-black/30">Benchmarked vs Procore, Buildertrend, Dodge</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <Activity size={18} className="text-blue-500" />
            <p className="mt-2 text-2xl font-black">{avgScore}%</p>
            <p className="text-xs text-black/50">Avg Capability Score</p>
            <p className="text-[10px] text-black/30">Across all current capabilities</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <AlertTriangle size={18} className="text-red-500" />
            <p className="mt-2 text-2xl font-black">{gaps.length + flags.length}</p>
            <p className="text-xs text-black/50">Open Gaps & Flags</p>
            <p className="text-[10px] text-black/30">{gaps.length} gaps · {flags.length} flags</p>
          </div>
        </div>

        {/* Action bar */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button onClick={() => invoke('runSystemAudit', 'System Audit')} disabled={busy.runSystemAudit} className="flex items-center gap-1.5 rounded-lg bg-[#0b0b0b] px-4 py-2 text-xs font-black text-white disabled:opacity-50">
            {busy.runSystemAudit ? <Loader2 size={14} className="animate-spin" /> : <Rocket size={14} />} Run Full Audit
          </button>
          <button onClick={() => invoke('runAutoHeal', 'Auto-Heal')} disabled={busy.runAutoHeal} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-4 py-2 text-xs font-bold hover:bg-black/5 disabled:opacity-50">
            {busy.runAutoHeal ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />} Auto-Heal Gaps
          </button>
          <button onClick={() => invoke('runRecursiveAudit', 'Recursive Audit')} disabled={busy.runRecursiveAudit} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-4 py-2 text-xs font-bold hover:bg-black/5 disabled:opacity-50">
            {busy.runRecursiveAudit ? <Loader2 size={14} className="animate-spin" /> : <Activity size={14} />} Recursive Audit
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-2">
          {[
            { id: 'current', label: 'Current Capabilities', icon: CheckCircle2, count: CURRENT_CAPABILITIES.length },
            { id: 'missing', label: 'Missing Capabilities', icon: AlertTriangle, count: MISSING_CAPABILITIES.length },
            { id: 'gaps', label: 'Gaps & Issues', icon: AlertTriangle, count: gaps.length + flags.length },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold ${tab === t.id ? 'bg-[#0b0b0b] text-white' : 'border border-black/15 text-black/60 hover:bg-black/5'}`}>
              <t.icon size={14} /> {t.label} ({t.count})
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-black/30" size={32} /></div>
        ) : (
          <>
            {/* CURRENT CAPABILITIES */}
            {tab === 'current' && (
              <div className="space-y-6">
                {categories.map(([catName, caps]) => (
                  <div key={catName} className="rounded-2xl border border-black/10 bg-white p-5">
                    <h2 className="mb-3 font-black">{catName} <span className="text-xs font-normal text-black/40">({caps.length})</span></h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {caps.map(c => (
                        <div key={c.name} className="rounded-xl border border-black/10 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold">{c.name}</p>
                              <p className="text-xs text-black/40">{c.desc}</p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${c.status === 'full' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{c.status}</span>
                          </div>
                          <div className="mt-2 flex items-center gap-2">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/10">
                              <div className="h-full rounded-full" style={{ width: `${c.score}%`, background: c.score >= 80 ? '#10b981' : c.score >= 60 ? '#f59e0b' : '#dc2626' }} />
                            </div>
                            <span className="text-xs font-black">{c.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* MISSING CAPABILITIES */}
            {tab === 'missing' && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-[#f2df0d]/40 bg-[#fdfbe1] p-5">
                  <p className="text-sm font-bold">Benchmarked against: Procore, Buildertrend, ConstructConnect, Dodge Construction Network, PlanGrid, BidClerk, BuildingConnected, CoConstruct, JobTread, RedTeam</p>
                  <p className="mt-1 text-xs text-black/50">These are capabilities that similar industry-leading systems have but AUTOLEADS does not yet implement. Each is prioritized by impact and effort.</p>
                </div>
                {missingCategories.map(([catName, caps]) => (
                  <div key={catName} className="rounded-2xl border border-black/10 bg-white p-5">
                    <h2 className="mb-3 font-black">{catName} <span className="text-xs font-normal text-black/40">({caps.length})</span></h2>
                    <div className="space-y-2">
                      {caps.map(c => (
                        <div key={c.name} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold">{c.name}</p>
                            <p className="text-xs text-black/40">{c.desc}</p>
                            <p className="text-[10px] text-black/30">Benchmark: {c.benchmark}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white" style={{ background: priorityColor[c.priority] }}>{c.priority}</span>
                            <span className="rounded-full border border-black/10 px-2 py-0.5 text-[10px] font-bold" style={{ color: effortColor[c.effort] }}>{c.effort} effort</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* GAPS & ISSUES */}
            {tab === 'gaps' && (
              <div className="space-y-6">
                {/* System Gaps */}
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <h2 className="mb-3 font-black">System Gaps ({gaps.length})</h2>
                  {gaps.length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                      <p className="mt-3 text-sm font-bold text-emerald-600">No open gaps</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {gaps.map(g => (
                        <div key={g.id} className="rounded-lg border border-black/10 p-3">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${g.severity === 'critical' ? 'bg-red-100 text-red-700' : g.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{g.severity}</span>
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase">{g.category || 'general'}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${g.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{g.status}</span>
                          </div>
                          <p className="mt-2 text-sm font-bold">{g.title || g.gap_description || 'Unnamed gap'}</p>
                          <p className="mt-1 text-xs text-black/50">{g.description || g.gap_description || ''}</p>
                          {g.recommended_fix && <p className="mt-1 text-xs text-emerald-700">Fix: {g.recommended_fix}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* System Flags */}
                <div className="rounded-2xl border border-black/10 bg-white p-5">
                  <h2 className="mb-3 font-black">System Flags ({flags.length})</h2>
                  {flags.length === 0 ? (
                    <div className="py-8 text-center">
                      <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
                      <p className="mt-3 text-sm font-bold text-emerald-600">No open flags</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {flags.map(f => (
                        <div key={f.id} className="rounded-lg border border-black/10 p-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 rounded-full ${f.severity === 'critical' ? 'bg-red-500' : f.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${f.severity === 'critical' ? 'bg-red-100 text-red-700' : f.severity === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>{f.severity}</span>
                            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase">{f.flag_type?.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="mt-2 text-sm font-bold">{f.title}</p>
                          <p className="mt-1 text-xs text-black/50">{f.description}</p>
                          {f.fix_description && <p className="mt-1 text-xs text-emerald-700">Fix: {f.fix_description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}