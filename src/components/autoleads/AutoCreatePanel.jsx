import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Check, Loader2, Sparkles } from "lucide-react";
import MobileSelect from "@/components/autoleads/MobileSelect";

export default function AutoCreatePanel({ sectors, images, companyInfo, userTrades, onImagesChange, open, onClose, companyIntel }) {
  const [selectedSectors, setSelectedSectors] = useState(new Set());
  const [imgsPerSector, setImgsPerSector] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, currentSector: "" });

  useEffect(() => {
    if (open) {
      const allKeys = new Set();
      sectors.forEach(cat => cat.sectors.forEach(s => allKeys.add(s.key)));
      setSelectedSectors(allKeys);
    }
  }, [open]);

  const sectorImageCounts = {};
  images.forEach(img => { if (img.sector) sectorImageCounts[img.sector] = (sectorImageCounts[img.sector] || 0) + 1; });

  const toggleSector = (key) => {
    setSelectedSectors(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleCategory = (catIndex) => {
    const cat = sectors[catIndex];
    const allSelected = cat.sectors.every(s => selectedSectors.has(s.key));
    setSelectedSectors(prev => {
      const next = new Set(prev);
      cat.sectors.forEach(s => { if (allSelected) next.delete(s.key); else next.add(s.key); });
      return next;
    });
  };

  const generateAll = async () => {
    if (generating || selectedSectors.size === 0) return;
    setGenerating(true);
    const sectorList = [];
    sectors.forEach(cat => cat.sectors.forEach(s => { if (selectedSectors.has(s.key)) sectorList.push({ ...s, category: cat.category }); }));
    setProgress({ current: 0, total: sectorList.length, currentSector: sectorList[0]?.label || "" });
    for (let i = 0; i < sectorList.length; i++) {
      const sector = sectorList[i];
      setProgress({ current: i, total: sectorList.length, currentSector: sector.label });
      try {
        const enhancer = companyIntel?.image_prompt_enhancer ? ` ${companyIntel.image_prompt_enhancer}.` : "";
        const prompt = `Ultra-realistic professional architectural photograph of ${sector.prompt}.${enhancer} ${companyInfo?.name ? `Project by ${companyInfo.name}.` : ""} High resolution, natural lighting, showing texture and finish detail. Professional real estate photography, wide-angle lens, no people, clean modern aesthetic. Photorealistic, 8K quality.`;
        const results = await Promise.all(
          Array.from({ length: imgsPerSector }, () => base44.integrations.Core.GenerateImage({ prompt }).catch(() => null))
        );
        const urls = results.map(r => r?.url || r?.file_url).filter(Boolean);
        const recs = await Promise.all(urls.map(url =>
          base44.entities.ProjectImage.create({
            title: `${sector.label} — AI Generated`,
            image_url: url,
            trade: (userTrades || []).join(", "),
            category: sector.category,
            sector: sector.key,
            sector_label: sector.label,
            source: "ai_generated",
            description: `AI-generated image for ${sector.label}`,
          })
        ));
        onImagesChange(prev => [...prev, ...recs]);
      } catch {}
    }
    setProgress({ current: sectorList.length, total: sectorList.length, currentSector: "" });
    setGenerating(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-6 py-4">
          <div>
            <h2 className="text-xl font-black">Auto Create Image Database</h2>
            <p className="text-xs text-black/50">Select categories and sub-categories — we'll generate up to {imgsPerSector} images per sector</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-6">
          {generating ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] p-4">
                <Loader2 size={20} className="animate-spin text-[#b0a209]" />
                <div>
                  <p className="text-sm font-black">Generating {progress.current}/{progress.total} sectors</p>
                  <p className="text-xs text-black/50">{progress.currentSector}…</p>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-[#f2df0d] transition-all" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-black">Images per sector:</span>
                <MobileSelect value={imgsPerSector} onChange={v => setImgsPerSector(Number(v))} className="h-9 rounded-lg border border-black/15 bg-white px-2 text-xs font-bold">
                  {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                </MobileSelect>
                <span className="ml-auto text-xs font-bold text-black/50">{selectedSectors.size} sectors selected</span>
              </div>
              {sectors.map((cat, catIndex) => {
                const allSelected = cat.sectors.every(s => selectedSectors.has(s.key));
                const someSelected = cat.sectors.some(s => selectedSectors.has(s.key));
                return (
                  <div key={catIndex} className="rounded-xl border border-black/10">
                    <div className="flex items-center gap-2 border-b border-black/5 px-4 py-3">
                      <button onClick={() => toggleCategory(catIndex)} className={`grid h-5 w-5 place-items-center rounded border ${allSelected ? "border-[#f2df0d] bg-[#f2df0d]" : someSelected ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/20 bg-white"}`}>
                        {allSelected && <Check size={12} className="text-black" />}
                      </button>
                      <span className="text-sm font-black">{cat.category}</span>
                      <span className="ml-auto text-xs text-black/40">{cat.sectors.filter(s => selectedSectors.has(s.key)).length}/{cat.sectors.length} selected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                      {cat.sectors.map(s => {
                        const isSelected = selectedSectors.has(s.key);
                        const count = sectorImageCounts[s.key] || 0;
                        return (
                          <button key={s.key} onClick={() => toggleSector(s.key)} className={`flex items-center gap-2 rounded-lg border p-2 text-left transition ${isSelected ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 bg-white hover:bg-black/[.02]"}`}>
                            <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${isSelected ? "border-[#f2df0d] bg-[#f2df0d]" : "border-black/20"}`}>
                              {isSelected && <Check size={10} className="text-black" />}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold">{s.label}</p>
                              {count > 0 && <p className="text-[10px] font-bold text-emerald-600">{count} img{count !== 1 ? "s" : ""} ✓</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {!generating && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-black/10 px-6 py-4">
            <button onClick={onClose} className="rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/[.02]">Cancel</button>
            <button onClick={generateAll} disabled={selectedSectors.size === 0} className="flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">
              <Sparkles size={16} /> Generate {selectedSectors.size * imgsPerSector} Images
            </button>
          </div>
        )}
      </div>
    </div>
  );
}