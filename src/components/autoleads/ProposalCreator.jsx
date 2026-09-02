import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Zap, Loader2, Save, Plus, X, FileText, Check, ChevronDown } from "lucide-react";
import HtmlPreview from "@/components/autoleads/HtmlPreview";

const stripFences = (text) => {
  if (!text) return "";
  let c = String(text).replace(/```(?:html)?/gi, "").replace(/```/g, "");
  const idx = c.search(/<(!DOCTYPE|html|head|div|h1|p|table|section)/i);
  if (idx > 0) c = c.slice(idx);
  return c.trim();
};

export default function ProposalCreator() {
  const nav = useNavigate();
  const [template, setTemplate] = useState(null);
  const [pricing, setPricing] = useState(null);
  const [company, setCompany] = useState(/** @type {any} */ ({}));
  const [scopePricing, setScopePricing] = useState(/** @type {any[]} */ ([]));
  const [jobText, setJobText] = useState("");
  const [selectedScope, setSelectedScope] = useState("");
  const [qty, setQty] = useState("");
  const [lineItems, setLineItems] = useState(/** @type {any[]} */ ([]));
  const [generating, setGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [autoMode, setAutoMode] = useState(false);
  const [materials, setMaterials] = useState(/** @type {any[]} */ ([]));

  useEffect(() => {
    (async () => {
      try {
        const [templates, profiles, companies, mats] = await Promise.all([
          base44.entities.BrandAsset.filter({ type: "proposal_template", is_default: true }).catch(() => []),
          base44.entities.PricingProfile.list().catch(() => []),
          base44.entities.CompanyProfile.list().catch(() => []),
          base44.entities.Material.list("-created_date", 500).catch(() => []),
        ]);
        if (templates?.length) setTemplate(templates[0]);
        if (profiles?.length) {
          setPricing(profiles[0]);
          setScopePricing(profiles[0].scope_pricing || []);
        }
        if (companies?.length) setCompany(companies[0]);
        if (mats?.length) setMaterials(mats);
      } catch {}
    })();
  }, []);

  const trade = company.trade || "General Construction";
  const cities = ["Atlanta", "Charlotte", "Miami"];
  const samples = scopePricing.length >= 3
    ? scopePricing.slice(0, 3).map((s, i) => ({
        label: `${s.scope} · ${cities[i] || "Local"}`,
        text: `${1500 + i * 900} ${s.unit || "SF"} ${s.scope.toLowerCase()} — ${["warehouse", "garage", "restaurant"][i] || "commercial"} space. Existing conditions ${["decent", "fair", "good"][i] || "fair"}. High-quality finish. Start within 2 weeks.`,
      }))
    : [
        { label: `Warehouse · ${cities[0]}`, text: `2,400 sqft warehouse in ${cities[0]}. Concrete in decent shape. High gloss polished finish. Start within 2 weeks.` },
        { label: `Garage · ${cities[1]}`, text: `800 sqft residential garage in ${cities[1]}. Metallic epoxy finish. New slab, smooth surface. Ready to start next week.` },
        { label: `Restaurant · ${cities[2]}`, text: `1,200 sqft restaurant floor in ${cities[2]}. Epoxy coating system. Light foot traffic area. Needs to be done before opening in 3 weeks.` },
      ];

  const addLineItem = () => {
    if (!selectedScope) return;
    const sp = scopePricing.find((s) => s.scope === selectedScope);
    const quantity = Number(qty) || 1;
    const unitPrice = sp ? (sp.local_mid ?? sp.national_mid ?? 0) : 0;
    setLineItems((prev) => [...prev, { scope: selectedScope, unit: sp?.unit || "SF", quantity, unit_price: unitPrice }]);
    setSelectedScope("");
    setQty("");
  };
  const removeLineItem = (i) => setLineItems((prev) => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => setLineItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  const totalValue = lineItems.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  const generate = async () => {
    if (!jobText.trim() && lineItems.length === 0) return;
    setGenerating(true);
    setGeneratedHtml("");
    setSavedId(null);
    try {
      const scopeList = scopePricing.map((s) => `${s.scope} (${s.unit || "SF"}) — Low $${s.local_low ?? s.national_low ?? 0}, Mid $${s.local_mid ?? s.national_mid ?? 0}, High $${s.local_high ?? s.national_high ?? 0}`).join("\n");
      const itemsList = lineItems.map((it) => `${it.scope}: ${it.quantity} ${it.unit} @ $${it.unit_price}/${it.unit} = $${(it.quantity * it.unit_price).toFixed(2)}`).join("\n");
      const selectedScopes = lineItems.map((it) => it.scope);
      const relevantMats = materials.filter((m) => selectedScopes.length === 0 || selectedScopes.includes(m.scope) || selectedScopes.some((sc) => (m.name || "").toLowerCase().includes(sc.toLowerCase())));
      const materialsList = relevantMats.length > 0
        ? relevantMats.map((m) => `${m.name} (${m.scope || "General"}) — $${m.unit_cost ?? 0}/${m.unit || "EA"}${m.manufacturer ? " [" + m.manufacturer + "]" : ""}`).join("\n")
        : "No materials in database — estimate material costs from industry knowledge.";
      const templateContent = template?.content || "";
      const prompt = `You are an expert construction proposal generator. Using the company's APPROVED proposal template and their intelligent pricing data, generate a complete, ready-to-send proposal as clean HTML.

COMPANY: ${company.name || "[Company Name]"}
TRADE: ${trade}
WEBSITE: ${company.website || "N/A"}
PHONE: ${company.phone || "N/A"}

APPROVED PROPOSAL TEMPLATE (use this exact structure, styling, and branding — fill in the placeholders with real values):
${templateContent || "(No template on file — create a clean, professional proposal layout with company header, scope of work, pricing table, terms, and signature block.)"}

INTELLIGENT PRICING (use these local rates to price scopes):
${scopeList || "No pricing data — use industry-standard rates."}

MATERIAL COST DATABASE (real supplier costs — use these for the material breakdown):
${materialsList}

LINE ITEMS SELECTED BY USER:
${itemsList || "None selected — infer the relevant scopes and quantities from the job description and price them using the intelligent pricing above."}

JOB DESCRIPTION / CLIENT EMAIL:
${jobText || "No description provided — use the line items above."}

INSTRUCTIONS:
1. Fill in the approved template with real values derived from the job description and line items.
2. Use the intelligent pricing rates to calculate each line item total and a grand total.
3. Extract client name, project name, project address, and date from the job description if available; otherwise use clear placeholders like [Client Name].
4. Return ONLY valid HTML starting with <!DOCTYPE html>. Do NOT wrap in markdown code fences. Do NOT include any explanation.
5. Include a pricing table with columns: Scope, Qty, Unit, Unit Price, Total — plus a Grand Total row.
6. Include a MATERIAL BREAKDOWN table showing the actual materials needed for the scopes (drawn from the Material Cost Database above), with columns: Material, Qty, Unit, Unit Cost, Total — and a Material Subtotal row. Use the real unit costs from the database.
7. Make it polished and print-ready, matching the template's branding and colors.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, file_urls: template?.file_url ? [template.file_url] : undefined });
      setGeneratedHtml(stripFences(typeof res === "string" ? res : res?.response || res?.text || ""));
    } catch (e) {
      setGeneratedHtml("<p style='padding:20px;color:#c00'>Generation failed. Please try again.</p>");
    } finally {
      setGenerating(false);
    }
  };

  const saveProposal = async () => {
    if (!generatedHtml) return;
    setSaving(true);
    try {
      const firstLine = jobText.split("\n")[0].slice(0, 60) || "Generated Proposal";
      const rec = await base44.entities.Proposal.create({
        title: firstLine,
        total_value: totalValue || null,
        items: lineItems.map((it) => ({ description: it.scope, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, source: "approved_estimate" })),
        status: "draft",
      });
      setSavedId(rec?.id);
    } catch (e) {
      alert("Save failed: " + (e?.message || "try again"));
    } finally {
      setSaving(false);
    }
  };

  const hasTemplate = !!template;
  const hasPricing = !!pricing;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
        {/* Status badges */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fbf6bc] px-3 py-1 text-[11px] font-black uppercase tracking-wide text-[#a09308]">
            <Zap size={12} /> AI Proposal Engine
          </span>
          {hasTemplate ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><Check size={11} /> Template loaded</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600">No template — set up Auto Bids</span>
          )}
          {hasPricing ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><Check size={11} /> Pricing intelligence</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600">No pricing — set up Auto Pricing</span>
          )}
          {materials.length > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700"><Check size={11} /> {materials.length} materials loaded</span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600">No materials — ingest in Material Pricing</span>
          )}
        </div>

        {/* Hero */}
        <h1 className="text-3xl font-black tracking-[-.03em] sm:text-4xl">
          Paste a job. <span className="text-[#f2df0d]">Get a proposal.</span>
        </h1>
        <p className="mt-2 text-sm leading-6 text-black/55">
          {trade} · AI-generated in under 60 seconds using your approved template and intelligent pricing.
        </p>

        {/* Input card */}
        <div className="mt-6 rounded-xl border border-black/10 bg-[#f8f9f9] p-4">
          <label className="mb-2 block text-[11px] font-black uppercase tracking-wide text-black/40">Job Description or Client Email</label>
          <textarea
            className="min-h-[120px] w-full resize-y rounded-lg border border-black/10 bg-white p-3 text-sm leading-6 outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20"
            placeholder="Paste a client email or describe the job... Example: '2,400 sqft warehouse in Nashville. Concrete in decent shape. High gloss polished finish. Start within 2 weeks.'"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
          />

          {/* Samples */}
          <div className="mt-3">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-black/40">Try a Sample</p>
            <div className="flex flex-wrap gap-2">
              {samples.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setJobText(s.text)}
                  className="rounded-full border border-black/15 bg-white px-3 py-1.5 text-xs font-bold text-black/70 transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Scope selector */}
        {scopePricing.length > 0 && (
          <div className="mt-4 rounded-xl border border-black/10 bg-white p-4">
            <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-black/40">Add Scopes from Your Pricing (optional)</p>
            <div className="flex flex-wrap items-end gap-2">
              <div className="relative min-w-[200px] flex-1">
                <select
                  className="h-11 w-full appearance-none rounded-lg border border-black/15 bg-white pl-3 pr-9 text-sm outline-none focus:border-[#f2df0d]"
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                >
                  <option value="">Select a scope…</option>
                  {scopePricing.map((s, i) => (
                    <option key={i} value={s.scope}>{s.scope} ({s.unit || "SF"}) — ${s.local_mid ?? s.national_mid ?? 0}/{s.unit || "SF"}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-3.5 text-black/40" />
              </div>
              <input
                type="number"
                className="h-11 w-24 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d]"
                placeholder="Qty"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <button
                onClick={addLineItem}
                disabled={!selectedScope}
                className="flex h-11 items-center gap-1.5 rounded-lg bg-black px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                <Plus size={16} /> Add
              </button>
            </div>

            {lineItems.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-lg border border-black/10">
                <table className="w-full text-sm">
                  <thead className="bg-black/[.02] text-[10px] font-black uppercase text-black/50">
                    <tr><th className="p-2 text-left">Scope</th><th className="p-2 text-right">Qty</th><th className="p-2 text-right">Unit</th><th className="p-2 text-right">Unit $</th><th className="p-2 text-right">Total</th><th className="p-2 w-8"></th></tr>
                  </thead>
                  <tbody>
                    {lineItems.map((it, i) => (
                      <tr key={i} className="border-t border-black/5">
                        <td className="p-2 font-bold">{it.scope}</td>
                        <td className="p-2 text-right"><input type="number" className="h-8 w-16 rounded border border-black/10 px-1 text-right text-sm outline-none focus:border-[#f2df0d]" value={it.quantity} onChange={(e) => updateItem(i, "quantity", e.target.value)} /></td>
                        <td className="p-2 text-right text-black/50">{it.unit}</td>
                        <td className="p-2 text-right"><input type="number" className="h-8 w-20 rounded border border-black/10 px-1 text-right text-sm outline-none focus:border-[#f2df0d]" value={it.unit_price} onChange={(e) => updateItem(i, "unit_price", e.target.value)} /></td>
                        <td className="p-2 text-right font-black">${((Number(it.quantity) || 0) * (Number(it.unit_price) || 0)).toFixed(2)}</td>
                        <td className="p-2"><button onClick={() => removeLineItem(i)} className="grid h-7 w-7 place-items-center rounded text-black/40 hover:bg-red-50 hover:text-red-500"><X size={14} /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end border-t border-black/10 bg-black/[.02] px-3 py-2 text-sm font-black">Total: ${totalValue.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={generating || (!jobText.trim() && lineItems.length === 0)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#f2df0d] px-6 py-4 text-base font-black text-black shadow-[0_4px_14px_rgba(255,196,0,.28)] transition hover:bg-[#f4e431] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generating ? <><Loader2 size={20} className="animate-spin" /> Generating proposal…</> : <><Zap size={20} /> Generate Proposal →</>}
        </button>

        {/* Generated proposal */}
        {generatedHtml && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black"><FileText size={16} className="text-[#b0a209]" /> Generated Proposal</h3>
              <div className="flex gap-2">
                {savedId ? (
                  <button onClick={() => nav(`/proposals/${savedId}`)} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-black text-white hover:bg-emerald-600"><Check size={14} /> Open Proposal</button>
                ) : (
                  <button onClick={saveProposal} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-black px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : <><Save size={14} /> Save Proposal</>}</button>
                )}
              </div>
            </div>
            <HtmlPreview html={generatedHtml} minHeight={500} className="rounded-lg border border-black/10" />
          </div>
        )}

        {/* Approved template preview */}
        {hasTemplate && template?.content && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-black"><FileText size={16} className="text-[#b0a209]" /> Your Approved Proposal Template</h3>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Approved · {template.name || "Default"}</span>
            </div>
            <p className="mb-2 text-xs text-black/45">This is the branded template from your onboarding. Generated proposals use this layout and styling.</p>
            <HtmlPreview html={template.content} minHeight={500} className="rounded-lg border border-black/10" />
          </div>
        )}

        {/* Setup nudge */}
        {!hasTemplate && (
          <p className="mt-4 text-center text-xs text-black/45">
            No proposal template found. <button onClick={() => nav("/auto-bids-setup")} className="font-bold text-[#b0a209] underline">Set up Auto Bids</button> to create your branded template first.
          </p>
        )}
      </div>
    </div>
  );
}