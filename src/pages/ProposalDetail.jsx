import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, FileText, Loader2, Send, User, DollarSign,
  AlertCircle, Lock, FileCheck, Mail, Trophy, XCircle, Calendar
} from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";
import { Card, PrimaryButton, SecondaryButton, EmptyState } from "@/components/autoleads/UiPrimitives";
import { useToast } from "@/components/ui/use-toast";

const STATUS_META = {
  draft: { label: "Draft", cls: "bg-black/5 text-black/50" },
  internal_review: { label: "Internal Review", cls: "bg-amber-50 text-amber-700" },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
  delivered: { label: "Delivered", cls: "bg-blue-50 text-blue-700" },
  responded: { label: "Responded", cls: "bg-purple-50 text-purple-700" },
  won: { label: "Won", cls: "bg-emerald-100 text-emerald-800" },
  lost: { label: "Lost", cls: "bg-red-50 text-red-600" },
};

export default function ProposalDetail() {
  const { proposalId, bidId } = useParams();
  const id = proposalId || bidId;
  const [proposal, setProposal] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [clientEmail, setClientEmail] = useState("");
  const [sendError, setSendError] = useState("");
  const { toast } = useToast();

  const load = async () => {
    if (!id) { setLoading(false); return; }
    try {
      const p = await base44.entities.Proposal.get(id);
      setProposal(p);
      setClientEmail(p?.client_email || "");
      if (p?.project_id) {
        try {
          const proj = await base44.entities.Project.get(p.project_id);
          setProject(proj);
          if (!p.client_email && proj.contract_info) setClientEmail(proj.contract_info);
        } catch {}
      }
    } catch { setProposal(null); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const updateStatus = async (status) => {
    const prevProposal = proposal;
    setBusy(status);
    setProposal(p => p ? { ...p, status } : p);
    try {
      await base44.entities.Proposal.update(id, { status });
    } catch {
      setProposal(prevProposal);
    } finally { setBusy(null); }
  };

  const sendBid = async () => {
    setSendError("");
    if (!clientEmail.trim()) {
      setSendError("Enter the recipient email address.");
      return;
    }
    setBusy("send");
    try {
      await base44.entities.Proposal.update(id, { client_email: clientEmail.trim() });

      const subject = `Bid Proposal: ${proposal.title}`;
      const body = `Hello ${proposal.client_name || project?.client_name || ""},\n\nPlease find our bid proposal for ${proposal.title} below.\n\nTotal Bid: $${Number(proposal.total_value || 0).toLocaleString()}\n\nWe'd be happy to discuss any questions. Reply to this email or call us anytime.\n\nBest regards,\n${project?.authority || ""}`;

      const res = await base44.functions.invoke("sendEmail", {
        to: clientEmail.trim(),
        subject,
        body,
        project_id: proposal.project_id,
      });

      if (res?.error) throw new Error(res.error);

      // Use submitProposal to mark delivered + advance project + set up follow-ups
      await base44.functions.invoke("submitProposal", { proposal_id: id });
      toast({ title: "Bid submitted", description: `Delivered to ${clientEmail.trim()}. Follow-ups configured.` });
      await load();
    } catch (e) {
      setSendError(e.message || "Failed to send. Make sure Gmail is connected in Settings → Integrations.");
    } finally { setBusy(null); }
  };

  const markDelivered = async () => {
    setBusy("delivered");
    try {
      await base44.functions.invoke("submitProposal", { proposal_id: id });
      toast({ title: "Bid submitted", description: "Project advanced to submitted. Follow-ups configured." });
      await load();
    } catch (e) {
      toast({ title: "Failed", description: e?.message || "try again", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const recordOutcome = async (outcome) => {
    setBusy(outcome);
    try {
      const res = await base44.functions.invoke("recordBidOutcome", { proposal_id: id, outcome });
      if (res?.error) throw new Error(res.error);
      toast({
        title: outcome === "won" ? "Bid won! 🎉" : "Bid lost",
        description: outcome === "won"
          ? `Contract & invoice generated. ${res.esign_document ? "E-sign ready." : ""}`
          : "Outcome recorded for bid intelligence.",
      });
      await load();
    } catch (e) {
      toast({ title: "Failed", description: e?.message || "try again", variant: "destructive" });
    } finally { setBusy(null); }
  };

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-[#f2df0d]" /></div>;
  if (!proposal) return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <BackButton to="/proposals" className="mb-4" />
      <Card><EmptyState icon={AlertCircle} title="Proposal not found" description="This proposal may have been deleted." action={<Link to="/proposals"><PrimaryButton>Back to Proposals</PrimaryButton></Link>} /></Card>
    </div>
  );

  const sMeta = STATUS_META[proposal.status] || STATUS_META.draft;
  const items = proposal.items || [];

  return (
    <div className="min-h-[calc(100vh-66px)] bg-white px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
      <BackButton to="/proposals" className="mb-3" />
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          {proposal.logo_url && (
            <img src={proposal.logo_url} alt="Company logo" className="mb-3 max-h-16 w-auto object-contain" />
          )}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase ${sMeta.cls}`}>{sMeta.label}</span>
            <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-[11px] font-bold text-black/50">v{proposal.version || 1}{proposal.immutable ? " · locked" : ""}</span>
          </div>
          <h1 className="text-2xl font-black tracking-[-.02em] sm:text-3xl">{proposal.title}</h1>
          {proposal.client_name && <p className="mt-1 text-sm text-black/55">{proposal.client_name}</p>}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {proposal.status === "internal_review" && (
            <SecondaryButton onClick={() => updateStatus("approved")} disabled={!!busy}>
              {busy === "approved" ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}Approve
            </SecondaryButton>
          )}
          {proposal.status === "approved" && (
            <>
              <SecondaryButton onClick={markDelivered} disabled={!!busy}>
                {busy === "delivered" ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}Mark Submitted
              </SecondaryButton>
              <PrimaryButton onClick={sendBid} disabled={!!busy}>
                {busy === "send" ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}Send via Gmail
              </PrimaryButton>
            </>
          )}
          {(proposal.status === "delivered" || proposal.status === "responded") && (
            <>
              <button onClick={() => recordOutcome("won")} disabled={!!busy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_12px_rgba(16,185,129,.22)] transition hover:bg-emerald-600 disabled:opacity-40">
                {busy === "won" ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} />}Mark Won
              </button>
              <button onClick={() => recordOutcome("lost")} disabled={!!busy}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-300 bg-red-50 px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-40">
                {busy === "lost" ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}Mark Lost
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Line Items</h2>
            {items.length === 0 ? (
              <p className="text-sm text-black/40">No line items on this proposal.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-left text-[11px] font-black uppercase text-black/40">
                      <th className="pb-2 pr-3">Description</th>
                      <th className="pb-2 pr-3 text-right">Qty</th>
                      <th className="pb-2 pr-3">Unit</th>
                      <th className="pb-2 pr-3 text-right">Unit Price</th>
                      <th className="pb-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i} className="border-b border-black/5">
                        <td className="py-2.5 pr-3">
                          <p className="font-bold">{it.description}</p>
                          {it.source && <span className="text-[10px] text-black/40">{it.source.replace(/_/g, " ")}</span>}
                        </td>
                        <td className="py-2.5 pr-3 text-right">{it.quantity}</td>
                        <td className="py-2.5 pr-3">{it.unit}</td>
                        <td className="py-2.5 pr-3 text-right">${Number(it.unit_price || 0).toLocaleString()}</td>
                        <td className="py-2.5 text-right font-black">${Number((it.quantity || 0) * (it.unit_price || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Summary</h2>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-black/60"><DollarSign size={15} />Total Value</span>
              <span className="text-xl font-black">${Number(proposal.total_value || 0).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-black/60"><User size={15} />Client</span>
              <span className="text-sm font-bold">{proposal.client_name || "—"}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-black/60"><FileText size={15} />Status</span>
              <span className="text-sm font-bold">{sMeta.label}</span>
            </div>
            {proposal.immutable && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs text-black/50">
                <Lock size={13} /> This proposal is locked (immutable).
              </div>
            )}
          </Card>

          {project && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Linked Project</h2>
              <Link to={`/projects/${project.id}`} className="block rounded-lg border border-black/10 bg-black/[.02] px-3 py-2.5 hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                <p className="font-bold text-black">{project.title}</p>
                <p className="mt-0.5 text-xs text-black/50">{project.authority || project.jurisdiction || "—"}</p>
              </Link>
            </Card>
          )}

          {proposal.sent_date && (
            <Card className="p-5">
              <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Submission</h2>
              <div className="flex items-center gap-2 text-sm text-black/60">
                <Calendar size={15} />
                Submitted {new Date(proposal.sent_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </Card>
          )}

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Pipeline Actions</h2>
            <div className="space-y-2">
              {proposal.status === "internal_review" && (
                <button onClick={() => updateStatus("approved")} disabled={!!busy || proposal.immutable} className="flex w-full items-center gap-2 rounded-lg border border-black/10 px-3 py-2.5 text-sm font-bold hover:bg-[#fdfbe1] disabled:opacity-40">
                  <FileCheck size={15} className="text-emerald-600" />Approve Proposal
                </button>
              )}
              {proposal.status === "approved" && (
                <button onClick={markDelivered} disabled={!!busy || proposal.immutable} className="flex w-full items-center gap-2 rounded-lg border border-black/10 px-3 py-2.5 text-sm font-bold hover:bg-[#fdfbe1] disabled:opacity-40">
                  <Send size={15} className="text-blue-600" />Mark as Submitted
                </button>
              )}
              {(proposal.status === "delivered" || proposal.status === "responded") && (
                <>
                  <button onClick={() => recordOutcome("won")} disabled={!!busy} className="flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40">
                    {busy === "won" ? <Loader2 size={15} className="animate-spin" /> : <Trophy size={15} />}Mark as Won
                  </button>
                  <button onClick={() => recordOutcome("lost")} disabled={!!busy} className="flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-40">
                    {busy === "lost" ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}Mark as Lost
                  </button>
                </>
              )}
              {proposal.status === "won" && (
                <div className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm font-bold text-emerald-700">
                  <Trophy size={15} className="mr-1 inline" />Bid won — contract & invoice generated
                </div>
              )}
              {proposal.status === "lost" && (
                <div className="rounded-lg bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600">
                  <XCircle size={15} className="mr-1 inline" />Bid lost — recorded for intelligence
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Send Bid via Gmail</h2>
            <p className="mb-3 text-xs text-black/50">Sends a cover email with your bid directly to the client. Requires Gmail connected in Settings → Integrations.</p>
            <label className="mb-1.5 block text-xs font-black">Recipient Email</label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@example.com"
              className="mb-3 h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm outline-none transition focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20"
            />
            {sendError && <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{sendError}</p>}
            <PrimaryButton onClick={sendBid} disabled={!!busy || proposal.immutable} className="w-full">
              {busy === "send" ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
              {busy === "send" ? "Sending…" : "Send Bid via Gmail"}
            </PrimaryButton>
          </Card>
        </div>
      </div>
    </div>
  );
}