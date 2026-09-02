import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Page, Card, PrimaryButton, SecondaryButton, EmptyState, StatusPanel } from "@/components/autoleads/UiPrimitives";
import { FileText, Loader2, Sparkles, Check, AlertCircle, ShieldCheck, Clock, RefreshCw } from "lucide-react";
import { useEntityList } from "@/hooks/useEntityList";
import { TRADES } from "@/lib/geoData";
import MobileSelect from "@/components/autoleads/MobileSelect";

export default function Contracts() {
  const { records, loading, setRefreshKey } = useEntityList("ContractTemplate", { sort: "-created_date", limit: 100 });
  const [generating, setGenerating] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState("");
  const [contractType, setContractType] = useState("commercial");
  const [viewing, setViewing] = useState(null);
  const [genResult, setGenResult] = useState(null);

  const handleGenerate = async () => {
    if (!selectedTrade) return;
    setGenerating(true);
    setGenResult(null);
    try {
      const res = await base44.functions.invoke('generateContract', { trade: selectedTrade, contract_type: contractType });
      setGenResult(res);
      setRefreshKey(k => k + 1);
    } catch (e) {
      setGenResult({ error: e?.message || "Generation failed" });
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await base44.entities.ContractTemplate.update(id, { validated_by_user: true, validation_status: 'validated' });
      setRefreshKey(k => k + 1);
    } catch {}
  };

  const contracts = records || [];

  return (
    <Page eyebrow="Legal" title="Contract System" description="AI-enhanced, trade-specific contracts for commercial and government projects. Generated, AI-validated, and stored for your use." backTo="/dashboard">

      {/* Generation panel */}
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-[#b0a209]" />
          <h2 className="font-black">Generate AI Contract</h2>
        </div>
        <p className="mt-1 text-sm text-black/50">Searches the web for legal contract templates, generates a trade-specific contract, and validates it with AI for neutrality and legal soundness.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label>
            <span className="mb-1 block text-xs font-black">Trade</span>
            <MobileSelect label="Select Trade" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" value={selectedTrade} onChange={setSelectedTrade}>
              <option value="">Select a trade…</option>
              {TRADES.map(t => <option key={t} value={t}>{t}</option>)}
            </MobileSelect>
          </label>
          <label>
            <span className="mb-1 block text-xs font-black">Contract Type</span>
            <MobileSelect label="Select Type" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm" value={contractType} onChange={setContractType}>
              <option value="commercial">Commercial</option>
              <option value="government">Government</option>
              <option value="residential">Residential</option>
              <option value="industrial">Industrial</option>
              <option value="universal">Universal</option>
            </MobileSelect>
          </label>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={handleGenerate} disabled={generating || !selectedTrade}>
            {generating ? <><Loader2 size={16} className="animate-spin" /> Generating & Validating…</> : <><Sparkles size={16} /> Generate & AI-Validate Contract</>}
          </PrimaryButton>
        </div>
        {genResult?.error && <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600"><AlertCircle size={14} /> {genResult.error}</div>}
        {genResult?.success && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
              <Check size={16} /> Contract generated and {genResult.validation?.is_valid ? 'AI-validated' : 'needs review'}
            </div>
            {genResult.validation?.safety_score != null && (
              <p className="mt-1 text-xs text-emerald-600">Safety Score: {Math.round(genResult.validation.safety_score)}/100</p>
            )}
            {genResult.validation?.issues?.length > 0 && (
              <div className="mt-2 space-y-1">
                {genResult.validation.issues.map((issue, i) => (
                  <p key={i} className="text-xs text-amber-700">• {issue}</p>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Contract list */}
      <div className="mt-6 mb-3 flex items-center justify-between">
        <h2 className="text-sm font-black">{contracts.length} contract template{contracts.length !== 1 ? 's' : ''}</h2>
        <SecondaryButton onClick={() => setRefreshKey(k => k + 1)}><RefreshCw size={14} /> Refresh</SecondaryButton>
      </div>

      {loading ? <StatusPanel state="loading" /> : contracts.length === 0 ? (
        <Card><EmptyState icon={FileText} title="No contracts yet" description="Generate your first AI-enhanced contract template above." minHeight="240px" /></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {contracts.map(c => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-black">{c.title}</h3>
                  <p className="mt-0.5 text-xs text-black/40">{c.trade} · {c.contract_type}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                  c.validation_status === 'validated' ? 'bg-emerald-100 text-emerald-700' :
                  c.validation_status === 'needs_review' ? 'bg-amber-100 text-amber-700' :
                  c.validation_status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{c.validation_status}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                {c.ai_generated && <span className="flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 font-bold text-purple-600"><Sparkles size={10} /> AI-Generated</span>}
                {c.validated_by_ai && <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 font-bold text-blue-600"><ShieldCheck size={10} /> AI-Validated</span>}
                {c.validated_by_user ? <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 font-bold text-emerald-600"><Check size={10} /> User-Approved</span> : <span className="flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 font-bold text-amber-600"><Clock size={10} /> Awaiting Approval</span>}
                {c.is_standard && <span className="rounded bg-gray-100 px-2 py-0.5 font-bold text-gray-600">Standard</span>}
              </div>
              {c.terms && <p className="mt-3 line-clamp-2 text-xs text-black/50">{c.terms}</p>}
              <div className="mt-4 flex gap-2">
                <SecondaryButton onClick={() => setViewing(c)} className="flex-1">View</SecondaryButton>
                {!c.validated_by_user && c.validation_status === 'validated' && (
                  <PrimaryButton onClick={() => handleApprove(c.id)} className="flex-1">Approve</PrimaryButton>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* View modal */}
      {viewing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setViewing(null)}>
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-black">{viewing.title}</h2>
              <button onClick={() => setViewing(null)} className="rounded-lg p-1 hover:bg-black/5"><AlertCircle size={20} /></button>
            </div>
            <div className="whitespace-pre-wrap text-sm leading-7 text-black/70">{viewing.content}</div>
          </div>
        </div>
      )}
    </Page>
  );
}