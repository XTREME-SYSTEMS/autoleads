import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, PrimaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import { Sparkles, Loader2, CheckCircle2, Globe, Mail, FileText, AlertCircle, Eye } from "lucide-react";

export default function AIProposalGenerator({ orgId, onGenerated }) {
  const [company, setCompany] = useState(null);
  const [logo, setLogo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    (async () => {
      try {
        const [companies, logos] = await Promise.all([
          base44.entities.CompanyProfile.filter({ organization_id: orgId }).catch(() => []),
          base44.entities.BrandAsset.filter({ organization_id: orgId, type: "logo" }).catch(() => []),
        ]);
        setCompany(companies?.[0] || null);
        setLogo((logos || []).find(l => l.is_default) || (logos || [])[0] || null);
      } catch {}
      setLoading(false);
    })();
  }, [orgId]);

  const generate = async () => {
    setGenerating(true);
    setError("");
    setResult(null);
    try {
      const res = await base44.functions.invoke("generateProposalTemplates", {});
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      if (onGenerated) onGenerated();
    } catch (e) {
      setError(e?.message || "Generation failed. Make sure your company profile is set up.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-5">
        <div className="flex items-center gap-2 text-sm text-black/50">
          <Loader2 size={16} className="animate-spin" /> Loading company info…
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="border-b border-black/10 bg-gradient-to-r from-[#fdfbe1] to-white p-5">
        <div className="flex items-start gap-4">
          {logo?.file_url ? (
            <img src={logo.file_url} alt="Company Logo" className="h-16 w-16 rounded-lg border border-black/10 object-contain" />
          ) : (
            <div className="grid h-16 w-16 place-items-center rounded-lg border-2 border-dashed border-black/15 text-black/30">
              <FileText size={24} />
            </div>
          )}
          <div className="flex-1">
            <h2 className="flex items-center gap-2 font-black">
              <Sparkles size={18} className="text-[#b0a209]" />
              AI Proposal Template Generator
            </h2>
            <p className="mt-1 text-sm text-black/50">
              Researches top commercial bid templates online, scrapes your company website,
              and generates professional proposal + email templates using your saved logo.
            </p>
          </div>
        </div>

        {/* Company info summary */}
        {company && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
            <InfoChip label="Company" value={company.name} />
            <InfoChip label="Trade" value={company.trade} />
            <InfoChip label="Website" value={company.website} />
            <InfoChip label="Logo" value={logo ? "Connected" : "Not set"} ok={!!logo} />
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="p-5">
        {!company?.name && (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>Set up your company profile in Settings → Company first, then generate templates.</span>
          </div>
        )}

        <PrimaryButton onClick={generate} disabled={generating || !company?.name} className="w-full">
          {generating ? (
            <><Loader2 size={16} className="animate-spin" /> Researching & Generating Templates…</>
          ) : (
            <><Sparkles size={16} /> Generate Professional Templates from My Website</>
          )}
        </PrimaryButton>

        {generating && (
          <div className="mt-4 space-y-2">
            <Step icon={Globe} label="Researching top commercial proposal templates online…" active />
            <Step icon={Globe} label="Scraping your company website for services & info…" active />
            <Step icon={FileText} label="Generating professional proposal template…" active />
            <Step icon={Mail} label="Creating email templates (intro, bid, follow-up)…" active />
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-600">
              <CheckCircle2 size={18} /> Templates generated and saved as system standard!
            </div>

            {/* Company Research */}
            {result.company_research && (
              <div className="rounded-lg border border-black/10 p-4">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase text-black/40">
                  <Globe size={14} /> Company Website Analysis
                </h3>
                <p className="mt-2 text-sm leading-6 text-black/70">{result.company_research}</p>
              </div>
            )}

            {/* Template Structure Research */}
            {result.template_structure && (
              <div className="rounded-lg border border-black/10 p-4">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase text-black/40">
                  <FileText size={14} /> Best Practices from Top Commercial Proposals
                </h3>
                <p className="mt-2 text-sm leading-6 text-black/70">{result.template_structure}</p>
              </div>
            )}

            {/* Email templates created */}
            {result.email_templates_created > 0 && (
              <div className="rounded-lg border border-black/10 p-4">
                <h3 className="flex items-center gap-2 text-xs font-black uppercase text-black/40">
                  <Mail size={14} /> Email Templates Created ({result.email_templates_created})
                </h3>
                <p className="mt-2 text-sm text-black/70">
                  Introduction, bid submission, and follow-up email templates saved to your Outreach Settings.
                </p>
              </div>
            )}

            {/* Preview button */}
            <button
              onClick={() => setPreviewing(!previewing)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 py-2.5 text-sm font-bold hover:bg-black/5"
            >
              <Eye size={15} /> {previewing ? "Hide Preview" : "Preview Proposal Template"}
            </button>
          </div>
        )}
      </div>

      {/* Template preview */}
      {result && previewing && (
        <div className="border-t border-black/10 bg-[#fafafa] p-5">
          <iframe
            title="Proposal Template Preview"
            sandbox=""
            srcDoc={result.proposal_template_html || ""}
            className="h-[600px] w-full rounded-lg border border-black/10 bg-white"
          />
        </div>
      )}
    </Card>
  );
}

function InfoChip({ label, value, ok }) {
  return (
    <div className="rounded-lg bg-black/[.03] px-3 py-2">
      <p className="text-[10px] font-black uppercase text-black/40">{label}</p>
      <p className={`mt-0.5 truncate text-xs font-bold ${ok ? "text-emerald-600" : "text-black/70"}`}>
        {value || "Not set"}
      </p>
    </div>
  );
}

function Step({ icon: Icon, label, active }) {
  return (
    <div className="flex items-center gap-2 text-sm text-black/60">
      <Loader2 size={14} className={`animate-spin ${active ? "text-[#b0a209]" : "opacity-30"}`} />
      <span>{label}</span>
    </div>
  );
}