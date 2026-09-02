import React, { useState, useEffect } from "react";
import { AlertCircle, ArrowRight, Check, Inbox, Loader2, MailPlus, RefreshCw } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, IconSquare, StatusPill, SecondaryAction, PrimaryAction } from "@/components/CommercialMobileUI";
import { useEntityList } from "@/hooks/useEntityList";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

const GMAIL_CONNECTOR_ID = "69db200274332486fd28dd7e";

const STATUS_TONE = {
  needs_match: "warning",
  needs_review: "info",
  assigned: "success",
  duplicate: "neutral",
  declined: "danger",
};

function fmtDateTime(d) { try { return new Date(d).toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }); } catch { return "—"; } }

export default function BidInbox() {
  const nav = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [connected, setConnected] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [ingesting, setIngesting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const { records, loading } = useEntityList("BidInvitation", { sort: "-received_date", limit: 100, refreshKey });
  const invitations = records || [];
  const unmatched = invitations.filter(i => i.status === "needs_match").length;
  const needsReview = invitations.filter(i => i.status === "needs_review").length;

  const checkConnection = async () => {
    try {
      await base44.functions.invoke('gmailSync', { check: true });
      setConnected(true);
    } catch { setConnected(false); }
  };
  useEffect(() => { checkConnection(); }, []);

  const connect = async () => {
    setConnecting(true); setError("");
    try {
      const url = await base44.connectors.connectAppUser(GMAIL_CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => { if (!popup || popup.closed) { clearInterval(timer); checkConnection(); } }, 500);
    } catch (e) { setError("Connect failed: " + (e?.message || "try again")); }
    finally { setConnecting(false); }
  };

  const ingest = async () => {
    setIngesting(true); setError(""); setResult(null);
    try {
      const res = await base44.functions.invoke('gmailIngestBids', {});
      setResult(res);
      setRefreshKey(k => k + 1);
    } catch (e) { setError("Ingest failed: " + (e?.message || "try again — make sure Gmail is connected")); }
    finally { setIngesting(false); }
  };

  const stats = [
    ["Unmatched", unmatched],
    ["Deadlines", invitations.filter(i => i.deadline).length],
    ["Needs Review", needsReview],
    ["Total", invitations.length],
  ];

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Bid Inbox</IndustrialTitle>

    {error && <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"><AlertCircle size={15}/>{error}</div>}
    {result && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"><Check size={14} className="mr-1 inline"/>Inbox checked — {result.created || 0} new, {result.duplicates || 0} duplicates, {result.scanned || 0} scanned.</div>}

    <Surface className="mb-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconSquare icon={connected === true ? Check : MailPlus} tone={connected === true ? "success" : "yellow"}/>
          <div>
            <p className="font-bold">{connected === true ? "Gmail Connected" : connected === false ? "No mailbox connected" : "Checking…"}</p>
            <p className="text-xs text-black/50">{connected === true ? "Bid invitations ingested automatically." : "Connect Gmail to pull in bid invitations."}</p>
          </div>
        </div>
        {connected === true && <StatusPill tone="success">Live</StatusPill>}
      </div>
    </Surface>

    <Surface className="mb-3 p-4">
      <div className="grid grid-cols-4 gap-2">
        {stats.map(([t, v]) => (
          <div key={t} className="flex flex-col items-center text-center">
            <p className="text-[20px] font-black leading-none">{v}</p>
            <p className="mt-1 text-[8px] font-bold uppercase leading-tight tracking-wide text-black/55">{t}</p>
          </div>
        ))}
      </div>
    </Surface>

    <div className="mb-3 grid grid-cols-2 gap-2">
      <SecondaryAction onClick={ingest} disabled={ingesting || connected === false}>{ingesting ? <><Loader2 size={16} className="animate-spin"/>Checking…</> : <><RefreshCw size={16}/>Check Inbox</>}</SecondaryAction>
      <PrimaryAction onClick={connect} disabled={connecting || connected === true}>{connecting ? <><Loader2 size={16} className="animate-spin"/>Connecting…</> : connected === true ? <><Check size={16}/>Connected</> : <><MailPlus size={16}/>Connect</>}</PrimaryAction>
    </div>

    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-brand text-[15px] font-bold uppercase tracking-[.035em]">Invitations</h2>
      {loading && <Loader2 size={16} className="animate-spin text-black/30"/>}
    </div>

    {loading ? <Surface className="p-8 text-center text-sm text-black/45">Loading invitations…</Surface> :
      invitations.length === 0 ? (
        <Surface className="p-8 text-center"><p className="font-brand text-xl font-bold uppercase">No bid invitations yet</p><p className="mt-2 text-sm text-black/50">{connected === true ? "Click Check Inbox to pull in recent invitations." : "Connect your mailbox to get started."}</p></Surface>
      ) : (
        <Surface className="divide-y divide-black/[.07]">
          {invitations.map((inv) => {
            const isOpen = expanded === inv.id;
            return (
              <div key={inv.id}>
                <button onClick={() => setExpanded(isOpen ? null : inv.id)} className="flex min-h-[68px] w-full items-center gap-3 px-4 text-left">
                  <IconSquare icon={Inbox}/>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{inv.subject}</p>
                    <p className="mt-0.5 truncate text-xs text-black/50">{inv.sender}</p>
                  </div>
                  <StatusPill tone={STATUS_TONE[inv.status] || "neutral"}>{(inv.status || "").replace("_", " ")}</StatusPill>
                </button>
                {isOpen && (
                  <div className="border-t border-black/[.06] px-4 py-4">
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between"><span className="text-black/50">Received</span><span className="font-bold">{inv.received_date ? fmtDateTime(inv.received_date) : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/50">Deadline</span><span className="font-bold text-[#D99D00]">{inv.deadline ? fmtDateTime(inv.deadline) : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/50">Confidence</span><span className="font-bold">{inv.confidence != null ? `${Math.round(inv.confidence * 100)}%` : "—"}</span></div>
                      <div className="flex justify-between"><span className="text-black/50">Assigned To</span><span className="font-bold">{inv.assigned_to || "—"}</span></div>
                    </div>
                    {inv.matched_project_id && (
                      <div className="mt-3 flex justify-end">
                        <button onClick={() => nav(`/projects/${inv.matched_project_id}`)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#FFC400] px-4 font-brand text-sm font-bold uppercase text-black">Open Project <ArrowRight size={15}/></button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </Surface>
      )}
  </CommercialPage>;
}