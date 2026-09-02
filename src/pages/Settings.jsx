import React from "react";
import { Link } from "react-router-dom";
import { Page } from "@/components/autoleads/UiPrimitives";
import { ArrowRight, Bell, Bot, Briefcase, Building2, CreditCard, Database, DollarSign, FileText, HelpCircle, Mail, MapPin, MessageSquare, Package, Palette, Plug, Shield, Users } from "lucide-react";

// Settings = ongoing configuration only. One-time setup wizards live in the
// Onboarding zone (/onboarding). Admin/ops/qa/testing live in the Admin Portal.
const GROUPS = [
  {
    title: "Company & Branding",
    items: [
      { to: "/settings/company", label: "Company Profile", desc: "Name, trade, location, credentials", icon: Building2, primary: true },
      { to: "/settings/branding", label: "Logo & Branding", desc: "Generate or upload your logo", icon: Palette },
      { to: "/settings/service-areas", label: "Service Areas", desc: "States, counties, cities you cover", icon: MapPin },
      { to: "/settings/trades", label: "Trades", desc: "Manage your trade scopes", icon: Briefcase },
    ],
  },
  {
    title: "Pricing & Materials",
    items: [
      { to: "/settings/pricing", label: "Pricing Settings", desc: "Labor, material, overhead, margin", icon: DollarSign },
      { to: "/material-pricing", label: "Materials Database", desc: "Material costs and suppliers", icon: Package },
    ],
  },
  {
    title: "Proposals & Communication",
    items: [
      { to: "/settings/proposals", label: "Proposal Template", desc: "Default proposal template", icon: FileText },
      { to: "/email-templates", label: "Email Templates", desc: "Create and manage templates", icon: Mail },
      { to: "/settings/outreach", label: "Outreach Settings", desc: "Follow-up cadence and rules", icon: MessageSquare },
      { to: "/settings/notifications", label: "Notifications", desc: "Alert frequency and channels", icon: Bell },
    ],
  },
  {
    title: "Automation & Integrations",
    items: [
      { to: "/settings/ai-autonomy", label: "AI Autonomy", desc: "Manual, hybrid, or full-auto mode", icon: Bot },
      { to: "/settings/integrations", label: "Integrations", desc: "Google, Slack, HubSpot, more", icon: Plug },
    ],
  },
  {
    title: "Team & Account",
    items: [
      { to: "/settings/team", label: "Team & Roles", desc: "Members and permissions", icon: Users },
      { to: "/settings/billing", label: "Billing", desc: "Plan, credits, invoices", icon: CreditCard },
      { to: "/settings/security", label: "Security", desc: "Passwords, 2FA, sessions", icon: Shield },
      { to: "/settings/data-retention", label: "Data Retention", desc: "Retention and deletion policies", icon: Database },
      { to: "/help", label: "Help & Support", desc: "Docs and contact support", icon: HelpCircle },
    ],
  },
];

export default function Settings() {
  return (
    <Page backTo="/dashboard" eyebrow="Auto Settings" title="Settings" description="Your company profile and ongoing configuration. One-time setup wizards live in Setup Hub; admin tools live in the Admin Portal.">
      <div className="space-y-8">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">{group.title}</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.to} to={item.to} className={`group flex items-start gap-3 rounded-xl border bg-white p-4 transition hover:shadow-sm ${item.primary ? "border-[#f2df0d] bg-[#fdfbe1] hover:bg-[#fcf9cf]" : "border-black/10 hover:border-[#f2df0d] hover:bg-[#fdfbe1]"}`}>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Icon size={20} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1 text-sm font-black">{item.label}<ArrowRight size={13} className="text-black/30 transition group-hover:translate-x-0.5 group-hover:text-[#b0a209]" /></p>
                      <p className="mt-0.5 text-xs leading-5 text-black/50">{item.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}