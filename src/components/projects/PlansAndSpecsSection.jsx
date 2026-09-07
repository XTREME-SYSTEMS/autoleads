import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { FileText, Download, ExternalLink, Loader2, FileCheck, FileWarning, Layers, RefreshCw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Surface } from "@/components/CommercialMobileUI";

// Plans & Specifications section for the Project Detail page.
// Shows all available plans, specs, drawings, addenda, bid forms,
// the source readable document, and a button to fetch full details
// from the source URL.

const DOC_TYPE_META = {
  plans: { label: "Plans / Drawings", icon: Layers, color: "text-blue-600", bg: "bg-blue-50" },
  specs: { label: "Specifications", icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
  addenda: { label: "Addenda", icon: FileWarning, color: "text-amber-600", bg: "bg-amber-50" },
  bid_form: { label: "Bid Form", icon: FileCheck, color: "text-emerald-600", bg: "bg-emerald-50" },
  document: { label: "Document", icon: FileText, color: "text-black/60", bg: "bg-black/5" },
  other: { label: "Other", icon: FileText, color: "text-black/60", bg: "bg-black/5" },
};

export default function PlansAndSpecsSection({ project, onRefresh }) {
  const [fetching, setFetching] = useState(false);
  const [fetchResult, setFetchResult] = useState(null);

  const documents = project?.documents || [];
  const hasPlans = Boolean(project?.plans_url);
  const hasAddenda = Boolean(project?.addenda_url);
  const hasSpecs = Boolean((project?.specs || "").trim());
  const hasSourceDoc = Boolean((project?.source_readable_document || "").trim());
  const hasSourcePdf = Boolean(project?.source_pdf_url);
  const hasCompiledPdf = Boolean(project?.compiled_pdf_url);
  const hasSqFt = Boolean(project?.square_footage);
  const hasFloorFinish = Boolean(project?.floor_finish);

  const fetchDetails = async () => {
    if (!project?.source_url) return;
    setFetching(true);
    setFetchResult(null);
    try {
      const res = await base44.functions.invoke("verifyProject", { project_id: project.id });
      setFetchResult(res);
      if (onRefresh) onRefresh();
    } catch (err) {
      setFetchResult({ error: err?.message || "Failed to fetch details" });
    } finally {
      setFetching(false);
    }
  };

  const translateSource = async () => {
    if (!project?.source_url) return;
    setFetching(true);
    try {
      const res = await base44.functions.invoke("translateSourceDocument", { project_id: project.id });
      setFetchResult(res);
      if (onRefresh) onRefresh();
    } catch (err) {
      setFetchResult({ error: err?.message || "Failed to translate source" });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Key Project Data */}
      <Surface className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-brand text-sm font-bold uppercase text-[#D99D00]">Key Project Data</h3>
          <button
            onClick={fetchDetails}
            disabled={fetching || !project?.source_url}
            className="flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black disabled:opacity-40"
          >
            {fetching ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            Fetch Full Details
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DataChip label="Square Footage" value={hasSqFt ? `${Number(project.square_footage).toLocaleString()} SF` : "Not extracted"} ok={hasSqFt} />
          <DataChip label="Floor Finish" value={hasFloorFinish ? project.floor_finish : "Not extracted"} ok={hasFloorFinish} />
          <DataChip label="Documents" value={`${documents.length} found`} ok={documents.length > 0} />
          <DataChip label="Source PDF" value={hasSourcePdf ? "Generated" : "Not generated"} ok={hasSourcePdf} />
        </div>
        {fetchResult && (
          <div className={`mt-3 rounded-lg p-3 text-xs ${fetchResult.error ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
            {fetchResult.error ? `✗ ${fetchResult.error}` : "✓ Details fetched from source. Project updated with extracted data."}
          </div>
        )}
        {!project?.source_url && (
          <p className="mt-2 text-xs text-black/40">No source URL — this project may have been added manually.</p>
        )}
      </Surface>

      {/* Plans & Drawings */}
      <Surface className="p-5">
        <h3 className="mb-3 font-brand text-sm font-bold uppercase text-[#D99D00]">Plans & Drawings</h3>
        {hasPlans ? (
          <a href={project.plans_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 hover:bg-blue-100">
            <Layers size={20} className="text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-blue-900">View Plans / Drawings</p>
              <p className="text-xs text-blue-600/70 truncate">{project.plans_url}</p>
            </div>
            <ExternalLink size={16} className="text-blue-600" />
          </a>
        ) : (
          <EmptyDoc type="plans" />
        )}
        {documents.filter(d => d.type === "plans").map((doc, i) => (
          <DocLink key={i} doc={doc} />
        ))}
      </Surface>

      {/* Specifications */}
      <Surface className="p-5">
        <h3 className="mb-3 font-brand text-sm font-bold uppercase text-[#D99D00]">Specifications</h3>
        {hasSpecs ? (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-black/75">{project.specs}</p>
          </div>
        ) : (
          <EmptyDoc type="specs" />
        )}
        {documents.filter(d => d.type === "specs").map((doc, i) => (
          <DocLink key={i} doc={doc} />
        ))}
      </Surface>

      {/* Addenda */}
      <Surface className="p-5">
        <h3 className="mb-3 font-brand text-sm font-bold uppercase text-[#D99D00]">Addenda & Clarifications</h3>
        {hasAddenda ? (
          <a href={project.addenda_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 hover:bg-amber-100">
            <FileWarning size={20} className="text-amber-600" />
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-900">View Addenda</p>
              <p className="text-xs text-amber-600/70 truncate">{project.addenda_url}</p>
            </div>
            <ExternalLink size={16} className="text-amber-600" />
          </a>
        ) : (
          <EmptyDoc type="addenda" />
        )}
        {documents.filter(d => d.type === "addenda").map((doc, i) => (
          <DocLink key={i} doc={doc} />
        ))}
      </Surface>

      {/* Bid Forms & Other Documents */}
      {documents.filter(d => !["plans", "specs", "addenda"].includes(d.type)).length > 0 && (
        <Surface className="p-5">
          <h3 className="mb-3 font-brand text-sm font-bold uppercase text-[#D99D00]">Bid Forms & Other Documents</h3>
          {documents.filter(d => !["plans", "specs", "addenda"].includes(d.type)).map((doc, i) => (
            <DocLink key={i} doc={doc} />
          ))}
        </Surface>
      )}

      {/* Source Document */}
      {hasSourceDoc && (
        <Surface className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-brand text-sm font-bold uppercase text-[#D99D00]">Source Document (Readable)</h3>
            {!hasSourcePdf && (
              <button onClick={translateSource} disabled={fetching}
                className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-bold hover:bg-black/5 disabled:opacity-40">
                {fetching ? <Loader2 size={13} className="animate-spin" /> : <FileText size={13} />}
                Generate PDF
              </button>
            )}
          </div>
          <div className="prose-source-doc max-h-96 overflow-y-auto rounded-lg border border-black/10 bg-white p-4">
            <ReactMarkdown>{project.source_readable_document}</ReactMarkdown>
          </div>
        </Surface>
      )}

      {/* Generated PDFs */}
      {(hasSourcePdf || hasCompiledPdf) && (
        <Surface className="p-5">
          <h3 className="mb-3 font-brand text-sm font-bold uppercase text-[#D99D00]">Generated Documents</h3>
          <div className="space-y-2">
            {hasSourcePdf && (
              <a href={project.source_pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-3 hover:bg-black/[.02]">
                <FileText size={18} className="text-black/60" />
                <span className="flex-1 text-sm font-bold">Source PDF (clean readable document)</span>
                <Download size={16} className="text-black/40" />
              </a>
            )}
            {hasCompiledPdf && (
              <a href={project.compiled_pdf_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg border border-black/10 px-4 py-3 hover:bg-black/[.02]">
                <FileCheck size={18} className="text-emerald-600" />
                <span className="flex-1 text-sm font-bold">Compiled Project Document (source + specs + takeoff)</span>
                <Download size={16} className="text-black/40" />
              </a>
            )}
          </div>
        </Surface>
      )}
    </div>
  );
}

function DataChip({ label, value, ok }) {
  return (
    <div className={`rounded-lg border p-3 ${ok ? "border-emerald-200 bg-emerald-50" : "border-black/10 bg-black/[.02]"}`}>
      <p className="text-[10px] font-bold uppercase text-black/40">{label}</p>
      <p className={`mt-1 text-sm font-bold ${ok ? "text-emerald-700" : "text-black/40"}`}>{value}</p>
    </div>
  );
}

function DocLink({ doc }) {
  const meta = DOC_TYPE_META[doc.type] || DOC_TYPE_META.other;
  const Icon = meta.icon;
  return (
    <a href={doc.url} target="_blank" rel="noopener noreferrer"
      className={`mt-2 flex items-center gap-3 rounded-lg border px-4 py-3 hover:opacity-80 ${meta.bg} border-black/10`}>
      <Icon size={18} className={meta.color} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">{doc.name || "Untitled Document"}</p>
        <p className="text-xs text-black/50 truncate">{doc.url}</p>
      </div>
      <ExternalLink size={16} className="text-black/40" />
    </a>
  );
}

function EmptyDoc({ type }) {
  const meta = DOC_TYPE_META[type] || DOC_TYPE_META.other;
  return (
    <div className="rounded-lg border-2 border-dashed border-black/10 p-4 text-center">
      <p className="text-sm font-bold text-black/40">No {meta.label.toLowerCase()} extracted from source</p>
      <p className="mt-1 text-xs text-black/30">Click "Fetch Full Details" to extract from the source URL</p>
    </div>
  );
}