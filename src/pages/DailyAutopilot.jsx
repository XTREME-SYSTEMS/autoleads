import React, { useState } from "react";
import { ArrowRight, FileCheck2, Inbox, Loader2, MailCheck, Radar, TriangleAlert } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, IconSquare } from "@/components/CommercialMobileUI";
import { useEntityList } from "@/hooks/useEntityList";
import { useNavigate } from "react-router-dom";

const CATEGORY_ICONS = {
  opportunity_review: Radar,
  bid_inbox: Inbox,
  takeoff_review: FileCheck2,
  proposal_approval: MailCheck,
  source_health: TriangleAlert,
  follow_up: MailCheck,
};

const CATEGORY_ROUTES = {
  opportunity_review: "/leads",
  bid_inbox: "/bid-inbox",
  takeoff_review: "/takeoff-evidence",
  proposal_approval: "/proposal-approvals",
  source_health: "/source-health-center",
  follow_up: "/outreach",
};

const CATEGORY_LABELS = {
  opportunity_review: "Opportunity Review",
  bid_inbox: "Bid Inbox",
  takeoff_review: "Takeoff Review",
  proposal_approval: "Proposal Approval",
  source_health: "Source Health",
  follow_up: "Follow Up",
};

function fmtDate(d) { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; } }

const PLACEHOLDERS = [
  { title: "Review newly matched opportunities", description: "Ranked using trade, geography, stage, source confidence, and relationship strength.", due_date: "Today", priority: "high", category: "opportunity_review" },
  { title: "Process bid inbox", description: "Connected invitations requiring project matching and deadline confirmation will appear here.", due_date: "Today", priority: "critical", category: "bid_inbox" },
  { title: "Review takeoff evidence", description: "Takeoffs with low-confidence scale or specification conflicts will appear here.", due_date: "Before pricing", priority: "high", category: "takeoff_review" },
  { title: "Approve proposal drafts", description: "Completed proposal drafts awaiting human approval will appear here.", due_date: "This afternoon", priority: "medium", category: "proposal_approval" },
  { title: "Resolve source-health warning", description: "Source parsers requiring operator review will appear here.", due_date: "Within 24 hours", priority: "medium", category: "source_health" },
];

export default function DailyAutopilot() {
  const nav = useNavigate();
  const [expanded, setExpanded] = useState(null);
  const { records, loading } = useEntityList("ActionItem", { filter: { status: "open" }, sort: "-priority", limit: 50 });
  const actions = records || [];
  const { records: projects } = useEntityList("Project", { sort: "-created_date", limit: 200 });
  const { records: proposals } = useEntityList("Proposal", { limit: 200 });
  const { records: messages } = useEntityList("Message", { limit: 200 });
  const list = actions.length > 0 ? actions : PLACEHOLDERS;

  const proposalMap = {};
  (proposals || []).forEach(p => { if (p.project_id) proposalMap[p.project_id] = p; });

  const leadsToView = (projects || []).filter(p =>
    ["qualification", "takeoff", "estimating"].includes(p.stage) && !proposalMap[p.id]
  ).length;
  const bidsCompleted = (projects || []).filter(p => {
    const prop = proposalMap[p.id];
    return prop && prop.status !== "rejected" && prop.status !== "lost";
  }).length;
  const bidPackages = (proposals || []).filter(p =>
    p.status === "approved" || p.status === "internal_review"
  ).length;
  const emailsSent = (messages || []).filter(m => m.direction === "outbound" && m.status === "sent").length;
  const emailsReceived = (messages || []).filter(m => m.direction === "inbound").length;
  const followUps = (actions || []).filter(a => a.category === "follow_up").length;

  const openRoute = (a) => a.route || CATEGORY_ROUTES[a.category] || "/dashboard";

  const stats = [
    ["Leads to view", leadsToView, "/leads", Radar],
    ["Bids completed", bidsCompleted, "/finished-proposals", FileCheck2],
    ["Ready To Send", bidPackages, "/proposals", MailCheck],
    ["Emails sent", emailsSent, "/messages", MailCheck],
    ["Emails received", emailsReceived, "/messages", Inbox],
    ["Follow ups", followUps, "/outreach", MailCheck],
  ];

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Today's Action Plan</IndustrialTitle>
    <Surface className="mb-4 p-4">
      <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-[#E9A900]">Pipeline Summary</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {stats.map(([t, v, route, Icon]) => (
          <button key={t} onClick={() => nav(route)} className="flex flex-col items-center rounded-[12px] border border-black/10 p-3 text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full border border-black/10"><Icon size={16}/></span>
            <p className="mt-1.5 text-[20px] font-black leading-none">{v}</p>
            <p className="mt-1 text-[8px] font-bold uppercase leading-tight tracking-wide text-black/55">{t}</p>
          </button>
        ))}
      </div>
    </Surface>
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-brand text-[15px] font-bold uppercase tracking-[.035em]">Priority Actions</h2>
      {loading && <Loader2 size={16} className="animate-spin text-black/30"/>}
    </div>
    {loading ? <Surface className="p-8 text-center text-sm text-black/45">Loading your action plan…</Surface> :
      list.length === 0 ? (
        <Surface className="p-8 text-center"><p className="font-brand text-xl font-bold uppercase">No actions today</p><p className="mt-2 text-sm text-black/50">Your prioritized queue will appear here once verified leads, deadlines, and approvals are flowing.</p></Surface>
      ) : (
        <Surface className="divide-y divide-black/[.07]">
          {list.map((a, idx) => {
            const Icon = CATEGORY_ICONS[a.category] || Radar;
            const id = a.id || `ph-${idx}`;
            const isOpen = expanded === id;
            return (
              <div key={id}>
                <button onClick={() => setExpanded(isOpen ? null : id)} className="flex min-h-[68px] w-full items-center gap-3 px-4 text-left">
                  <IconSquare icon={Icon}/>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-black/50">{CATEGORY_LABELS[a.category] || "Action"}</p>
                  </div>
                  {a.priority && <span className={`shrink-0 rounded px-1.5 py-0.5 text-[8px] font-black uppercase ${a.priority==='critical'?'bg-red-100 text-red-700':a.priority==='high'?'bg-[#FFC400] text-black':'bg-black/5 text-black/50'}`}>{a.priority}</span>}
                </button>
                {isOpen && (
                  <div className="border-t border-black/[.06] px-4 py-4">
                    {a.description && <p className="text-sm leading-6 text-black/70">{a.description}</p>}
                    {a.due_date && <p className="mt-2 text-xs font-bold text-[#D99D00]">Due {fmtDate(a.due_date) || a.due_date}</p>}
                    <div className="mt-3 flex justify-end">
                      <button onClick={() => nav(openRoute(a))} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FFC400] px-4 font-brand text-sm font-bold uppercase text-black">Open <ArrowRight size={15}/></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Surface>
      )}
  </CommercialPage>;
}