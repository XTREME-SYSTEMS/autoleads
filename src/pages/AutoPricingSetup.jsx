import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check, ArrowRight, DollarSign, Loader2, TrendingUp, MapPin, BarChart3, Calculator, RefreshCw, Award, History, ListChecks, Plus, X, Briefcase } from "lucide-react";
import AppHeader from "@/components/autoleads/AppHeader";
import PricingFinancialsPanel from "@/components/autoleads/PricingFinancialsPanel";
import GeoPricingTable from "@/components/autoleads/GeoPricingTable";
import PricingComparisonChart from "@/components/autoleads/PricingComparisonChart";
import SidebarChatInput from "@/components/autoleads/SidebarChatInput";
import PageStepGuide from "@/components/autoleads/PageStepGuide";
import BackButton from "@/components/autoleads/BackButton";
import { useOrgId } from "@/hooks/useOrgContext";
import { US_STATES } from "@/lib/geoData";

// Pull the states out of the "Auto Leads Discovery" source jurisdiction string
// (format: "cities · counties · states" or just "states").
const parseStatesFromJurisdiction = (jurisdiction) => {
  if (!jurisdiction || jurisdiction === "National") return [];
  const segments = jurisdiction.split("·").map(s => s.trim()).filter(Boolean);
  const stateSeg = segments[segments.length - 1] || "";
  return stateSeg.split(",").map(s => s.trim()).filter(Boolean);
};
const stateName = (code) => US_STATES.find(s => s.code === code || s.name === code)?.name || code;

const PHASES = [
  { key: "selection", label: "My Scope", icon: ListChecks, question: "Before I scrape any pricing, let's confirm exactly what to scan. I've pulled your trades, service-area states, and scope systems straight from your onboarding — toggle off anything you don't want priced, or add your own. I will ONLY scan for the trades, states, and scopes you confirm here — never all trades." },
  { key: "financials", label: "Financials", icon: Calculator, question: "Let's set up your pricing intelligence. First, tell us about your business size, labor costs, material ranges, overhead, mandatory margins, what percentage of a typical job is material vs labor vs consumables, and the margin range you like to operate at." },
  { key: "geo_pricing", label: "Geo Pricing", icon: MapPin, question: "Now I'll search your city, county, state, and region for current pricing ranges on ONLY the trade scopes you confirmed — plus national averages for comparison. I'll scrape as many pricing websites as possible (RSMeans, HomeAdvisor, Angi, suppliers, hardware stores, cost guides, and zip-code-based pricing sites)." },
  { key: "tier", label: "Pricing Tier", icon: BarChart3, question: "Based on the scraped data, choose your pricing tier — low, mid, or high. This sets your default pricing strategy." },
  { key: "market_intel", label: "Market Intel", icon: TrendingUp, question: "Finally, I'll scrape government and commercial bid result sites (SAM.gov, state DOT, Dodge, ConstructConnect, ENR, municipal bid openings) for historical winning bid numbers per scope, past pricing trends, and the future outlook — then show you a chart comparing your geo pricing against winning bid averages." },
];

const _inputClass = "h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20";

export default function AutoPricingSetup() {
  const nav = useNavigate();
  const orgId = useOrgId();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [messages, setMessages] = useState([{ role: "ai", text: PHASES[0].question }]);
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);

  const [companyInfo, setCompanyInfo] = useState(/** @type {any} */ ({}));
  const [userTrades, setUserTrades] = useState(/** @type {any[]} */ ([]));
  const [scopeSystems, setScopeSystems] = useState(/** @type {any[]} */ ([]));
  const [selectedTrades, setSelectedTrades] = useState(/** @type {any[]} */ ([]));
  const [selectedStates, setSelectedStates] = useState(/** @type {any[]} */ ([]));
  const [selectedScopes, setSelectedScopes] = useState(/** @type {any[]} */ ([]));
  const [customTrade, setCustomTrade] = useState("");
  const [customState, setCustomState] = useState("");
  const [customScope, setCustomScope] = useState("");
  const [financials, setFinancials] = useState({ labor_weekly_cost: "", labor_hourly_rate: "", material_cost_low: "", material_cost_high: "", overhead_weekly: "", mandatory_margin_pct: "", material_pct: "", labor_pct: "", consumables_pct: "", preferred_margin_low: "", preferred_margin_high: "" });
  const [geoPricing, setGeoPricing] = useState(/** @type {any[]} */ ([]));
  const [scrapingGeo, setScrapingGeo] = useState(false);
  const [scrapingMarket, setScrapingMarket] = useState(false);
  const [marketIntel, setMarketIntel] = useState(/** @type {any} */ ({}));
  const [winningHistory, setWinningHistory] = useState(/** @type {any[]} */ ([]));
  const [winningPrices, setWinningPrices] = useState(/** @type {any[]} */ ([]));
  const [pricingTimeline, setPricingTimeline] = useState(/** @type {any[]} */ ([]));
  const [pricingTiersExplanation, setPricingTiersExplanation] = useState("");
  const [pricingTiers, setPricingTiers] = useState(/** @type {any[]} */ ([]));
  const [pricingTier, setPricingTier] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [, ] = useState(null);
  const [scrapingFinancials, setScrapingFinancials] = useState(false);

  const currentPhase = PHASES[phaseIndex];
  const progress = done ? 100 : Math.round((phaseIndex / PHASES.length) * 100);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    (async () => {
      try {
        const [companies, sources, pricingProfiles, scopeSystems] = await Promise.all([
          base44.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.ScrapeSource.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.PricingProfile.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.ScopeSystem.filter({ organization_id: orgId }).catch(() => []),
        ]);
        const tradeSet = new Set();
        (companies || []).forEach(c => { if (c.trade) c.trade.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tradeSet.add(t)); });
        (sources || []).forEach(s => { if (s.trades) s.trades.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tradeSet.add(t)); });
        if (tradeSet.size > 0) setUserTrades([...tradeSet].sort());
        if ((companies || []).length > 0) setCompanyInfo(companies[0]);
        // Onboarding scope systems — the user's configured trade scopes
        const prodScopes = (scopeSystems || []).filter(s => s.data_class !== "NON_PRODUCTION_EXAMPLE");
        setScopeSystems(prodScopes);
        // Pre-select trades from onboarding (ScrapeSource trades + CompanyProfile trade)
        setSelectedTrades([...tradeSet].sort());
        // Pre-select states from onboarding (Auto Leads Discovery source jurisdiction + CompanyProfile state)
        const discoverySource = (sources || []).find(s => s.name?.startsWith("Auto Leads Discovery"));
        const onboardStates = new Set([
          ...parseStatesFromJurisdiction(discoverySource?.jurisdiction),
          ...(companies?.[0]?.state ? [companies[0].state] : []),
        ].filter(Boolean));
        setSelectedStates([...onboardStates].sort());
        // Pre-select scopes from onboarding ScopeSystems (unique scope categories)
        const scopeCats = [...new Set(prodScopes.map(s => s.scope).filter(Boolean))].sort();
        setSelectedScopes(scopeCats);
        if ((pricingProfiles || []).length > 0) {
          const p = pricingProfiles[0];
          setExistingProfile(p);
          setFinancials({
            labor_weekly_cost: p.labor_weekly_cost || "",
            labor_hourly_rate: p.labor_hourly_rate || "",
            material_cost_low: p.material_cost_low || "",
            material_cost_high: p.material_cost_high || "",
            overhead_weekly: p.overhead_weekly || "",
            mandatory_margin_pct: p.mandatory_margin_pct || "",
            material_pct: p.material_pct || "",
            labor_pct: p.labor_pct || "",
            consumables_pct: p.consumables_pct || "",
            preferred_margin_low: p.preferred_margin_low || "",
            preferred_margin_high: p.preferred_margin_high || "",
          });
          if (p.winning_bid_history) setWinningHistory(p.winning_bid_history);
          if (p.pricing_timeline) setPricingTimeline(p.pricing_timeline);
          if (p.scope_pricing) {
            setGeoPricing(p.scope_pricing.map(s => ({
              scope: s.scope, unit: s.unit,
              city_low: s.city_low, city_mid: s.city_mid, city_high: s.city_high,
              county_low: s.county_low, county_mid: s.county_mid, county_high: s.county_high,
              state_low: s.state_low, state_mid: s.state_mid, state_high: s.state_high,
              region_low: s.region_low, region_mid: s.region_mid, region_high: s.region_high,
              national_low: s.national_low, national_mid: s.national_mid, national_high: s.national_high,
            })));
          }
          if (p.pricing_tier) setPricingTier(p.pricing_tier);
          if (p.winning_bid_intelligence || p.future_outlook) setMarketIntel({ winning: p.winning_bid_intelligence, outlook: p.future_outlook, intelligence: p.financial_intelligence });
          if (p.pricing_tiers_explanation) setPricingTiersExplanation(p.pricing_tiers_explanation);
          if (p.scope_pricing_tiers) setPricingTiers(p.scope_pricing_tiers);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (currentPhase.key === "geo_pricing" && geoPricing.length === 0 && !scrapingGeo && selectedTrades.length > 0) scrapeGeoPricing();
  }, [phaseIndex]);
  useEffect(() => {
    if (currentPhase.key === "market_intel" && !marketIntel.winning && !scrapingMarket && selectedTrades.length > 0) scrapeMarketIntel();
  }, [phaseIndex]);

  const aiSay = async (prompt) => {
    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      return typeof res === "string" ? res : res?.response || res?.text || "Done!";
    } catch { return "Done!"; }
  };

  const _scrapeFinancials = async () => {
    if (scrapingFinancials) return;
    setScrapingFinancials(true);
    const trades = userTrades.length > 0 ? userTrades.join(", ") : (companyInfo.trade || "general construction");
    const state = companyInfo.state || "their state";
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for typical financial data for a ${trades} contractor in ${state}. Find:
1. Typical weekly labor cost and hourly labor rate for this trade
2. Typical material cost range (low and high) for this trade
3. Typical weekly overhead / cost of doing business for this trade
4. Typical mandatory profit margin percentage for this trade
Use national and state averages if specific local data isn't available. Return a JSON object with: labor_weekly_cost (number), labor_hourly_rate (number), material_cost_low (number), material_cost_high (number), overhead_weekly (number), mandatory_margin_pct (number).`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            labor_weekly_cost: { type: "number" },
            labor_hourly_rate: { type: "number" },
            material_cost_low: { type: "number" },
            material_cost_high: { type: "number" },
            overhead_weekly: { type: "number" },
            mandatory_margin_pct: { type: "number" }
          }
        }
      });
      if (res) {
        setFinancials(prev => ({
          ...prev,
          labor_weekly_cost: res.labor_weekly_cost || "",
          labor_hourly_rate: res.labor_hourly_rate || "",
          material_cost_low: res.material_cost_low || "",
          material_cost_high: res.material_cost_high || "",
          overhead_weekly: res.overhead_weekly || "",
          mandatory_margin_pct: res.mandatory_margin_pct || "",
        }));
      }
    } catch {}
    finally { setScrapingFinancials(false); }
  };

  const advancePhase = async (ackPrompt) => {
    setThinking(true);
    const ack = await aiSay(ackPrompt);
    setThinking(false);
    const nextIndex = phaseIndex + 1;
    if (nextIndex < PHASES.length) {
      setMessages(m => [...m, { role: "user", text: "Continue" }, { role: "ai", text: ack }, { role: "ai", text: PHASES[nextIndex].question }]);
      setPhaseIndex(nextIndex);
    }
  };

  const scrapeGeoPricing = async () => {
    if (scrapingGeo) return;
    setScrapingGeo(true);
    const trades = selectedTrades.length > 0 ? selectedTrades.join(", ") : (companyInfo.trade || "general construction");
    const states = selectedStates.length > 0 ? selectedStates.map(stateName).join(", ") : (companyInfo.state || "their state");
    const scopes = selectedScopes.length > 0 ? selectedScopes.join(", ") : trades;
    const city = companyInfo.city || "their city";
    const state = selectedStates.length > 0 ? selectedStates.map(stateName).join(", ") : (companyInfo.state || "their state");
    const zip = companyInfo.zip || "";
    const employees = companyInfo.employees || "N/A";
    const trucks = companyInfo.trucks || "N/A";
    const equipment = companyInfo.equipment_setups || "N/A";
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web extensively for current construction pricing for ONLY these specific trade scopes: ${scopes}. These are the trades the company performs: ${trades}. The company services these states: ${states}. Home base: ${city}, ${state}${zip ? ` (ZIP ${zip})` : ""} with ${employees} employees, ${trucks} trucks, and ${equipment} equipment setups.

CRITICAL: Only return pricing for the scopes listed above (${scopes}). Do NOT return pricing for trades or scopes the company does not perform. Only include COMMERCIAL and GOVERNMENT project pricing — EXCLUDE residential pricing entirely.

Scrape as many pricing websites as possible, including:
- RSMeans and Gordian cost guides
- HomeAdvisor, Angi, Thumbtack cost estimators
- Home Depot, Lowe's, Menards, local lumber yards and building supply pricing
- 84 Lumber, ABC Supply, SRS Distribution and other trade suppliers
- State and local government bid results and cost data
- Construction cost calculators and zip-code-based pricing sites (e.g. Homewyse, Remodeling Expense, CostOwl)
- National supplier catalogs and industry pricing reports

For EACH scope, find pricing at FIVE geographic levels:
1. CITY — pricing specific to ${city} and its immediate area
2. COUNTY — pricing for the county ${city} is in
3. STATE — pricing for ${state} statewide
4. REGION — pricing for the multi-state region ${state} is in
5. NATIONAL — US national average pricing

For each level, provide low, mid, and high pricing per standard unit (per SF, per LF, per unit, per ton, etc.).

Return a JSON object with a "scopes" array. Each item: scope (string), unit (string), city_low (number), city_mid (number), city_high (number), county_low (number), county_mid (number), county_high (number), state_low (number), state_mid (number), state_high (number), region_low (number), region_mid (number), region_high (number), national_low (number), national_mid (number), national_high (number). Only return data from web search. Do not make up numbers.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            scopes: { type: "array", items: { type: "object", properties: {
              scope: { type: "string" }, unit: { type: "string" },
              city_low: { type: "number" }, city_mid: { type: "number" }, city_high: { type: "number" },
              county_low: { type: "number" }, county_mid: { type: "number" }, county_high: { type: "number" },
              state_low: { type: "number" }, state_mid: { type: "number" }, state_high: { type: "number" },
              region_low: { type: "number" }, region_mid: { type: "number" }, region_high: { type: "number" },
              national_low: { type: "number" }, national_mid: { type: "number" }, national_high: { type: "number" }
            } } }
          }
        }
      });
      setGeoPricing(res?.scopes || []);
    } catch { setGeoPricing([]); }
    finally { setScrapingGeo(false); }
  };

  const scrapeMarketIntel = async () => {
    if (scrapingMarket) return;
    setScrapingMarket(true);
    const trades = selectedTrades.length > 0 ? selectedTrades.join(", ") : (companyInfo.trade || "general construction");
    const states = selectedStates.length > 0 ? selectedStates.map(stateName).join(", ") : (companyInfo.state || "their state");
    const scopes = selectedScopes.length > 0 ? selectedScopes.join(", ") : trades;
    const city = companyInfo.city || "their city";
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web extensively for construction winning bid intelligence and pricing history for ONLY these specific trade scopes: ${scopes}. These are the trades the company performs: ${trades}. The company services these states: ${states}. Home base: ${city}.

CRITICAL: Only return winning bid intelligence and pricing for the scopes listed above (${scopes}). Do NOT return data for trades or scopes the company does not perform. Only include COMMERCIAL and GOVERNMENT project pricing — EXCLUDE residential pricing entirely. Focus on winning bids from the PREVIOUS 3 MONTHS so the pricing is competitive with what companies are currently winning. Also scan for the user's likely competitors (other ${trades} contractors in ${states}) and note their pricing and positioning if found.

Scrape these SPECIFIC government bid result sites for awarded contract prices and winning bid numbers:
- SAM.gov (federal contract awards)
- ${states} state procurement / DOT bid results portal
- City and municipal bid opening results for ${city} and surrounding areas
- BidNetDirect, GovTech, IonWave, OpenGov procurement portals
- AASHTO and state DOT material & unit bid price data
- School district and university capital project bid results
- USACE (Army Corps of Engineers) contract awards

Scrape these SPECIFIC commercial construction intelligence sites for winning bid numbers and pricing history:
- Dodge Construction Network / Dodge Analytics
- ConstructConnect / CMD Group
- BidClerk / BidNet
- ENR (Engineering News-Record) cost indexes and bid data
- BuildingConnected / Procore bid history
- RSMeans / Gordian historical cost data
- Turner Building Cost Index, Mortenson Cost Index
- Bureau of Labor Statistics construction cost data

For EACH trade scope, find:
1. WINNING BID PRICES: What are general contractors and owners actually paying? What unit prices are winning bids? Find the medium/median winning number per scope.
2. HISTORICAL PRICING: How have unit prices for each scope changed over the last 1-3 years? Find specific historical data points.
3. AWARDED CONTRACT RECORDS: Find specific recently awarded projects with their winning bid values, locations, dates, and sources.
4. FUTURE OUTLOOK: What's the forecast for these trades? Are prices going up or down? What factors are driving changes (material costs, labor shortages, demand, tariffs, etc.)?
5. FINANCIAL INTELLIGENCE: Key financial insights — typical profit margins, overhead rates, cost structures for these trades.
6. PRICING TIMELINE: Build a month-by-month time series of the average price per unit across ALL geographic levels (city, county, state, region, national) AND the winning bid median, covering the past 12-18 months of actual history PLUS 6 months of projected future prices. Use real historical data from the sites above where available; for the projected months, extrapolate based on the trends and future outlook you found. Mark projected months with projected=true.

Return a JSON object with:
- winning_bid_intelligence (string): Summary of what winning bids look like for these scopes
- future_outlook (string): Price trend forecast and driving factors
- financial_intelligence (string): Key financial insights for these trades
- scope_winning_prices (array): { scope (string), winning_price (number), unit (string) } — the median winning unit price per scope
- history_records (array): { project (string), location (string), value (string), date (string), source (string), scope (string), winning_price (number), unit (string), project_type (string) } — specific awarded contracts found
- pricing_timeline (array): { date (string like "Aug 2024"), city (number), county (number), state (number), region (number), national (number), winning_bid (number), projected (boolean) } — monthly time series, past 12-18 months actual + 6 months projected
- pricing_tiers_explanation (string): A clear, plain-English explanation of the recommended low/mid/high pricing for these scopes and WHY — considering location, travel, per diem, overnight stays, material, labor, overtime, tools, and misc costs specific to the trade and project location. Reference the recent winning bids and competitor pricing you found.
- scope_pricing_tiers (array): { scope (string), unit (string), low (number), mid (number), high (number), explanation (string), cost_breakdown (string), competitor_note (string) } — for each scope, the recommended low/mid/high unit price based on commercial & government winning bids from the last 3 months, a short explanation, a JSON string of cost factors (travel, per_diem, overnight, material, labor, overtime, tools, misc), and a note on competitor pricing if found.
Only return data from actual web search results. Do not make up numbers.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            winning_bid_intelligence: { type: "string" },
            future_outlook: { type: "string" },
            financial_intelligence: { type: "string" },
            scope_winning_prices: { type: "array", items: { type: "object", properties: {
              scope: { type: "string" }, winning_price: { type: "number" }, unit: { type: "string" }
            } } },
            history_records: { type: "array", items: { type: "object", properties: {
              project: { type: "string" }, location: { type: "string" }, value: { type: "string" }, date: { type: "string" }, source: { type: "string" }, scope: { type: "string" }, winning_price: { type: "number" }, unit: { type: "string" }, project_type: { type: "string" }
            } } },
            pricing_timeline: { type: "array", items: { type: "object", properties: {
              date: { type: "string" }, city: { type: "number" }, county: { type: "number" }, state: { type: "number" }, region: { type: "number" }, national: { type: "number" }, winning_bid: { type: "number" }, projected: { type: "boolean" }
            } } },
            pricing_tiers_explanation: { type: "string" },
            scope_pricing_tiers: { type: "array", items: { type: "object", properties: {
              scope: { type: "string" }, unit: { type: "string" }, low: { type: "number" }, mid: { type: "number" }, high: { type: "number" }, explanation: { type: "string" }, cost_breakdown: { type: "string" }, competitor_note: { type: "string" }
            } } }
          }
        }
      });
      setMarketIntel({ winning: res?.winning_bid_intelligence || "", outlook: res?.future_outlook || "", intelligence: res?.financial_intelligence || "" });
      setWinningPrices(res?.scope_winning_prices || []);
      setWinningHistory(res?.history_records || []);
      setPricingTimeline(res?.pricing_timeline || []);
      setPricingTiersExplanation(res?.pricing_tiers_explanation || "");
      setPricingTiers(res?.scope_pricing_tiers || []);
    } catch { setMarketIntel({ winning: "", outlook: "", intelligence: "" }); setWinningPrices([]); setWinningHistory([]); setPricingTimeline([]); setPricingTiersExplanation(""); setPricingTiers([]); }
    finally { setScrapingMarket(false); }
  };

  const savePricing = async () => {
    setSaving(true);
    const scopePricing = geoPricing.map(s => ({
      scope: s.scope,
      unit: s.unit || "SF",
      city_low: s.city_low ?? null, city_mid: s.city_mid ?? null, city_high: s.city_high ?? null,
      county_low: s.county_low ?? null, county_mid: s.county_mid ?? null, county_high: s.county_high ?? null,
      state_low: s.state_low ?? null, state_mid: s.state_mid ?? null, state_high: s.state_high ?? null,
      region_low: s.region_low ?? null, region_mid: s.region_mid ?? null, region_high: s.region_high ?? null,
      national_low: s.national_low ?? null, national_mid: s.national_mid ?? null, national_high: s.national_high ?? null,
    }));
    const scopePricingWithWins = scopePricing.map(s => {
      const winMatch = winningPrices.find(w => w.scope && w.scope.toLowerCase().trim() === (s.scope || "").toLowerCase().trim());
      return winMatch ? { ...s, winning_bid_price: winMatch.winning_price } : s;
    });
    const payload = {
      labor_weekly_cost: Number(financials.labor_weekly_cost) || null,
      labor_hourly_rate: Number(financials.labor_hourly_rate) || null,
      material_cost_low: Number(financials.material_cost_low) || null,
      material_cost_high: Number(financials.material_cost_high) || null,
      overhead_weekly: Number(financials.overhead_weekly) || null,
      mandatory_margin_pct: Number(financials.mandatory_margin_pct) || null,
      material_pct: Number(financials.material_pct) || null,
      labor_pct: Number(financials.labor_pct) || null,
      consumables_pct: Number(financials.consumables_pct) || null,
      preferred_margin_low: Number(financials.preferred_margin_low) || null,
      preferred_margin_high: Number(financials.preferred_margin_high) || null,
      pricing_tier: pricingTier || "mid",
      scope_pricing: scopePricingWithWins,
      winning_bid_history: winningHistory,
      pricing_timeline: pricingTimeline,
      winning_bid_intelligence: marketIntel.winning || "",
      future_outlook: marketIntel.outlook || "",
      financial_intelligence: marketIntel.intelligence || "",
      pricing_tiers_explanation: pricingTiersExplanation || "",
      scope_pricing_tiers: pricingTiers,
    };
    try {
      if (existingProfile) {
        await base44.entities.PricingProfile.update(existingProfile.id, payload);
      } else {
        await base44.entities.PricingProfile.create({ ...payload, organization_id: orgId });
      }
      setDone(true);
      const res = await aiSay("A construction company just finished setting up their Auto Pricing intelligence on AUTOLEADS — labor costs, material ranges, overhead, margins, local and national pricing scraped, pricing tier chosen, and market intelligence gathered. Write a warm 2-3 sentence summary telling them their pricing intelligence is now integrated into their estimating and proposal system.");
      setMessages(m => [...m, { role: "user", text: "Finish" }, { role: "ai", text: res, isFinal: true }]);
    } catch (e) {
      alert("Save failed: " + (e?.message || "try again"));
    } finally {
      setSaving(false);
    }
  };

  const _setFin = (k, v) => setFinancials(p => ({ ...p, [k]: v }));

  const _cellInput = "h-9 w-full rounded-md border border-black/15 bg-white px-2 text-sm outline-none focus:border-[#f2df0d] focus:ring-1 focus:ring-[#f2df0d]/20";

  const toggle = (arr, setArr, value) => {
    const v = String(value).trim();
    if (!v) return;
    setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };
  const addCustom = (arr, setArr, value, setter) => {
    const v = String(value).trim();
    if (!v) return;
    if (!arr.includes(v)) setArr([...arr, v]);
    setter("");
  };

  const renderPhaseForm = () => {
    if (currentPhase.key === "selection") {
      const Chip = ({ label, active, onClick }) => (
        <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition ${active ? "border-[#f2df0d] bg-[#fdfbe1] text-black" : "border-black/15 bg-white text-black/50 hover:border-black/30"}`}>
          {active && <Check size={12} />}{label}{active && <X size={12} className="opacity-50" />}
        </button>
      );
      return (
        <div className="space-y-5">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
            <Check size={14} className="mr-1 inline" /> Pulled from your onboarding: {userTrades.length} trades, {selectedStates.length} service-area states, {scopeSystems.length} scope systems. Toggle off anything you don't want priced — I'll only scan for what's selected below.
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black/50"><Briefcase size={14} className="text-[#b0a209]" /> Trades to scan ({selectedTrades.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {userTrades.map(t => <Chip key={t} label={t} active={selectedTrades.includes(t)} onClick={() => toggle(selectedTrades, setSelectedTrades, t)} />)}
              {userTrades.length === 0 && <p className="text-xs text-black/40">No trades from onboarding yet — add yours below.</p>}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input value={customTrade} onChange={e => setCustomTrade(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom(selectedTrades, setSelectedTrades, customTrade, setCustomTrade)} placeholder="Add a trade…" className="h-9 flex-1 rounded-md border border-black/15 bg-white px-2.5 text-xs outline-none focus:border-[#f2df0d]" />
              <button onClick={() => addCustom(selectedTrades, setSelectedTrades, customTrade, setCustomTrade)} className="grid h-9 w-9 place-items-center rounded-md bg-[#f2df0d] text-black"><Plus size={16} /></button>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black/50"><MapPin size={14} className="text-[#b0a209]" /> States to scan ({selectedStates.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {selectedStates.map(s => <Chip key={s} label={stateName(s)} active={true} onClick={() => setSelectedStates(selectedStates.filter(x => x !== s))} />)}
              {selectedStates.length === 0 && <p className="text-xs text-black/40">No states from onboarding yet — add yours below.</p>}
            </div>
            <div className="mt-2 flex gap-1.5">
              <select value={customState} onChange={e => setCustomState(e.target.value)} className="h-9 flex-1 rounded-md border border-black/15 bg-white px-2 text-xs outline-none focus:border-[#f2df0d]">
                <option value="">Select a state to add…</option>
                {US_STATES.filter(s => !selectedStates.includes(s.code) && !selectedStates.includes(s.name)).map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              <button onClick={() => addCustom(selectedStates, setSelectedStates, customState, setCustomState)} className="grid h-9 w-9 place-items-center rounded-md bg-[#f2df0d] text-black"><Plus size={16} /></button>
            </div>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-black/50"><ListChecks size={14} className="text-[#b0a209]" /> Scope systems to price ({selectedScopes.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set(scopeSystems.map(s => s.scope).filter(Boolean))].sort().map(sc => <Chip key={sc} label={sc} active={selectedScopes.includes(sc)} onClick={() => toggle(selectedScopes, setSelectedScopes, sc)} />)}
              {selectedScopes.filter(s => !scopeSystems.some(ss => ss.scope === s)).map(sc => <Chip key={sc} label={sc} active={true} onClick={() => setSelectedScopes(selectedScopes.filter(x => x !== sc))} />)}
              {scopeSystems.length === 0 && selectedScopes.length === 0 && <p className="text-xs text-black/40">No scope systems from onboarding yet — add yours below or finish scope systems setup first.</p>}
            </div>
            <div className="mt-2 flex gap-1.5">
              <input value={customScope} onChange={e => setCustomScope(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom(selectedScopes, setSelectedScopes, customScope, setCustomScope)} placeholder="Add a scope…" className="h-9 flex-1 rounded-md border border-black/15 bg-white px-2.5 text-xs outline-none focus:border-[#f2df0d]" />
              <button onClick={() => addCustom(selectedScopes, setSelectedScopes, customScope, setCustomScope)} className="grid h-9 w-9 place-items-center rounded-md bg-[#f2df0d] text-black"><Plus size={16} /></button>
            </div>
          </div>

          <div className="rounded-lg border-2 border-[#f2df0d] bg-[#fdfbe1] p-3 text-xs">
            <p className="font-black uppercase tracking-wide text-[#b0a209]">Will scan for:</p>
            <p className="mt-1 text-black/70"><strong>Trades:</strong> {selectedTrades.length > 0 ? selectedTrades.join(", ") : "none selected"}</p>
            <p className="text-black/70"><strong>States:</strong> {selectedStates.length > 0 ? selectedStates.map(stateName).join(", ") : "none selected"}</p>
            <p className="text-black/70"><strong>Scopes:</strong> {selectedScopes.length > 0 ? selectedScopes.join(", ") : "none selected"}</p>
          </div>

          <button onClick={() => advancePhase("A construction company just confirmed the exact trades, states, and scopes they want priced on AUTOLEADS. Write a brief one-sentence acknowledgment (max 15 words). Do NOT ask a question.")} disabled={selectedTrades.length === 0 || selectedScopes.length === 0 || thinking} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Continue <ArrowRight size={16} /></button>
          {(selectedTrades.length === 0 || selectedScopes.length === 0) && <p className="text-center text-[11px] font-bold text-black/40">Select at least one trade and one scope to continue.</p>}
        </div>
      );
    }

    if (currentPhase.key === "financials") {
      return (
        <PricingFinancialsPanel
          financials={financials}
          setFinancials={setFinancials}
          companyInfo={companyInfo}
          userTrades={userTrades}
          thinking={thinking}
          onContinue={() => advancePhase("A construction company just entered their financial basics on AUTOLEADS. Write a brief one-sentence acknowledgment (max 15 words). Do NOT ask a question.")}
        />
      );
    }

    if (currentPhase.key === "geo_pricing") {
      return (
        <div className="space-y-4">
          {scrapingGeo && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-[#f2df0d] bg-[#fdfbe1] p-8 text-center">
              <div className="relative grid h-20 w-20 place-items-center">
                <Loader2 size={72} className="animate-spin text-[#f2df0d]" strokeWidth={2.5} />
                <MapPin size={28} className="absolute text-[#b0a209]" />
              </div>
              <div>
                <p className="text-base font-black text-[#b0a209]">Scraping pricing for {selectedScopes.length > 0 ? selectedScopes.join(", ") : (selectedTrades.length > 0 ? selectedTrades.join(", ") : "your scopes")}…</p>
                <p className="mt-1 text-xs font-bold text-black/50">Searching city, county, state, region & national across RSMeans, HomeAdvisor, Angi, suppliers, Homewyse & zip-code pricing sites</p>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          {!scrapingGeo && geoPricing.length > 0 && (
            <>
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700"><Check size={14} /> AI pre-filled pricing for {geoPricing.length} scopes across city, county, state, region & national levels. Switch tabs to review each level, edit any field, then approve to continue.</div>
              <GeoPricingTable pricing={geoPricing} setPricing={setGeoPricing} />
            </>
          )}
          {!scrapingGeo && geoPricing.length === 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">No pricing found. You can retry or continue and fill in manually later.</div>
          )}
          <div className="flex gap-2">
            <button onClick={scrapeGeoPricing} disabled={scrapingGeo} className="flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40"><RefreshCw size={16} /> Retry</button>
            <button onClick={() => advancePhase("A construction company just received geo pricing intelligence (city, county, state, region, national) from AUTOLEADS. Write a brief one-sentence acknowledgment (max 15 words). Do NOT ask a question.")} disabled={scrapingGeo || thinking} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Continue <ArrowRight size={16} /></button>
          </div>
        </div>
      );
    }

    if (currentPhase.key === "tier") {
      const tiers = [
        { value: "low", label: "Low Range", desc: "Competitive pricing to win more bids. Best for building volume and entering new markets.", color: "border-blue-300 bg-blue-50" },
        { value: "mid", label: "Mid Range", desc: "Balanced pricing — fair margins with competitive positioning. Recommended for most contractors.", color: "border-[#f2df0d] bg-[#fdfbe1]" },
        { value: "high", label: "High Range", desc: "Premium pricing for specialized work, strong reputation, or high-demand markets.", color: "border-emerald-300 bg-emerald-50" },
      ];
      return (
        <div className="space-y-4">
          <p className="text-sm leading-6 text-black/60">Your pricing tier sets the default strategy for estimates and proposals. You can adjust individual prices later — this just sets your baseline.</p>
          <div className="grid gap-3">
            {tiers.map(t => (
              <button key={t.value} onClick={() => setPricingTier(t.value)} className={`flex items-start gap-3 rounded-xl border-2 p-4 text-left transition ${pricingTier === t.value ? t.color + " ring-2 ring-[#f2df0d]/20" : "border-black/10 bg-white hover:border-black/20"}`}>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${pricingTier === t.value ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/40"}`}>{pricingTier === t.value ? <Check size={16} /> : <BarChart3 size={16} />}</span>
                <div><p className="text-sm font-black">{t.label}</p><p className="mt-1 text-xs leading-5 text-black/55">{t.desc}</p></div>
              </button>
            ))}
          </div>
          <button onClick={() => advancePhase(`A construction company just chose ${pricingTier} range pricing tier on AUTOLEADS. Write a brief one-sentence acknowledgment (max 15 words). Do NOT ask a question.`)} disabled={!pricingTier || thinking} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Continue <ArrowRight size={16} /></button>
        </div>
      );
    }

    if (currentPhase.key === "market_intel") {
      return (
        <div className="space-y-4">
          {scrapingMarket && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-[#f2df0d] bg-[#fdfbe1] p-8 text-center">
              <div className="relative grid h-20 w-20 place-items-center">
                <Loader2 size={72} className="animate-spin text-[#f2df0d]" strokeWidth={2.5} />
                <Award size={28} className="absolute text-[#b0a209]" />
              </div>
              <div>
                <p className="text-base font-black text-[#b0a209]">Scraping winning bids & pricing history…</p>
                <p className="mt-1 text-xs font-bold text-black/50">Searching SAM.gov, state DOT, Dodge, ConstructConnect, ENR, RSMeans & municipal bid results</p>
              </div>
              <div className="flex gap-1.5">
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "0ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "150ms" }} />
                <span className="h-2 w-2 animate-bounce rounded-full bg-[#f2df0d]" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
          {!scrapingMarket && marketIntel.winning && (
            <div className="space-y-3">
              <PricingComparisonChart timeline={pricingTimeline} />
              <div className="rounded-lg border border-black/10 bg-white p-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase text-black/40"><Award size={14} /> Winning Bid Intelligence</p>
                <p className="text-sm leading-6 text-black/70">{marketIntel.winning}</p>
              </div>
              {winningHistory.length > 0 && (
                <div className="rounded-lg border border-black/10 bg-white p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase text-black/40"><History size={14} /> Awarded Contract History ({winningHistory.length} records)</p>
                  <div className="overflow-x-auto rounded-md border border-black/10">
                    <table className="w-full text-xs">
                      <thead className="bg-black/[.02] font-black uppercase text-black/50"><tr><th className="p-2 text-left">Project</th><th className="p-2 text-left">Location</th><th className="p-2 text-left">Scope</th><th className="p-2 text-right">Winning $</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Source</th></tr></thead>
                      <tbody>
                        {winningHistory.slice(0, 10).map((r, i) => (
                          <tr key={i} className="border-t border-black/5"><td className="p-2">{r.project}</td><td className="p-2">{r.location}</td><td className="p-2">{r.scope || "—"}</td><td className="p-2 text-right font-bold">{r.winning_price ? `$${Number(r.winning_price).toLocaleString()}` : r.value || "—"}</td><td className="p-2">{r.date}</td><td className="p-2 text-black/50">{r.source}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="rounded-lg border border-black/10 bg-white p-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase text-black/40"><TrendingUp size={14} /> Future Outlook</p>
                <p className="text-sm leading-6 text-black/70">{marketIntel.outlook}</p>
              </div>
              <div className="rounded-lg border border-black/10 bg-white p-4">
                <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase text-black/40"><DollarSign size={14} /> Financial Intelligence</p>
                <p className="text-sm leading-6 text-black/70">{marketIntel.intelligence}</p>
              </div>
              {pricingTiersExplanation && (
                <div className="rounded-lg border-2 border-[#f2df0d] bg-[#fdfbe1] p-4">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-black uppercase text-[#b0a209]"><BarChart3 size={14} /> Low / Mid / High Pricing Guidance</p>
                  <p className="text-sm leading-6 text-black/70">{pricingTiersExplanation}</p>
                </div>
              )}
              {pricingTiers.length > 0 && (
                <div className="rounded-lg border border-black/10 bg-white p-4">
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase text-black/40"><BarChart3 size={14} /> Recommended Pricing Tiers (commercial &amp; government, last 3 months)</p>
                  <div className="overflow-x-auto rounded-md border border-black/10">
                    <table className="w-full text-xs">
                      <thead className="bg-black/[.02] font-black uppercase text-black/50"><tr><th className="p-2 text-left">Scope</th><th className="p-2 text-right">Low</th><th className="p-2 text-right">Mid</th><th className="p-2 text-right">High</th><th className="p-2 text-left">Why</th></tr></thead>
                      <tbody>
                        {pricingTiers.map((t, i) => (
                          <tr key={i} className="border-t border-black/5"><td className="p-2 font-bold">{t.scope}</td><td className="p-2 text-right">{t.low!=null?`$${Number(t.low).toLocaleString()}`:"—"}</td><td className="p-2 text-right font-bold text-[#b0a209]">{t.mid!=null?`$${Number(t.mid).toLocaleString()}`:"—"}</td><td className="p-2 text-right">{t.high!=null?`$${Number(t.high).toLocaleString()}`:"—"}</td><td className="p-2 text-black/60">{t.explanation||"—"}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
          {!scrapingMarket && !marketIntel.winning && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">No market intelligence found. You can retry or save without it.</div>
          )}
          <div className="flex gap-2">
            <button onClick={scrapeMarketIntel} disabled={scrapingMarket} className="flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40"><RefreshCw size={16} /> Retry</button>
            <button onClick={savePricing} disabled={saving || thinking} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{saving ? <><Loader2 size={16} className="animate-spin" />Saving…</> : <><Check size={16} /> Save & Finish</>}</button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f5f5]">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-black/10 bg-white lg:flex">
          <div className="flex h-[60px] items-center gap-3 border-b border-black/10 px-6"><DollarSign size={20} className="text-[#b0a209]" /><span className="text-lg font-black">Auto Pricing Setup</span></div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "ai" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span><div className="rounded-xl border border-black/10 bg-black/[.02] px-3 py-3"><div className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "0ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "150ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "300ms" }} /></div></div></div>
              )}
            </div>
          </div>
          <SidebarChatInput messages={messages} setMessages={setMessages} contextLabel="Auto Pricing Setup" companyInfo={companyInfo} userTrades={userTrades} />
          {done && <div className="border-t border-black/10 p-4"><button onClick={() => nav("/onboarding")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">Finish Setup <ArrowRight size={16} /></button></div>}
          <p className="px-6 pb-4 text-[10px] text-black/40">AI can make mistakes. Verify important information.</p>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
            <BackButton to="/onboarding" className="mb-4" />
            <p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Auto Pricing</p>
            <h1 className="text-3xl font-black tracking-[-.03em] sm:text-[34px]">Pricing Intelligence Setup</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">Set your financial basics, then let AI scrape local and national pricing for all your scopes. Choose your tier and get market intelligence — all integrated into your estimating.</p>

            <PageStepGuide className="mt-6" title="How to use this page — Step-by-Step" steps={[{title:"Enter your financials",description:"Labor costs, material ranges, overhead, and mandatory margins."},{title:"Scrape geo pricing",description:"AI pulls city, county, state, region & national rates for your scopes."},{title:"Choose your pricing tier",description:"Low, mid, or high — sets your default pricing strategy."},{title:"Review market intelligence",description:"Winning bids, pricing trends, and future outlook."},{title:"Save & finish",description:"Pricing feeds into every estimate and proposal."}]} />

            <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-sm font-black">Setup Progress</span><span className="text-sm font-bold text-black/50">{progress}%</span></div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#f2df0d] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black"><currentPhase.icon size={18} className="text-[#b0a209]" />{currentPhase.label}</h2>
              <div className="mt-4">{renderPhaseForm()}</div>
            </div>

            {done && (
              <div className="mt-5 rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-6 text-center shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f2df0d]"><Check size={28} className="text-black" /></span>
                <h2 className="mt-4 text-xl font-black">Pricing Intelligence Active! 🎉</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/60">Your pricing intelligence is now integrated into your estimating and proposal system. AUTOLEADS will use your financials, scraped pricing, and market intelligence to guide your bids.</p>
                <button onClick={() => nav("/onboarding")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f2df0d] px-6 py-3 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">Back to Setup Hub <ArrowRight size={16} /></button>
              </div>
            )}

            <div className="mt-6 lg:hidden">
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-black"><DollarSign size={16} className="text-[#b0a209]" />AI Assistant</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-5 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                    </div>
                  ))}
                  {thinking && <p className="text-xs text-black/40">AI is typing…</p>}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}