import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Send, Loader2, MapPin, Clock, FileText, Mail, Radar, Zap, CheckCircle2, Clock3, XCircle, Eye, PenTool, Sparkles } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";
import { base44 } from "@/api/base44Client";
import RecordCard from "@/components/autoleads/RecordCard";

function money(n) { return n != null && !isNaN(n) ? `$${Number(n).toLocaleString()}` : "—"; }
function fmtDate(d) { try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); } catch { return ""; } }

const SIG_STATUS_CONFIG = {
  not_sent: { label: "Not Sent", icon: Send, cls: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
  awaiting_signature: { label: "Awaiting Signature", icon: PenTool, cls: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  viewed: { label: "Viewed by Client", icon: Eye, cls: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  signed: { label: "Signed / Finalized", icon: CheckCircle2, cls: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  declined: { label: "Declined", icon: XCircle, cls: "bg-red-50 text-red-600", dot: "bg-red-500" },
  expired: { label: "Expired", icon: Clock3, cls: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
};

export default function SentBids() {
  const nav = useNavigate();
  const [expanded, setExpanded] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [runningFollowups, setRunningFollowups] = useState(false);
  const [followupResult, setFollowupResult] = useState(null);

  const { records: projects, loading } = useEntityList("Project", { sort: "-created_date", limit: 200, refreshKey });
  const { records: proposals } = useEntityList("Proposal", { limit: 200, refreshKey });
  const { records: messages } = useEntityList("Message", { limit: 200, refreshKey });

  const projectMap = useMemo(() => {
    const m = {};
    (projects || []).forEach(p => { m[p.id] = p; });
    return m;
  }, [projects]);

  const sentBids = useMemo(() =>
    (proposals || []).filter(p => p.status === "delivered" || p.status === "responded" || p.status === "won"),
    [proposals]
  );

  const followUpMap = useMemo(() => {
    const m = {};
    (messages || []).filter(msg => msg.direction === "outbound" && msg.ai_generated).forEach(msg => {
      if (msg.project_id) (m[msg.project_id] = m[msg.project_id] || []).push(msg);
    });
    return m;
  }, [messages]);

  // Status summary counts
  const statusCounts = useMemo(() => {
    const c = { awaiting_signature: 0, signed: 0, viewed: 0, declined: 0, not_sent: 0 };
    sentBids.forEach(p => {
      const s = p.signature_status || "not_sent";
      if (c[s] !== undefined) c[s]++;
    });
    return c;
  }, [sentBids]);

  const runFollowUps = async () => {
    setRunningFollowups(true);
    setFollowupResult(null);
    try {
      const res = await base44.functions.invoke('autoFollowUp', {});
      setFollowupResult(res);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setFollowupResult({ error: e?.message || "Failed to run follow-ups" });
    } finally {
      setRunningFollowups(false);
    }
  };

  return (
    <Page backTo="/dashboard" eyebrow="Sent Bids" title="Sent Bids"
      description="Every bid you've sent to a client — with clear signature status indicators and an automated follow-up system that chases the ones that go quiet."
      actions={<>
        <SecondaryButton onClick={() => setRefreshKey(k => k + 1)}><Send size={15}/>Refresh</SecondaryButton>
        <PrimaryButton onClick={runFollowUps} disabled={runningFollowups}>
          {runningFollowups ? <><Loader2 size={15} className="animate-spin" />Running…</> : <><Zap size={15} />Run Follow-Up System</>}
        </PrimaryButton>
      </>}>

      {/* Status summary bar */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-700"><PenTool size={12} />Awaiting Signature</div>
          <p className="mt-1 text-2xl font-black text-amber-700">{statusCounts.awaiting_signature}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-700"><CheckCircle2 size={12} />Finalized</div>
          <p className="mt-1 text-2xl font-black text-emerald-700">{statusCounts.signed}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-blue-700"><Eye size={12} />Viewed</div>
          <p className="mt-1 text-2xl font-black text-blue-700">{statusCounts.viewed}</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-red-600"><XCircle size={12} />Declined</div>
          <p className="mt-1 text-2xl font-black text-red-600">{statusCounts.declined}</p>
        </div>
      </div>

      {/* Follow-up result */}
      {followupResult && (
        <div className={`mb-4 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm font-bold ${followupResult.error ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
          {followupResult.error ? <XCircle size={16} className="mt-0.5" /> : <Sparkles size={16} className="mt-0.5" />}
          <div>
            {followupResult.error ? followupResult.error : `${followupResult.drafted || 0} follow-up emails drafted by AI. Check your Messages page to review and send them.`}
          </div>
        </div>
      )}

      {loading ? <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#f2df0d]" /></div> :
        sentBids.length === 0 ? (
          <Card><EmptyState icon={Send} title="No sent bids yet" description="Bids you send to clients will appear here with signature status indicators. The follow-up system will automatically draft chase emails for any that go quiet." action={<PrimaryButton onClick={() => nav('/proposals')}>Go to Bid Packages</PrimaryButton>} minHeight="300px" /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sentBids.map(proposal => {
              const project = projectMap[proposal.project_id] || null;
              const isOpen = expanded === proposal.id;
              const followUps = (followUpMap[proposal.project_id] || []).sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
              const lastFollowUp = followUps[0];
              const sigStatus = proposal.signature_status || "not_sent";
              const sigConfig = SIG_STATUS_CONFIG[sigStatus] || SIG_STATUS_CONFIG.not_sent;
              const SigIcon = sigConfig.icon;
              const isFinalized = sigStatus === "signed" || proposal.status === "won";
              return (
                <RecordCard key={proposal.id} className={isOpen ? "sm:col-span-2 xl:col-span-3" : ""}
                  icon={Send} title={proposal.title} meta={proposal.client_name || project?.authority} value={money(proposal.total_value)}
                  status={sigConfig.label} statusCls={sigConfig.cls}
                  onClick={() => setExpanded(isOpen ? null : proposal.id)} actionLabel={isOpen ? "Hide details" : "View sent bid"}
                  footer={<div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-black/40">
                    {project?.jurisdiction && <span className="inline-flex items-center gap-1"><MapPin size={11}/>{project.jurisdiction}</span>}
                    <span className="inline-flex items-center gap-1"><Clock size={11}/>Sent {fmtDate(proposal.sent_date || proposal.created_date)}</span>
                    {lastFollowUp && <span className="inline-flex items-center gap-1 font-bold text-[#a09308]"><Mail size={11}/>Followed up {fmtDate(lastFollowUp.created_date)}</span>}
                  </div>}>
                  {isOpen && (
                    <div className="border-t border-black/5 p-5">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-black">{proposal.title}</h2>
                          {/* Clear signature status badge */}
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${sigConfig.cls}`}>
                            <span className={`h-2 w-2 rounded-full ${sigConfig.dot} ${sigStatus === "awaiting_signature" ? "animate-pulse" : ""}`} />
                            <SigIcon size={13} />{sigConfig.label}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <SecondaryButton onClick={() => nav(`/proposals/${proposal.id}`)}><FileText size={15}/>Open Proposal</SecondaryButton>
                          {project && <SecondaryButton onClick={() => nav(`/projects/${project.id}`)}><Radar size={15}/>Open Project</SecondaryButton>}
                          {!isFinalized && <PrimaryButton onClick={() => nav('/outreach')}><Mail size={15}/>Follow Up</PrimaryButton>}
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <Card className="p-3"><p className="text-[10px] font-black uppercase text-black/40">Client</p><p className="mt-1 text-sm font-bold">{proposal.client_name || project?.client_name || "—"}</p></Card>
                        <Card className="p-3"><p className="text-[10px] font-black uppercase text-black/40">Bid Value</p><p className="mt-1 text-sm font-bold">{money(proposal.total_value)}</p></Card>
                        <Card className="p-3"><p className="text-[10px] font-black uppercase text-black/40">Signature Status</p><p className="mt-1 text-sm font-bold">{sigConfig.label}</p></Card>
                      </div>
                      {followUps.length > 0 && (
                        <div className="mt-4">
                          <p className="mb-2 text-[10px] font-black uppercase text-black/40">Follow-up History ({followUps.length})</p>
                          <div className="space-y-2">
                            {followUps.slice(0, 5).map(m => (
                              <div key={m.id} className="rounded-lg border border-black/10 p-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-bold">{m.subject}</p>
                                  <span className="text-[10px] font-black uppercase text-black/40">{m.status}</span>
                                </div>
                                <p className="mt-1 text-xs text-black/50">{fmtDate(m.created_date)}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </RecordCard>
              );
            })}
          </div>
        )}
    </Page>
  );
}