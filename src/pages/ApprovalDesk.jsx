import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, FileCheck2, Loader2, Send, X } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, SecondaryAction, PrimaryAction, money } from "@/components/CommercialMobileUI";
import { useEntityList } from "@/hooks/useEntityList";
import { useToast } from "@/components/ui/use-toast";
import ProposalDocument from "@/components/autoleads/ProposalDocument";

export default function ApprovalDesk() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState(null);
  const [project, setProject] = useState(null);
  const [company, setCompany] = useState(null);
  const [pkg, setPkg] = useState(null);

  const { records: proposals, loading } = useEntityList("Proposal", { sort: "-created_date", limit: 200, refreshKey });
  const { records: companies } = useEntityList("CompanyProfile", { limit: 1, refreshKey });
  const { records: packages } = useEntityList("ProposalPackage", { limit: 10, refreshKey });
  const { records: brandAssets } = useEntityList("BrandAsset", { filter: { type: "logo" }, limit: 20, refreshKey });

  const queue = useMemo(
    () => (proposals || []).filter(p => p.status === "draft" || p.status === "internal_review"),
    [proposals]
  );

  const selected = useMemo(() => queue.find(p => p.id === selectedId) || queue[0] || null, [queue, selectedId]);
  const logoUrl = (brandAssets || []).find(a => a.is_default)?.file_url || (brandAssets || [])[0]?.file_url || null;

  useEffect(() => {
    setCompany((companies || [])[0] || null);
    setPkg((packages || []).find(p => p.is_default) || (packages || [])[0] || null);
  }, [companies, packages]);

  useEffect(() => {
    if (!selected?.project_id) { setProject(null); return; }
    base44.entities.Project.get(selected.project_id).then(setProject).catch(() => setProject(null));
  }, [selected?.project_id]);

  const approve = async (p) => {
    setBusy(p.id);
    try {
      await base44.entities.Proposal.update(p.id, { status: "approved" });
      toast({ title: "Proposal approved", description: `${p.title} is ready to submit.` });
      setRefreshKey(k => k + 1);
    } catch (e) { toast({ title: "Approve failed", description: e?.message || "try again", variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const submitBid = async (p) => {
    setBusy(`submit-${p.id}`);
    try {
      await base44.functions.invoke("submitProposal", { proposal_id: p.id });
      toast({ title: "Bid submitted", description: "Project advanced to submitted. Follow-ups configured." });
      setRefreshKey(k => k + 1);
    } catch (e) { toast({ title: "Submit failed", description: e?.message || "try again", variant: "destructive" }); }
    finally { setBusy(null); }
  };

  const decline = async (p) => {
    setBusy(p.id);
    try {
      await base44.entities.Proposal.update(p.id, { status: "rejected" });
      toast({ title: "Proposal declined" });
      setRefreshKey(k => k + 1);
    } catch (e) { toast({ title: "Decline failed", description: e?.message, variant: "destructive" }); }
    finally { setBusy(null); }
  };

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Approval Desk</IndustrialTitle>

    <div className="mb-3 grid grid-cols-2 gap-2">
      <SecondaryAction onClick={() => nav('/proposals')}>All Proposals</SecondaryAction>
      <SecondaryAction onClick={() => nav('/finished-proposals')}>Finished Bids</SecondaryAction>
    </div>

    {loading ? <Surface className="p-8 text-center"><Loader2 className="mx-auto animate-spin text-[#FFC400]" size={28}/></Surface> :
      queue.length === 0 ? (
        <Surface className="p-8 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-black/20 bg-white text-black/40"><FileCheck2 size={29}/></span>
          <h3 className="mt-4 font-brand text-xl font-bold uppercase">No proposals awaiting approval</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/50">The AI builds proposals from your qualified leads. When one is ready, it lands here for review.</p>
          <div className="mt-4 flex justify-center"><PrimaryAction className="max-w-[220px]" onClick={() => nav('/admin')}>Generate Proposals</PrimaryAction></div>
        </Surface>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 font-brand text-[14px] font-bold uppercase tracking-[.035em]">Awaiting Your Review ({queue.length})</p>
            <div className="space-y-2">
              {queue.map(p => {
                const isSel = selected?.id === p.id;
                return (
                  <button key={p.id} onClick={() => setSelectedId(p.id)}
                    className={`w-full rounded-[12px] border p-4 text-left transition ${isSel ? "border-[#FFC400] bg-[#FFF7DA]" : "border-black/10 bg-white"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold leading-tight">{p.title}</h3>
                      <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 bg-amber-50">{p.status === 'internal_review' ? 'Review' : 'Draft'}</span>
                    </div>
                    {p.client_name && <p className="mt-1 text-xs text-black/50">{p.client_name}</p>}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-brand text-lg font-bold text-[#E9A900]">{money(p.total_value)}</span>
                      <span className="text-[11px] font-bold text-black/40">{(p.items || []).length} items</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <Surface className="p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-700 bg-amber-50">{selected.status === 'internal_review' ? 'Review' : 'Draft'}</span>
                  <span className="text-sm font-bold">{selected.title}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decline(selected)} disabled={busy === selected.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-black/15 px-3 font-brand text-sm font-bold uppercase">{busy === selected.id ? <Loader2 size={15} className="animate-spin"/> : <X size={15}/>}Decline</button>
                  <button onClick={() => approve(selected)} disabled={busy === selected.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FFC400] px-3 font-brand text-sm font-bold uppercase text-black disabled:opacity-50">{busy === selected.id ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}Approve</button>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-black/10 p-2"><p className="text-[9px] font-bold uppercase text-black/40">Total</p><p className="mt-1 text-sm font-bold">{money(selected.total_value)}</p></div>
                <div className="rounded-lg border border-black/10 p-2"><p className="text-[9px] font-bold uppercase text-black/40">Client</p><p className="mt-1 truncate text-sm font-bold">{selected.client_name || "—"}</p></div>
                <div className="rounded-lg border border-black/10 p-2"><p className="text-[9px] font-bold uppercase text-black/40">Project</p><p className="mt-1 truncate text-sm font-bold">{project?.title || "—"}</p></div>
              </div>
              <ProposalDocument proposal={selected} project={project} company={company} pkg={pkg} logoUrl={logoUrl} />
              <div className="mt-3 flex justify-end gap-2">
                <button onClick={() => decline(selected)} disabled={busy === selected.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-black/15 px-3 font-brand text-sm font-bold uppercase">{busy === selected.id ? <Loader2 size={15} className="animate-spin"/> : <X size={15}/>}Decline</button>
                {selected.status === "approved"
                  ? <button onClick={() => submitBid(selected)} disabled={busy === `submit-${selected.id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-blue-500 px-3 font-brand text-sm font-bold uppercase text-white disabled:opacity-50">{busy === `submit-${selected.id}` ? <Loader2 size={15} className="animate-spin"/> : <Send size={15}/>}Submit Bid</button>
                  : <button onClick={() => approve(selected)} disabled={busy === selected.id} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FFC400] px-3 font-brand text-sm font-bold uppercase text-black disabled:opacity-50">{busy === selected.id ? <Loader2 size={15} className="animate-spin"/> : <CheckCircle2 size={15}/>}Approve</button>
                }
              </div>
            </Surface>
          )}
        </div>
      )}
  </CommercialPage>;
}