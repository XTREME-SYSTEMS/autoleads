import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Upload, Sparkles, X, Loader2, Image as ImageIcon, Wand2, Scan, Check, Plus } from "lucide-react";
import AutoCreatePanel from "./AutoCreatePanel";
import MobileSelect from "@/components/autoleads/MobileSelect";
import { useOrgId } from "@/hooks/useOrgContext";

export default function ImageGalleryTab({ sectors, images, onImagesChange, companyInfo, userTrades, companyIntel }) {
  const orgId = useOrgId();
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeSector, setActiveSector] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [smartGenerating, setSmartGenerating] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [generateCount, setGenerateCount] = useState(4);
  const [pendingImages, setPendingImages] = useState(/** @type {any[]} */ ([]));
  const [selectedPending, setSelectedPending] = useState(new Set());
  const [pendingMeta, setPendingMeta] = useState(null);
  const [autoCreateOpen, setAutoCreateOpen] = useState(false);
  const fileRef = useRef(null);

  const currentCategory = sectors[activeCategory];
  const sectorList = currentCategory?.sectors || [];

  useEffect(() => {
    if (sectorList.length > 0) {
      setActiveSector(sectorList[0].key);
    }
  }, [activeCategory]);

  const filteredImages = activeSector ? images.filter(img => img.sector === activeSector) : [];
  const sectorImageCounts = {};
  images.forEach(img => { if (img.sector) sectorImageCounts[img.sector] = (sectorImageCounts[img.sector] || 0) + 1; });
  const totalSectors = sectors.reduce((acc, cat) => acc + cat.sectors.length, 0);
  const completedSectors = sectors.reduce((acc, cat) => acc + cat.sectors.filter(s => (sectorImageCounts[s.key] || 0) > 0).length, 0);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    setScanning(true);
    try {
      for (const file of files) {
        const up = await base44.integrations.Core.UploadFile({ file });
        let scanData = { title: file.name.replace(/\.[^.]+$/, ""), sector: activeSector, space_type: "", description: "" };
        try {
          const scan = await base44.integrations.Core.InvokeLLM({
            prompt: "Analyze this construction/flooring project image. Identify the flooring type or construction scope, the space type, and provide a brief title and description. Return as JSON.",
            file_urls: [up.file_url],
            response_json_schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                space_type: { type: "string" },
                description: { type: "string" },
              },
            },
          });
          if (scan) {
            scanData = {
              title: scan.title || scanData.title,
              sector: activeSector,
              space_type: scan.space_type || "",
              description: scan.description || "",
            };
          }
        } catch {}
        const rec = await base44.entities.ProjectImage.create({
          organization_id: orgId,
          title: scanData.title,
          image_url: up.file_url,
          trade: (userTrades || []).join(", "),
          category: currentCategory?.category || "",
          sector: activeSector,
          sector_label: sectorList.find(s => s.key === activeSector)?.label || "",
          space_type: scanData.space_type,
          description: scanData.description,
          source: "uploaded",
        });
        onImagesChange(prev => [...prev, rec]);
      }
    } catch (err) {
      alert("Upload failed: " + (err?.message || "try again"));
    } finally {
      setUploading(false);
      setScanning(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleAIGenerate = async () => {
    if (generating || smartGenerating) return;
    const sector = sectorList.find(s => s.key === activeSector);
    if (!sector) return;
    setGenerating(true);
    setPendingImages([]);
    setSelectedPending(new Set());
    setPendingMeta({ sector: activeSector, sectorLabel: sector.label, category: currentCategory?.category || "", source: "ai_generated", space_type: "", description: `AI-generated image for ${sector.label}` });
    try {
      const prompt = `Ultra-realistic professional architectural photograph of ${sector.prompt}. ${companyInfo?.name ? `Project by ${companyInfo.name}.` : ""} High resolution, natural lighting, showing texture and finish detail. Professional real estate photography, wide-angle lens, no people, clean modern aesthetic. Photorealistic, 8K quality.`;
      const results = await Promise.all(
        Array.from({ length: generateCount }, () => base44.integrations.Core.GenerateImage({ prompt }).catch(() => null))
      );
      const urls = results.map(r => r?.url || r?.file_url).filter(Boolean);
      setPendingImages(urls);
      setSelectedPending(new Set(urls.map((_, i) => i)));
    } catch (err) {
      alert("Generation failed: " + (err?.message || "try again"));
    } finally {
      setGenerating(false);
    }
  };

  const handleSmartGenerate = async () => {
    if (generating || smartGenerating) return;
    const sector = sectorList.find(s => s.key === activeSector);
    if (!sector) return;
    setSmartGenerating(true);
    setPendingImages([]);
    setSelectedPending(new Set());
    setPendingMeta({ sector: activeSector, sectorLabel: sector.label, category: currentCategory?.category || "", source: "ai_generated", space_type: "", description: sector.prompt });
    try {
      const searchRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Search the web for "${companyInfo?.name || "this construction company"}" and their work with ${sector.label}. Their website is ${companyInfo?.website || "not provided"}. Describe what their ${sector.label} projects typically look like — the space type, style, and key visual features. Return as JSON.`,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            space_type: { type: "string" },
            visual_features: { type: "string" },
          },
        },
      });
      const desc = searchRes?.description || sector.prompt;
      const spaceType = searchRes?.space_type || "";
      const visualFeatures = searchRes?.visual_features || "";
      const prompt = `Ultra-realistic professional architectural photograph of ${spaceType || "a commercial space"} with ${sector.prompt}. ${visualFeatures ? `Key features: ${visualFeatures}.` : ""} ${companyInfo?.name ? `Style matching ${companyInfo.name}'s actual work.` : ""} High resolution, natural lighting, photorealistic, 8K quality, professional real estate photography.`;
      setPendingMeta(prev => ({ ...prev, space_type: spaceType, description: desc }));
      const results = await Promise.all(
        Array.from({ length: generateCount }, () => base44.integrations.Core.GenerateImage({ prompt }).catch(() => null))
      );
      const urls = results.map(r => r?.url || r?.file_url).filter(Boolean);
      setPendingImages(urls);
      setSelectedPending(new Set(urls.map((_, i) => i)));
    } catch (err) {
      alert("Smart generation failed: " + (err?.message || "try again"));
    } finally {
      setSmartGenerating(false);
    }
  };

  const removeImage = async (id) => {
    try {
      await base44.entities.ProjectImage.delete(id);
      onImagesChange(prev => prev.filter(img => img.id !== id));
    } catch {}
  };

  const togglePending = (index) => {
    setSelectedPending(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const saveSelectedImages = async () => {
    if (!pendingMeta || selectedPending.size === 0) return;
    const sectorLabel = pendingMeta.sectorLabel;
    const toSave = [...selectedPending].sort((a, b) => a - b).map(i => pendingImages[i]).filter(Boolean);
    try {
      const recs = await Promise.all(toSave.map(url =>
        base44.entities.ProjectImage.create({
          organization_id: orgId,
          title: `${sectorLabel} — AI Generated`,
          image_url: url,
          trade: (userTrades || []).join(", "),
          category: pendingMeta.category,
          sector: pendingMeta.sector,
          sector_label: sectorLabel,
          space_type: pendingMeta.space_type || "",
          source: "ai_generated",
          description: pendingMeta.description || `AI-generated image for ${sectorLabel}`,
        })
      ));
      onImagesChange(prev => [...prev, ...recs]);
      setPendingImages([]);
      setSelectedPending(new Set());
      setPendingMeta(null);
    } catch (err) {
      alert("Save failed: " + (err?.message || "try again"));
    }
  };

  const discardPending = () => {
    setPendingImages([]);
    setSelectedPending(new Set());
    setPendingMeta(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {sectors.map((cat, i) => (
          <button key={i} onClick={() => setActiveCategory(i)} className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeCategory === i ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/50 hover:bg-black/10"}`}>{cat.category}</button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {sectorList.map(s => (
          <button key={s.key} onClick={() => setActiveSector(s.key)} className={`rounded-full px-3 py-1 text-xs font-bold transition ${activeSector === s.key ? "bg-[#0b0b0b] text-white" : "bg-black/5 text-black/50 hover:bg-black/10"}`}>{s.label}</button>
        ))}
      </div>
      <div className="rounded-lg border border-black/10 bg-black/[.02] p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black">Image Database Progress</span>
          <span className="text-xs font-bold text-black/50">{completedSectors}/{totalSectors} sectors have images</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/5">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${totalSectors > 0 ? (completedSectors / totalSectors) * 100 : 0}%` }} />
        </div>
      </div>
      <button onClick={() => setAutoCreateOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#f2df0d] bg-[#fdfbe1] px-4 py-2.5 text-sm font-black text-[#b0a209] hover:bg-[#fcf9cf]">
        <Sparkles size={16} /> Auto Create All — Generate Image Database
      </button>
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" />
        <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40 min-w-[120px]">
          {uploading ? <><Loader2 size={16} className="animate-spin" />{scanning ? "Scanning…" : "Uploading…"}</> : <><Upload size={16} /> Upload Photos</>}
        </button>
        <div className="flex items-center gap-1.5">
          <MobileSelect value={generateCount} onChange={v => setGenerateCount(Number(v))} disabled={generating || smartGenerating} className="h-10 rounded-lg border border-black/15 bg-white px-2 text-xs font-bold disabled:opacity-40">
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} imgs</option>)}
          </MobileSelect>
          <button onClick={handleAIGenerate} disabled={generating || smartGenerating} className="flex items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-sm font-black text-black disabled:opacity-40">
            {generating ? <><Loader2 size={16} className="animate-spin" />Generating…</> : <><Sparkles size={16} /> AI Generate</>}
          </button>
          <button onClick={handleSmartGenerate} disabled={generating || smartGenerating} className="flex items-center justify-center gap-2 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] px-3 py-2.5 text-sm font-black text-[#b0a209] disabled:opacity-40" title="Searches your website and generates matching images">
            {smartGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
          </button>
        </div>
      </div>
      {(generating || smartGenerating) && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] p-4 text-sm font-bold text-[#b0a209]">
          <Loader2 size={18} className="animate-spin" /> Generating {generateCount} images — you'll be able to pick your favorites…
        </div>
      )}
      {pendingImages.length > 0 && (
        <div className="rounded-xl border-2 border-[#f2df0d] bg-[#fdfbe1] p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-black">Pick the images you like ({selectedPending.size}/{pendingImages.length} selected)</span>
            <div className="flex gap-2">
              <button onClick={discardPending} className="rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs font-bold hover:bg-black/[.02]">Discard All</button>
              <button onClick={saveSelectedImages} disabled={selectedPending.size === 0} className="rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40">Save Selected</button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {pendingImages.map((url, i) => (
              <div key={i} className={`relative cursor-pointer overflow-hidden rounded-lg border-2 transition ${selectedPending.has(i) ? "border-[#f2df0d]" : "border-transparent opacity-60 hover:opacity-100"}`} onClick={() => togglePending(i)}>
                <img src={url} className="aspect-square w-full object-cover" />
                <div className={`absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full ${selectedPending.has(i) ? "bg-[#f2df0d] text-black" : "bg-black/50 text-white"}`}>
                  {selectedPending.has(i) ? <Check size={14} /> : <Plus size={14} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {filteredImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredImages.map(img => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg border border-black/10">
              <img src={img.image_url} className="aspect-square w-full object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                <p className="truncate text-xs font-bold text-white">{img.title}</p>
                {img.source === "ai_generated" && <span className="text-[9px] font-bold text-[#f2df0d]">AI GENERATED</span>}
                {img.source === "uploaded" && img.description && <span className="block truncate text-[9px] text-white/60">{img.description}</span>}
              </div>
              <button onClick={() => removeImage(img.id)} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"><X size={12} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid place-items-center rounded-lg border border-dashed border-black/15 p-8 text-center">
          <ImageIcon size={32} className="text-black/20" />
          <p className="mt-2 text-sm text-black/40">No images in this sector yet.<br />Upload photos (multi-select supported) or generate with AI.</p>
        </div>
      )}
      {scanning && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] p-3 text-xs font-bold text-[#b0a209]">
          <Scan size={14} className="animate-pulse" /> AI is scanning your uploaded images to categorize them…
        </div>
      )}
      <AutoCreatePanel sectors={sectors} images={images} companyInfo={companyInfo} userTrades={userTrades} onImagesChange={onImagesChange} open={autoCreateOpen} onClose={() => setAutoCreateOpen(false)} companyIntel={companyIntel} />
    </div>
  );
}