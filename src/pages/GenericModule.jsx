import React from "react";
import { useLocation } from "react-router-dom";
import ModulePage from "@/components/common/ModulePage";

const TITLES = {
  "/leads": ["Leads", "Discovered construction leads across verified sources."],
  "/lead-pipeline": ["Lead Pipeline", "Qualification stages for verified leads."],
  "/projects": ["Projects", "National construction project registry."],
  "/projects/discovery": ["Project Discovery", "Search verified projects by state, city, and region."],
  "/contractors": ["Contractors", "Contractor and company intelligence."],
  "/contacts": ["Contacts", "Project participants and verified contacts."],
  "/bids": ["Bids", "Submitted and in-progress bids."],
  "/estimates": ["Estimates", "Estimates built from approved takeoffs."],
  "/proposals": ["Proposals", "All proposal versions and their lifecycle state."],
  "/proposal-approvals": ["Proposal Approvals", "Reviewer queue for proposals awaiting approval."],
  "/pricing-intelligence": ["Pricing Intelligence", "Organization-specific pricing signals."],
  "/communication-control": ["Communication Control", "All external communication is draft, preview, or test mode only."],
  "/outreach": ["Outreach", "Draft-only outreach sequences. Live delivery disabled."],
  "/follow-ups": ["Follow-ups", "Scheduled follow-up tasks."],
  "/outcome-learning": ["Outcome Learning", "Improvement from verified wins and losses."],
  "/source-health-center": ["Source Health Center", "Health, authority, and freshness of every data source."],
  "/sources": ["Sources", "Registered import sources and their usage basis."],
  "/scrapers": ["Import Pipelines", "National geography and procurement import pipelines."],
  "/tasks": ["Tasks", "Organization task queue."],
  "/messages": ["Messages", "Internal messages and draft communications."],
  "/calendar": ["Calendar", "Bid deadlines and scheduled follow-ups."],
  "/notifications": ["Notifications", "System and workflow notifications."],
  "/reports": ["Reports", "Verified reporting only."],
  "/analytics": ["Analytics", "Verified analytics only."],
  "/ai-command-center": ["AI Command Center", "Governed agents, tools, and audit receipts."],
  "/settings": ["Settings", "Organization profile, trades, service areas, and pricing."],
  "/admin": ["Admin", "Organization membership and roles."],
  "/audit": ["Audit Receipts", "Every governed action produces a receipt."],
  "/jobs": ["Jobs", "Background job runs."],
  "/dead-letters": ["Dead Letters", "Failed jobs awaiting operator action."],
  "/takeoff": ["Takeoffs", "Document processing and evidence-first takeoffs."],
};

export default function GenericModule() {
  const { pathname } = useLocation();
  const [title, subtitle] = TITLES[pathname] || ["Not Found", ""];
  return <ModulePage title={title} subtitle={subtitle} emptyDescription="No verified records yet for this organization. Data appears only after an authorized import or verified activity." />;
}