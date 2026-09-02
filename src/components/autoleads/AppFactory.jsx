import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Factory, CheckCircle2 } from "lucide-react";
import HtmlPreview from "./HtmlPreview";
import { useOrgId } from "@/hooks/useOrgContext";

const APP_STYLES = [
  { key: "brochure", name: "Digital Brochure", desc: "Elegant multi-section brochure", layout: "classic", primary: "#1E3A5F", secondary: "#F5F5F5" },
  { key: "bizcard", name: "Digital Business Card", desc: "Compact, contact-focused card", layout: "minimal", primary: "#0A0A0A", secondary: "#FFFFFF" },
  { key: "website", name: "Modern Website", desc: "Full landing page with hero", layout: "modern", primary: "#f2df0d", secondary: "#0A0A0A" },
  { key: "portfolio", name: "Portfolio Gallery", desc: "Image-first grid showcase", layout: "bold", primary: "#2563EB", secondary: "#0F172A" },
  { key: "executive", name: "Executive Landing", desc: "Professional corporate landing", layout: "modern", primary: "#D97706", secondary: "#1C1917" },
];

function stripMarkdown(text) {
  if (!text) return "";
  let cleaned = text.replace(/```(?:html)?/gi, "").replace(/```/g, "");
  const idx = cleaned.search(/<(!DOCTYPE|html|head|div|h1|p|table|section)/i);
  if (idx > 0) cleaned = cleaned.slice(idx);
  return cleaned.trim();
}

export default function AppFactory({ companyInfo, companyLogo, userTrades, images, onAppCreated = null }) {
  const orgId = useOrgId();
  const [generating, setGenerating] = useState(false);
  const [designs, setDesigns] = useState(/** @type {any[]} */ ([]));
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingApp, setExistingApp] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      const apps = await base44.entities.ContractorApp.filter({ organization_id: orgId }).catch(() => []);
      if (apps?.length > 0) setExistingApp(apps[0]);
    })();
  }, [orgId]);

  const generateDesigns = async () => {
    if (generating) return;
    setGenerating(true);
    setDesigns([]);
    setSelectedDesign(null);
    const tradeStr = (userTrades || []).join(", ") || "general construction";
    const fileUrls = companyLogo ? [companyLogo] : [];
    const companyCtx = companyInfo?.name ? `Company: ${companyInfo.name}. Website: ${companyInfo.website || "N/A"}. Phone: ${companyInfo.phone || "N/A"}. Email: ${companyInfo.email || "N/A"}.` : "";
    const heroImg = (images || []).find(i => i.image_url)?.image_url;

    try {
      const results = await Promise.all(APP_STYLES.map(async (style) => {
        const prompt = `Create a professional contractor app / mobile landing page for a construction company specializing in ${tradeStr}.
Design style: "${style.name}" — ${style.desc}.
${companyLogo ? `Embed the company logo at the top using: <img src="${companyLogo}" style="max-height:50px;object-fit:contain;" />. ` : ""}${heroImg ? `Use this as the hero image: <img src="${heroImg}" style="width:100%;height:200px;object-fit:cover;" />. ` : ""}${companyCtx}
The page must include: company header with logo, hero section, services list (${tradeStr}), project gallery section, contact section, and a "Get a Quote" CTA button.
Return ONLY valid HTML. Start with <!DOCTYPE html>. All CSS in a <style> tag. Make it mobile-responsive and visually stunning. Use ${style.primary} as primary color and ${style.secondary} as background.`;
        const res = await base44.integrations.Core.InvokeLLM({ prompt, file_urls: fileUrls.length ? fileUrls : undefined });
        const content = stripMarkdown(typeof res === "string" ? res : res?.response || res?.text || "");
        return { ...style, content };
      }));
      setDesigns(results.filter(r => r.content));
    } catch {}
    finally { setGenerating(false); }
  };

  useEffect(() => {
    if (!existingApp && designs.length === 0 && !generating) {
      generateDesigns();
    }
  }, [existingApp]);

  const selectAndSave = async (design) => {
    setSelectedDesign(design.key);
    setSaving(true);
    try {
      const slug = (companyInfo?.name || "contractor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const payload = {
        organization_id: orgId,
        company_name: companyInfo?.name || "",
        logo_url: companyLogo || "",
        tagline: "Premium construction solutions",
        about: companyInfo?.company_highlights || "",
        primary_color: design.primary,
        secondary_color: design.secondary,
        layout_style: design.layout,
        hero_image_url: (images || []).find(i => i.image_url)?.image_url || "",
        share_slug: slug,
        is_published: true,
        services: userTrades || [],
        contact_phone: companyInfo?.phone || "",
        contact_email: companyInfo?.email || "",
        website: companyInfo?.website || "",
      };
      let app;
      if (existingApp?.id) {
        app = await base44.entities.ContractorApp.update(existingApp.id, { ...payload, share_slug: existingApp.share_slug });
      } else {
        app = await base44.entities.ContractorApp.create(payload);
      }
      setExistingApp(app);
      setSaved(true);
      if (onAppCreated) onAppCreated(app);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Save failed: " + (err?.message || "try again"));
    } finally {
      setSaving(false);
    }
  };

  if (existingApp && !selectedDesign && !generating && designs.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 size={28} className="mx-auto text-emerald-600" />
        <p className="mt-2 text-sm font-black">Contractor app already created!</p>
        <p className="mt-1 text-xs text-black/50">Your branded contractor app is live at /contractor-app/{existingApp.share_slug}</p>
        <div className="mt-4 flex gap-2">
          <a href={`/contractor-app/${existingApp.share_slug}`} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-xs font-black text-black">View Live App</a>
          <button onClick={generateDesigns} className="flex-1 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-xs font-bold hover:bg-black/[.02]">Regenerate Options</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#f2df0d] bg-[#fdfbe1] p-3">
        <p className="flex items-center gap-1.5 text-xs font-black text-[#b0a209]"><Factory size={14} /> App Factory — Auto-generating 5 branded contractor app designs</p>
        <p className="mt-1 text-[11px] text-black/50">Each design is a different style: digital brochure, business card, website, portfolio, and executive landing. Pick your favorite to publish instantly.</p>
      </div>

      {generating && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-[#fdfbe1] p-6 text-sm font-bold text-[#b0a209]">
          <Loader2 size={18} className="animate-spin" /> Generating 5 branded app designs…
        </div>
      )}

      {designs.length > 0 && !generating && (
        <div className="space-y-4">
          {designs.map((d) => (
            <div key={d.key} className={`rounded-xl border-2 p-3 transition ${selectedDesign === d.key ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 bg-white"}`}>
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <span className="text-sm font-black">{d.name}</span>
                  <span className="ml-2 text-[11px] text-black/40">{d.desc}</span>
                </div>
                {selectedDesign === d.key ? (
                  <span className="flex items-center gap-1 text-xs font-black text-[#b0a209]"><Check size={14} /> Selected</span>
                ) : (
                  <button onClick={() => selectAndSave(d)} disabled={saving} className="rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black hover:bg-[#f4e431] disabled:opacity-40">Use this design</button>
                )}
              </div>
              <HtmlPreview html={d.content} minHeight={400} className="rounded-lg border border-black/10" />
            </div>
          ))}
        </div>
      )}

      {saved && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
          <Check size={16} /> Contractor app published! View it at the share link.
        </div>
      )}

      {designs.length > 0 && !generating && (
        <button onClick={generateDesigns} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/[.02]">
          <Loader2 size={16} /> Regenerate All Designs
        </button>
      )}
    </div>
  );
}