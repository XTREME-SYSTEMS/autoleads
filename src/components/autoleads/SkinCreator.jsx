import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Check, Eye, Save } from "lucide-react";
import { useOrgId } from "@/hooks/useOrgContext";

const SKIN_PRESETS = [
  { key: "modern_dark", label: "Modern Dark", primary: "#f2df0d", secondary: "#0A0A0A", bg: "#0A0A0A", text: "#FFFFFF" },
  { key: "clean_light", label: "Clean Light", primary: "#0A0A0A", secondary: "#f2df0d", bg: "#FFFFFF", text: "#0A0A0A" },
  { key: "bold_blue", label: "Bold Blue", primary: "#2563EB", secondary: "#1E3A8A", bg: "#0F172A", text: "#FFFFFF" },
  { key: "warm_earth", label: "Warm Earth", primary: "#D97706", secondary: "#78350F", bg: "#1C1917", text: "#FFFFFF" },
  { key: "forest_green", label: "Forest Green", primary: "#16A34A", secondary: "#14532D", bg: "#0A0A0A", text: "#FFFFFF" },
  { key: "royal_purple", label: "Royal Purple", primary: "#9333EA", secondary: "#581C87", bg: "#0A0A0A", text: "#FFFFFF" },
];

const LAYOUT_STYLES = [
  { key: "modern", label: "Modern", desc: "Dark with accent highlights" },
  { key: "classic", label: "Classic", desc: "Light, traditional layout" },
  { key: "bold", label: "Bold", desc: "Strong header, prominent logo" },
  { key: "minimal", label: "Minimal", desc: "Ultra-clean, whitespace" },
];

export default function SkinCreator({ companyInfo, companyLogo, userTrades, images, companyIntel }) {
  const orgId = useOrgId();
  const [selectedPreset, setSelectedPreset] = useState("modern_dark");
  const [primaryColor, setPrimaryColor] = useState("#f2df0d");
  const [secondaryColor, setSecondaryColor] = useState("#0A0A0A");
  const [layoutStyle, setLayoutStyle] = useState("modern");
  const [heroImage, setHeroImage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [contractorApp, setContractorApp] = useState(null);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const apps = await base44.entities.ContractorApp.filter({ organization_id: orgId }).catch(() => []);
        if (apps && apps.length > 0) {
          setContractorApp(apps[0]);
          if (apps[0].primary_color) setPrimaryColor(apps[0].primary_color);
          if (apps[0].secondary_color) setSecondaryColor(apps[0].secondary_color);
          if (apps[0].layout_style) setLayoutStyle(apps[0].layout_style);
          if (apps[0].hero_image_url) setHeroImage(apps[0].hero_image_url);
          const matched = SKIN_PRESETS.find(p => p.primary === apps[0].primary_color);
          if (matched) setSelectedPreset(matched.key);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (companyIntel?.recommended_colors && companyIntel.recommended_colors.length >= 2 && !contractorApp) {
      setPrimaryColor(companyIntel.recommended_colors[0]);
      setSecondaryColor(companyIntel.recommended_colors[1]);
      setSelectedPreset("custom");
    }
  }, [companyIntel]);

  const applyPreset = (preset) => {
    setSelectedPreset(preset.key);
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
  };

  const saveSkin = async () => {
    setSaving(true);
    try {
      const slug = (companyInfo?.name || "contractor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const payload = {
        organization_id: orgId,
        company_name: companyInfo?.name || "",
        logo_url: companyLogo || "",
        tagline: "Premium construction solutions",
        about: companyInfo?.company_highlights || "",
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        layout_style: layoutStyle,
        hero_image_url: heroImage,
        share_slug: slug,
        is_published: true,
        services: userTrades || [],
        contact_phone: companyInfo?.phone || "",
        contact_email: companyInfo?.email || "",
        website: companyInfo?.website || "",
      };
      let app;
      if (contractorApp?.id) {
        app = await base44.entities.ContractorApp.update(contractorApp.id, { ...payload, share_slug: contractorApp.share_slug });
      } else {
        app = await base44.entities.ContractorApp.create(payload);
      }
      setContractorApp(app);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert("Save failed: " + (err?.message || "try again"));
    } finally {
      setSaving(false);
    }
  };

  const heroImageOptions = (images || []).filter(img => img.image_url);
  const isDark = layoutStyle === "modern" || layoutStyle === "bold";
  const previewBg = isDark ? secondaryColor : "#FFFFFF";
  const previewText = isDark ? "#FFFFFF" : "#0A0A0A";

  return (
    <div className="space-y-5">
      {companyIntel && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-bold text-emerald-700">✓ AI scraped your company's online presence</p>
          {companyIntel.company_style && <p className="mt-1 text-[11px] text-emerald-600">{companyIntel.company_style}</p>}
          {companyIntel.recommended_colors && (
            <p className="mt-1 text-[11px] text-emerald-600">Recommended colors: {companyIntel.recommended_colors.join(" / ")}</p>
          )}
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-black/50">Branded Skin Presets</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {SKIN_PRESETS.map(preset => (
            <button key={preset.key} onClick={() => applyPreset(preset)} className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition ${selectedPreset === preset.key ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 hover:border-black/20"}`}>
              <div className="flex gap-0.5">
                <div className="h-6 w-3 rounded-sm" style={{ background: preset.primary }} />
                <div className="h-6 w-3 rounded-sm" style={{ background: preset.secondary }} />
              </div>
              <span className="text-[9px] font-bold">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-black/50">Custom Brand Colors</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-bold">Primary (Accent)</label>
            <div className="flex items-center gap-2">
              <input type="color" value={primaryColor} onChange={e => { setPrimaryColor(e.target.value); setSelectedPreset("custom"); }} className="h-10 w-12 cursor-pointer rounded border border-black/15" />
              <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 flex-1 rounded-lg border border-black/15 px-3 text-xs font-mono" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold">Secondary</label>
            <div className="flex items-center gap-2">
              <input type="color" value={secondaryColor} onChange={e => { setSecondaryColor(e.target.value); setSelectedPreset("custom"); }} className="h-10 w-12 cursor-pointer rounded border border-black/15" />
              <input type="text" value={secondaryColor} onChange={e => setSecondaryColor(e.target.value)} className="h-10 flex-1 rounded-lg border border-black/15 px-3 text-xs font-mono" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-black/50">Layout Style</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {LAYOUT_STYLES.map(style => (
            <button key={style.key} onClick={() => setLayoutStyle(style.key)} className={`rounded-lg border-2 p-3 text-left transition ${layoutStyle === style.key ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 hover:border-black/20"}`}>
              <span className="block text-sm font-black">{style.label}</span>
              <span className="block text-[10px] text-black/40">{style.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {heroImageOptions.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-black/50">Hero Image (Featured)</h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {heroImageOptions.slice(0, 10).map(img => (
              <button key={img.id} onClick={() => setHeroImage(img.image_url)} className={`overflow-hidden rounded-lg border-2 transition ${heroImage === img.image_url ? "border-[#f2df0d]" : "border-black/10 hover:border-black/20"}`}>
                <img src={img.image_url} className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black/50"><Eye size={12} /> Live Preview</h3>
        <div className="mx-auto max-w-[280px] overflow-hidden rounded-[24px] border-4 border-black/80 shadow-xl" style={{ background: previewBg, color: previewText }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ background: layoutStyle === "bold" ? primaryColor : "transparent" }}>
            {companyLogo ? <img src={companyLogo} className="max-h-8 object-contain" style={{ filter: layoutStyle === "bold" && isDark ? "brightness(0)" : "none" }} alt="" /> : <span className="text-xs font-black">{companyInfo?.name || "Company"}</span>}
            <div className="rounded-full px-2 py-1 text-[9px] font-black" style={{ background: primaryColor, color: isDark ? previewBg : "#fff" }}>CALL</div>
          </div>
          <div className="relative h-32">
            {heroImage ? <img src={heroImage} className="h-full w-full object-cover" /> : heroImageOptions[0]?.image_url ? <img src={heroImageOptions[0].image_url} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center" style={{ background: secondaryColor }}><span className="text-xs text-white/40">No hero image</span></div>}
            <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${previewBg}, transparent)` }} />
            <div className="absolute bottom-2 left-3">
              <p className="text-sm font-black">{companyInfo?.name || "Company"}</p>
              <p className="text-[10px]" style={{ color: primaryColor }}>Premium construction solutions</p>
            </div>
          </div>
          <div className="px-3 py-3">
            <p className="mb-2 text-[9px] font-black uppercase" style={{ color: primaryColor }}>Our Services</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(userTrades || []).slice(0, 4).map((s, i) => (
                <div key={i} className="flex items-center gap-1 rounded-lg border p-1.5" style={{ borderColor: `${previewText}20`, background: `${previewText}08` }}>
                  <div className="h-2 w-2 rounded-full" style={{ background: primaryColor }} />
                  <span className="truncate text-[9px] font-bold">{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="px-3 pb-3">
            <p className="mb-1.5 text-[9px] font-black uppercase" style={{ color: primaryColor }}>Gallery</p>
            <div className="grid grid-cols-3 gap-1">
              {heroImageOptions.slice(0, 6).map((img, i) => (
                <img key={i} src={img.image_url} className="aspect-square w-full rounded object-cover" />
              ))}
            </div>
          </div>
          <div className="px-3 pb-4">
            <div className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-[10px] font-black" style={{ background: primaryColor, color: isDark ? previewBg : "#fff" }}>
              GET A FREE QUOTE
            </div>
          </div>
        </div>
      </div>

      <button onClick={saveSkin} disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">
        {saving ? <><Loader2 size={16} className="animate-spin" />Saving Skin…</> : saved ? <><Check size={16} /> Skin Saved!</> : <><Save size={16} /> Save Branded Skin</>}
      </button>
    </div>
  );
}