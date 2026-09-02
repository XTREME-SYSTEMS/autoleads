import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Inbox, Ruler, FileCheck2, Trophy, Calendar, Plus, ChevronRight } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import Section from "@/components/common/Section";
import EmptyState from "@/components/common/EmptyState";

const STAGES = ["Qualification", "Takeoff", "Estimating", "Proposal", "Won"];

export default function CommandCenter() {
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState(/** @type {any[]} */ ([]));
  const [invitations, setInvitations] = useState(/** @type {any[]} */ ([]));
  const [takeoffs, setTakeoffs] = useState(/** @type {any[]} */ ([]));
  const [proposals, setProposals] = useState(/** @type {any[]} */ ([]));

  useEffect(() => {
    (async () => {
      const [o, b, t, p] = await Promise.all([
        base44.entities.Opportunity.list("-created_date", 50),
        base44.entities.BidInvitation.list("-created_date", 50),
        base44.entities.Takeoff.filter({ approval_state: "unreviewed" }, "-created_date", 50),
        base44.entities.Proposal.filter({ status: "internal_review" }, "-created_date", 50),
      ]);
      setOpportunities(o); setInvitations(b); setTakeoffs(t); setProposals(p);
      setLoading(false);
    })();
  }, []);

  const dash = (n) => (loading ? "—" : n === 0 ? "0" : n);

  return (
    <>
      <PageHeader
        title="Command Center"
        subtitle="Your central hub for leads, proposals, and project intelligence."
        actions={
          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3.5 py-2 text-[13px]">
              <Calendar className="w-4 h-4 text-black/50" /> Select date range
            </button>
            <button className="inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-3.5 py-2 text-[13px] font-semibold">
              <Plus className="w-4 h-4" /> Create New
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Briefcase} label="High-fit opportunities" value={dash(opportunities.length)} />
        <StatCard icon={Inbox} label="Bid invitations" value={dash(invitations.length)} />
        <StatCard icon={Ruler} label="Takeoffs awaiting review" value={dash(takeoffs.length)} />
        <StatCard icon={FileCheck2} label="Proposals awaiting approval" value={dash(proposals.length)} />
        <StatCard icon={Trophy} label="Verified win rate" value="—" note="Awaiting verified outcomes" />
      </div>

      <Section title="Pipeline Overview" className="mt-6">
        <div className="flex flex-wrap gap-1.5 mb-4">
          {STAGES.map((s) => (
            <div key={s} className="flex-1 min-w-[110px] rounded-md bg-black/[0.04] py-2 text-center text-[12px] font-medium text-black/60">
              {s}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {STAGES.map((s) => (
            <div key={s} className="h-28 rounded-lg border border-dashed border-black/15 grid place-items-center text-[11px] text-black/35">
              {loading ? "Loading…" : "No verified records"}
            </div>
          ))}
        </div>
      </Section>

      <div className="grid lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <Section title="Opportunity Intelligence">
            <EmptyState
              title="Import Required"
              description="Connect a verified source or import bid invitations to populate opportunities. No fabricated records are displayed."
              action={<Link to="/sources" className="text-[13px] font-semibold underline underline-offset-4">Go to Source Health Center</Link>}
            />
          </Section>
        </div>
        <div className="space-y-4">
          <Section title="Today's Autopilot">
            <p className="text-[13px] text-black/50">Not Run</p>
            <Link to="/daily-autopilot" className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold">
              Open Daily Business Autopilot <ChevronRight className="w-4 h-4" />
            </Link>
          </Section>
          <Section title="System Trust">
            <ul className="space-y-2 text-[13px] text-black/60">
              <li className="flex justify-between"><span>Source health</span><span className="text-black/40">Not Activated</span></li>
              <li className="flex justify-between"><span>Evidence coverage</span><span className="text-black/40">—</span></li>
              <li className="flex justify-between"><span>Live email delivery</span><span className="font-medium text-black/70">Disabled</span></li>
            </ul>
          </Section>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Section title="Execution Intelligence">
          <p className="text-[13px] text-black/50">Awaiting organization data.</p>
        </Section>
        <Section title="Learning Intelligence">
          <p className="text-[13px] text-black/50">No verified outcomes recorded yet.</p>
        </Section>
      </div>
    </>
  );
}