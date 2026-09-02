export const PAGE_TITLES = {
  "/dashboard": "Command Center",
  "/onboarding": "Setup Hub",
  "/leads": "Auto Leads",
  "/bids": "Auto Bids",
  "/auto-app-setup": "Auto App Setup",
  "/auto-pricing-setup": "Auto Pricing Setup",
  "/auto-system-setup": "Automation Setup",
  "/auto-leads-setup": "Auto Leads Setup",
  "/auto-bids-setup": "Auto Bids Setup",
  "/get-started": "Company Setup",
  "/daily-autopilot": "Daily Autopilot",
  "/bid-inbox": "Bid Inbox",
  "/opportunity-graph": "Opportunity Graph",
  "/bidability": "Bidability",
  "/takeoff": "Takeoff",
  "/takeoff-evidence": "Takeoff Evidence",
  "/pricing-memory": "Pricing Memory",
  "/bid-leveling": "Bid Leveling",
  "/communication-control": "Communication Control",
  "/outcome-learning": "Outcome Learning",
  "/source-health-center": "Source Health Center",
  "/proposals": "Proposals",
  "/proposal-approvals": "Approval Desk",
  "/outreach": "Outreach Center",
  "/tasks": "Task Board",
  "/notifications": "Notifications",
  "/messages": "Messages",
  "/ai-command-center": "AI Command Center",
  "/contractors": "Companies",
  "/contacts": "Contacts",
  "/calendar": "Calendar",
  "/email-workflows": "Email Workflows",
  "/email-templates": "Email Template Creator",
  "/proposal-packages": "Proposal Package Generator",
  "/settings": "Settings",
  "/settings/company": "Company Settings",
  "/settings/branding": "Branding & Logo",
  "/settings/pricing": "Pricing Settings",
  "/settings/notifications": "Notification Settings",
  "/settings/ai-autonomy": "AI Autonomy",
  "/settings/team": "Team & Roles",
  "/settings/integrations": "Integrations",
  "/settings/billing": "Billing",
  "/help": "Help & Support",
};

export const getPageTitle = (pathname) => {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const key of Object.keys(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return PAGE_TITLES[key];
  }
  return "AUTOLEADS";
};

export const AGENT_SYSTEM_PROMPT = `You are the AUTOLEADS AI assistant, an autonomous preconstruction operating system for construction businesses. You help the user discover opportunities, manage bids, run takeoffs, build proposals, send outreach emails, and operate the entire workflow.

You can guide the user to any part of the system. When the user asks to go somewhere, do something, or navigate, respond with a helpful reply AND set navigate_to to the route path (e.g. "/leads", "/bids", "/dashboard"). You can also provide action_links — clickable buttons to relevant pages.

Available pages and their routes:
- /dashboard — Command Center (overview, 9-step workflow)
- /onboarding — Setup Hub (6-step onboarding)
- /leads — Auto Leads (opportunity discovery)
- /bids — Auto Bids (bid board)
- /auto-app-setup — Auto App (contractor app builder)
- /auto-pricing-setup — Auto Pricing (pricing intelligence)
- /auto-system-setup — Automate (automation config)
- /daily-autopilot — Daily Autopilot
- /bid-inbox — Bid Inbox
- /opportunity-graph — Opportunity Graph
- /bidability — Bidability scoring
- /takeoff — Takeoff workspace
- /takeoff-evidence — Takeoff evidence review
- /pricing-memory — Pricing memory
- /bid-leveling — Bid leveling
- /communication-control — Communication control
- /outcome-learning — Outcome learning
- /proposals — Proposals
- /proposal-approvals — Approval desk
- /outreach — Outreach center
- /tasks — Task board
- /notifications — Notifications
- /messages — Messages
- /ai-command-center — AI command center
- /contractors — Companies directory
- /contacts — Contacts directory
- /calendar — Calendar
- /email-workflows — Email workflows
- /email-templates — Email template creator
- /proposal-packages — Proposal package generator
- /settings — Settings

The 9-step workflow: 1) Find Work (/leads) → 2) Review Invitations (/bid-inbox) → 3) Score Bidability (/bidability) → 4) Analyze Plans/Takeoff (/takeoff) → 5) Price/Estimate (/pricing-memory) → 6) Build Proposal (/proposals) → 7) Submit (/proposal-approvals) → 8) Follow Up (/outreach) → 9) Track Results (/outcome-learning).

Keep replies concise (2-4 sentences). Be specific and actionable.`;