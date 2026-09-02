import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check, ArrowRight, Image as ImageIcon, Upload, FileText, Briefcase, Loader2, Mail, Send, RefreshCw, Eye, Globe } from "lucide-react";
import AppHeader from "@/components/autoleads/AppHeader";
import BackButton from "@/components/autoleads/BackButton";
import SidebarChatInput from "@/components/autoleads/SidebarChatInput";
import HtmlPreview from "@/components/autoleads/HtmlPreview";
import BrandApproval from "@/components/autoleads/BrandApproval";
import { useOrgId } from "@/hooks/useOrgContext";

const PHASES = [
  { key: "logo", label: "Company Logo", icon: ImageIcon, question: "Let's set up your Auto Bids branding. First, would you like to generate a logo with AI or upload an existing one?" },
  { key: "proposal", label: "Proposal Template", icon: FileText, question: "Great! Now let's set up a proposal template. Would you like to create one from scratch or upload an existing document?" },
  { key: "email", label: "Email Template", icon: Mail, question: "Now let's create an email template for outreach and follow-ups. You can write one from scratch or let AI generate one for you." },
  { key: "package", label: "Credentials Package", icon: Briefcase, question: "Excellent! Let's build your credentials package. Fill in your company details on the right, then click Continue." },
];

const emptyPkg = { name: "", company_highlights: "", years_experience: "", license_number: "", bonding_capacity: "", insurance_carrier: "", insurance_policy_number: "", insurance_limit: "", website: "" };

export default function AutoBidsSetup() {
  const nav = useNavigate();
  const orgId = useOrgId();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [messages, setMessages] = useState([{ role: "ai", text: PHASES[0].question }]);
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);

  // Logo state
  const [logoMode, setLogoMode] = useState(null);
  const [logoName, setLogoName] = useState("");
  const [logoPrompt, setLogoPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSaved, setLogoSaved] = useState(false);
  const [rebrandMode, setRebrandMode] = useState(null);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState(null);
  const [rebranding, setRebranding] = useState(false);
  const [rebrandedLogoUrl, setRebrandedLogoUrl] = useState(null);
  const logoFileRef = useRef(null);

  // Proposal state
  const [proposalMode, setProposalMode] = useState(null);
  const [proposalName, setProposalName] = useState("");
  const [proposalContent, setProposalContent] = useState("");
  const [uploadingProposal, setUploadingProposal] = useState(false);
  const [proposalSaved, setProposalSaved] = useState(false);
  const proposalFileRef = useRef(null);
  const [proposalAiMessages, setProposalAiMessages] = useState(/** @type {any[]} */ ([]));
  const [proposalAiInput, setProposalAiInput] = useState("");
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [userTrades, setUserTrades] = useState(/** @type {any[]} */ ([]));
  const [proposalEditMode, setProposalEditMode] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyInfo, setCompanyInfo] = useState(/** @type {any} */ ({}));
  const [designOptions, setDesignOptions] = useState(/** @type {any[]} */ ([]));
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [generatingDesigns, setGeneratingDesigns] = useState(false);

  // Email template state
  const [emailMode, setEmailMode] = useState(null);
  const [emailName, setEmailName] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailPurpose, setEmailPurpose] = useState("follow_up");
  const [emailTrigger, setEmailTrigger] = useState("");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [useProposalForEmails, setUseProposalForEmails] = useState(false);
  const [bulkEmailTemplates, setBulkEmailTemplates] = useState(/** @type {any[]} */ ([]));
  const [generatingBulkEmails, setGeneratingBulkEmails] = useState(false);
  const [savingEmails, setSavingEmails] = useState(false);
  const [showBrandApproval, setShowBrandApproval] = useState(false);

  // Package state
  const [pkg, setPkg] = useState(emptyPkg);
  const [savingPkg, setSavingPkg] = useState(false);
  const [pkgSaved, setPkgSaved] = useState(false);
  const [savedPkgId, setSavedPkgId] = useState(null);
  const [scrapingPkg, setScrapingPkg] = useState(false);
  const [pkgScraped, setPkgScraped] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [missingFields, setMissingFields] = useState(/** @type {any} */ ({}));
  const [completedPhases, setCompletedPhases] = useState(/** @type {any} */ ({}));

  // Images state
  const [projectImages, setProjectImages] = useState(/** @type {any[]} */ ([]));
  const [, setUploadingImg] = useState(false);
  const imgRef = useRef(null);

  const currentPhase = PHASES[phaseIndex];
  const progress = done ? 100 : Math.round((phaseIndex / PHASES.length) * 100);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const refreshAll = async () => {
    try {
      const [companies, sources, brands, packages, emails, projectImages, contractorApps] = await Promise.all([
        base44.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
        base44.entities.ScrapeSource.filter({ organization_id: orgId }).catch(() => []),
        base44.entities.BrandAsset.filter({ organization_id: orgId }).catch(() => []),
        base44.entities.ProposalPackage.filter({ organization_id: orgId }).catch(() => []),
        base44.entities.EmailTemplate.filter({ organization_id: orgId }).catch(() => []),
        base44.entities.ProjectImage.filter({ organization_id: orgId }).catch(() => []),
        base44.entities.ContractorApp.filter({ organization_id: orgId }).catch(() => []),
      ]);
      const tradeSet = new Set();
      (companies || []).forEach(c => { if (c.trade) c.trade.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tradeSet.add(t)); });
      (sources || []).forEach(s => { if (s.trades) s.trades.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tradeSet.add(t)); });
      if (tradeSet.size > 0) setUserTrades([...tradeSet].sort());
      if ((companies || []).length > 0) setCompanyInfo(companies[0]);
      const logo = (brands || []).find(b => b.type === "logo" && b.file_url);
      if (logo) setCompanyLogo(logo.file_url);
      const completed = {};
      if (logo) completed.logo = true;
      if ((brands || []).some(b => b.type === "proposal_template")) completed.proposal = true;
      if ((emails || []).length > 0) completed.email = true;
      if ((packages || []).length > 0) {
        const existingPkg = packages[0];
        completed.package = true;
        setSavedPkgId(existingPkg.id);
        setPkg({
          name: existingPkg.name || "",
          company_highlights: existingPkg.company_highlights || "",
          years_experience: existingPkg.years_experience || "",
          license_number: existingPkg.license_number || "",
          bonding_capacity: existingPkg.bonding_capacity || "",
          insurance_carrier: existingPkg.insurance_carrier || "",
          insurance_policy_number: existingPkg.insurance_policy_number || "",
          insurance_limit: existingPkg.insurance_limit || "",
          website: existingPkg.website || "",
        });
        setPkgScraped(true);
        if (existingPkg.project_images && existingPkg.project_images.length > 0) {
          setProjectImages(existingPkg.project_images);
        }
      }
      if ((projectImages || []).length > 0 || (contractorApps || []).length > 0) {
        completed.autoapp = true;
      }
      setCompletedPhases(completed);
    } catch {}
  };
  useEffect(() => { refreshAll(); }, []);

  // Backend scraping system: scrapes the company website for real info and
  // repopulates the company profile, proposal template, and all email templates
  // with the verified details + uploaded logo + configured trade scopes.
  // Runs in place — does NOT reset onboarding progress.
  const runWebsiteEnrichment = async () => {
    if (enriching) return;
    setEnriching(true);
    try {
      const res = await base44.functions.invoke("enrichCompanyProfile", {});
      if (res?.error) throw new Error(res.error);
      await refreshAll();
      alert(`Website enrichment complete. ${res?.company_fields_updated?.length || 0} company fields, ${res?.email_templates_regenerated || 0} email templates, and your proposal template updated with your real info${res?.logo_embedded ? " + logo" : ""}.`);
    } catch (e) {
      alert("Enrichment failed: " + (e?.message || "try again"));
    } finally {
      setEnriching(false);
    }
  };

  useEffect(() => {
    if (currentPhase.key === "email" && useProposalForEmails && bulkEmailTemplates.length === 0 && !generatingBulkEmails && !emailSaved) {
      generateAllEmailTemplates();
    }
  }, [phaseIndex, useProposalForEmails]);

  useEffect(() => {
    if (currentPhase.key === "package" && !pkgScraped && !scrapingPkg && companyInfo?.name) {
      scrapeCredentials();
    }
  }, [phaseIndex, pkgScraped]);

  const aiSay = async (prompt) => {
    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      return typeof res === "string" ? res : res?.response || res?.text || "Done!";
    } catch { return "Done!"; }
  };

  const stripMarkdown = (text) => {
    if (!text) return "";
    let cleaned = text.replace(/```(?:html)?/gi, "").replace(/```/g, "");
    const idx = cleaned.search(/<(!DOCTYPE|html|head|div|h1|p|table|section)/i);
    if (idx > 0) cleaned = cleaned.slice(idx);
    return cleaned.trim();
  };

  const advancePhase = async (ackPrompt) => {
    setThinking(true);
    const ack = await aiSay(ackPrompt);
    setThinking(false);
    const nextIndex = phaseIndex + 1;
    if (nextIndex < PHASES.length) {
      setMessages(m => [...m, { role: "user", text: "Continue" }, { role: "ai", text: ack }, { role: "ai", text: PHASES[nextIndex].question }]);
      setPhaseIndex(nextIndex);
    } else {
      setMessages(m => [...m, { role: "user", text: "Finish" }, { role: "ai", text: ack, isFinal: true }]);
      setDone(true);
    }
  };

  const _isPhaseDone = (key) => {
    if (key === "logo") return completedPhases.logo || logoSaved;
    if (key === "proposal") return completedPhases.proposal || proposalSaved;
    if (key === "email") return completedPhases.email || emailSaved;
    if (key === "package") return completedPhases.package || pkgSaved;
    if (key === "autoapp") return completedPhases.autoapp;
    return false;
  };

  const _goToPhase = (index) => {
    setDone(false);
    setPhaseIndex(index);
  };

  // Logo handlers
  const generateLogo = async () => {
    if (!logoPrompt.trim() || generating) return;
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.GenerateImage({ prompt: `Professional minimalist construction company logo. ${logoPrompt}. Clean vector style, bold, suitable for letterhead and proposals. White background. High quality brand mark.` });
      const url = res?.url || res?.file_url || (typeof res === "string" ? res : null);
      if (!url) throw new Error("No image returned");
      await base44.entities.BrandAsset.create({ organization_id: orgId, name: logoName.trim() || logoPrompt.slice(0, 40), type: "logo", file_url: url, prompt: logoPrompt, source: "ai_generated" });
      setLogoSaved(true);
      setLogoPrompt(""); setLogoName("");
    } catch (e) { alert("Generation failed: " + (e?.message || "try again")); }
    finally { setGenerating(false); }
  };

  const uploadLogo = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.BrandAsset.create({ organization_id: orgId, name: logoName.trim() || file.name.replace(/\.[^.]+$/, ""), type: "logo", file_url: up.file_url, source: "uploaded" });
      setLogoSaved(true); setLogoName("");
    } catch (err) { alert("Upload failed: " + (err?.message || "try again")); }
    finally { setUploadingLogo(false); if (logoFileRef.current) logoFileRef.current.value = ""; }
  };

  const uploadLogoForRebrand = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingLogo(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      setUploadedLogoUrl(up.file_url);
    } catch (err) { alert("Upload failed: " + (err?.message || "try again")); }
    finally { setUploadingLogo(false); if (logoFileRef.current) logoFileRef.current.value = ""; }
  };

  const rebrandLogo = async () => {
    if (!uploadedLogoUrl || rebranding) return;
    setRebranding(true);
    setRebrandedLogoUrl(null);
    try {
      const prompt = rebrandMode === "recreate"
        ? `Recreate this construction company logo as a fresh, modern, professional version. Keep the same concept, name, and identity but redesign it with cleaner lines, better proportions, and a polished vector style. White background. High quality brand mark.`
        : `Enhance and improve this construction company logo. Keep the same design and layout but make it sharper, more professional, higher quality, and print-ready. White background. High quality brand mark.`;
      const res = await base44.integrations.Core.GenerateImage({ prompt, existing_image_urls: [uploadedLogoUrl] });
      const url = res?.url || res?.file_url || (typeof res === "string" ? res : null);
      if (!url) throw new Error("No image returned");
      setRebrandedLogoUrl(url);
    } catch (e) { alert("Rebrand failed: " + (e?.message || "try again")); }
    finally { setRebranding(false); }
  };

  const approveRebrandedLogo = async () => {
    if (!rebrandedLogoUrl) return;
    try {
      await base44.entities.BrandAsset.create({ organization_id: orgId, name: logoName.trim() || (rebrandMode === "recreate" ? "Recreated Logo" : "Enhanced Logo"), type: "logo", file_url: rebrandedLogoUrl, prompt: rebrandMode === "recreate" ? "Recreated from uploaded logo" : "Enhanced from uploaded logo", source: "ai_generated" });
      setLogoSaved(true);
      setLogoName(""); setUploadedLogoUrl(null); setRebrandMode(null); setRebrandedLogoUrl(null);
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
  };

  const completeLogo = () => advancePhase(`A construction company just ${logoMode === "ai" ? "generated a logo with AI" : logoMode === "rebrand" ? "rebranded their logo with AI" : "uploaded their existing logo"} on AUTOLEADS. Write a brief one-sentence acknowledgment (max 15 words). Do NOT ask a question.`);

  // Proposal handlers
  const saveProposal = async () => {
    if (!proposalName.trim()) { alert("Add a template name"); return; }
    try {
      const existing = await base44.entities.BrandAsset.filter({ organization_id: orgId, type: "proposal_template", is_default: true }).catch(() => []);
      await Promise.all((existing || []).map(b => base44.entities.BrandAsset.update(b.id, { is_default: false }).catch(() => {})));
      await base44.entities.BrandAsset.create({ organization_id: orgId, name: proposalName.trim(), type: "proposal_template", content: proposalContent || "<p>Proposal content…</p>", source: "authored", is_default: true });
      setProposalSaved(true); setProposalName(""); setProposalContent(""); setDesignOptions([]); setSelectedDesign(null);
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
  };

  const uploadProposal = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingProposal(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.BrandAsset.create({ organization_id: orgId, name: proposalName.trim() || file.name.replace(/\.[^.]+$/, ""), type: "proposal_template", file_url: up.file_url, source: "uploaded" });
      setProposalSaved(true); setProposalName("");
    } catch (err) { alert("Upload failed: " + (err?.message || "try again")); }
    finally { setUploadingProposal(false); if (proposalFileRef.current) proposalFileRef.current.value = ""; }
  };

  const chatWithProposalAI = async () => {
    if (!proposalAiInput.trim() || generatingProposal) return;
    const userMsg = proposalAiInput.trim();
    setProposalAiMessages(m => [...m, { role: "user", text: userMsg }]);
    setProposalAiInput("");
    setGeneratingProposal(true);
    try {
      const existing = proposalContent || "";
      const logoCtx = companyLogo ? ` Keep the logo embedded using <img src="${companyLogo}" style="max-height:70px; object-fit:contain;" /> at the top and use the brand colors.` : "";
      const prompt = existing
        ? `Here is the current proposal template:\n\n${existing}\n\nThe user wants to update it: "${userMsg}".${logoCtx} Return the FULL updated proposal template as clean HTML only — no markdown code fences, no explanations. Start with <!DOCTYPE html>.`
        : `Create a professional construction proposal template based on this request: "${userMsg}".${logoCtx} Return ONLY clean HTML with sections for: Company Overview (with logo), Scope of Work, Project Timeline, Pricing, Terms & Conditions, and Signature. Use placeholders like [Client Name], [Project Name], [Date]. Start with <!DOCTYPE html>. No markdown code fences, no explanations.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, file_urls: companyLogo ? [companyLogo] : undefined });
      const raw = typeof res === "string" ? res : (res?.response || res?.text || res?.output || "");
      const content = stripMarkdown(raw);
      if (!content || content.length < 50) throw new Error("Empty AI response");
      setProposalContent(content);
      setProposalAiMessages(m => [...m, { role: "ai", text: existing ? "I've updated your template — review it below and ask for any changes, or save when ready." : "I've created a proposal template — review it below and ask for any changes, or save when ready." }]);
    } catch {
      setProposalAiMessages(m => [...m, { role: "ai", text: "Sorry, I couldn't generate that. Please try again." }]);
    } finally {
      setGeneratingProposal(false);
    }
  };

  const generateDesignOptions = async () => {
    if (generatingDesigns) return;
    const trades = userTrades.length > 0 ? userTrades.join(", ") : "general construction";
    setGeneratingDesigns(true);
    setDesignOptions([]);
    setSelectedDesign(null);
    setProposalContent("");
    setProposalAiMessages(m => [...m, { role: "user", text: "Auto-generate branded proposal designs using my scopes and logo" }]);
    const styles = [
      { key: "modern", name: "Modern Clean", desc: "Minimalist with lots of whitespace and subtle accent color highlights" },
      { key: "classic", name: "Classic Executive", desc: "Traditional formal layout with structured borders and serif headings" },
      { key: "bold", name: "Bold Dynamic", desc: "Strong colored header band with prominent logo and modern section cards" },
      { key: "minimal", name: "Minimalist", desc: "Ultra-clean, black and white with a single accent color, lots of breathing room" },
      { key: "corporate", name: "Corporate Professional", desc: "Polished corporate look with sidebar, branded header, and structured tables" },
    ];
    const fileUrls = companyLogo ? [companyLogo] : [];
    const companyCtx = companyInfo.name ? `Company name: ${companyInfo.name}. Website: ${companyInfo.website || "N/A"}.` : "";
    let firstError = null;
    try {
      const settled = await Promise.allSettled(styles.map(async (style) => {
        const prompt = `Create a professional construction proposal template for a contractor specializing in: ${trades}. Design style: "${style.name}" (${style.desc}).
${companyLogo ? `I've attached the company logo image. Analyze its colors and use them as the primary and accent colors throughout the template. Embed the logo at the top of the proposal using: <img src="${companyLogo}" style="max-height:70px; object-fit:contain;" />. ` : ""}${companyCtx}
Return ONLY valid HTML code. Do NOT wrap it in markdown code fences. Do NOT include any explanation text before or after the HTML. Start directly with <!DOCTYPE html> and end with </html>. Put all CSS in a <style> tag inside <head>.
The template must include these sections with clear headings: Company Overview (with logo), Scope of Work (covering the contractor's trades: ${trades}), Project Timeline, Pricing & Schedule of Values (as a styled HTML table), Terms & Conditions, and a Signature block.
Use placeholders like [Client Name], [Project Name], [Date], [Project Address] where appropriate. Make it look polished and print-ready.`;
        const res = await base44.integrations.Core.InvokeLLM({ prompt, file_urls: fileUrls.length ? fileUrls : undefined });
        const raw = typeof res === "string" ? res : (res?.response || res?.text || res?.output || "");
        const content = stripMarkdown(raw);
        if (!content || content.length < 50) throw new Error("AI returned an empty response");
        return { ...style, content };
      }));
      const results = settled.filter(s => s.status === "fulfilled").map(s => s.value);
      const failures = settled.filter(s => s.status === "rejected").map(s => s.reason?.message || String(s.reason));
      setDesignOptions(results);
      if (results.length > 0) {
        setProposalAiMessages(m => [...m, { role: "ai", text: `I've created ${results.length} branded design option${results.length === 1 ? "" : "s"} using your scopes and logo.${failures.length > 0 ? ` (${failures.length} failed: ${failures[0]})` : ""} Review the previews below and pick your favorite — it'll become your default template for automated bids.` }]);
      } else {
        firstError = failures[0] || "Unknown error";
        setProposalAiMessages(m => [...m, { role: "ai", text: `Sorry, I couldn't generate the designs. Error: ${firstError}. Please try again, or use the chat box below to ask the AI to create a template directly.` }]);
      }
    } catch (e) {
      setProposalAiMessages(m => [...m, { role: "ai", text: `Sorry, I couldn't generate the designs${e?.message ? ` (${e.message})` : ""}. Please try again.` }]);
    } finally {
      setGeneratingDesigns(false);
    }
  };

  const selectDesign = (design) => {
    setSelectedDesign(design.key);
    setProposalContent(design.content);
    setProposalName(`${design.name} Proposal Template`);
  };

  const completeProposal = () => advancePhase(`A construction company just ${proposalMode === "ai" ? "generated a proposal template with AI" : proposalMode === "create" ? "created a proposal template" : "uploaded a proposal document"} on AUTOLEADS. Write a brief one-sentence acknowledgment (max 15 words). Do NOT ask a question.`);

  // Email template handlers
  const saveEmailTemplate = async () => {
    if (!emailName.trim()) { alert("Add a template name"); return; }
    try {
      await base44.entities.EmailTemplate.create({
        organization_id: orgId,
        name: emailName.trim(),
        subject: emailSubject.trim() || emailName.trim(),
        body: emailBody || "Email body…",
        purpose: emailPurpose,
        ai_generated: false,
        approval_status: "approved",
      });
      setEmailSaved(true); setEmailName(""); setEmailSubject(""); setEmailBody(""); setEmailTrigger("");
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
  };

  const generateEmailTemplate = async () => {
    if (!emailTrigger.trim() || generatingEmail) return;
    setGeneratingEmail(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a professional construction business email template. Purpose: ${emailPurpose}. Context/trigger: ${emailTrigger}. Return ONLY a JSON object with "subject" and "body" fields. The body should be professional, concise, and ready to send.`,
        response_json_schema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } } }
      });
      const subject = res?.subject || "";
      const body = res?.body || "";
      setEmailSubject(subject); setEmailBody(body);
    } catch (e) { alert("Generation failed: " + (e?.message || "try again")); }
    finally { setGeneratingEmail(false); }
  };

  const completeEmail = () => advancePhase(`A construction company just ${useProposalForEmails ? "auto-generated all email templates from their proposal design" : emailMode === "ai" ? "generated an email template with AI" : "created an email template"} on AUTOLEADS. Write a brief one-sentence acknowledgment (max 15 words). Do NOT ask a question.`);

  const generateAllEmailTemplates = async () => {
    if (generatingBulkEmails) return;
    setGeneratingBulkEmails(true);
    const trades = userTrades.length > 0 ? userTrades.join(", ") : "general construction";
    const purposes = [
      { key: "follow_up", label: "Follow Up", desc: "following up with a general contractor after submitting a bid" },
      { key: "outreach", label: "Outreach", desc: "reaching out to a new general contractor or potential client to introduce services" },
      { key: "bid_response", label: "Bid Response", desc: "responding to a bid invitation from a general contractor or owner" },
      { key: "introduction", label: "Introduction", desc: "introducing your company to a new contact for the first time" },
      { key: "reminder", label: "Reminder", desc: "reminding a client about an upcoming deadline, meeting, or action needed" },
      { key: "thank_you", label: "Thank You", desc: "thanking a client after a meeting, project award, or completed project" },
    ];
    const fileUrls = companyLogo ? [companyLogo] : [];
    const companyCtx = companyInfo.name ? `Company name: ${companyInfo.name}. Website: ${companyInfo.website || "N/A"}.` : "";
    try {
      const settled = await Promise.allSettled(purposes.map(async (p) => {
        const prompt = `Create a professional construction business email template for ${p.desc}. The contractor specializes in: ${trades}. ${companyCtx}
${companyLogo ? `I've attached the company logo. Use its colors as the brand accent colors. Include the logo at the top of the email body using: <img src="${companyLogo}" style="max-height:50px; object-fit:contain;" />. ` : ""}Return ONLY a JSON object with "subject" and "body" fields. The subject should be a compelling, professional email subject line. The body should be professional HTML email content that matches the proposal design branding (logo + colors). Use placeholders like [Client Name], [Project Name], [Date] where appropriate. Do NOT include any explanation outside the JSON.`;
        const res = await base44.integrations.Core.InvokeLLM({
          prompt,
          file_urls: fileUrls.length ? fileUrls : undefined,
          response_json_schema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } } }
        });
        if (!res?.subject && !res?.body) throw new Error("Empty response");
        return { purpose: p.key, purposeLabel: p.label, name: `${p.label} Template`, subject: res?.subject || "", body: res?.body || "" };
      }));
      const results = settled.filter(s => s.status === "fulfilled").map(s => s.value);
      setBulkEmailTemplates(results);
    } catch { setBulkEmailTemplates([]); }
    finally { setGeneratingBulkEmails(false); }
  };

  const saveAllEmailTemplates = async () => {
    setSavingEmails(true);
    try {
      await Promise.all(bulkEmailTemplates.map(t =>
        base44.entities.EmailTemplate.create({
          organization_id: orgId,
          name: t.name,
          subject: t.subject,
          body: t.body,
          purpose: t.purpose,
          ai_generated: true,
          approval_status: "approved",
        })
      ));
      setEmailSaved(true);
      setBulkEmailTemplates([]);
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
    finally { setSavingEmails(false); }
  };

  // Package handlers
  const setPkgField = (k, v) => setPkg(p => ({ ...p, [k]: v }));
  const isMissing = (field) => pkgScraped && !!missingFields[field];
  const isFound = (field) => pkgScraped && !missingFields[field] && !!pkg[field];
  const pkgFieldClass = (field) => isMissing(field) ? inputClass + " border-orange-400 bg-orange-50 ring-2 ring-orange-200" : inputClass;

  const savePackage = async () => {
    if (!pkg.name.trim()) { alert("Add a package name"); return; }
    setSavingPkg(true);
    try {
      const payload = { ...pkg, organization_id: orgId, years_experience: pkg.years_experience ? Number(pkg.years_experience) : null, bonding_capacity: pkg.bonding_capacity ? Number(pkg.bonding_capacity) : null, project_images: projectImages };
      const rec = await base44.entities.ProposalPackage.create(payload);
      setSavedPkgId(rec?.id); setPkgSaved(true);
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
    finally { setSavingPkg(false); }
  };

  const scrapeCredentials = async () => {
    if (scrapingPkg || pkgScraped) return;
    if (!companyInfo?.name) return;
    setScrapingPkg(true);
    try {
      const stateName = companyInfo.state || "the company's state";
      const prompt = `Search the web for information about this construction company to auto-fill their credentials package:
- Company name: ${companyInfo.name}
- Website: ${companyInfo.website || "Not provided"}
- State: ${stateName}
- Trade: ${companyInfo.trade || "General construction"}

1. Search the ${stateName} state contractor license registry/portal to find or verify the contractor's license number and bonding capacity.
2. Search the company website and online sources (LinkedIn, BBB, company about page, online profiles) to find:
   - Company description and highlights (what they do, specialties, certifications, notable projects)
   - Years of experience or year founded
   - Insurance information (GL carrier, policy number, limits) if publicly available
   - Website URL

Return a JSON object. For any field you cannot find from web search results, set its value to null. Do NOT make up or guess values — only return information you actually found.`;
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: "gemini_3_flash",
        response_json_schema: {
          type: "object",
          properties: {
            company_highlights: { type: "string" },
            years_experience: { type: "number" },
            license_number: { type: "string" },
            bonding_capacity: { type: "number" },
            insurance_carrier: { type: "string" },
            insurance_policy_number: { type: "string" },
            insurance_limit: { type: "string" },
            website: { type: "string" }
          }
        }
      });
      const found = {};
      const missing = {};
      const fields = ["company_highlights", "years_experience", "license_number", "bonding_capacity", "insurance_carrier", "insurance_policy_number", "insurance_limit", "website"];
      fields.forEach(f => {
        const val = res?.[f];
        if (val !== null && val !== undefined && String(val).trim() !== "") {
          found[f] = val;
        } else {
          missing[f] = true;
        }
      });
      setPkg(p => ({ ...p, ...found, name: p.name || `${companyInfo.name} Credentials Package` }));
      setMissingFields(missing);
      setPkgScraped(true);
    } catch {
      setPkg(p => ({ ...p, name: p.name || `${companyInfo.name} Credentials Package` }));
      setPkgScraped(true);
    } finally {
      setScrapingPkg(false);
    }
  };

  const completePackage = () => finishSetup();

  // Image handlers
  const _onProjectImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadingImg(true);
    try {
      const up = await base44.integrations.Core.UploadFile({ file });
      const newImages = [...projectImages, up.file_url];
      setProjectImages(newImages);
      if (savedPkgId) {
        await base44.entities.ProposalPackage.update(savedPkgId, { project_images: newImages }).catch(() => {});
      }
    } catch { alert("Upload failed"); }
    finally { setUploadingImg(false); if (imgRef.current) imgRef.current.value = ""; }
  };

  const _removeProjectImage = async (index) => {
    const newImages = projectImages.filter((_, idx) => idx !== index);
    setProjectImages(newImages);
    if (savedPkgId) {
      try { await base44.entities.ProposalPackage.update(savedPkgId, { project_images: newImages }); } catch {}
    }
  };

  const finishSetup = async () => {
    setThinking(true);
    const res = await aiSay("A construction company just finished setting up their entire Auto Bids system on AUTOLEADS — logo, proposal template, email template, and credentials package. Write a warm, enthusiastic welcome message (2-3 sentences) telling them to head to Auto Leads to start discovering opportunities.");
    setThinking(false);
    setMessages(m => [...m, { role: "user", text: "Finish" }, { role: "ai", text: res, isFinal: true }]);
    setDone(true);
  };

  const inputClass = "h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20";

  const renderPhaseForm = () => {
    if (currentPhase.key === "logo") {
      if (logoSaved) {
        return (
          <div className="rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-5 text-center">
            <Check size={28} className="mx-auto text-[#b0a209]" />
            <p className="mt-2 text-sm font-black">Logo saved!</p>
            <button onClick={completeLogo} disabled={thinking} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Continue <ArrowRight size={16} /></button>
          </div>
        );
      }
      if (!logoMode) {
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            <button onClick={() => setLogoMode("ai")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Sparkles size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Generate with AI</span><span className="text-xs text-black/50">Describe your brand</span>
            </button>
            <button onClick={() => setLogoMode("rebrand")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Sparkles size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Upload & Rebrand</span><span className="text-xs text-black/50">Recreate or enhance</span>
            </button>
            <button onClick={() => setLogoMode("upload")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Upload size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Upload existing</span><span className="text-xs text-black/50">PNG, JPG, or SVG</span>
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-black">Logo name (optional)</label><input className={inputClass} value={logoName} onChange={e => setLogoName(e.target.value)} placeholder="Acme Construction" /></div>
          {logoMode === "ai" ? (
            <>
              <div><label className="mb-1 block text-xs font-black">Describe your brand</label><textarea className={inputClass + " min-h-[80px]"} value={logoPrompt} onChange={e => setLogoPrompt(e.target.value)} placeholder="Modern general contractor, navy and gold, geometric hammer icon" /></div>
              <button onClick={generateLogo} disabled={generating || !logoPrompt.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{generating ? <><Loader2 size={16} className="animate-spin" />Generating…</> : <><Sparkles size={16} />Generate Logo</>}</button>
            </>
          ) : logoMode === "rebrand" ? (
            <>
              {!uploadedLogoUrl ? (
                <>
                  <input ref={logoFileRef} type="file" accept="image/*" onChange={uploadLogoForRebrand} className="hidden" />
                  <button onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">{uploadingLogo ? <><Loader2 size={16} className="animate-spin" />Uploading…</> : <><Upload size={16} />Upload Your Logo</>}</button>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-black/10 bg-white p-4 text-center">
                    <img src={uploadedLogoUrl} className="mx-auto max-h-24 object-contain" alt="Uploaded logo" />
                    <button onClick={() => { setUploadedLogoUrl(null); setRebrandMode(null); }} className="mt-2 text-xs font-bold text-black/40 hover:text-black/60">Use a different logo</button>
                  </div>
                  {!rebrandMode ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <button onClick={() => setRebrandMode("recreate")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-5 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                        <Sparkles size={24} className="text-[#b0a209]" /><span className="text-sm font-black">Recreate</span><span className="text-xs text-black/50">Fresh new design</span>
                      </button>
                      <button onClick={() => setRebrandMode("enhance")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-5 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                        <Sparkles size={24} className="text-[#b0a209]" /><span className="text-sm font-black">Enhance</span><span className="text-xs text-black/50">Improve quality</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-black/10 bg-black/[.02] p-3">
                        <span className="text-sm font-bold">{rebrandMode === "recreate" ? "Recreate" : "Enhance"} your logo</span>
                        <button onClick={() => { setRebrandMode(null); setRebrandedLogoUrl(null); }} className="text-xs font-bold text-black/40 hover:text-black/60">Change</button>
                      </div>
                      {rebranding && (
                        <div className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-[#fdfbe1] p-6 text-sm font-bold text-[#b0a209]">
                          <Loader2 size={18} className="animate-spin" /> {rebrandMode === "recreate" ? "Recreating your logo…" : "Enhancing your logo…"}
                        </div>
                      )}
                      {rebrandedLogoUrl && !rebranding && (
                        <div className="space-y-3">
                          <div className="rounded-lg border border-black/10 bg-white p-4 text-center">
                            <img src={rebrandedLogoUrl} className="mx-auto max-h-32 object-contain" alt="Generated logo" />
                          </div>
                          <p className="text-center text-xs font-bold text-black/50">Happy with the result? Approve to save it, or regenerate to try again.</p>
                          <div className="grid grid-cols-2 gap-3">
                            <button onClick={rebrandLogo} className="flex items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/[.02]"><RefreshCw size={16} /> Regenerate</button>
                            <button onClick={approveRebrandedLogo} className="flex items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black"><Check size={16} /> Approve</button>
                          </div>
                        </div>
                      )}
                      {!rebrandedLogoUrl && !rebranding && (
                        <button onClick={rebrandLogo} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black"><Sparkles size={16} />{rebrandMode === "recreate" ? "Recreate Logo" : "Enhance Logo"}</button>
                      )}
                    </>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <input ref={logoFileRef} type="file" accept="image/*" onChange={uploadLogo} className="hidden" />
              <button onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">{uploadingLogo ? <><Loader2 size={16} className="animate-spin" />Uploading…</> : <><Upload size={16} />Choose File</>}</button>
            </>
          )}
          <button onClick={() => setLogoMode(null)} className="text-xs font-bold text-black/40 hover:text-black/60">← Back to options</button>
        </div>
      );
    }

    if (currentPhase.key === "proposal") {
      if (proposalSaved) {
        return (
          <div className="rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-5 text-center">
            <Check size={28} className="mx-auto text-[#b0a209]" />
            <p className="mt-2 text-sm font-black">Proposal template saved!</p>
            <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 text-left text-sm font-bold text-black/70">
              <input type="checkbox" checked={useProposalForEmails} onChange={e => setUseProposalForEmails(e.target.checked)} className="h-4 w-4 accent-[#f2df0d]" />
              Use my proposal design (logo + colors) for all email templates too
            </label>
            <button onClick={completeProposal} disabled={thinking} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Continue <ArrowRight size={16} /></button>
          </div>
        );
      }
      if (!proposalMode) {
        return (
          <div className="grid gap-3 sm:grid-cols-3">
            <button onClick={() => { setProposalMode("ai"); generateDesignOptions(); }} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Sparkles size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Generate with AI</span><span className="text-xs text-black/50">Auto-creates 5 designs</span>
            </button>
            <button onClick={() => setProposalMode("create")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <FileText size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Create template</span><span className="text-xs text-black/50">Write from scratch</span>
            </button>
            <button onClick={() => setProposalMode("upload")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Upload size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Upload document</span><span className="text-xs text-black/50">PDF, DOCX, or HTML</span>
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-black">Template name</label><input className={inputClass} value={proposalName} onChange={e => setProposalName(e.target.value)} placeholder="Standard Commercial Proposal" /></div>
          {proposalMode === "ai" ? (
            <>
              {generatingDesigns && (
                <div className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-[#fdfbe1] p-4 text-sm font-bold text-[#b0a209]">
                  <Loader2 size={16} className="animate-spin" /> Generating branded design options…
                </div>
              )}
              {designOptions.length > 0 && !generatingDesigns && (
                <div className="space-y-3">
                  <p className="text-xs font-black text-black/50">Pick a design — it becomes your default template for automated bids:</p>
                  <button onClick={() => setShowBrandApproval(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] px-5 py-2.5 text-sm font-black text-[#b0a209] hover:bg-[#fcf9cf]"><Eye size={16} /> Open Brand Approval — View Logo, Proposals & Emails Together</button>
                  {designOptions.map((d) => (
                    <div key={d.key} className={`rounded-xl border-2 p-3 transition ${selectedDesign === d.key ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 bg-white hover:border-black/20"}`}>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-black">{d.name}</span>
                        {selectedDesign === d.key ? (
                          <span className="flex items-center gap-1 text-xs font-black text-[#b0a209]"><Check size={14} /> Selected</span>
                        ) : (
                          <button onClick={() => selectDesign(d)} className="rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black hover:bg-[#f4e431]">Use this design</button>
                        )}
                      </div>
                      <HtmlPreview html={d.content} minHeight={500} className="rounded-lg border border-black/10" />
                    </div>
                  ))}
                </div>
              )}
              <div className="rounded-lg border border-black/10 bg-black/[.02] p-3">
                <p className="mb-2 text-xs font-black text-black/50">Describe your business and project type, then ask the AI to create or refine your proposal template.</p>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {proposalAiMessages.length === 0 && <p className="text-xs text-black/40">e.g. "I'm a commercial GC specializing in retail build-outs. Create a professional proposal template."</p>}
                  {proposalAiMessages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      {m.role === "ai" && <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={12} className="text-black" /></span>}
                      <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs leading-5 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-white text-black/80"}`}>{m.text}</div>
                    </div>
                  ))}
                  {generatingProposal && <div className="flex gap-2"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={12} className="text-black" /></span><div className="rounded-lg border border-black/10 bg-white px-2.5 py-2"><Loader2 size={14} className="animate-spin text-black/40" /></div></div>}
                </div>
                <div className="mt-2 flex gap-2">
                  <input className={inputClass + " flex-1"} value={proposalAiInput} onChange={e => setProposalAiInput(e.target.value)} onKeyDown={e => e.key === "Enter" && chatWithProposalAI()} placeholder="Ask the AI to create or change your template…" />
                  <button onClick={chatWithProposalAI} disabled={generatingProposal || !proposalAiInput.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40"><Send size={18} /></button>
                </div>
              </div>
              {proposalContent && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs font-black">Selected template</label>
                    <button onClick={() => setProposalEditMode(v => !v)} className="text-[11px] font-bold text-[#b0a209] hover:underline">{proposalEditMode ? "Preview" : "Edit HTML"}</button>
                  </div>
                  {proposalEditMode ? (
                    <textarea className={inputClass + " min-h-[200px] font-mono text-xs"} value={proposalContent} onChange={e => setProposalContent(e.target.value)} />
                  ) : (
                    <HtmlPreview html={proposalContent} minHeight={500} className="rounded-lg border border-black/10" />
                  )}
                </div>
              )}
              <button onClick={saveProposal} disabled={!proposalContent} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Save as Default Template</button>
            </>
          ) : proposalMode === "create" ? (
            <>
              <div><label className="mb-1 block text-xs font-black">Content</label><textarea className={inputClass + " min-h-[160px]"} value={proposalContent} onChange={e => setProposalContent(e.target.value)} placeholder="Scope of work, pricing, timeline, terms…" /></div>
              <button onClick={saveProposal} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black">Save Template</button>
            </>
          ) : (
            <>
              <input ref={proposalFileRef} type="file" accept=".pdf,.doc,.docx,.html,.txt" onChange={uploadProposal} className="hidden" />
              <button onClick={() => proposalFileRef.current?.click()} disabled={uploadingProposal} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">{uploadingProposal ? <><Loader2 size={16} className="animate-spin" />Uploading…</> : <><Upload size={16} />Choose File</>}</button>
            </>
          )}
          <button onClick={() => setProposalMode(null)} className="text-xs font-bold text-black/40 hover:text-black/60">← Back to options</button>
        </div>
      );
    }

    if (currentPhase.key === "email") {
      if (emailSaved) {
        return (
          <div className="rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-5 text-center">
            <Check size={28} className="mx-auto text-[#b0a209]" />
            <p className="mt-2 text-sm font-black">{useProposalForEmails ? "All email templates saved!" : "Email template saved!"}</p>
            <button onClick={completeEmail} disabled={thinking} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Continue <ArrowRight size={16} /></button>
          </div>
        );
      }
      if (useProposalForEmails) {
        if (generatingBulkEmails) {
          return (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-[#fdfbe1] p-6 text-sm font-bold text-[#b0a209]">
              <Loader2 size={18} className="animate-spin" /> Generating branded email templates for all purposes…
            </div>
          );
        }
        if (bulkEmailTemplates.length > 0) {
          return (
            <div className="space-y-3">
              <p className="text-xs font-black text-black/50">Auto-generated from your proposal design — review and save all:</p>
              {bulkEmailTemplates.map((t, i) => (
                <div key={i} className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-black">{t.purposeLabel}</span>
                    <span className="rounded-full bg-[#fcf9cf] px-2 py-0.5 text-[10px] font-black text-[#b0a209]">{t.purpose}</span>
                  </div>
                  <p className="text-xs font-bold text-black/60">{t.subject}</p>
                  <div className="mt-1"><HtmlPreview html={t.body} minHeight={250} className="rounded-lg border border-black/10" /></div>
                </div>
              ))}
              <button onClick={() => setShowBrandApproval(true)} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] px-5 py-2.5 text-sm font-black text-[#b0a209] hover:bg-[#fcf9cf]"><Eye size={16} /> Open Brand Approval — View Logo, Proposals & Emails Together</button>
              <button onClick={saveAllEmailTemplates} disabled={savingEmails} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{savingEmails ? <><Loader2 size={16} className="animate-spin" />Saving…</> : "Save All Templates"}</button>
            </div>
          );
        }
        return (
          <div className="rounded-lg border border-black/10 bg-black/[.02] p-4 text-center text-sm text-black/50">
            Preparing your branded email templates…
          </div>
        );
      }
      if (!emailMode) {
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <button onClick={() => setEmailMode("ai")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Sparkles size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Generate with AI</span><span className="text-xs text-black/50">Describe the trigger</span>
            </button>
            <button onClick={() => setEmailMode("write")} className="flex flex-col items-center gap-2 rounded-xl border border-black/10 p-6 text-center transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Mail size={28} className="text-[#b0a209]" /><span className="text-sm font-black">Write from scratch</span><span className="text-xs text-black/50">Subject and body</span>
            </button>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <div><label className="mb-1 block text-xs font-black">Template name</label><input className={inputClass} value={emailName} onChange={e => setEmailName(e.target.value)} placeholder="Follow-up after bid submission" /></div>
          <div>
            <label className="mb-1 block text-xs font-black">Purpose</label>
            <select className={inputClass} value={emailPurpose} onChange={e => setEmailPurpose(e.target.value)}>
              <option value="follow_up">Follow Up</option>
              <option value="outreach">Outreach</option>
              <option value="bid_response">Bid Response</option>
              <option value="introduction">Introduction</option>
              <option value="reminder">Reminder</option>
              <option value="thank_you">Thank You</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {emailMode === "ai" ? (
            <>
              <div><label className="mb-1 block text-xs font-black">Describe the trigger / context</label><textarea className={inputClass + " min-h-[80px]"} value={emailTrigger} onChange={e => setEmailTrigger(e.target.value)} placeholder="Follow up with a general contractor 3 days after submitting a bid for a commercial project" /></div>
              <button onClick={generateEmailTemplate} disabled={generatingEmail || !emailTrigger.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{generatingEmail ? <><Loader2 size={16} className="animate-spin" />Generating…</> : <><Sparkles size={16} />Generate Template</>}</button>
              {(emailSubject || emailBody) && (
                <div className="space-y-2 rounded-lg border border-black/10 bg-black/[.02] p-3">
                  <div><p className="text-[11px] font-bold text-black/40">Subject</p><p className="text-sm font-bold">{emailSubject}</p></div>
                  <div><p className="text-[11px] font-bold text-black/40">Body</p><p className="whitespace-pre-wrap text-sm text-black/70">{emailBody}</p></div>
                </div>
              )}
              <button onClick={saveEmailTemplate} disabled={!emailSubject && !emailBody} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">Save Template</button>
            </>
          ) : (
            <>
              <div><label className="mb-1 block text-xs font-black">Subject</label><input className={inputClass} value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Following up on our bid for [Project Name]" /></div>
              <div><label className="mb-1 block text-xs font-black">Body</label><textarea className={inputClass + " min-h-[160px]"} value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Hi [Name], Thank you for the opportunity to bid on…" /></div>
              <button onClick={saveEmailTemplate} disabled={!emailName.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Save Template</button>
            </>
          )}
          <button onClick={() => setEmailMode(null)} className="text-xs font-bold text-black/40 hover:text-black/60">← Back to options</button>
        </div>
      );
    }

    if (currentPhase.key === "package") {
      if (pkgSaved) {
        return (
          <div className="rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-5 text-center">
            <Check size={28} className="mx-auto text-[#b0a209]" />
            <p className="mt-2 text-sm font-black">Package saved!</p>
            <button onClick={completePackage} disabled={thinking} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">Continue <ArrowRight size={16} /></button>
          </div>
        );
      }
      return (
        <div className="space-y-3">
          <button onClick={runWebsiteEnrichment} disabled={enriching} className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-[#f2df0d] bg-[#fdfbe1] px-5 py-3 text-sm font-black text-black hover:bg-[#fcf9cf] disabled:opacity-50">
            {enriching ? <><Loader2 size={16} className="animate-spin" /> Scraping your website & populating templates…</> : <><Globe size={16} className="text-[#b0a209]" /> Scrape my website to auto-fill everything</>}
          </button>
          {enriching && <p className="text-center text-[11px] font-bold text-black/45">Pulls real company info, license & insurance from your website, then regenerates your proposal + email templates with your logo and trade scopes. Your onboarding progress is kept.</p>}
          {scrapingPkg && (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-[#f2df0d] bg-[#fdfbe1] p-5 text-sm font-bold text-[#b0a209]">
              <Loader2 size={18} className="animate-spin" /> Searching online for your company info, license, and insurance…
            </div>
          )}
          {companyLogo && !scrapingPkg && (
            <div className="rounded-lg border border-black/10 bg-white p-4 text-center">
              <img src={companyLogo} className="mx-auto max-h-20 object-contain" alt="Company logo" />
              <p className="mt-1 text-[10px] font-bold text-black/40">Your logo will be included in the credentials package</p>
            </div>
          )}
          {!scrapingPkg && pkgScraped && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-700">
              <Check size={14} /> Auto-filled from online sources. Fields highlighted in orange need your input.
            </div>
          )}
          <div><label className="mb-1 block text-xs font-black">Package name</label><input className={inputClass} value={pkg.name} onChange={e => setPkgField("name", e.target.value)} placeholder="Standard Credentials Package" /></div>
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-black">Company highlights{isFound("company_highlights") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
            <textarea className={pkgFieldClass("company_highlights") + " min-h-[80px]"} value={pkg.company_highlights} onChange={e => setPkgField("company_highlights", e.target.value)} placeholder="Family-owned since 2008. OSHA-certified. 200+ projects completed…" />
            {isMissing("company_highlights") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found online — please enter</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-black">Years of experience{isFound("years_experience") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
              <input type="number" className={pkgFieldClass("years_experience")} value={pkg.years_experience} onChange={e => setPkgField("years_experience", e.target.value)} placeholder="15" />
              {isMissing("years_experience") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found — please enter</p>}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-black">License number{isFound("license_number") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
              <input className={pkgFieldClass("license_number")} value={pkg.license_number} onChange={e => setPkgField("license_number", e.target.value)} placeholder="BC-12345" />
              {isMissing("license_number") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found — please enter</p>}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-black">Bonding capacity ($){isFound("bonding_capacity") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
              <input type="number" className={pkgFieldClass("bonding_capacity")} value={pkg.bonding_capacity} onChange={e => setPkgField("bonding_capacity", e.target.value)} placeholder="5000000" />
              {isMissing("bonding_capacity") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found — please enter</p>}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-black">Website{isFound("website") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
              <input className={pkgFieldClass("website")} value={pkg.website} onChange={e => setPkgField("website", e.target.value)} placeholder="www.company.com" />
              {isMissing("website") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found — please enter</p>}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-black">GL carrier{isFound("insurance_carrier") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
              <input className={pkgFieldClass("insurance_carrier")} value={pkg.insurance_carrier} onChange={e => setPkgField("insurance_carrier", e.target.value)} placeholder="Hartford" />
              {isMissing("insurance_carrier") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found — please enter</p>}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-black">GL policy #{isFound("insurance_policy_number") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
              <input className={pkgFieldClass("insurance_policy_number")} value={pkg.insurance_policy_number} onChange={e => setPkgField("insurance_policy_number", e.target.value)} placeholder="GL-987654" />
              {isMissing("insurance_policy_number") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found — please enter</p>}
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-black">GL limit{isFound("insurance_limit") && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black text-emerald-700">FOUND ONLINE</span>}</label>
              <input className={pkgFieldClass("insurance_limit")} value={pkg.insurance_limit} onChange={e => setPkgField("insurance_limit", e.target.value)} placeholder="$2M / $4M" />
              {isMissing("insurance_limit") && <p className="mt-1 text-[10px] font-bold text-orange-600">⚠ Not found — please enter</p>}
            </div>
          </div>
          <button onClick={savePackage} disabled={savingPkg || !pkg.name.trim()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">{savingPkg ? <><Loader2 size={16} className="animate-spin" />Saving…</> : "Save Package"}</button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f5f5]">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-black/10 bg-white lg:flex">
          <div className="flex h-[60px] items-center gap-3 border-b border-black/10 px-6">
            <Briefcase size={20} className="text-[#b0a209]" />
            <span className="text-lg font-black">Auto Bids Setup</span>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "ai" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>
                  <div className="rounded-xl border border-black/10 bg-black/[.02] px-3 py-3"><div className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "0ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "150ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "300ms" }} /></div></div>
                </div>
              )}
            </div>
          </div>
          <SidebarChatInput messages={messages} setMessages={setMessages} contextLabel="Auto Bids Setup" companyInfo={companyInfo} userTrades={userTrades} />
          {done && <div className="border-t border-black/10 p-4"><button onClick={() => nav("/auto-system-setup")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">Continue to System Setup <ArrowRight size={16} /></button></div>}
          <p className="px-6 pb-4 text-[10px] text-black/40">AI can make mistakes. Verify important information.</p>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
            <BackButton to="/onboarding" className="mb-4" />
            <p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Auto Bids</p>
            <h1 className="text-3xl font-black tracking-[-.03em] sm:text-[34px]">Bidding System Setup</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">Follow the AI assistant's guidance on the left and complete each phase on the right to set up your logo, proposal template, credentials package, and project photos.</p>

            <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between"><span className="text-sm font-black">Setup Progress</span><span className="text-sm font-bold text-black/50">{progress}%</span></div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#f2df0d] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
              <div className="mt-4 grid gap-2 sm:grid-cols-4">
                {PHASES.map((p, i) => {
                  const isDone = i < phaseIndex || done;
                  const isCurrent = i === phaseIndex && !done;
                  return (
                    <div key={p.key} className={`flex items-center gap-2 rounded-lg border p-2.5 ${isDone ? "border-[#f2df0d]/40 bg-[#fdfbe1]" : isCurrent ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 bg-white"}`}>
                      <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${isDone ? "bg-[#f2df0d] text-black" : isCurrent ? "bg-[#f2df0d]/20 text-[#b0a209]" : "bg-black/5 text-black/30"}`}>{isDone ? <Check size={14} /> : <p.icon size={14} />}</span>
                      <span className={`truncate text-xs font-bold ${isDone || isCurrent ? "text-black" : "text-black/30"}`}>{p.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black"><currentPhase.icon size={18} className="text-[#b0a209]" />{currentPhase.label}</h2>
              <div className="mt-4">{renderPhaseForm()}</div>
            </div>

            {done && (
              <div className="mt-5 rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-6 text-center shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f2df0d]"><Check size={28} className="text-black" /></span>
                <h2 className="mt-4 text-xl font-black">Auto Bids Ready!</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/60">Your logo, proposal template, email template, credentials package, and project photos are all set up. One last step — let's configure your automated system.</p>
                <button onClick={() => nav("/auto-system-setup")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f2df0d] px-6 py-3 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">Continue to System Setup <ArrowRight size={16} /></button>
              </div>
            )}

            <div className="mt-6 lg:hidden">
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-black"><Briefcase size={16} className="text-[#b0a209]" />AI Assistant</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-5 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                    </div>
                  ))}
                  {thinking && <p className="text-xs text-black/40">AI is typing…</p>}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <BrandApproval open={showBrandApproval} onClose={() => setShowBrandApproval(false)} logo={companyLogo} designOptions={designOptions} selectedDesign={selectedDesign} onSelectDesign={selectDesign} bulkEmailTemplates={bulkEmailTemplates} />
    </div>
  );
}