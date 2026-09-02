import React, { useMemo, useState } from "react";
import { Activity, DatabaseZap, Globe2, Loader2, RefreshCw, ShieldCheck, Siren, TimerReset, TriangleAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, Surface, SecondaryAction, PrimaryAction } from "@/components/CommercialMobileUI";
import { useEntityList } from "@/hooks/useEntityList";

const EXPECTED = { US: 56, CA: 13, MX: 32 };
const COUNTRY_LABEL = { US: "United States", CA: "Canada", MX: "Mexico" };

function countryFor(source) {
  const text = ` ${String(source?.jurisdiction || "")} ${String(source?.name || "")} `.toLowerCase();
  if (/\b(canada|alberta|british columbia|manitoba|new brunswick|newfoundland|nova scotia|northwest territories|nunavut|ontario|prince edward island|quebec|saskatchewan|yukon)\b/.test(text)) return "CA";
  if (/\b(mexico|méxico|aguascalientes|baja california|campeche|chiapas|chihuahua|ciudad de mexico|ciudad de méxico|coahuila|colima|durango|guanajuato|guerrero|hidalgo|jalisco|michoacan|michoacán|morelos|nayarit|nuevo leon|nuevo león|oaxaca|puebla|queretaro|querétaro|quintana roo|san luis potosi|san luis potosí|sinaloa|sonora|tabasco|tamaulipas|tlaxcala|veracruz|yucatan|yucatán|zacatecas)\b/.test(text)) return "MX";
  return "US";
}

export default function SourceHealthCenter() {
  const [refreshKey, setRefreshKey] = useState(0);
  const { records: sources, loading, error } = useEntityList("ScrapeSource", { sort: "-updated_date", limit: 500, refreshKey });
  const [coverage, setCoverage] = useState(null);
  const [coverageError, setCoverageError] = useState("");
  const [running, setRunning] = useState(false);

  const stats = useMemo(() => {
    const list = sources || [];
    const active = list.filter(s => s.status === "active").length;
    const unverified = list.filter(s => s.status === "unverified").length;
    const failed = list.filter(s => s.status === "error").length;
    const stale = list.filter(s => { if (!s.last_success_date) return true; return Date.now() - new Date(s.last_success_date).getTime() > 7 * 86400000; }).length;
    const byCountry = { US: 0, CA: 0, MX: 0 };
    list.forEach(s => { byCountry[countryFor(s)]++; });
    return { total: list.length, active, unverified, failed, stale, byCountry };
  }, [sources]);

  async function runCoverage() {
    setRunning(true); setCoverageError("");
    try {
      const result = await base44.functions.invoke("discoverNorthAmericaSources", { mode: "dry_run" });
      setCoverage(result || null);
    } catch (e) { setCoverageError(e?.message || "Coverage sweep failed"); }
    finally { setRunning(false); }
  }

  const countries = coverage?.countries || Object.keys(EXPECTED).map(country => ({ country, expected: EXPECTED[country], covered: 0, gaps: [], coverage_pct: 0 }));

  const statCards = [
    [DatabaseZap, "Registered", stats.total],
    [ShieldCheck, "Active", stats.active],
    [Globe2, "Unverified", stats.unverified],
    [TimerReset, "Stale", stats.stale],
    [Siren, "Failed", stats.failed],
  ];

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Source Coverage</IndustrialTitle>

    <div className="mb-3 grid grid-cols-2 gap-2">
      <SecondaryAction onClick={() => setRefreshKey(v => v + 1)}><RefreshCw size={16}/>Refresh</SecondaryAction>
      <PrimaryAction onClick={runCoverage} disabled={running}>{running ? <><Loader2 size={16} className="animate-spin"/>Sweeping…</> : <><Activity size={16}/>Run Sweep</>}</PrimaryAction>
    </div>

    <Surface className="mb-3 p-4">
      <div className="grid grid-cols-5 gap-1">
        {statCards.map(([Icon, t, v]) => (
          <div key={t} className="flex flex-col items-center text-center">
            <span className="grid h-8 w-8 place-items-center rounded-full border border-black/10"><Icon size={15}/></span>
            <p className="mt-1.5 text-[18px] font-black leading-none">{loading ? "…" : v}</p>
            <p className="mt-1 text-[8px] font-bold uppercase leading-tight tracking-wide text-black/55">{t}</p>
          </div>
        ))}
      </div>
    </Surface>

    {(error || coverageError) && <Surface className="mb-3 border-red-200 bg-red-50 p-4"><div className="flex gap-3 text-red-700"><TriangleAlert className="shrink-0" size={20}/><div><p className="font-bold">Coverage validation issue</p><p className="mt-1 text-sm">{coverageError || error?.message || "Could not load source registry."}</p></div></div></Surface>}

    <Surface className="mb-3 divide-y divide-black/[.07]">
      <div className="px-4 py-3"><p className="font-brand text-[14px] font-bold uppercase tracking-[.035em]">Jurisdiction Coverage</p></div>
      {countries.map(c => {
        const gapCount = Array.isArray(c.gaps) ? c.gaps.length : Math.max(0, (c.expected || 0) - (c.covered || 0));
        return (
          <div key={c.country} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold">{COUNTRY_LABEL[c.country] || c.country}</p>
                <p className="mt-0.5 text-xs text-black/45">{c.covered || 0} of {c.expected || EXPECTED[c.country] || 0} jurisdictions</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-black ${gapCount === 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{Number(c.coverage_pct || 0).toFixed(1)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#FFC400]" style={{ width: `${Math.min(100, Number(c.coverage_pct || 0))}%` }}/></div>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="rounded bg-black/5 px-2 py-0.5 text-[11px] font-bold">Gaps: {gapCount}</span>
              <span className="rounded bg-black/5 px-2 py-0.5 text-[11px] font-bold">Records: {stats.byCountry[c.country] || 0}</span>
            </div>
            {Array.isArray(c.gaps) && c.gaps.length > 0 && <p className="mt-2 text-xs leading-5 text-black/45">Missing: {c.gaps.slice(0, 12).map(g => g.name || g.code).join(", ")}{c.gaps.length > 12 ? ` +${c.gaps.length - 12} more` : ""}</p>}
          </div>
        );
      })}
    </Surface>

    {coverage?.seed_results?.length > 0 && (
      <Surface className="divide-y divide-black/[.07]">
        <div className="px-4 py-3"><p className="font-brand text-[14px] font-bold uppercase tracking-[.035em]">Discovery Seed Receipts</p></div>
        {coverage.seed_results.map(s => (
          <div key={s.key} className="px-4 py-3">
            <p className="font-bold">{s.name}</p>
            <p className="text-xs text-black/40">{s.url}</p>
            <div className="mt-1 flex gap-4 text-sm">
              <span className="text-black/45">Candidates: <span className="font-bold text-black">{s.found || 0}</span></span>
              <span className="text-black/45">Worker: <span className="font-bold text-black">{s.browser_worker_receipt || "direct"}</span></span>
            </div>
          </div>
        ))}
      </Surface>
    )}
  </CommercialPage>;
}