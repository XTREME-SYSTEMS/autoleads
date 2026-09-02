import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2, RefreshCw, AlertCircle, Link2, Unlink, Building2, TrendingUp } from "lucide-react";

const HUBSPOT_CONNECTOR_ID = "69db228b2439d854c8587167";

export default function HubspotConnect() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [error, setError] = useState("");

  const fetchData = async () => {
    try {
      const res = await base44.functions.invoke('hubspotSync', { check: true });
      setConnected(true);
      setError("");
    } catch {
      setConnected(false);
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
      const url = await base44.connectors.connectAppUser(HUBSPOT_CONNECTOR_ID);
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
      await base44.connectors.disconnectAppUser(HUBSPOT_CONNECTOR_ID);
      setConnected(false);
      setSyncResult(null);
    } catch (e) { setError("Failed to disconnect: " + (e?.message || "")); }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    setSyncResult(null);
    try {
      const res = await base44.functions.invoke('hubspotSync', {});
      setSyncResult(res);
    } catch (e) { setError("Sync failed: " + (e?.message || "try again")); }
    finally { setSyncing(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-6 text-sm text-black/50"><Loader2 size={16} className="animate-spin" /> Checking connection…</div>;
  }

  if (!user) {
    return <div className="rounded-xl border border-black/10 bg-white p-5 text-center text-sm text-black/50">Sign in to connect your HubSpot.</div>;
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-orange-50 text-orange-600"><Building2 size={20} /></span>
        <div>
          <h3 className="font-black">HubSpot CRM Sync</h3>
          <p className="text-xs text-black/50">Connect your HubSpot to push leads and won deals to your CRM.</p>
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
          <p className="mb-3 text-xs text-black/50">Connect your HubSpot account so AUTOLEADS can push discovered leads and won projects directly into your CRM as contacts and deals.</p>
          <button onClick={handleConnect} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FF7A59] px-4 py-2.5 text-sm font-black text-white hover:bg-[#ff6a45]">
            <Link2 size={16} /> Connect My HubSpot
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Check size={14} /> Connected to HubSpot
          </div>
          <div className="flex gap-2">
            <button onClick={handleSync} disabled={syncing} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">
              {syncing ? <><Loader2 size={16} className="animate-spin" /> Syncing…</> : <><RefreshCw size={16} /> Sync Leads to HubSpot</>}
            </button>
            <button onClick={handleDisconnect} className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100">
              <Unlink size={16} />
            </button>
          </div>
          {syncResult?.success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs">
              <p className="flex items-center gap-1.5 font-bold text-emerald-700"><TrendingUp size={14} /> Sync Complete!</p>
              <p className="mt-1 text-emerald-600">{syncResult.contacts_created} contacts pushed · {syncResult.deals_created} deals created</p>
              {syncResult.errors?.length > 0 && (
                <p className="mt-1 text-amber-600">{syncResult.errors.length} items skipped (duplicates)</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}