import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, FileText, Loader2, Send, User, DollarSign,
  AlertCircle, Lock, FileCheck, Mail, Trophy, XCircle, Calendar, Eye, Package
} from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";
import { Card, PrimaryButton, SecondaryButton, EmptyState } from "@/components/autoleads/UiPrimitives";
import { useToast } from "@/components/ui/use-toast";
import BidPackagePreview from "@/components/proposals/BidPackagePreview";
import EmailTemplatePreview from "@/components/proposals/EmailTemplatePreview";

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
  const [activeTab, setActiveTab] = useState("items");
  const [takeoffs, setTakeoffs] = useState([]);
  const [company, setCompany] = useState(null);
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
          const [tk, comps] = await Promise.all([
            base44.entities.Takeoff.filter({ project_id: p.project_id }).catch(() => []),
            base44.entities.CompanyProfile.filter({ organization_id: proj.organization_id }).catch(() => []),
          ]);
          setTakeoffs(tk || []);
          setCompany(comps?.[0] || null);
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

      // Fetch company profile and brand assets for the branded email
      const [companies, brandAssets, projectImages] = await Promise.all([
        base44.entities.CompanyProfile.filter({ organization_id: project?.organization_id || "" }).catch(() => []),
        base44.entities.BrandAsset.filter({ organization_id: project?.organization_id || "" }).catch(() => []),
        base44.entities.ProjectImage.filter({ project_id: project?.id || "" }).catch(() => []),
      ]);
      const comp = companies?.[0] || {};
      const logo = (brandAssets || []).find(b => b.type === "logo" && b.file_url) || null;
      const appUrl = window.location.origin;

      // Build branded HTML email
      const logoHtml = logo?.file_url
        ? `<img src="${logo.file_url}" alt="${comp.name || "Company"}" style="max-height:80px;max-width:200px;margin-bottom:20px;"/>`
        : `<h1 style="font-size:28px;font-weight:900;color:#080808;margin:0 0 20px;">${comp.name || "AUTOLEADS"}</h1>`;
      const showcaseHtml = (projectImages || []).slice(0, 4).map(img =>
        `<img src="${img.file_url || img.url}" style="width:100%;max-width:280px;border-radius:8px;margin:4px;display:inline-block;"/>`
      ).join("");

      const htmlBody = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:30px 20px;background:#fff;border-radius:12px 12px 0 0;">${logoHtml}</div>
  <div style="background:#fff;padding:0 30px 30px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;color:#080808;">Dear ${proposal.client_name || project?.client_name || "Valued Client"},</p>
    <p style="font-size:15px;line-height:1.6;color:#333;">Thank you for the opportunity to submit a proposal for <strong>${project?.title || proposal.title}</strong>. ${comp.name || "Our team"} is a licensed and insured ${comp.trade || "construction"} contractor serving ${comp.city || ""}${comp.city && comp.state ? ", " : ""}${comp.state || ""}. We take pride in delivering quality workmanship on every project.</p>
    <div style="background:#FFF7DA;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="font-size:14px;font-weight:bold;color:#080808;margin:0 0 10px;text-transform:uppercase;">Project Summary</p>
      <table style="width:100%;font-size:14px;color:#333;">
        <tr><td style="padding:4px 0;color:#666;">Project:</td><td style="padding:4px 0;font-weight:bold;">${project?.title || proposal.title}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Location:</td><td style="padding:4px 0;font-weight:bold;">${project?.jurisdiction || project?.address || "N/A"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Bid Value:</td><td style="padding:4px 0;font-weight:bold;color:#E9A900;">$${Number(proposal.total_value || 0).toLocaleString()}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Bid Due:</td><td style="padding:4px 0;font-weight:bold;">${project?.bid_due_date ? new Date(project.bid_due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Trade:</td><td style="padding:4px 0;font-weight:bold;">${project?.trade || comp.trade || "N/A"}</td></tr>
      </table>
    </div>
    ${showcaseHtml ? `<p style="font-size:14px;font-weight:bold;color:#080808;margin:20px 0 8px;">Our Recent Work:</p><div style="text-align:center;margin-bottom:20px;">${showcaseHtml}</div>` : ""}
    <div style="text-align:center;margin:30px 0;"><a href="${appUrl}/proposals/${proposal.id}" style="display:inline-block;padding:16px 40px;background:#FFC400;color:#080808;text-decoration:none;font-weight:bold;font-size:16px;border-radius:8px;">View Full Bid Package →</a></div>
    <p style="font-size:15px;line-height:1.6;color:#333;">We are available to answer any questions and can schedule a site visit at your convenience. Please don't hesitate to reach out.</p>
  </div>
  <div style="background:#080808;padding:25px 30px;border-radius:12px;margin-top:20px;text-align:center;">
    <p style="font-size:18px;font-weight:bold;color:#FFC400;margin:0 0 10px;">${comp.name || "AUTOLEADS"}</p>
    <div style="font-size:14px;color:#fff;line-height:1.8;">${comp.phone ? `<a href="tel:${comp.phone}" style="color:#FFC400;text-decoration:none;">📞 ${comp.phone}</a> &nbsp;|&nbsp; ` : ""}${comp.email ? `<a href="mailto:${comp.email}" style="color:#FFC400;text-decoration:none;">✉️ ${comp.email}</a>` : ""}${comp.website ? `<br/><a href="${comp.website}" style="color:#FFC400;text-decoration:none;">🌐 ${comp.website}</a>` : ""}</div>
    <p style="font-size:11px;color:#666;margin:15px 0 0;">${comp.license_number ? `Licensed #${comp.license_number} &nbsp;|&nbsp; ` : ""}Bonded & Insured</p>
  </div>
</div>
</body></html>`;

      const subject = `Bid Proposal: ${proposal.title}`;
      const res = await base44.functions.invoke("sendEmail", {
        to: clientEmail.trim(),
        subject,
        body: htmlBody,
        project_id: proposal.project_id,
      });

      if (res?.error) throw new Error(res.error);

      await base44.functions.invoke("submitProposal", { proposal_id: id });
      toast({ title: "Bid submitted", description: `Branded bid package delivered to ${clientEmail.trim()}. Follow-ups configured.` });
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

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-xl border border-black/10 bg-black/[.02] p-1">
        <button onClick={() => setActiveTab("items")} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${activeTab === "items" ? "bg-[#f2df0d] text-black" : "text-black/50 hover:text-black"}`}>
          <FileText size={15} /> Line Items
        </button>
        <button onClick={() => setActiveTab("package")} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${activeTab === "package" ? "bg-[#f2df0d] text-black" : "text-black/50 hover:text-black"}`}>
          <Package size={15} /> Bid Package Preview
        </button>
        <button onClick={() => setActiveTab("email")} className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${activeTab === "email" ? "bg-[#f2df0d] text-black" : "text-black/50 hover:text-black"}`}>
          <Eye size={15} /> Email Preview
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {activeTab === "package" ? (
            <BidPackagePreview proposal={proposal} project={project} company={company} takeoffs={takeoffs} />
          ) : activeTab === "email" ? (
            <EmailTemplatePreview proposal={proposal} project={project} />
          ) : (
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
          )}
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