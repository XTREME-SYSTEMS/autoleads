import {
  Search, Radar, Plus, Download, Activity, Network, Target, Inbox, Building2, Database, Users,
  Wrench, Layers, Ruler,
  BriefcaseBusiness, Calculator, FileText, FileCheck2, Send, Tag, BookOpen, BarChart3,
  Mail, MessageSquare, MessagesSquare, Contact,
  Repeat, ListTodo, TrendingUp,
  PenTool, FileSignature,
  CreditCard, Receipt,
  Calendar, Clock,
  LayoutDashboard, Sparkles, Zap, Settings, Bell, ShieldCheck, Bug, FlaskConical, ScrollText, CircleHelp, Palette, Brain,
} from "lucide-react";

// Single source of truth: the 8-step pipeline + every related tool page grouped under its step.
export const PIPELINE_STEPS = [
  {
    key: "scrape", number: 1, title: "Scrape Leads", subtitle: "Find new opportunities", icon: Search, to: "/leads",
    tools: [
      { to: "/leads", label: "Lead Discovery", icon: Radar },
      { to: "/leads/new", label: "Add Lead", icon: Plus },
      { to: "/scrapers", label: "Scrapers", icon: Download },
      { to: "/sources", label: "Sources", icon: Activity },
      { to: "/opportunity-graph", label: "Opportunity Graph", icon: Network },
      { to: "/bidability", label: "Bidability", icon: Target },
      { to: "/bid-inbox", label: "Bid Inbox", icon: Inbox },
      { to: "/contractors", label: "Companies", icon: Building2 },
      { to: "/contacts", label: "Contacts", icon: Users },
    ],
  },
  {
    key: "takeoff", number: 2, title: "Take Off", subtitle: "Measure & quantify", icon: Wrench, to: "/takeoff",
    tools: [
      { to: "/takeoff", label: "Takeoff Workspace", icon: Ruler },
      { to: "/takeoff-evidence", label: "Takeoff Evidence", icon: Layers },
      { to: "/scope-systems", label: "Scope Systems", icon: Layers },
    ],
  },
  {
    key: "bid", number: 3, title: "Auto Bid", subtitle: "Build accurate bids", icon: BriefcaseBusiness, to: "/bids",
    tools: [
      { to: "/bids", label: "Bid Board", icon: BriefcaseBusiness },
      { to: "/estimates", label: "Estimates", icon: Calculator },
      { to: "/proposals", label: "Proposals", icon: FileText },
      { to: "/proposals/new", label: "Proposal Builder", icon: FileText },
      { to: "/finished-proposals", label: "Finished Proposals", icon: FileCheck2 },
      { to: "/sent-bids", label: "Sent Bids", icon: Send },
      { to: "/proposal-approvals", label: "Approval Desk", icon: FileCheck2 },
      { to: "/bid-leveling", label: "Bid Leveling", icon: BarChart3 },
      { to: "/pricing-intelligence", label: "Pricing Intelligence", icon: Tag },
      { to: "/material-pricing", label: "Material Pricing", icon: Tag },
      { to: "/price-books", label: "Price Books", icon: BookOpen },
      { to: "/pricing-memory", label: "Pricing Memory", icon: BookOpen },
    ],
  },
  {
    key: "email", number: 4, title: "Send Email", subtitle: "Deliver the proposal", icon: Mail, to: "/email-workflows",
    tools: [
      { to: "/email-workflows", label: "Email Workflows", icon: Mail },
      { to: "/email-templates", label: "Email Templates", icon: FileText },
      { to: "/messages", label: "Messages", icon: MessageSquare },
      { to: "/communication-control", label: "Comms Control", icon: MessagesSquare },
      { to: "/auto-contact", label: "Contact Hub", icon: Contact },
    ],
  },
  {
    key: "followup", number: 5, title: "Follow Up", subtitle: "Close more jobs", icon: Repeat, to: "/outreach",
    tools: [
      { to: "/outreach", label: "Outreach", icon: Send },
      { to: "/tasks", label: "Tasks", icon: ListTodo },
      { to: "/outcome-learning", label: "Outcome Learning", icon: TrendingUp },
    ],
  },
  {
    key: "contract", number: 6, title: "Sign Contract", subtitle: "E-sign in one tap", icon: PenTool, to: "/contracts",
    tools: [
      { to: "/contracts", label: "Contracts", icon: FileSignature },
    ],
  },
  {
    key: "payment", number: 7, title: "Take Payment", subtitle: "Get paid fast", icon: CreditCard, to: "/invoices",
    tools: [
      { to: "/invoices", label: "Invoices", icon: Receipt },
    ],
  },
  {
    key: "schedule", number: 8, title: "Schedule Job", subtitle: "Get to work", icon: Calendar, to: "/calendar",
    tools: [
      { to: "/calendar", label: "Calendar", icon: Calendar },
      { to: "/jobs", label: "Jobs", icon: Clock },
    ],
  },
];

// Hub tools that live outside the 8 pipeline stages — kept to the 4 zones:
// Setup (onboarding), Settings (ongoing config), Admin (single hub for all
// admin/ops/qa/testing/observability), and Help. Admin Portal surfaces the rest.
export const HUB_TOOLS = [
  { to: "/onboarding", label: "Setup Hub", icon: Palette },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/admin-portal", label: "Admin Portal", icon: ShieldCheck },
  { to: "/test-agent-portal", label: "Test Agent", icon: FlaskConical },
  { to: "/owner-dashboard", label: "Owner Dashboard", icon: BarChart3 },
  { to: "/cost-intelligence", label: "Cost Intelligence", icon: BarChart3 },
  { to: "/api-keys", label: "API Keys", icon: Tag },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/help", label: "Help", icon: CircleHelp },
];