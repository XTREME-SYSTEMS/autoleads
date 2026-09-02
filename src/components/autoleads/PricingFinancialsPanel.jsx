import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check, ArrowRight, Calculator, DollarSign, Loader2, RefreshCw, History, MapPin, Globe, Building2, Sliders } from "lucide-react";

const FIELDS = [
  { key: "labor_weekly_cost", label: "Weekly labor cost", unit: "$", placeholder: "5000" },
  { key: "labor_hourly_rate", label: "Hourly labor rate", unit: "$/hr", placeholder: "45" },
  { key: "material_cost_low", label: "Material cost low", unit: "$", placeholder: "2000" },
  { key: "material_cost_high", label: "Material cost high", unit: "$", placeholder: "8000" },
  { key: "overhead_weekly", label: "Weekly overhead", unit: "$", placeholder: "1500" },
  { key: "mandatory_margin_pct", label: "Mandatory margin", unit: "%", placeholder: "20" },
];

const inputClass = "h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20";

export default function PricingFinancialsPanel({ financials, setFinancials, companyInfo, userTrades, onContinue, thinking }) {
  const [mode, setMode] = useState("mid"); // low | mid | high
  const [region, setRegion] = useState("state"); // state | national | region
  const [scraping, setScraping] = useState(false);
  const [scraped, setScraped] = useState(false);
  const [scale, setScale] = useState(100); // 50-150 percent
  const [history, setHistory] = useState(null);
  const [scrapingHistory, setScrapingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [bizSize, setBizSize] = useState({ employees: companyInfo?.employees || "", trucks: companyInfo?.trucks || "", equipment_setups: companyInfo?.equipment_setups || "" });
  const [savingBiz, setSavingBiz] = useState(false);

  useEffect(() => {
    if (companyInfo) setBizSize({ employees: companyInfo.employees || "", trucks: companyInfo.trucks || "", equipment_setups: companyInfo.equipment_setups || "" });
  }, [companyInfo]);

  const saveBusinessSize = async () => {
    const payload = {
      employees: bizSize.employees ? Number(bizSize.employees) : null,
      trucks: bizSize.trucks ? Number(bizSize.trucks) : null,
      equipment_setups: bizSize.equipment_setups ? Number(bizSize.equipment_setups) : null,
    };
    try {
      if (companyInfo?.id) {
        await base44.entities.CompanyProfile.update(companyInfo.id, payload);
      } else {
        await base44.entities.CompanyProfile.create({ name: "My Company", ...payload });
      }
    } catch {}
  };

  const trades = userTrades.length > 0 ? userTrades.join(", ") : (companyInfo.trade || "general construction");
  const state = companyInfo.state || "their state";
  const city = companyInfo.city || "their city";

  const setFin = (k, v) => setFinancials(p => ({ ...p, [k]: v }));

  const scrapeFinancials = async (regionType = region) => {
    if (scraping) return;
    setScraping(true);
    setScraped(false);
    const regionLabel = regionType === "national" ? "national (US)" : regionType === "region" ? `regional (${state} and surrounding states)` : `state (${state})`;
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for typical financial data for a ${trades} contractor in ${regionLabel}. The company has ${bizSize.employees || "an unknown number of"} employees, ${bizSize.trucks || "an unknown number of"} trucks, and ${bizSize.equipment_setups || "an unknown number of"} equipment setups. Find low, mid, and high ranges for:
1. Weekly labor cost
2. Hourly labor rate
3. Material cost range (low and high)
4. Weekly overhead / cost of doing business
5. Typical mandatory profit margin percentage
Use ${regionLabel} averages from construction cost guides, RSMeans, industry reports, and contractor surveys. Return a JSON object with low, mid, high sub-objects, each containing: labor_weekly_cost, labor_hourly_rate, material_cost_low, material_cost_high, overhead_weekly, mandatory_margin_pct (all numbers).`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            low: { type: "object", properties: { labor_weekly_cost: { type: "number" }, labor_hourly_rate: { type: "number" }, material_cost_low: { type: "number" }, material_cost_high: { type: "number" }, overhead_weekly: { type: "number" }, mandatory_margin_pct: { type: "number" } } },
            mid: { type: "object", properties: { labor_weekly_cost: { type: "number" }, labor_hourly_rate: { type: "number" }, material_cost_low: { type: "number" }, material_cost_high: { type: "number" }, overhead_weekly: { type: "number" }, mandatory_margin_pct: { type: "number" } } },
            high: { type: "object", properties: { labor_weekly_cost: { type: "number" }, labor_hourly_rate: { type: "number" }, material_cost_low: { type: "number" }, material_cost_high: { type: "number" }, overhead_weekly: { type: "number" }, mandatory_margin_pct: { type: "number" } } },
          }
        }
      });
      if (res && res[mode]) {
        applyMode(mode, res, 100);
        setScraped(true);
        // stash raw ranges for mode switching
        setRawRanges(res);
      }
    } catch {}
    finally { setScraping(false); }
  };

  const [rawRanges, setRawRanges] = useState(null);

  const applyMode = (m, ranges = rawRanges, scalePct = scale) => {
    if (!ranges || !ranges[m]) return;
    const factor = scalePct / 100;
    const vals = ranges[m];
    setFinancials({
      labor_weekly_cost: vals.labor_weekly_cost ? Math.round(vals.labor_weekly_cost * factor) : "",
      labor_hourly_rate: vals.labor_hourly_rate ? Math.round(vals.labor_hourly_rate * factor) : "",
      material_cost_low: vals.material_cost_low ? Math.round(vals.material_cost_low * factor) : "",
      material_cost_high: vals.material_cost_high ? Math.round(vals.material_cost_high * factor) : "",
      overhead_weekly: vals.overhead_weekly ? Math.round(vals.overhead_weekly * factor) : "",
      mandatory_margin_pct: vals.mandatory_margin_pct ? Math.round(vals.mandatory_margin_pct * factor * 10) / 10 : "",
    });
  };

  const switchMode = (m) => {
    setMode(m);
    if (rawRanges) applyMode(m, rawRanges, scale);
  };

  const onScale = (val) => {
    setScale(val);
    if (rawRanges) applyMode(mode, rawRanges, val);
  };

  const switchRegion = (r) => {
    setRegion(r);
    if (scraped) scrapeFinancials(r);
  };

  const scrapeHistory = async () => {
    if (scrapingHistory) return;
    setScrapingHistory(true);
    setShowHistory(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for historic bid pricing and awarded contract data for ${trades} in ${state} and nationally. Find:
1. Recent awarded contract prices for these trade scopes
2. Historic bid pricing trends over the last 1-3 years
3. Public bid results from government portals, DOT, school districts, municipal projects
4. Winning bid numbers vs losing bid numbers if available
Return a JSON object with: summary (string - overview of historic pricing), records (array of {project, location, value, date, source}), trends (string - how prices have changed).`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            records: { type: "array", items: { type: "object", properties: { project: { type: "string" }, location: { type: "string" }, value: { type: "string" }, date: { type: "string" }, source: { type: "string" } } } },
            trends: { type: "string" }
          }
        }
      });
      setHistory(res || { summary: "No historic data found.", records: [], trends: "" });
    } catch {
      setHistory({ summary: "Could not retrieve historic data. Try again later.", records: [], trends: "" });
    }
    finally { setScrapingHistory(false); }
  };

  const handleContinue = async () => {
    setSavingBiz(true);
    await saveBusinessSize();
    setSavingBiz(false);
    onContinue();
  };

  return (
    <div className="space-y-4">
      {/* Business Size — helps the system learn about the user */}
      <div className="rounded-lg border border-black/10 bg-white p-4">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black/50"><Building2 size={14} /> Business Size <span className="font-bold text-black/30">— helps us tailor pricing to your capacity</span></p>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-black">Employees</label>
            <input type="number" min="0" className={inputClass} value={bizSize.employees} onChange={e => setBizSize(p => ({ ...p, employees: e.target.value }))} placeholder="5" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black">Trucks</label>
            <input type="number" min="0" className={inputClass} value={bizSize.trucks} onChange={e => setBizSize(p => ({ ...p, trucks: e.target.value }))} placeholder="3" />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-black">Equipment setups</label>
            <input type="number" min="0" className={inputClass} value={bizSize.equipment_setups} onChange={e => setBizSize(p => ({ ...p, equipment_setups: e.target.value }))} placeholder="2" />
          </div>
        </div>
      </div>

      {/* AI Estimating button */}
      {!scraped && !scraping && (
        <div className="grid gap-3 sm:grid-cols-3">
          <button onClick={() => scrapeFinancials("state")} className="flex flex-col items-center gap-2 rounded-xl border-2 border-[#f2df0d] bg-[#fdfbe1] p-6 text-center transition hover:bg-[#fcf9cf]">
            <Sparkles size={28} className="text-[#b0a209]" /><span className="text-sm font-black">AI Estimating</span><span className="text-xs text-black/50">Scrape & audit pricing</span>
          </button>
          <button onClick={() => { setFinancials({ labor_weekly_cost: "", labor_hourly_rate: "", material_cost_low: "", material_cost_high: "", overhead_weekly: "", mandatory_margin_pct: "" }); setScraped(true); }} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
            <Calculator size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Hybrid</span><span className="text-xs text-black/50">AI estimates, you edit</span>
          </button>
          <button onClick={() => setScraped(true)} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
            <DollarSign size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Manual</span><span className="text-xs text-black/50">Fill in yourself</span>
          </button>
        </div>
      )}

      {scraping && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-[#f2df0d] bg-[#fdfbe1] p-8 text-center">
          <div className="relative grid h-20 w-20 place-items-center">
            <Loader2 size={72} className="animate-spin text-[#f2df0d]" strokeWidth={2.5} />
            <Sparkles size={28} className="absolute text-[#b0a209]" />
          </div>
          <div>
            <p className="text-base font-black text-[#b0a209]">Auditing pricing for {trades}…</p>
            <p className="mt-1 text-xs font-bold text-black/50">Searching {region === "national" ? "national" : region === "region" ? "regional" : state} averages — this takes a few seconds</p>
          </div>
          <div className="flex gap-1.5">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}

      {scraped && !scraping && (
        <>
          {/* Range mode buttons */}
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">Pricing Range Mode <span className="font-bold text-black/30">(defaults to Mid)</span></p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "low", label: "Low Range", color: "border-blue-300 bg-blue-50 text-blue-700" },
                { value: "mid", label: "Mid Range", color: "border-[#f2df0d] bg-[#fdfbe1] text-[#b0a209]" },
                { value: "high", label: "High Range", color: "border-emerald-300 bg-emerald-50 text-emerald-700" },
              ].map(t => (
                <button key={t.value} onClick={() => switchMode(t.value)} className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2.5 text-sm font-black transition ${mode === t.value ? t.color : "border-black/10 bg-white text-black/50 hover:border-black/20"}`}>
                  {mode === t.value && <Check size={14} />}{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region average buttons */}
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">Average Source</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "state", label: "State Avg", icon: MapPin },
                { value: "region", label: "Region Avg", icon: Building2 },
                { value: "national", label: "National Avg", icon: Globe },
              ].map(t => (
                <button key={t.value} onClick={() => switchRegion(t.value)} className={`flex items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-xs font-bold transition ${region === t.value ? "border-[#f2df0d] bg-[#fdfbe1] text-[#b0a209]" : "border-black/10 bg-white text-black/50 hover:border-black/20"}`}>
                  <t.icon size={14} />{t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scale slider */}
          <div className="rounded-lg border border-black/10 bg-black/[.02] p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black/50"><Sliders size={14} /> Scale All Numbers</span>
              <span className="rounded-full bg-[#f2df0d] px-2.5 py-0.5 text-xs font-black text-black">{scale}%</span>
            </div>
            <input type="range" min="50" max="150" step="5" value={scale} onChange={e => onScale(Number(e.target.value))} className="w-full accent-[#f2df0d]" />
            <div className="mt-1 flex justify-between text-[10px] font-bold text-black/30"><span>50% (Low)</span><span>100% (Mid)</span><span>150% (High)</span></div>
            <button onClick={() => onScale(100)} className="mt-2 text-[11px] font-bold text-[#b0a209] hover:underline">Reset to 100%</button>
          </div>

          {/* Editable fields */}
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700 flex items-center gap-2">
            <Check size={14} /> AI-filled {mode} range from {region} averages. Edit any field to adjust.
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">Labor Costs</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-black">Weekly labor cost ($)</label><input type="number" className={inputClass} value={financials.labor_weekly_cost} onChange={e => setFin("labor_weekly_cost", e.target.value)} placeholder="5000" /></div>
              <div><label className="mb-1 block text-xs font-black">Hourly labor rate ($/hr)</label><input type="number" className={inputClass} value={financials.labor_hourly_rate} onChange={e => setFin("labor_hourly_rate", e.target.value)} placeholder="45" /></div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">Material Range</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-black">Material cost low ($)</label><input type="number" className={inputClass} value={financials.material_cost_low} onChange={e => setFin("material_cost_low", e.target.value)} placeholder="2000" /></div>
              <div><label className="mb-1 block text-xs font-black">Material cost high ($)</label><input type="number" className={inputClass} value={financials.material_cost_high} onChange={e => setFin("material_cost_high", e.target.value)} placeholder="8000" /></div>
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">Cost of Doing Business</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="mb-1 block text-xs font-black">Weekly overhead ($)</label><input type="number" className={inputClass} value={financials.overhead_weekly} onChange={e => setFin("overhead_weekly", e.target.value)} placeholder="1500" /></div>
              <div><label className="mb-1 block text-xs font-black">Mandatory margin (%) <span className="text-red-500">*</span></label><input type="number" className={inputClass} value={financials.mandatory_margin_pct} onChange={e => setFin("mandatory_margin_pct", e.target.value)} placeholder="20" /></div>
            </div>
          </div>

          {/* Cost Breakdown — what % of total job cost is material / labor / consumables */}
          <div className="rounded-lg border border-black/10 bg-white p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black/50"><Calculator size={14} /> Cost Breakdown <span className="font-bold text-black/30">— what % of a typical job is material, labor & consumables?</span></p>
            <p className="mb-3 text-[11px] text-black/40">Many contractors know these roundabout. Enter your best guess — the system combines this with geo pricing and winning bids to calculate accurate estimates.</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-black">Material %</label>
                <input type="number" min="0" max="100" className={inputClass} value={financials.material_pct ?? ""} onChange={e => setFin("material_pct", e.target.value)} placeholder="40" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black">Labor %</label>
                <input type="number" min="0" max="100" className={inputClass} value={financials.labor_pct ?? ""} onChange={e => setFin("labor_pct", e.target.value)} placeholder="35" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black">Consumables %</label>
                <input type="number" min="0" max="100" className={inputClass} value={financials.consumables_pct ?? ""} onChange={e => setFin("consumables_pct", e.target.value)} placeholder="10" />
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] font-bold text-black/40">
              <span>Total: {(Number(financials.material_pct) || 0) + (Number(financials.labor_pct) || 0) + (Number(financials.consumables_pct) || 0)}%</span>
              {(Number(financials.material_pct) || 0) + (Number(financials.labor_pct) || 0) + (Number(financials.consumables_pct) || 0) === 100 && <span className="text-emerald-600">✓ Balanced</span>}
            </div>
          </div>

          {/* Preferred Operating Margin Range */}
          <div className="rounded-lg border border-black/10 bg-white p-4">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black/50"><DollarSign size={14} /> Preferred Operating Margin <span className="font-bold text-black/30">— the margin range you like to operate at</span></p>
            <p className="mb-3 text-[11px] text-black/40">This is the profit range you target on bids. The system uses this alongside mandatory margin to keep your pricing within your comfort zone.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-black">Preferred low (%)</label>
                <input type="number" min="0" max="100" className={inputClass} value={financials.preferred_margin_low ?? ""} onChange={e => setFin("preferred_margin_low", e.target.value)} placeholder="15" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-black">Preferred high (%)</label>
                <input type="number" min="0" max="100" className={inputClass} value={financials.preferred_margin_high ?? ""} onChange={e => setFin("preferred_margin_high", e.target.value)} placeholder="25" />
              </div>
            </div>
          </div>

          {/* History button + panel */}
          <div className="rounded-lg border border-black/10 bg-white p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-black"><History size={16} className="text-[#b0a209]" /> Historic Bid Pricing</span>
              <button onClick={scrapeHistory} disabled={scrapingHistory} className="flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40">
                {scrapingHistory ? <Loader2 size={18} className="animate-spin" /> : <History size={14} />} {scrapingHistory ? "Searching…" : "Scrape History"}
              </button>
            </div>
            {showHistory && scrapingHistory && (
              <div className="mt-3 flex items-center justify-center gap-3 rounded-lg border-2 border-[#f2df0d] bg-[#fdfbe1] p-5">
                <Loader2 size={32} className="animate-spin text-[#f2df0d]" strokeWidth={2.5} />
                <p className="text-sm font-black text-[#b0a209]">Searching historic bid records…</p>
              </div>
            )}
            {showHistory && history && !scrapingHistory && (
              <div className="mt-3 space-y-3">
                <div className="rounded-md border border-black/10 bg-black/[.02] p-3">
                  <p className="mb-1 text-[10px] font-black uppercase text-black/40">Summary</p>
                  <p className="text-xs leading-5 text-black/70">{history.summary}</p>
                </div>
                {history.records && history.records.length > 0 && (
                  <div className="overflow-x-auto rounded-md border border-black/10">
                    <table className="w-full text-xs">
                      <thead className="bg-black/[.02] font-black uppercase text-black/50"><tr><th className="p-2 text-left">Project</th><th className="p-2 text-left">Location</th><th className="p-2 text-right">Value</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Source</th></tr></thead>
                      <tbody>
                        {history.records.slice(0, 8).map((r, i) => (
                          <tr key={i} className="border-t border-black/5"><td className="p-2">{r.project}</td><td className="p-2">{r.location}</td><td className="p-2 text-right font-bold">{r.value}</td><td className="p-2">{r.date}</td><td className="p-2 text-black/50">{r.source}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {history.trends && (
                  <div className="rounded-md border border-black/10 bg-black/[.02] p-3">
                    <p className="mb-1 text-[10px] font-black uppercase text-black/40">Trends</p>
                    <p className="text-xs leading-5 text-black/70">{history.trends}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button onClick={() => scrapeFinancials(region)} disabled={scraping} className="flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40"><RefreshCw size={16} /> Re-scrape</button>
            <button onClick={handleContinue} disabled={!financials.mandatory_margin_pct || thinking || savingBiz} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{savingBiz ? <><Loader2 size={16} className="animate-spin" />Saving…</> : <>Continue <ArrowRight size={16} /></>}</button>
          </div>
        </>
      )}
    </div>
  );
}