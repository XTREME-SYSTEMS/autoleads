import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowRight, FileCheck2, FileText, Loader2, MapPin, Clock, Package, Plus, Radar } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, IconSquare, StatusPill, SecondaryAction, PrimaryAction, money, fmtDate } from "@/components/CommercialMobileUI";
import { useEntityList } from "@/hooks/useEntityList";
import BidPackagePanel from "@/components/autoleads/BidPackagePanel";

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

function coverEmail(proposal, project, company) {
  const name = company?.name || "Our team";
  const client = proposal.client_name || project?.client_name || project?.authority || "the project team";
  const subject = `Bid Proposal — ${proposal.title}`;
  const body = `Hello ${client},\n\nThank you for the opportunity to submit a proposal for ${proposal.title}. Please find our bid package attached, which includes our scope of work, pricing, company qualifications, and insurance information.\n\n${project?.specs ? `Project scope: ${project.specs.slice(0, 280)}${project.specs.length > 280 ? "…" : ""}\n\n` : ""}Our total bid: ${money(proposal.total_value)}.\n\nWe are available to answer any questions and can begin work on short notice. The proposal is valid for 30 days.\n\nBest regards,\n${name}${company?.phone ? `\n${company.phone}` : ""}${company?.email ? `\n${company.email}` : ""}`;
  return { subject, body };
}

export default function Proposals() {
  const nav = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [proposing, setProposing] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [proposalMap, setProposalMap] = useState({});
  const [msgMap, setMsgMap] = useState({});

  const { records: projects, loading } = useEntityList("Project", { sort: "-created_date", limit: 100, refreshKey });
  const { records: proposals } = useEntityList("Proposal", { limit: 200, refreshKey });
  const { records: companies } = useEntityList("CompanyProfile", { limit: 1, refreshKey });
  const { records: packages } = useEntityList("ProposalPackage", { limit: 10, refreshKey });
  const { records: brandAssets } = useEntityList("BrandAsset", { filter: { type: "logo" }, limit: 20, refreshKey });
  const { records: contractorApps } = useEntityList("ContractorApp", { limit: 5, refreshKey });
  const { records: projectImages } = useEntityList("ProjectImage", { limit: 50, refreshKey });

  const company = (companies || [])[0] || null;
  const pkg = (packages || []).find(p => p.is_default) || (packages || [])[0] || null;
  const logoUrl = (brandAssets || []).find(a => a.is_default)?.file_url || (brandAssets || [])[0]?.file_url || null;
  const contractorApp = (contractorApps || [])[0] || null;

  useEffect(() => {
    const pm = {};
    (proposals || []).forEach(p => { if (p.project_id) pm[p.project_id] = p; });
    setProposalMap(pm);
  }, [proposals]);

  useEffect(() => {
    (async () => {
      const msgs = await base44.entities.Message.filter({ direction: "outbound" }).catch(() => []);
      const mm = {};
      (msgs || []).forEach(m => { if (m.project_id) (mm[m.project_id] = mm[m.project_id] || []).push(m); });
      setMsgMap(mm);
    })();
  }, [refreshKey]);

  const withProposals = useMemo(() => (projects || []).filter(p => proposalMap[p.id]), [projects, proposalMap]);

  const runProposals = async () => {
    setProposing(true);
    try { await base44.functions.invoke('autoProposals', { limit: 10 }); setRefreshKey(k => k + 1); }
    catch (e) { alert('Failed: ' + (e?.message || 'try again')); }
    finally { setProposing(false); }
  };

  const emailFor = (project, proposal) => {
    const real = (msgMap[project.id] || []).sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())[0];
    if (real) return { subject: real.subject, body: real.body, recipient: real.recipient, real: true, status: real.status };
    return { ...coverEmail(proposal, project, company), recipient: proposal.client_name || project?.client_name || "", real: false };
  };

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Bid Packages</IndustrialTitle>

    <div className="mb-3 grid grid-cols-2 gap-2">
      <SecondaryAction onClick={runProposals} disabled={proposing}>{proposing ? <><Loader2 size={16} className="animate-spin"/>Drafting…</> : <><FileCheck2 size={16}/>Generate</>}</SecondaryAction>
      <PrimaryAction onClick={() => nav('/proposals/new')}><Plus size={16}/>New Proposal</PrimaryAction>
    </div>

    {loading ? <Surface className="p-8 text-center"><Loader2 className="mx-auto animate-spin text-[#FFC400]" size={28}/></Surface> :
      withProposals.length === 0 ? (
        <Surface className="p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-black/20 bg-white text-black/40"><Package size={29}/></span>
          <h3 className="mt-4 font-brand text-xl font-bold uppercase">No bid packages yet</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/50">The AI builds bid packages from your qualified leads. Run the pipeline to generate proposals.</p>
          <div className="mt-4 flex justify-center"><PrimaryAction className="max-w-[220px]" onClick={runProposals} disabled={proposing}>{proposing ? <><Loader2 size={16} className="animate-spin"/>Drafting…</> : <><FileCheck2 size={16}/>Generate Proposals</>}</PrimaryAction></div>
        </Surface>
      ) : (
        <Surface className="divide-y divide-black/[.07]">
          {withProposals.map(project => {
            const proposal = proposalMap[project.id];
            const isOpen = expanded === project.id;
            const email = emailFor(project, proposal);
            const images = (projectImages || []).filter(img => img.trade === project.trade || img.category === project.project_type).slice(0, 6);
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
                    <StatusPill tone={PROPOSAL_STATUS_TONE[proposal.status] || "neutral"}>{(proposal.status || "").replace("_", " ")}</StatusPill>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-black/[.06] px-4 py-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-brand text-base font-bold uppercase">{proposal.title}</h3>
                      <div className="flex gap-2">
                        <button onClick={() => nav(`/proposals/${proposal.id}`)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-black/15 px-3 font-brand text-sm font-bold uppercase"><FileText size={15}/>Editor</button>
                        {proposal.status === "approved" && <button onClick={() => nav(`/proposals/${proposal.id}`)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FFC400] px-3 font-brand text-sm font-bold uppercase text-black">Send <ArrowRight size={14}/></button>}
                        {(proposal.status === "draft" || proposal.status === "internal_review") && <button onClick={() => nav('/proposal-approvals')} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FFC400] px-3 font-brand text-sm font-bold uppercase text-black">Approve <ArrowRight size={14}/></button>}
                      </div>
                    </div>
                    <BidPackagePanel proposal={proposal} project={project} company={company} pkg={pkg} logoUrl={logoUrl} contractorApp={contractorApp} projectImages={images} email={email} />
                  </div>
                )}
              </div>
            );
          })}
        </Surface>
      )}
  </CommercialPage>;
}