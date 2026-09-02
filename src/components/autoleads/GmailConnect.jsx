import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Inbox, Loader2, RefreshCw, AlertCircle, Mail, Link2, Unlink } from "lucide-react";

const GMAIL_CONNECTOR_ID = "69db200274332486fd28dd7e";

export default function GmailConnect() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const res = await base44.functions.invoke('gmailSync', { check: true });
      setConnected(true);
      setEmail(res.email || "");
      setError("");
    } catch {
      setConnected(false);
      setEmail("");
    }
  };

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await fetchData();
      }
      setLoading(false);
    });
  }, []);

  const handleConnect = async () => {
    setError("");
    try {
      const url = await base44.connectors.connectAppUser(GMAIL_CONNECTOR_ID);
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          fetchData();
        }
      }, 500);
    } catch (e) { setError("Failed to start connection: " + (e?.message || "")); }
  };

  const handleDisconnect = async () => {
    try {
      await base44.connectors.disconnectAppUser(GMAIL_CONNECTOR_ID);
      setConnected(false);
      setEmail("");
      setMessages([]);
    } catch (e) { setError("Failed to disconnect: " + (e?.message || "")); }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    try {
      const res = await base44.functions.invoke('gmailSync', {});
      setMessages(res.messages || []);
    } catch (e) { setError("Sync failed: " + (e?.message || "try again")); }
    finally { setSyncing(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-6 text-sm text-black/50"><Loader2 size={16} className="animate-spin" /> Checking connection…</div>;
  }

  if (!user) {
    return <div className="rounded-xl border border-black/10 bg-white p-5 text-center text-sm text-black/50">Sign in to connect your Gmail.</div>;
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Mail size={20} /></span>
        <div>
          <h3 className="font-black">Gmail Sync</h3>
          <p className="text-xs text-black/50">Connect your own Gmail to send bids and sync your inbox.</p>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!connected ? (
        <div className="mt-4">
          <p className="mb-3 text-xs text-black/50">Connect your Gmail account so AUTOLEADS can send bids and track replies on your behalf.</p>
          <button onClick={handleConnect} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-sm font-black text-black hover:bg-[#f4e431]">
            <Link2 size={16} /> Connect My Gmail
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Check size={14} /> Connected{email ? ` — ${email}` : ""}
          </div>
          <div className="flex gap-2">
            <button onClick={handleSync} disabled={syncing} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">
              {syncing ? <><Loader2 size={16} className="animate-spin" /> Syncing…</> : <><RefreshCw size={16} /> Sync Inbox</>}
            </button>
            <button onClick={handleDisconnect} className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100">
              <Unlink size={16} />
            </button>
          </div>
          {messages.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-black text-black/50"><Inbox size={14} /> Recent Messages</p>
              {messages.map((m) => (
                <div key={m.id} className="rounded-lg border border-black/10 p-3">
                  <p className="truncate text-sm font-bold">{m.subject}</p>
                  <p className="truncate text-xs text-black/50">{m.from}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-black/40">{m.snippet}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}