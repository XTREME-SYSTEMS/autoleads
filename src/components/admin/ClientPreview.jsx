import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Edit3, ExternalLink, Eye, Image, Layout, Mail, MapPin, Monitor, Palette, RefreshCw,
  Settings, Tag, Wrench,
} from "lucide-react";

// Client Preview — lets the admin see the client-facing app live and jump
// to the settings pages that control what clients see (branding, proposals,
// pricing, email templates, service areas, trades, etc.).

const CLIENT_PAGES = [
  { path: '/', label: 'Home / Landing', desc: 'Public marketing page' },
  { path: '/dashboard', label: 'Client Dashboard', desc: 'Main start-my-day view' },
  { path: '/leads', label: 'Lead Feed', desc: 'Browse and qualify leads' },
  { path: '/leads/pipeline', label: 'Lead Pipeline', desc: 'Kanban pipeline board' },
  { path: '/projects', label: 'Projects', desc: 'All projects' },
  { path: '/proposals', label: 'Proposals', desc: 'All proposals' },
  { path: '/bids', label: 'Bid Board', desc: 'Active bids' },
  { path: '/takeoff', label: 'Takeoff', desc: 'Takeoff workspace' },
  { path: '/estimates', label: 'Estimates', desc: 'Estimate workspace' },
  { path: '/pricing-intelligence', label: 'Pricing Intelligence', desc: 'Pricing dashboard' },
  { path: '/contractors', label: 'Contractor Directory', desc: 'Contractor CRM' },
  { path: '/outreach', label: 'Outreach Center', desc: 'Follow-ups & outreach' },
  { path: '/tasks', label: 'Task Board', desc: 'Team tasks' },
  { path: '/calendar', label: 'Calendar', desc: 'Calendar workspace' },
  { path: '/reports', label: 'Reports', desc: 'Operational reports' },
];

const EDIT_LINKS = [
  { to: '/settings/company', icon: Settings, label: 'Company Profile', desc: 'Name, phone, website, address' },
  { to: '/settings/branding', icon: Image, label: 'Branding & Logo', desc: 'Logo, colors, brand assets' },
  { to: '/settings/proposals', icon: Layout, label: 'Proposal Template', desc: 'Default proposal layout' },
  { to: '/settings/pricing', icon: Tag, label: 'Pricing Settings', desc: 'Margins, tiers, scope pricing' },
  { to: '/settings/service-areas', icon: MapPin, label: 'Service Areas', desc: 'Geographic coverage' },
  { to: '/settings/trades', icon: Wrench, label: 'Trade Settings', desc: 'Trade filters & keywords' },
  { to: '/email-templates', icon: Mail, label: 'Email Templates', desc: 'Outreach email templates' },
  { to: '/settings/notifications', icon: Mail, label: 'Notifications', desc: 'Alert preferences' },
  { to: '/settings/outreach', icon: Mail, label: 'Outreach Settings', desc: 'Follow-up cadence' },
  { to: '/settings/ai-autonomy', icon: Wrench, label: 'AI Autonomy', desc: 'Automation toggles' },
];

export default function ClientPreview() {
  const [selectedPath, setSelectedPath] = useState('/dashboard');
  const [iframeKey, setIframeKey] = useState(0);
  const baseUrl = 'https://autoleads.base44.app';
  const previewUrl = `${baseUrl}${selectedPath}`;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Monitor size={20} /></span>
          <div className="flex-1">
            <p className="font-black">Client Preview & Editor</p>
            <p className="text-xs text-black/50">See exactly what your clients see. Pick a page to preview live, then jump to the settings that control it.</p>
          </div>
          <a href={previewUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
            <ExternalLink size={14} /> Open in New Tab
          </a>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        {/* Page picker */}
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">Client Pages</p>
          <div className="space-y-1">
            {CLIENT_PAGES.map((p) => (
              <button
                key={p.path}
                onClick={() => setSelectedPath(p.path)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-bold transition ${
                  selectedPath === p.path ? 'bg-[#f2df0d] text-black' : 'text-black/60 hover:bg-black/5'
                }`}
              >
                <Eye size={13} /> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Live preview iframe */}
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-black">{CLIENT_PAGES.find(p => p.path === selectedPath)?.label || 'Preview'}</p>
              <p className="truncate text-xs text-black/40">{previewUrl}</p>
            </div>
            <button onClick={() => setIframeKey(k => k + 1)} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
              <RefreshCw size={14} /> Reload
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-black/10 bg-gray-50">
            <iframe
              key={iframeKey}
              src={previewUrl}
              title="Client Preview"
              className="h-[600px] w-full"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            />
          </div>
          <p className="mt-2 text-[11px] text-black/40">
            Note: pages requiring login will show the login screen. Use "Open in New Tab" to interact with the full client experience.
          </p>
        </div>
      </div>

      {/* Edit links — settings that control the client experience */}
      <div className="rounded-2xl border border-black/10 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Edit3 size={18} className="text-[#b0a209]" />
          <p className="font-black">Edit What Clients See</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {EDIT_LINKS.map(({ to, icon: Icon, label, desc }) => (
            <Link key={to} to={to} className="rounded-xl border border-black/10 p-4 hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Icon size={18} className="text-black/40" />
              <p className="mt-2 font-black text-sm">{label}</p>
              <p className="text-xs text-black/40">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}