import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Page } from "@/components/autoleads/UiPrimitives";
import { Package } from "lucide-react";
import MaterialIngestionPanel from "@/components/autoleads/MaterialIngestionPanel";
import MaterialQuickScrape from "@/components/autoleads/MaterialQuickScrape";
import MaterialDatabaseTable from "@/components/autoleads/MaterialDatabaseTable";
import MaterialCalculator from "@/components/autoleads/MaterialCalculator";
import { SCOPE_NAMES } from "@/lib/scopeMaterials";
import PageStepGuide from "@/components/autoleads/PageStepGuide";

const nowISO = () => new Date().toISOString();

export default function MaterialPricing() {
  const [materials, setMaterials] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [ingestedCount, setIngestedCount] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Material.list("-created_date", 500);
      setMaterials(list || []);
    } catch { setMaterials([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ingestSupplier = async (url) => {
    setIngesting(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Go to ${url} and extract ALL products listed on the site. For each product return: name, category, scope (assign one of these trade scopes if applicable: ${SCOPE_NAMES.join(", ")} — otherwise use "General"), unit (EA, GAL, SF, LF, LB, etc.), unit_cost (current price as a number), manufacturer, sku (if visible), description (short). Return a JSON object with a "materials" array. Only return real products actually found on the site — do not invent items or prices.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: { type: "object", properties: { materials: { type: "array", items: { type: "object", properties: {
          name: { type: "string" }, category: { type: "string" }, scope: { type: "string" }, unit: { type: "string" },
          unit_cost: { type: "number" }, manufacturer: { type: "string" }, sku: { type: "string" }, description: { type: "string" }
        } } } } }
      });
      const items = (res?.materials || []).filter((m) => m.name).map((m) => ({
        name: m.name, category: m.category || "", scope: m.scope || "General", unit: m.unit || "EA",
        unit_cost: m.unit_cost ?? null, manufacturer: m.manufacturer || "", sku: m.sku || "",
        source_url: url, source: url.includes("xtremepolishingsystems") ? "xtremepolishingsystems" : "supplier",
        last_scraped_date: nowISO(), description: m.description || "",
      }));
      if (items.length) {
        await base44.entities.Material.bulkCreate(items);
        setIngestedCount(items.length);
      }
      await load();
    } catch (e) { alert("Ingestion failed: " + (e?.message || "try again")); }
    finally { setIngesting(false); }
  };

  const quickScrape = async (name, scope) => {
    setScraping(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for current pricing of this construction material: "${name}". Find the typical unit price from suppliers (Home Depot, Lowe's, Menards, ABC Supply, 84 Lumber, manufacturer sites, supply houses). Return: name, category, unit (EA, GAL, SF, LF, LB), unit_cost (current market price as a number), manufacturer, description (short), source_url (where you found the price).`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: { type: "object", properties: {
          name: { type: "string" }, category: { type: "string" }, unit: { type: "string" }, unit_cost: { type: "number" },
          manufacturer: { type: "string" }, description: { type: "string" }, source_url: { type: "string" }
        } }
      });
      if (res?.name) {
        await base44.entities.Material.create({
          name: res.name, category: res.category || "", scope: scope || "General", unit: res.unit || "EA",
          unit_cost: res.unit_cost ?? null, manufacturer: res.manufacturer || "", description: res.description || "",
          source_url: res.source_url || "", source: "scraped", last_scraped_date: nowISO(),
        });
        await load();
      }
    } catch (e) { alert("Scrape failed: " + (e?.message || "try again")); }
    finally { setScraping(false); }
  };

  const refreshPrices = async () => {
    if (materials.length === 0) return;
    setRefreshing(true);
    try {
      const names = materials.map((m) => m.name);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for current pricing of these construction materials and return updated unit costs: ${JSON.stringify(names)}. For each, return the name and the current market unit_cost as a number. Only return real prices found online.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: { type: "object", properties: { updates: { type: "array", items: { type: "object", properties: {
          name: { type: "string" }, unit_cost: { type: "number" }
        } } } } }
      });
      const updates = res?.updates || [];
      const byName = new Map(updates.map((u) => [u.name, u.unit_cost]));
      const toUpdate = materials.filter((m) => byName.has(m.name)).map((m) => ({ id: m.id, unit_cost: byName.get(m.name), last_scraped_date: nowISO() }));
      if (toUpdate.length) await base44.entities.Material.bulkUpdate(toUpdate);
      await load();
    } catch (e) { alert("Refresh failed: " + (e?.message || "try again")); }
    finally { setRefreshing(false); }
  };

  const updateMaterial = async (id, data) => {
    const prev = materials;
    setMaterials((p) => p.map((m) => m.id === id ? { ...m, ...data } : m));
    try { await base44.entities.Material.update(id, data); }
    catch { setMaterials(prev); alert("Update failed — reverting."); }
  };
  const deleteMaterial = async (id) => {
    const prev = materials;
    setMaterials((p) => p.filter((m) => m.id !== id));
    try { await base44.entities.Material.delete(id); }
    catch { setMaterials(prev); alert("Delete failed — reverting."); }
  };

  return (
    <Page backTo="/dashboard" eyebrow="Material Pricing" title="Material Cost Database & Calculator" description="Ingest your supplier's full catalog, keep material pricing current, and feed real costs into every proposal. The Proposal Creator pulls from this database automatically." actions={<span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf6bc] px-3 py-1 text-[11px] font-black uppercase text-[#a09308]"><Package size={12} /> {materials.length} materials</span>}>
      <PageStepGuide className="mb-1" title="How to use this page — Step-by-Step" steps={[{title:"Ingest your supplier catalog",description:"Paste a supplier URL to bulk-import real products and prices."},{title:"Quick-scrape a single material",description:"Search the web for current pricing on one material."},{title:"Review your material database",description:"Edit costs, units, and scopes for every material."},{title:"Refresh prices",description:"Re-scrape current market costs across your whole database."},{title:"Use the calculator",description:"Estimate material costs for any job scope."}]} />
      <div className="space-y-5">
        <MaterialIngestionPanel onIngest={ingestSupplier} ingesting={ingesting} count={ingestedCount} />
        <MaterialQuickScrape onScrape={quickScrape} scraping={scraping} />
        <MaterialDatabaseTable materials={materials} loading={loading} onUpdate={updateMaterial} onDelete={deleteMaterial} onRefresh={refreshPrices} refreshing={refreshing} />
        <MaterialCalculator materials={materials} />
      </div>
    </Page>
  );
}