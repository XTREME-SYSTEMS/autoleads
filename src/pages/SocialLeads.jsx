import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Zap, Check, ArrowRight, Globe, AlertTriangle } from "lucide-react";
import AppHeader from "@/components/autoleads/AppHeader";
import BackButton from "@/components/autoleads/BackButton";
import { useOrgId } from "@/hooks/useOrgContext";

export default function SocialLeads() {
  const orgId = useOrgId();
  const nav = useNavigate();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const scan = async () => {
    setRunning(true); setError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("scrapeSocialLeads", { organization_id: orgId });
      setResult(res?.data || res);
    } catch (e) { setError(e?.message || "Scan failed"); }
    finally { setRunning(false); }
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f5f5]">
      <AppHeader />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
          <BackButton to="/leads" className="mb-4" />
          <p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Social &amp; Residential</p>
          <h1 className="text-3xl font-black tracking-[-.03em]">Social Lead Finder</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">
            Uses your cloud browser to scan Craigslist, Reddit, Facebook groups, forums, Nextdoor, and local sites for homeowners and businesses looking to hire for epoxy coating, decorative concrete, polished concrete, and concrete overlay work in your service areas.
          </p>

          <div className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[11px] bg-[#FFC400] text-black"><Globe size={24} /></span>
              <div>
                <p className="font-black">Exhaustive social &amp; residential scan</p>
                <p className="mt-1 text-xs leading-5 text-black/55">Targets your onboarding trades + service areas. Finds posts like "need my garage floor epoxied" and turns them into qualification-stage leads.</p>
              </div>
            </div>
            <button onClick={scan} disabled={running} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-3 text-sm font-black text-black disabled:opacity-50">
              {running ? <><Loader2 size={18} className="animate-spin" />Scanning social &amp; residential sites…</> : <><Zap size={18} /> Scan Now</>}
            </button>
            <p className="mt-2 text-center text-[11px] text-black/40">Uses your cloud browser engine if configured; otherwise falls back to AI web search.</p>
          </div>

          {error && <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"><AlertTriangle size={16} /> {error}</div>}

          {result && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-center gap-2"><Check size={18} className="text-emerald-600" /><p className="font-black text-emerald-800">Scan complete</p></div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-white p-3"><p className="text-2xl font-black text-emerald-600">{result.created ?? 0}</p><p className="text-[10px] font-bold uppercase text-black/50">New leads</p></div>
                <div className="rounded-lg bg-white p-3"><p className="text-2xl font-black text-black/60">{result.duplicates ?? 0}</p><p className="text-[10px] font-bold uppercase text-black/50">Duplicates</p></div>
                <div className="rounded-lg bg-white p-3"><p className="text-2xl font-black text-black/60">{result.total ?? 0}</p><p className="text-[10px] font-bold uppercase text-black/50">Found</p></div>
              </div>
              {result.usedBrowser === false && <p className="mt-3 text-[11px] font-semibold text-amber-700">⚠ Cloud browser not configured — used AI web search only. Set BROWSER_ENGINE_URL + BROWSER_ENGINE_API_KEY in Settings → Secrets to enable full social scraping.</p>}
              {result.keywords && <p className="mt-3 text-[11px] text-black/50"><strong>Searched:</strong> {result.keywords.join(', ')} · <strong>Locations:</strong> {(result.locations||[]).join(', ') || 'US'}</p>}
              {(result.created ?? 0) > 0 && (
                <button onClick={() => nav('/leads')} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-black text-white">
                  See your new leads <ArrowRight size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}