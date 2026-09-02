import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Sparkles, Loader2, Mail, Phone, MapPin, Globe, Award, RefreshCw, Search, Brain, TrendingUp, Check } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";
import { base44 } from "@/api/base44Client";

export default function CompanyDatabase() {
  const nav = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [search, setSearch] = useState("");
  const [enriching, setEnriching] = useState(null);
  const [enrichments, setEnrichments] = useState(/** @type {any} */ ({}));
  const [bulkEnriching, setBulkEnriching] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const { records: companies, loading } = useEntityList("CompanyProfile", { sort: "-created_date", limit: 200, refreshKey });
  const { records: projects } = useEntityList("Project", { limit: 200, refreshKey });

  // Build a map of projects per company (by source_id or name match)
  const projectCountMap = useMemo(() => {
    const m = {};
    (projects || []).forEach(p => {
      const key = p.authority || p.client_name || "";
      if (key) m[key] = (m[key] || 0) + 1;
    });
    return m;
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return companies || [];
    return (companies || []).filter(c =>
      (c.name || "").toLowerCase().includes(q) ||
      (c.trade || "").toLowerCase().includes(q) ||
      (c.city || "").toLowerCase().includes(q) ||
      (c.state || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q)
    );
  }, [companies, search]);

  const enrichCompany = async (company) => {
    setEnriching(company.id);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a construction business intelligence analyst. Analyze this contractor/client company and provide AI-enhanced insights.

Company: ${company.name || 'Unknown'}
Trade: ${company.trade || 'N/A'}
Location: ${company.city || ''}, ${company.state || ''}
Website: ${company.website || 'N/A'}
Phone: ${company.phone || 'N/A'}
Email: ${company.email || 'N/A'}
Employees: ${company.employees || 'N/A'}
Bonding Capacity: ${company.bonding_capacity || 'N/A'}
License: ${company.license_number || 'N/A'}
Prior Awards: ${company.prior_awards || 0}
Relationship: ${company.relationship_strength || 'none'}

Return JSON with:
- relationship_insight: 1-2 sentence assessment of relationship potential (weak/moderate/strong prospect)
- recommended_approach: how to approach this company for future work
- opportunity_score: 0-100 number (likelihood of winning future work with them)
- key_notes: 1-2 bullet points about this company's profile`,
        response_json_schema: {
          type: "object",
          properties: {
            relationship_insight: { type: "string" },
            recommended_approach: { type: "string" },
            opportunity_score: { type: "number" },
            key_notes: { type: "string" },
          },
        },
      });
      setEnrichments(prev => ({ ...prev, [company.id]: res }));
    } catch {
      setEnrichments(prev => ({ ...prev, [company.id]: { error: "Failed to enrich" } }));
    } finally {
      setEnriching(null);
    }
  };

  const bulkEnrich = async () => {
    setBulkEnriching(true);
    setBulkResult(null);
    let enriched = 0;
    for (const company of filtered.slice(0, 10)) {
      if (enrichments[company.id]) continue;
      await enrichCompany(company);
      enriched++;
    }
    setBulkEnriching(false);
    setBulkResult({ count: enriched });
  };

  const relColor = (r) => ({
    none: "bg-gray-100 text-gray-600",
    weak: "bg-amber-50 text-amber-700",
    moderate: "bg-blue-50 text-blue-700",
    strong: "bg-emerald-50 text-emerald-700",
  }[r] || "bg-gray-100 text-gray-600");

  return (
    <Page backTo="/dashboard" eyebrow="AI Database" title="Company Intelligence Database"
      description="Every company captured automatically when you generate a bid package — enriched with AI insights on relationship potential and opportunity scoring."
      actions={<>
        <SecondaryButton onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={15} />Refresh</SecondaryButton>
        <PrimaryButton onClick={bulkEnrich} disabled={bulkEnriching}>
          {bulkEnriching ? <><Loader2 size={15} className="animate-spin" />Enriching…</> : <><Sparkles size={15} />AI Enrich Top 10</>}
        </PrimaryButton>
      </>}>

      {bulkResult && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-bold text-emerald-700">
          <Check size={16} /> AI enriched {bulkResult.count} companies with relationship insights and opportunity scores.
        </div>
      )}

      {/* Search */}
      <div className="mb-5 relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
        <input value={search} onChange={e => setSearch(e.target.value)} className={`${inputClass} pl-9`} placeholder="Search by name, trade, location, email…" />
      </div>

      {loading ? <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-[#f2df0d]" /></div> :
        filtered.length === 0 ? (
          <Card><EmptyState icon={Building2} title="No companies yet" description="Companies are saved automatically when you generate bid packages. Generate proposals from your leads to populate this database." action={<PrimaryButton onClick={() => nav('/proposals')}>Go to Bid Packages</PrimaryButton>} minHeight="300px" /></Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map(company => {
              const e = enrichments[company.id];
              const projCount = projectCountMap[company.name] || 0;
              return (
                <Card key={company.id} className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-black">{company.name || "Unknown Company"}</h3>
                      <p className="mt-0.5 text-xs text-black/50">{company.trade || "General"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${relColor(company.relationship_strength)}`}>
                      {company.relationship_strength || "none"}
                    </span>
                  </div>

                  {/* Contact details */}
                  <div className="mt-3 space-y-1.5 text-xs text-black/60">
                    {company.email && <p className="flex items-center gap-1.5"><Mail size={12} className="text-black/40" />{company.email}</p>}
                    {company.phone && <p className="flex items-center gap-1.5"><Phone size={12} className="text-black/40" />{company.phone}</p>}
                    {(company.city || company.state) && <p className="flex items-center gap-1.5"><MapPin size={12} className="text-black/40" />{company.city}{company.city && company.state ? ", " : ""}{company.state}</p>}
                    {company.website && <p className="flex items-center gap-1.5"><Globe size={12} className="text-black/40" /><span className="truncate">{company.website}</span></p>}
                  </div>

                  {/* Stats */}
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                    {company.prior_awards > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 font-bold text-amber-700"><Award size={11} />{company.prior_awards} awards</span>}
                    {projCount > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 font-bold text-blue-700"><Building2 size={11} />{projCount} projects</span>}
                    {company.bonding_capacity > 0 && <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 font-bold text-emerald-700">Bonded ${(company.bonding_capacity / 1000000).toFixed(1)}M</span>}
                  </div>

                  {/* AI Enrichment */}
                  {e && !e.error && (
                    <div className="mt-3 rounded-lg border border-[#f2df0d]/30 bg-[#fefef6] p-3">
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-[#b0a209]"><Brain size={12} />AI Insight</div>
                      <p className="mt-1.5 text-xs leading-5 text-black/70">{e.relationship_insight}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[11px] font-bold text-black/60"><TrendingUp size={11} />Opportunity Score:</div>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-black ${(e.opportunity_score || 0) >= 70 ? "bg-emerald-100 text-emerald-700" : (e.opportunity_score || 0) >= 40 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{e.opportunity_score}/100</span>
                      </div>
                      {e.key_notes && <p className="mt-1.5 text-[11px] leading-5 text-black/50">{e.key_notes}</p>}
                    </div>
                  )}

                  {/* Enrich button */}
                  <button onClick={() => enrichCompany(company)} disabled={enriching === company.id}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/10 bg-white py-2 text-xs font-bold text-black/70 hover:border-[#f2df0d] hover:bg-[#fdfbe1] disabled:opacity-40">
                    {enriching === company.id ? <><Loader2 size={13} className="animate-spin" />Analyzing…</> : e ? <><RefreshCw size={13} />Re-enrich</> : <><Sparkles size={13} />AI Enrich</>}
                  </button>
                </Card>
              );
            })}
          </div>
        )}
    </Page>
  );
}