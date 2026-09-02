import { Settings, Radar, Briefcase, Smartphone, DollarSign, Package, Zap, Cog, Users, Mail } from "lucide-react";

// The single source of truth for the AUTOLEADS step-by-step workflow.
// Same pages/routes as the top nav, renamed to reflect the step-by-step process.
// Used by the AI chat step buttons.
export const WORKFLOW_STEPS = [
  {
    step: 1, key: "setup", title: "Auto Setup", icon: Settings, to: "/onboarding",
    purpose: "Company profile, branding, credentials, and the guided onboarding.",
    quick: "captures your company, branding, and credentials so every later step uses your real data.",
    chatMatch: ["setup", "onboarding", "get started", "company", "auto setup"],
  },
  {
    step: 2, key: "leads", title: "Auto Scrape", icon: Radar, to: "/leads",
    purpose: "Scrape sources, discover opportunities, filter and pursue leads.",
    quick: "scans 70+ national bid sources for opportunities matching your market and trade.",
    chatMatch: ["leads", "discovery", "scrape", "opportunity", "auto scrape"],
  },
  {
    step: 3, key: "bids", title: "Auto Bids", icon: Briefcase, to: "/bids",
    purpose: "Bid board, takeoff, estimates, proposals, and approvals.",
    quick: "moves pursued leads through takeoff, estimating, and proposal generation to a submitted bid.",
    chatMatch: ["bids", "bid", "proposal", "takeoff", "estimate", "auto bids"],
  },
  {
    step: 4, key: "app", title: "Auto App", icon: Smartphone, to: "/auto-app-setup",
    purpose: "Contractor app, AI image gallery, brochure, and business card.",
    quick: "builds a branded contractor app with AI project images and a shareable client link.",
    chatMatch: ["app", "contractor app", "auto app"],
  },
  {
    step: 5, key: "pricing", title: "Auto Pricing", icon: DollarSign, to: "/auto-pricing-setup",
    purpose: "Pricing intelligence — labor, material, margins, geo pricing, market intel.",
    quick: "scrapes local and national pricing and winning bids to power your estimating.",
    chatMatch: ["pricing", "auto pricing", "pricing setup"],
  },
  {
    step: 6, key: "materials", title: "Auto Materials", icon: Package, to: "/material-pricing",
    purpose: "Material database — supplier ingestion, scraping, and cost calculator.",
    quick: "ingests real supplier costs so proposals use actual material prices.",
    chatMatch: ["material", "materials", "auto materials"],
  },
  {
    step: 7, key: "automate", title: "Automate", icon: Zap, to: "/auto-system-setup",
    purpose: "Automation config, AI command center, outreach, and schedules.",
    quick: "runs the whole workflow on your schedule — scanning, takeoffs, proposals, and outreach.",
    chatMatch: ["automate", "automation", "system setup"],
  },
  {
    step: 8, key: "settings", title: "Auto Settings", icon: Cog, to: "/settings",
    purpose: "Account, team roles, billing, and security settings.",
    quick: "manages your account, team, billing, and security in one place.",
    chatMatch: ["settings", "auto settings", "account", "billing", "team"],
  },
  {
    step: 9, key: "teams", title: "Auto Teams", icon: Users, to: "/auto-teams",
    purpose: "Invite teammates, assign roles, and manage workspace access.",
    quick: "gets your team into the system with the right permissions.",
    chatMatch: ["teams", "auto teams", "team", "invite", "roles"],
  },
  {
    step: 10, key: "contact", title: "Auto Contact", icon: Mail, to: "/auto-contact",
    purpose: "WhatsApp, email templates, and message creation in one hub.",
    quick: "connects your contacts and communication channels together.",
    chatMatch: ["contact", "auto contact", "whatsapp", "email", "message", "templates"],
  },
];

export function findCurrentStep(contextLabel = "") {
  const lc = contextLabel.toLowerCase();
  return WORKFLOW_STEPS.find((s) => s.chatMatch.some((m) => lc.includes(m)));
}