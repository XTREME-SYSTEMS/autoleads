import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, FileText, Loader2, MapPin, Clock, Radar, Send } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, IconSquare, StatusPill, SecondaryAction, PrimaryAction, money, fmtDate } from "@/components/CommercialMobileUI";
import { useEntityList } from "@/hooks/useEntityList";
import ProjectOpportunityPanel from "@/components/autoleads/ProjectOpportunityPanel";

const PROPOSAL_STATUS_TONE = {
  draft: "neutral",
  internal_review: "warning",
  approved: "success",
  delivered: "info",
  responded: "purple",
  won: "success",
  lost: "danger",
  rejected: "danger",
};

export default function FinishedProposals() {
  const nav = useNavigate();
  const [expanded, setExpanded] = useState(null);
  const [proposalMap, setProposalMap] = useState({});

  const { records: projects, loading } = useEntityList("Project", { sort: "-created_date", limit: 100 });
  const { records: proposals } = useEntityList("Proposal", { limit: 200 });

  useEffect(() => {
    const pm = {};
    (proposals || []).forEach(p => { if (p.project_id) pm[p.project_id] = p; });
    setProposalMap(pm);
  }, [proposals]);

  const finished = useMemo(() => (projects || []).filter(p => {
    const prop = proposalMap[p.id];
    return prop && prop.status !== "rejected" && prop.status !== "lost";
  }), [projects, proposalMap]);

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Finished Bids</IndustrialTitle>

    <div className="mb-3"><SecondaryAction onClick={() => nav('/proposals')}>All Proposals</SecondaryAction></div>

    {loading ? <Surface className="p-8 text-center"><Loader2 className="mx-auto animate-spin text-[#FFC400]" size={28}/></Surface> :
      finished.length === 0 ? (
        <Surface className="p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-black/20 bg-white text-black/40"><FileText size={29}/></span>
          <h3 className="mt-4 font-brand text-xl font-bold uppercase">No finished proposals yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/50">The AI builds proposals from your qualified leads. Run the pipeline to generate finished bid packages.</p>
          <div className="mt-4 flex justify-center"><PrimaryAction className="max-w-[220px]" onClick={() => nav('/admin')}>Generate Proposals</PrimaryAction></div>
        </Surface>
      ) : (
        <Surface className="divide-y divide-black/[.07]">
          {finished.map(project => {
            const proposal = proposalMap[project.id];
            const isOpen = expanded === project.id;
            return (
              <div key={project.id}>
                <button onClick={() => setExpanded(isOpen ? null : project.id)} className="flex min-h-[68px] w-full items-center gap-3 px-4 text-left">
                  <IconSquare icon={Radar}/>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{project.title}</p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-black/50">
                      {project.jurisdiction && <span className="inline-flex items-center gap-1"><MapPin size={11}/>{project.jurisdiction}</span>}
                      {project.bid_due_date && <span className="inline-flex items-center gap-1 font-bold text-[#D99D00]"><Clock size={11}/>{fmtDate(project.bid_due_date)}</span>}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-brand text-[20px] font-bold text-[#E9A900]">{money(project.value, true)}</p>
                    <StatusPill tone={PROPOSAL_STATUS_TONE[proposal.status] || "success"}>{(proposal.status || "").replace("_", " ")}</StatusPill>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-black/[.06] px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-brand text-base font-bold uppercase">{project.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => nav(`/projects/${project.id}`)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-black/15 px-3 font-brand text-sm font-bold uppercase"><FileText size={15}/>Open</button>
                        <button onClick={() => nav(`/proposals/${proposal.id}`)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FFC400] px-3 font-brand text-sm font-bold uppercase text-black"><Send size={15}/>Proposal <ArrowRight size={14}/></button>
                      </div>
                    </div>
                    <ProjectOpportunityPanel project={project} proposal={proposal} />
                  </div>
                )}
              </div>
            );
          })}
        </Surface>
      )}
  </CommercialPage>;
}