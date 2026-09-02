import React, { useState, useMemo, useEffect } from "react";
import { MapPin, FileText, Search, X, ChevronDown, Layers } from "lucide-react";
import { US_STATES, getCounties, TRADES } from "@/lib/geoData";

const STAGE_LABELS = {
  qualification: "New",
  takeoff: "Takeoff",
  estimating: "Estimating",
  proposal: "Proposal",
  submitted: "Submitted",
  won: "Won",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  lost: "Lost",
};

const STAGE_COLORS = {
  qualification: "bg-[#F0F0F0] text-[#666] dark:bg-white/10 dark:text-white/60",
  takeoff: "bg-[#E3F2FD] text-[#1565C0] dark:bg-blue-500/15 dark:text-blue-300",
  estimating: "bg-[#FFF3E0] text-[#E65100] dark:bg-orange-500/15 dark:text-orange-300",
  proposal: "bg-[#F3E5F5] text-[#6A1B9A] dark:bg-purple-500/15 dark:text-purple-300",
  submitted: "bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-500/15 dark:text-green-300",
  won: "bg-[#E8F5E9] text-[#28A745] dark:bg-green-500/20 dark:text-green-300",
  scheduled: "bg-[#E8F5E9] text-[#28A745] dark:bg-green-500/20 dark:text-green-300",
  in_progress: "bg-[#E3F2FD] text-[#1565C0] dark:bg-blue-500/15 dark:text-blue-300",
  completed: "bg-[#E0E0E0] text-[#666] dark:bg-white/10 dark:text-white/60",
  lost: "bg-[#FFEBEE] text-[#C62828] dark:bg-red-500/15 dark:text-red-300",
};

const norm = (s) => String(s || "").toLowerCase();
const hay = (p) => norm(`${p.jurisdiction || ""} ${p.address || ""} ${p.authority || ""} ${p.title || ""}`);

function matchesState(p, code) {
  if (!code) return true;
  const st = US_STATES.find((x) => x.code === code);
  const h = hay(p);
  return h.includes(norm(code)) || (st && h.includes(norm(st.name)));
}
function matchesCounty(p, county) {
  const c = norm(county.replace(/_/g, " "));
  return hay(p).includes(c);
}
function matchesTrade(p, trade) {
  return norm(p.trade || "").includes(norm(trade));
}

function Chip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8E1] px-2.5 py-1 text-[11px] font-bold text-black dark:bg-[#f2df0d]/15 dark:text-[#f2df0d]">
      {label}
      <button onClick={onRemove} className="grid h-4 w-4 place-items-center rounded-full hover:bg-black/10">
        <X size={11} />
      </button>
    </span>
  );
}

export default function CityLeadsBrowser({ projects, selectedId, onOpenProject, onFiltersChange }) {
  const [stateCode, setStateCode] = useState("");
  const [counties, setCounties] = useState([]);
  const [trades, setTrades] = useState([]);
  const [activeCounty, setActiveCounty] = useState(null);
  useEffect(() => {
    if (onFiltersChange) onFiltersChange({ stateCode, counties, trades });
  }, [stateCode, counties, trades, onFiltersChange]);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [tradeQuery, setTradeQuery] = useState("");
  const [countyQuery, _setCountyQuery] = useState("");

  const countyOptions = useMemo(() => getCounties(stateCode), [stateCode]);

  const _toggleCounty = (c) => {
    setCounties((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
    setActiveCounty(null);
  };
  const toggleTrade = (t) => {
    setTrades((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  };

  const filtered = useMemo(() => {
    return (projects || []).filter((p) => {
      if (stateCode && !matchesState(p, stateCode)) return false;
      if (counties.length > 0 && !counties.some((c) => matchesCounty(p, c))) return false;
      if (trades.length > 0 && !trades.some((t) => matchesTrade(p, t))) return false;
      return true;
    });
  }, [projects, stateCode, counties, trades]);

  // Group filtered leads per county
  const byCounty = useMemo(() => {
    const map = {};
    const buckets = counties.length > 0 ? counties : countyOptions;
    buckets.forEach((c) => { map[c] = []; });
    filtered.forEach((p) => {
      const matched = buckets.filter((c) => matchesCounty(p, c));
      if (matched.length === 0) {
        // no county filter: try to infer county from options; else skip
        return;
      }
      matched.forEach((c) => map[c] && map[c].push(p));
    });
    return Object.entries(map)
      .map(([county, list]) => ({ county, list }))
      .filter((x) => x.list.length > 0)
      .sort((a, b) => b.list.length - a.list.length);
  }, [filtered, counties, countyOptions]);

  const totalLeads = filtered.length;
  const tradeMatches = useMemo(() => {
    const q = norm(tradeQuery);
    return TRADES.filter((t) => !q || norm(t).includes(q));
  }, [tradeQuery]);

  const _countyMatches = useMemo(() => {
    const q = norm(countyQuery);
    return countyOptions.filter((c) => !q || norm(c.replace(/_/g, " ")).includes(q)).slice(0, 80);
  }, [countyOptions, countyQuery]);

  const inputCls = "h-11 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#FFC107] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white";

  return (
    <div>
      {/* FILTERS */}
      <div className="space-y-3 rounded-2xl border border-[#E0E0E0] bg-white p-3 dark:border-white/10 dark:bg-[#1a1a1a]">
        {/* State */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#666] dark:text-white/50">State</span>
          <div className="relative">
            <select
              value={stateCode}
              onChange={(e) => { setStateCode(e.target.value); setCounties([]); setActiveCounty(null); }}
              className={inputCls + " appearance-none pr-9"}
            >
              <option value="">All states</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.name}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#999]" />
          </div>
        </label>

        {/* County multi */}
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-[#666] dark:text-white/50">County</span>
          <div className="relative">
            <select
              value={counties[0] || ""}
              onChange={(e) => setCounties(e.target.value ? [e.target.value] : [])}
              disabled={!stateCode}
              className={inputCls + " appearance-none pr-9 disabled:opacity-50"}
            >
              <option value="">{stateCode ? "All counties" : "Select a state first"}</option>
              {countyOptions.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#999]" />
          </div>
        </label>

        {/* Trade multi */}
        <div>
          <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#666] dark:text-white/50">Trade (multi)</span>
          {trades.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {trades.map((t) => (
                <Chip key={t} label={t} onRemove={() => toggleTrade(t)} />
              ))}
            </div>
          )}
          <button
            onClick={() => setTradeOpen((v) => !v)}
            className="flex h-11 w-full items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
          >
            <span className={trades.length ? "text-black dark:text-white" : "text-[#999]"}>
              {trades.length ? `${trades.length} trade${trades.length > 1 ? "s" : ""} selected` : "Select trades"}
            </span>
            <ChevronDown size={16} className={`text-[#999] transition ${tradeOpen ? "rotate-180" : ""}`} />
          </button>
          {tradeOpen && (
            <div className="mt-2 rounded-lg border border-[#E0E0E0] bg-white p-2 dark:border-white/10 dark:bg-[#1a1a1a]">
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
                <input
                  value={tradeQuery}
                  onChange={(e) => setTradeQuery(e.target.value)}
                  placeholder="Search trades…"
                  className="h-9 w-full rounded-md border border-[#E0E0E0] bg-white pl-8 pr-2 text-xs outline-none focus:border-[#FFC107] dark:border-white/10 dark:bg-[#0B0B0B] dark:text-white"
                />
              </div>
              <div className="max-h-48 space-y-0.5 overflow-y-auto">
                {tradeMatches.map((t) => {
                  const on = trades.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTrade(t)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-bold transition ${
                        on ? "bg-[#FFF8E1] text-black dark:bg-[#f2df0d]/15 dark:text-[#f2df0d]" : "text-[#444] hover:bg-[#F5F5F5] dark:text-white/70 dark:hover:bg-white/5"
                      }`}
                    >
                      <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-[#FFC107] bg-[#FFC107]" : "border-[#E0E0E0] dark:border-white/20"}`}>
                        {on && <X size={10} className="rotate-45 text-black" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{t}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RESULTS */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[#666] dark:text-white/50">
          {totalLeads} lead{totalLeads !== 1 ? "s" : ""} · {byCounty.length} count{byCounty.length !== 1 ? "ies" : "y"}
        </p>
        {(stateCode || counties.length > 0 || trades.length > 0) && (
          <button
            onClick={() => { setStateCode(""); setCounties([]); setTrades([]); setActiveCounty(null); }}
            className="text-[11px] font-bold text-[#E65100]"
          >
            Clear filters
          </button>
        )}
      </div>

      {byCounty.length === 0 ? (
        <div className="mt-3 grid place-items-center rounded-xl border border-dashed border-[#E0E0E0] bg-white px-4 py-8 text-center dark:border-white/10 dark:bg-[#1a1a1a]">
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[#E0E0E0] text-[#999] dark:border-white/10">
            <MapPin size={26} />
          </span>
          <p className="mt-3 text-sm font-bold text-black dark:text-white">No leads found</p>
          <p className="mt-1 max-w-xs text-xs text-[#666] dark:text-white/50">
            {stateCode ? "Try different counties/trades or run a scrape." : "Pick a state to see leads grouped by county."}
          </p>
        </div>
      ) : (
        <>
          {/* SQUARE COUNTY CARDS */}
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {byCounty.map(({ county, list }) => {
              const isActive = activeCounty === county;
              return (
                <button
                  key={county}
                  onClick={() => setActiveCounty(isActive ? null : county)}
                  className={`flex aspect-square flex-col items-center justify-center rounded-2xl border p-2 text-center transition ${
                    isActive
                      ? "border-[#FFC107] bg-[#FFF8E1] dark:bg-[#f2df0d]/10"
                      : "border-[#E0E0E0] bg-white dark:border-white/10 dark:bg-[#1a1a1a]"
                  }`}
                >
                  <span className={`text-3xl font-black leading-none ${list.length > 0 ? "text-black dark:text-white" : "text-[#bbb] dark:text-white/30"}`}>
                    {list.length}
                  </span>
                  <span className="mt-1.5 line-clamp-2 text-[10px] font-bold uppercase leading-tight text-[#666] dark:text-white/50">
                    {county.replace(/_/g, " ")}
                  </span>
                  <span className="mt-0.5 text-[9px] font-bold text-[#999] dark:text-white/40">{list.length === 1 ? "lead" : "leads"}</span>
                </button>
              );
            })}
          </div>

          {/* DRILL-DOWN LEADS FOR ACTIVE COUNTY */}
          {activeCounty && (
            <div className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <Layers size={14} className="text-[#FFC107]" />
                <p className="text-xs font-bold uppercase tracking-wide text-[#666] dark:text-white/50">
                  {byCounty.find((x) => x.county === activeCounty)?.list.length || 0} leads in {activeCounty.replace(/_/g, " ")}
                </p>
              </div>
              <div className="space-y-2">
                {byCounty.find((x) => x.county === activeCounty)?.list.map((p) => {
                  const isSelected = selectedId === p.id;
                  const stageLabel = STAGE_LABELS[p.stage] || "New";
                  const stageColor = STAGE_COLORS[p.stage] || STAGE_COLORS.qualification;
                  return (
                    <button
                      key={p.id}
                      onClick={() => onOpenProject(p)}
                      className={`block w-full overflow-hidden rounded-xl border text-left transition ${
                        isSelected
                          ? "border-[#FFC107] bg-[#FFF8E1] ring-2 ring-[#FFC107] dark:bg-[#f2df0d]/10"
                          : "border-[#E0E0E0] bg-white dark:border-white/10 dark:bg-[#1a1a1a]"
                      }`}
                    >
                      <div className="flex items-center gap-2 px-3 pt-3">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${stageColor}`}>{stageLabel}</span>
                        {p.value ? <span className="text-[10px] font-bold text-[#28A745]">${Number(p.value).toLocaleString()}</span> : null}
                        {p.trade ? <span className="line-clamp-1 text-[10px] font-bold text-[#999] dark:text-white/40">{p.trade}</span> : null}
                        <FileText size={13} className="ml-auto text-[#999] dark:text-white/40" />
                      </div>
                      <p className="mt-1 px-3 line-clamp-2 text-sm font-bold text-black dark:text-white">{p.title}</p>
                      <p className="mt-0.5 px-3 pb-3 line-clamp-1 text-[11px] text-[#666] dark:text-white/50">
                        {p.authority || p.jurisdiction || ""}{p.bid_due_date ? ` · Due ${p.bid_due_date}` : ""}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}