import React from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Activity, BarChart3, BookOpen, Bot, Bug, Database, Eye, Flag, Gauge, Layers,
  LayoutDashboard, MapPin, Monitor, Plus, Rocket, Search, Shield, ShieldCheck,
  Tag, TestTube, Users, Wrench, Zap,
} from "lucide-react";

// Left sidebar for the upgraded Admin Portal — all tools and pages organized
// into collapsible groups. The active section is highlighted based on the
// current `activeSection` prop (for in-page tabs) or the current route.

const SECTIONS = [
  {
    title: 'Dashboard',
    items: [
      { key: 'overview', label: 'Overview', icon: LayoutDashboard, type: 'tab' },
      { key: 'client', label: 'Client Preview', icon: Eye, type: 'tab' },
      { key: 'promo', label: 'Promo Codes', icon: Tag, type: 'tab' },
      { key: 'team', label: 'Team & Access', icon: Users, type: 'tab' },
      { key: 'flags', label: 'Flags', icon: Flag, type: 'tab' },
      { key: 'audit', label: 'Audit & Fix', icon: Wrench, type: 'tab' },
    ],
  },
  {
    title: 'Operations & Automation',
    items: [
      { to: '/ops-commander', label: 'Ops Commander', icon: Zap },
      { to: '/daily-autopilot', label: 'Daily Autopilot', icon: Rocket },
      { to: '/ai-command-center', label: 'AI Command Center', icon: Bot },
      { to: '/ai-approval-proxy', label: 'AI Approval Proxy', icon: ShieldCheck },
      { to: '/bid-package-center', label: 'Bid Package Center', icon: ShieldCheck },
      { to: '/auto-pipeline', label: 'Auto Pipeline', icon: Zap },
    ],
  },
  {
    title: 'Testing & QA',
    items: [
      { to: '/test-agent-portal', label: 'Test Agent Portal', icon: Zap },
      { to: '/system-qa', label: 'System QA', icon: Activity },
      { to: '/test-runner', label: 'Test Runner', icon: TestTube },
      { to: '/system-test-suite', label: 'System Test Suite', icon: TestTube },
      { to: '/validation-gates', label: 'Validation Gates', icon: Shield },
      { to: '/self-reflection', label: 'Self-Reflection', icon: Activity },
      { to: '/async-load-test', label: 'Load Tests', icon: Gauge },
    ],
  },
  {
    title: 'Prompt Library & Capabilities',
    items: [
      { to: '/prompt-library', label: 'Prompt Library', icon: BookOpen },
      { to: '/capability-matrix', label: 'Capability Matrix', icon: Layers },
    ],
  },
  {
    title: 'Observability & Health',
    items: [
      { to: '/system-health', label: 'System Health', icon: Activity },
      { to: '/observability', label: 'Observability', icon: Database },
      { to: '/dead-letters', label: 'Dead Letters', icon: Shield },
      { to: '/audit', label: 'Audit Log', icon: Shield },
      { to: '/jobs', label: 'Jobs', icon: Activity },
    ],
  },
  {
    title: 'Data & Sources',
    items: [
      { to: '/sources', label: 'Sources', icon: Search },
      { to: '/scrapers', label: 'Scrapers', icon: Search },
      { to: '/state-control', label: '50-State Control', icon: MapPin },
      { to: '/source-verification', label: 'Source Verification', icon: Shield },
      { to: '/canonical-health', label: 'Canonical Health', icon: Database },
      { to: '/lead-validation-review', label: 'Lead Validation', icon: Users },
    ],
  },
  {
    title: 'Financial & Growth',
    items: [
      { to: '/owner-dashboard', label: 'Owner Dashboard', icon: BarChart3 },
      { to: '/cost-intelligence', label: 'Cost Intelligence', icon: Database },
      { to: '/api-keys', label: 'API Keys', icon: Tag },
      { to: '/reports', label: 'Reports', icon: BarChart3 },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/employee-portal', label: 'Employee Portal', icon: Users },
    ],
  },
  {
    title: 'Governance & Blueprint',
    items: [
      { to: '/system-inventory', label: 'System Inventory', icon: Database },
      { to: '/dna-blueprint', label: 'DNA Blueprint', icon: ShieldCheck },
    ],
  },
];

export default function AdminSidebar({ activeSection, onSectionChange }) {
  const location = useLocation();

  return (
    <nav className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-4">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f2df0d] text-[#0b0b0b]"><ShieldCheck size={18} /></span>
        <div>
          <p className="text-sm font-black text-white">Admin Portal</p>
          <p className="text-[10px] text-white/40">Full system control</p>
        </div>
      </div>

      {/* Scrollable nav */}
      <div className="flex-1 overflow-y-auto px-2 py-3 sidebar-scroll">
        {SECTIONS.map((section) => (
          <div key={section.title} className="mb-4">
            <p className="mb-1.5 px-2 text-[10px] font-black uppercase tracking-wider text-white/30">{section.title}</p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                if (item.type === 'tab') {
                  const active = activeSection === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => onSectionChange(item.key)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${
                        active ? 'bg-[#f2df0d] text-[#0b0b0b]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <Icon size={15} /> {item.label}
                    </button>
                  );
                }
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-bold transition ${
                      active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon size={15} /> {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-4 py-3">
        <Link to="/dashboard" className="flex items-center gap-2 text-xs font-bold text-white/50 hover:text-white">
          <LayoutDashboard size={14} /> Back to App
        </Link>
      </div>
    </nav>
  );
}