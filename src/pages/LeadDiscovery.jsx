import React, {useState, useMemo, useEffect, useRef} from "react";
import { FileSearch, Loader2, Play, Radar, Search, X, MapPin, Clock } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import PullToRefresh from "@/components/autoleads/PullToRefresh";
import MobileSelect from "@/components/autoleads/MobileSelect";
import RecordCard from "@/components/autoleads/RecordCard";
import { useEntityList } from "@/hooks/useEntityList";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { US_STATES, getCounties, getCities, TRADES } from "@/lib/geoData";

function money(n){ return n!=null && !isNaN(n) ? `$${Number(n).toLocaleString()}` : null; }
function fmtDate(d){ try { return new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric'}); } catch { return ""; } }

export default function LeadDiscovery(){
  const nav = useNavigate();
  const [queued,_setQueued]=useState(false);
  const [scraping,setScraping]=useState(false);
  const [refreshKey,setRefreshKey]=useState(0);
  const runScrape = async () => {
    setScraping(true);
    try {
      base44.functions.invoke('runAutoScrape', {}).catch(()=>{});
      setTimeout(()=>setRefreshKey(k=>k+1), 15000);
      setTimeout(()=>{ setScraping(false); setRefreshKey(k=>k+1); }, 45000);
    } catch (e) {
      alert('Scrape failed to start: ' + (e?.message || 'try again'));
      setScraping(false);
    }
  };
  const {records, loading} = useEntityList("Project", {sort: "-created_date", limit: 100, refreshKey});
  const {records: sourceRecords} = useEntityList("ScrapeSource", {limit: 100});
  const {records: companyRecords} = useEntityList("CompanyProfile", {limit: 1});
  const companyProfile = companyRecords?.[0];
  const opportunities = records || [];
  const [state,setState]=useState("");
  const [city,setCity]=useState("");
  const [trade,setTrade]=useState("");
  const [keyword,setKeyword]=useState("");

  const cities = useMemo(()=>{
    if(!state) return [];
    const allCounties = getCounties(state);
    const allCities = new Set();
    allCounties.forEach(c => getCities(state, c).forEach(ci => allCities.add(ci)));
    return [...allCities].sort();
  },[state]);

  const prepopulated = useRef(false);
  useEffect(() => {
    if (prepopulated.current) return;
    const sourcesLoaded = sourceRecords !== undefined;
    const companyLoaded = companyRecords !== undefined;
    if (!sourcesLoaded || !companyLoaded) return;
    prepopulated.current = true;
    if (companyProfile?.state) setState(companyProfile.state);
    if (companyProfile?.trade) {
      const trades = companyProfile.trade.split(",").map(t => t.trim()).filter(Boolean);
      if (trades.length === 1) setTrade(trades[0]);
    }
  }, [companyProfile, sourceRecords, companyRecords]);

  const filtered = useMemo(()=>{
    return opportunities.filter(o=>{
      // Only show leads that have a total estimate — incomplete leads stay out of the pipeline.
      if (o.value == null || isNaN(o.value)) return false;
      if (state && o.jurisdiction && !o.jurisdiction.includes(state)) return false;
      if (city && o.jurisdiction && !o.jurisdiction.toLowerCase().includes(city.toLowerCase())) return false;
      if (trade) {
        const t = trade.toLowerCase();
        const hay = `${o.trade||""} ${o.title||""}`.toLowerCase();
        if (!hay.includes(t)) return false;
      }
      if (keyword){
        const k = keyword.toLowerCase();
        const hay = `${o.title||""} ${o.authority||""} ${o.jurisdiction||""}`.toLowerCase();
        if (!hay.includes(k)) return false;
      }
      return true;
    });
  },[opportunities, state, city, trade, keyword]);

  const resetFilters=()=>{setState("");setCity("");setTrade("");setKeyword("");};
  const activeFilterCount = [state, city, trade, keyword].filter(Boolean).length;

  return <PullToRefresh onRefresh={()=>setRefreshKey(k=>k+1)}>
    <Page backTo="/dashboard" eyebrow="Auto Leads" title="Lead Discovery" description="Find and track construction opportunities across approved public, private, permit, and bid sources.">

    <Card className="p-4">
      <div className="relative">
        <Search size={17} className="absolute left-3 top-3.5 text-emerald-600"/>
        <input className={`${inputClass} animate-pulse-green border-emerald-500 pl-10`} placeholder="Search by keyword, owner, architect, GC, solicitation number…" value={keyword} onChange={e=>setKeyword(e.target.value)}/>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label>
          <span className="mb-1 block text-xs font-black">State</span>
          <MobileSelect label="Select State" className={inputClass} value={state} onChange={v=>{setState(v);setCity("");}}>
            <option value="">All States</option>
            {US_STATES.map(s=><option key={s.code} value={s.code}>{s.name}</option>)}
          </MobileSelect>
        </label>
        <label>
          <span className="mb-1 block text-xs font-black">City</span>
          <MobileSelect label="Select City" className={inputClass} value={city} onChange={v=>setCity(v)} disabled={!state}>
            <option value="">{state ? "All Cities" : "Select state first"}</option>
            {cities.map(c=><option key={c} value={c}>{c}</option>)}
          </MobileSelect>
        </label>
        <label>
          <span className="mb-1 block text-xs font-black">Trade</span>
          <MobileSelect label="Select Trade" className={inputClass} value={trade} onChange={v=>setTrade(v)}>
            <option value="">All Trades</option>
            {TRADES.map(t=><option key={t} value={t}>{t}</option>)}
          </MobileSelect>
        </label>
      </div>
      {activeFilterCount > 0 && (
        <div className="mt-3 text-right">
          <SecondaryButton onClick={resetFilters}><X size={16}/>Clear ({activeFilterCount})</SecondaryButton>
        </div>
      )}
    </Card>

    <div className="mt-4 flex flex-wrap gap-3">
      <PrimaryButton onClick={runScrape} disabled={scraping}>{scraping ? <><Loader2 size={16} className="animate-spin"/>Getting leads…</> : <><Play size={16}/>Get Leads Now</>}</PrimaryButton>
    </div>

    <div className="mt-5 mb-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">{filtered.length} {filtered.length === 1 ? "lead" : "leads"}</h2>
        {activeFilterCount > 0 && <span className="text-xs text-black/40">{activeFilterCount} filter{activeFilterCount>1?'s':''} applied</span>}
      </div>
      <p className="mt-1 text-[11px] text-black/40">Only leads with a total estimate, plans, and all mandatory data appear here. The project total is an approximate value only.</p>
    </div>

    {loading ? <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#f2df0d]" /></div> :
      filtered.length === 0 ? (
        <Card><EmptyState icon={FileSearch} title={queued ? "Discovery job queued" : "No complete leads yet"} description={queued ? "Approved connectors will run in the background. Only leads with a total estimate, plans, and all mandatory data will appear." : activeFilterCount ? "No leads with a total estimate match your filters. Try clearing them." : "Run discovery to find leads. Only leads with a total estimate, plans, and all mandatory data will appear here."} action={<PrimaryButton onClick={runScrape} disabled={scraping}>{scraping ? <><Loader2 size={16} className="animate-spin"/>Getting leads…</> : <><Play size={16}/>Get Leads Now</>}</PrimaryButton>} minHeight="360px"/></Card>
      ) : (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map(o => (
            <RecordCard key={o.id} icon={Radar} title={o.title} meta={o.authority} value={money(o.value) || "—"}
              status="New Lead" statusCls="bg-blue-50 text-blue-700"
              onClick={()=>nav(`/projects/${o.id}`)} actionLabel="View Lead"
              footer={<>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-black/40">
                  {o.jurisdiction && <span className="inline-flex items-center gap-1"><MapPin size={11}/>{o.jurisdiction}</span>}
                  {o.bid_due_date && <span className="inline-flex items-center gap-1 font-bold text-[#a09308]"><Clock size={11}/>Due {fmtDate(o.bid_due_date)}</span>}
                </div>
                {o.confidence!=null && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-bold text-black/40"><span>Confidence</span><span>{Math.round(o.confidence*100)}%</span></div>
                    <div className="h-1 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#f2df0d]" style={{width:`${Math.round(o.confidence*100)}%`}}/></div>
                  </div>
                )}
              </>} />
          ))}
        </div>
      )}
  </Page>
    </PullToRefresh>;
}