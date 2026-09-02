import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Image as ImageIcon, FileText, Check, Loader2, Palette, Factory } from "lucide-react";
import ImageGalleryTab from "./ImageGalleryTab";
import DigitalAssetsTab from "./DigitalAssetsTab";
import SkinCreator from "./SkinCreator";
import AppFactory from "./AppFactory";
import { getTradeSectors } from "@/lib/tradeSectors";
import { generateIntelligentSectors, scrapeCompanyIntelligence } from "@/lib/intelligentSectors";
import { useOrgId } from "@/hooks/useOrgContext";

export default function AutoAppPhase({ companyInfo, companyLogo, userTrades, onComplete, thinking }) {
  const orgId = useOrgId();
  const [activeTab, setActiveTab] = useState("assets");
  const [images, setImages] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState(getTradeSectors(userTrades));
  const [companyIntel, setCompanyIntel] = useState(null);
  const [generatingSectors, setGeneratingSectors] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const imgs = await base44.entities.ProjectImage.filter({ organization_id: orgId }).catch(() => []);
        setImages(imgs || []);
        setGeneratingSectors(true);
        const [intel, aiSectors] = await Promise.all([
          scrapeCompanyIntelligence(companyInfo, userTrades),
          generateIntelligentSectors(userTrades, companyInfo),
        ]);
        if (intel) setCompanyIntel(intel);
        if (aiSectors && aiSectors.length > 0) setSectors(aiSectors);
      } catch {}
      finally { setLoading(false); setGeneratingSectors(false); }
    })();
  }, []);

  return (
    <div className="space-y-4">
      {generatingSectors && (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] p-3 text-xs font-bold text-[#b0a209]">
          <Loader2 size={14} className="animate-spin" /> Analyzing your trade and company online to create intelligent image sectors…
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setActiveTab("factory")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${activeTab === "factory" ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/50 hover:bg-black/10"}`}>
          <Factory size={16} /> App Factory
        </button>
        <button onClick={() => setActiveTab("gallery")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${activeTab === "gallery" ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/50 hover:bg-black/10"}`}>
          <ImageIcon size={16} /> Image Gallery
        </button>
        <button onClick={() => setActiveTab("assets")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${activeTab === "assets" ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/50 hover:bg-black/10"}`}>
          <FileText size={16} /> Digital Assets
        </button>
        <button onClick={() => setActiveTab("skin")} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition ${activeTab === "skin" ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/50 hover:bg-black/10"}`}>
          <Palette size={16} /> Skin Creator
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white p-8 text-sm text-black/40">
          <Loader2 size={18} className="animate-spin" /> Loading…
        </div>
      ) : activeTab === "factory" ? (
        <AppFactory companyInfo={companyInfo} companyLogo={companyLogo} userTrades={userTrades} images={images} />
      ) : activeTab === "gallery" ? (
        <ImageGalleryTab sectors={sectors} images={images} onImagesChange={setImages} companyInfo={companyInfo} userTrades={userTrades} companyIntel={companyIntel} />
      ) : activeTab === "assets" ? (
        <DigitalAssetsTab companyInfo={companyInfo} companyLogo={companyLogo} userTrades={userTrades} images={images} />
      ) : (
        <SkinCreator companyInfo={companyInfo} companyLogo={companyLogo} userTrades={userTrades} images={images} companyIntel={companyIntel} />
      )}

      <button onClick={onComplete} disabled={thinking} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">
        {thinking ? <><Loader2 size={16} className="animate-spin" />Finishing…</> : <>Finish Setup <Check size={16} /></>}
      </button>
    </div>
  );
}