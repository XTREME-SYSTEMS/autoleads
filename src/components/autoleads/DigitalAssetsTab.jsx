import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { FileText, CreditCard, Smartphone, Loader2, Check, Copy, ExternalLink, Sparkles } from "lucide-react";
import HtmlPreview from "@/components/autoleads/HtmlPreview";
import { useOrgId } from "@/hooks/useOrgContext";

const stripMarkdown = (text) => {
  if (!text) return "";
  let cleaned = text.replace(/```(?:html)?/gi, "").replace(/```/g, "");
  const idx = cleaned.search(/<(!DOCTYPE|html|head|div|h1|p|table|section)/i);
  if (idx > 0) cleaned = cleaned.slice(idx);
  return cleaned.trim();
};

export default function DigitalAssetsTab({ companyInfo, companyLogo, userTrades, images }) {
  const orgId = useOrgId();
  const [brochureHtml, setBrochureHtml] = useState("");
  const [businessCardHtml, setBusinessCardHtml] = useState("");
  const [generatingBrochure, setGeneratingBrochure] = useState(false);
  const [generatingCard, setGeneratingCard] = useState(false);
  const [generatingApp, setGeneratingApp] = useState(false);
  const [contractorApp, setContractorApp] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const apps = await base44.entities.ContractorApp.filter({ organization_id: orgId }).catch(() => []);
        if (apps && apps.length > 0) {
          setContractorApp(apps[0]);
          if (apps[0].share_slug) setShareUrl(`${window.location.origin}/contractor-app/${apps[0].share_slug}`);
          if (apps[0].brochure_html) setBrochureHtml(apps[0].brochure_html);
          if (apps[0].business_card_html) setBusinessCardHtml(apps[0].business_card_html);
        }
      } catch {}
    })();
  }, []);

  const generateBrochure = async () => {
    setGeneratingBrochure(true);
    try {
      const imageUrls = (images || []).slice(0, 6).map(img => img.image_url);
      const prompt = `Create a professional digital brochure as HTML for ${companyInfo?.name || "this construction company"}.
Trade: ${(userTrades || []).join(", ") || "General Construction"}.
About: ${companyInfo?.company_highlights || "Professional construction services."}
Contact: ${companyInfo?.phone || "[Phone]"}, ${companyInfo?.email || "[Email]"}, ${companyInfo?.website || "[Website]"}

Include sections: Hero with company name, About Us, Our Services, Project Gallery, Why Choose Us, and Contact.
${companyLogo ? `Embed the logo using <img src="${companyLogo}" style="max-height:60px;object-fit:contain;" /> at the top.` : ""}
Return ONLY valid HTML starting with <!DOCTYPE html>. Put all CSS in a <style> tag inside <head>. Make it print-ready and professional with a clean modern design.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: [...(companyLogo ? [companyLogo] : []), ...imageUrls],
      });
      const html = stripMarkdown(typeof res === "string" ? res : res?.response || res?.text || "");
      setBrochureHtml(html);
      if (contractorApp?.id) {
        await base44.entities.ContractorApp.update(contractorApp.id, { brochure_html: html }).catch(() => {});
      }
    } catch (err) {
      alert("Brochure generation failed: " + (err?.message || "try again"));
    } finally {
      setGeneratingBrochure(false);
    }
  };

  const generateBusinessCard = async () => {
    setGeneratingCard(true);
    try {
      const prompt = `Create a digital business card as HTML for ${companyInfo?.name || "this construction company"}.
${companyLogo ? `Embed the logo using <img src="${companyLogo}" style="max-height:80px;object-fit:contain;" />.` : ""}
Include: company name, tagline ("Premium construction solutions"), phone (${companyInfo?.phone || "[Phone]"}), email (${companyInfo?.email || "[Email]"}), website (${companyInfo?.website || "[Website]"}).
Make it a compact, professional card design (approximately 3.5" x 2" business card proportions). Return ONLY valid HTML starting with <!DOCTYPE html>. Put all CSS in a <style> tag.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        file_urls: companyLogo ? [companyLogo] : undefined,
      });
      const html = stripMarkdown(typeof res === "string" ? res : res?.response || res?.text || "");
      setBusinessCardHtml(html);
      if (contractorApp?.id) {
        await base44.entities.ContractorApp.update(contractorApp.id, { business_card_html: html }).catch(() => {});
      }
    } catch (err) {
      alert("Business card generation failed: " + (err?.message || "try again"));
    } finally {
      setGeneratingCard(false);
    }
  };

  const generateContractorApp = async () => {
    setGeneratingApp(true);
    try {
      const slug = (companyInfo?.name || "contractor").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Math.random().toString(36).slice(2, 6);
      const payload = {
        organization_id: orgId,
        company_name: companyInfo?.name || "",
        logo_url: companyLogo || "",
        tagline: "Premium construction solutions",
        about: companyInfo?.company_highlights || "",
        primary_color: "#f2df0d",
        secondary_color: "#0A0A0A",
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
      setShareUrl(`${window.location.origin}/contractor-app/${app.share_slug}`);
    } catch (err) {
      alert("App generation failed: " + (err?.message || "try again"));
    } finally {
      setGeneratingApp(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard?.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Digital Brochure */}
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#b0a209]" />
            <span className="text-sm font-black">Digital Brochure</span>
          </div>
          <button onClick={generateBrochure} disabled={generatingBrochure} className="flex items-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2 text-xs font-black text-black disabled:opacity-40">
            {generatingBrochure ? <><Loader2 size={14} className="animate-spin" />Generating…</> : brochureHtml ? <><Sparkles size={14} />Regenerate</> : <><Sparkles size={14} />Generate</>}
          </button>
        </div>
        {brochureHtml && (
          <div className="mt-3">
            <HtmlPreview html={brochureHtml} minHeight={400} className="rounded-lg border border-black/10" />
          </div>
        )}
      </div>

      {/* Digital Business Card */}
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-[#b0a209]" />
            <span className="text-sm font-black">Digital Business Card</span>
          </div>
          <button onClick={generateBusinessCard} disabled={generatingCard} className="flex items-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2 text-xs font-black text-black disabled:opacity-40">
            {generatingCard ? <><Loader2 size={14} className="animate-spin" />Generating…</> : businessCardHtml ? <><Sparkles size={14} />Regenerate</> : <><Sparkles size={14} />Generate</>}
          </button>
        </div>
        {businessCardHtml && (
          <div className="mt-3">
            <HtmlPreview html={businessCardHtml} minHeight={200} className="rounded-lg border border-black/10" />
          </div>
        )}
      </div>

      {/* Contractor App */}
      <div className="rounded-xl border border-black/10 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone size={18} className="text-[#b0a209]" />
            <span className="text-sm font-black">Digital Contractor App</span>
          </div>
          <button onClick={generateContractorApp} disabled={generatingApp} className="flex items-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2 text-xs font-black text-black disabled:opacity-40">
            {generatingApp ? <><Loader2 size={14} className="animate-spin" />Generating…</> : contractorApp ? <><Sparkles size={14} />Update</> : <><Sparkles size={14} />Generate</>}
          </button>
        </div>
        {shareUrl && (
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2">
              <Check size={14} className="text-emerald-600" />
              <span className="text-xs font-bold text-emerald-700">Your contractor app is live!</span>
            </div>
            <div className="flex items-center gap-2">
              <input readOnly value={shareUrl} className="h-9 flex-1 rounded-lg border border-black/15 bg-black/[.02] px-3 text-xs font-mono" />
              <button onClick={copyShareLink} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#0b0b0b] text-white">
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-black/15 bg-white">
                <ExternalLink size={14} />
              </a>
            </div>
            <p className="text-[11px] text-black/40">Share this link with clients — it opens a mobile-optimized showcase of your company, project gallery, services, and contact info.</p>
          </div>
        )}
      </div>
    </div>
  );
}