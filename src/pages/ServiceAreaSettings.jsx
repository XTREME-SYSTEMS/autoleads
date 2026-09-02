import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Briefcase, Building2, Check, Loader2, MapPin, MapPinned, Radar, Save } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import { US_STATES, getCounties, TRADES } from "@/lib/geoData";
import { useOrgId } from "@/hooks/useOrgContext";

function parseJurisdiction(jurisdiction) {
  const result = { states: [], counties: [], cities: [] };
  if (!jurisdiction || jurisdiction === "National") return result;
  const segments = jurisdiction.split("·").map(s => s.trim()).filter(Boolean);
  if (segments.length === 0) return result;
  const stateSeg = segments.pop();
  const stateItems = stateSeg.split(",").map(s => s.trim()).filter(Boolean);
  result.states = stateItems;
  if (segments.length === 2) {
    result.cities = segments[0].split(",").map(s => s.trim()).filter(Boolean);
    result.counties = segments[1].split(",").map(s => s.trim()).filter(Boolean);
  } else if (segments.length === 1) {
    const items = segments[0].split(",").map(s => s.trim()).filter(Boolean);
    const knownCounties = new Set();
    stateItems.forEach(code => {
      const sc = US_STATES.find(s => s.code === code || s.name === code)?.code;
      if (sc) getCounties(sc).forEach(c => knownCounties.add(c.replace(/_/g, " ").toLowerCase()));
    });
    const allCounties = items.length > 0 && items.every(it => knownCounties.has(it.toLowerCase()));
    if (allCounties) result.counties = items; else result.cities = items;
  }
  return result;
}

const stateName = (code) => US_STATES.find(s => s.code === code || s.name === code)?.name || code;

function Chip({ label }) {
  return <span className="inline-flex items-center rounded-full border border-[#f2df0d]/30 bg-[#fcf9cf] px-1.5 py-px text-[10px] font-bold leading-4 text-[#746b06]">{label}</span>;
}

function CategoryCard({ icon: Icon, title, items, emptyText }) {
  return (
    <div className="flex flex-col gap-2 border-b border-black/5 py-3 last:border-0 sm:flex-row sm:items-start">
      <div className="flex shrink-0 items-center gap-2 sm:w-44">
        <Icon size={14} className="text-[#b0a209]" />
        <span className="text-xs font-black uppercase tracking-wide">{title}</span>
        <span className="text-xs font-bold text-black/30">({items.length})</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {items.length === 0 ? <p className="text-xs text-black/40">{emptyText}</p> : items.map((it, i) => <Chip key={i} label={it} />)}
      </div>
    </div>
  );
}

export default function ServiceAreaSettings() {
  const orgId = useOrgId();
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState(null);
  const [jurisdiction, setJurisdiction] = useState("");
  const [trades, setTrades] = useState(/** @type {any[]} */ ([]));
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const sources = await base44.entities.ScrapeSource.filter({ organization_id: orgId }).catch(() => []);
        const s = (sources || []).find(x => x.name?.startsWith("Auto Leads Discovery"));
        if (s) {
          setSource(s);
          setJurisdiction(s.jurisdiction || "");
          setTrades((s.trades || "").split(",").map(t => t.trim()).filter(Boolean));
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const parsed = parseJurisdiction(jurisdiction);
  const stateLabels = parsed.states.map(stateName);

  const toggleTrade = (t) => setTrades(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);

  const save = async () => {
    setSaving(true);
    try {
      const payload = {
        name: `Auto Leads Discovery - ${jurisdiction || "National"}`,
        jurisdiction: jurisdiction || "National",
        trades: trades.join(", "),
      };
      if (source) {
        const updated = await base44.entities.ScrapeSource.update(source.id, payload);
        setSource(updated);
      } else {
        const created = await base44.entities.ScrapeSource.create({ ...payload, organization_id: orgId, source_type: "aggregator", status: "active", schedule_cron: "0 8 * * *" });
        setSource(created);
      }
      setEditing(false);
      alert("Service area saved.");
    } catch (e) {
      alert("Save failed: " + (e?.message || "try again"));
    } finally { setSaving(false); }
  };

  if (loading) {
    return <Page title="Service Areas" description="The states, counties, cities, and trades you configured during Auto Leads setup."><div className="flex items-center gap-2 text-sm text-black/40"><Loader2 size={16} className="animate-spin" />Loading your service area…</div></Page>;
  }

  return (
    <Page
      backTo="/settings"
      eyebrow="Settings"
      title="Service Areas"
      description="The states, counties, cities, and trades you configured during Auto Leads setup — organized by category."
      actions={source ? (editing
        ? <PrimaryButton onClick={save} disabled={saving}>{saving ? <><Loader2 size={16} className="animate-spin" />Saving…</> : <><Save size={16} />Save Changes</>}</PrimaryButton>
        : <SecondaryButton onClick={() => setEditing(true)}>Edit Service Area</SecondaryButton>
      ) : null}
    >
      {!source ? (
        <EmptyState
          icon={MapPin}
          title="No service area configured"
          description="Complete Auto Leads setup to define your target states, counties, cities, and trades."
          action={<SecondaryButton onClick={() => window.location.href = "/auto-leads-setup"}>Go to Auto Leads Setup</SecondaryButton>}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2 text-sm text-black/50">
            <Radar size={16} className="text-[#b0a209]" />
            <span>Scraper status: <span className="font-black capitalize text-black">{source.status}</span></span>
          </div>

          <Card className="p-4 sm:p-5">
            <CategoryCard icon={MapPin} title="States" items={stateLabels} emptyText="No states selected" />
            <CategoryCard icon={MapPinned} title="Counties" items={parsed.counties} emptyText="Statewide coverage" />
            <CategoryCard icon={Building2} title="Cities" items={parsed.cities} emptyText="County-wide coverage" />
            <CategoryCard icon={Briefcase} title="Target Trades" items={trades} emptyText="No trades selected" />
          </Card>

          {editing && (
            <>
              <Card className="mt-5 p-5">
                <h2 className="font-black">Jurisdiction</h2>
                <p className="mt-1 text-xs text-black/50">Cities, counties, and states your scraper covers. Order: Cities · Counties · States. Separate multiple values with commas.</p>
                <textarea className={`${inputClass} mt-3 min-h-24 resize-y`} value={jurisdiction} onChange={e => setJurisdiction(e.target.value)} placeholder="e.g. Pompano Beach · Broward · FL" />
              </Card>

              <Card className="mt-5 p-5">
                <h2 className="flex items-center gap-2 font-black"><Briefcase size={18} className="text-[#b0a209]" />Target Trades</h2>
                <p className="mt-1 text-xs text-black/50">{trades.length} selected</p>
                <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
                  {TRADES.map(t => {
                    const checked = trades.includes(t);
                    return (
                      <button key={t} type="button" onClick={() => toggleTrade(t)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm font-medium transition ${checked ? "border-[#f2df0d] bg-[#fdfbe1] text-black" : "border-black/10 text-black/70 hover:bg-black/5"}`}>
                        <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${checked ? "border-[#f2df0d] bg-[#f2df0d]" : "border-black/20 bg-white"}`}>{checked && <Check size={12} className="text-black" />}</span>
                        {t}
                      </button>
                    );
                  })}
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </Page>
  );
}