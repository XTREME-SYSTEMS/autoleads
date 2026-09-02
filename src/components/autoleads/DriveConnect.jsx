import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Check, Loader2, RefreshCw, AlertCircle, HardDrive, Link2, Unlink, FolderOpen } from "lucide-react";

const DRIVE_CONNECTOR_ID = "69db1e5e75a5f8c15c80cf34";

export default function DriveConnect() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState(/** @type {any[]} */ ([]));

  const fetchData = async () => {
    try {
      const res = await base44.functions.invoke('driveBrowse', { check: true });
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
      const url = await base44.connectors.connectAppUser(DRIVE_CONNECTOR_ID);
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
      await base44.connectors.disconnectAppUser(DRIVE_CONNECTOR_ID);
      setConnected(false);
      setFiles([]);
    } catch (e) { setError("Failed to disconnect: " + (e?.message || "")); }
  };

  const handleSync = async () => {
    setSyncing(true);
    setError("");
    try {
      const res = await base44.functions.invoke('driveBrowse', {});
      setFiles(res.files || []);
    } catch (e) { setError("Sync failed: " + (e?.message || "try again")); }
    finally { setSyncing(false); }
  };

  if (loading) {
    return <div className="flex items-center justify-center gap-2 py-6 text-sm text-black/50"><Loader2 size={16} className="animate-spin" /> Checking connection…</div>;
  }

  if (!user) {
    return <div className="rounded-xl border border-black/10 bg-white p-5 text-center text-sm text-black/50">Sign in to connect your Google Drive.</div>;
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><HardDrive size={20} /></span>
        <div>
          <h3 className="font-black">Google Drive</h3>
          <p className="text-xs text-black/50">Connect your Drive to scan bid documents and project files.</p>
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
          <p className="mb-3 text-xs text-black/50">Connect your Google Drive so AUTOLEADS can scan bid packages, project documents, and shared files automatically.</p>
          <button onClick={handleConnect} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-sm font-black text-black hover:bg-[#f4e431]">
            <Link2 size={16} /> Connect My Drive
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
            <Check size={14} /> Connected
          </div>
          <div className="flex gap-2">
            <button onClick={handleSync} disabled={syncing} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">
              {syncing ? <><Loader2 size={16} className="animate-spin" /> Scanning…</> : <><RefreshCw size={16} /> Scan Files</>}
            </button>
            <button onClick={handleDisconnect} className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100">
              <Unlink size={16} />
            </button>
          </div>
          {files.length > 0 && (
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-black text-black/50"><FolderOpen size={14} /> Recent Files</p>
              {files.slice(0, 5).map((f, i) => (
                <div key={i} className="rounded-lg border border-black/10 p-3">
                  <p className="truncate text-sm font-bold">{f.name}</p>
                  <p className="truncate text-xs text-black/50">{f.type || "file"}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}