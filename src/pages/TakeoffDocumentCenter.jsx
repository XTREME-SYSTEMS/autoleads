import React, { useEffect, useMemo, useState } from "react";
import { FileText, Loader2, CheckCircle2, XCircle, Download, Sparkles, FileCheck2, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, Surface, StatusPill, money, fmtDate } from "@/components/CommercialMobileUI";

// TakeoffDocumentCenter — central dashboard to scan, validate, and approve the
// human-readable takeoff documents the system generates (source PDFs + compiled
// scope/takeoff PDFs). Open each document, validate it, and approve it for use.
export default function TakeoffDocumentCenter() {
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [takeoffs, setTakeoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [allProjects, allTakeoffs] = await Promise.all([
        base44.entities.Project.list("-created_date", 300).catch(() => []),
        base44.entities.Takeoff.list("-created_date", 1000).catch(() => []),
      ]);
      // Projects that have a readable document or takeoffs — the ones with docs to review
      const docStages = ["takeoff", "estimating", "proposal", "submitted"];
      const reviewable = (allProjects || []).filter(p =>
        docStages.includes(p.stage) &&
        (p.source_readable_document || p.source_pdf_url || (allTakeoffs || []).some(t => t.project_id === p.id))
      );
      setProjects(reviewable);
      setTakeoffs(allTakeoffs || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const takeoffsByProject = useMemo(() => {
    const m = {}; (takeoffs || []).forEach(t => { (m[t.project_id] = m[t.project_id] || []).push(t); }); return m;
  }, [takeoffs]);

  const approveDoc = async (p) => {
    setBusyId(p.id);
    try {
      // Approve all takeoffs for this project + mark doc approved by advancing to estimating
      const pTakeoffs = takeoffsByProject[p.id] || [];
      if (pTakeoffs.length > 0) {
        await base44.entities.Takeoff.bulkUpdate(pTakeoffs.map(t => ({ id: t.id, reviewer_decision: "approved", approval_state: "approved" })));
      }
      if (p.stage === "takeoff") {
        await base44.entities.Project.update(p.id, { stage: "estimating" });
      }
      setProjects(prev => prev.map(x => x.id === p.id ? { ...x, stage: x.stage === "takeoff" ? "estimating" : x.stage } : x));
      setToast({ type: "success", msg: "Document approved — project advanced to estimating" });
    } catch (e) {
      setToast({ type: "error", msg: e.message || "Approval failed" });
    } finally { setBusyId(null); setTimeout(() => setToast(null), 2000); }
  };

  const generateCompiled = async (p) => {
    setBusyId(`compile-${p.id}`);
    try {
      const res = await base44.functions.invoke("compileProjectDocument", { project_id: p.id });
      if (res?.data?.compiled_pdf_url) {
        setProjects(prev => prev.map(x => x.id === p.id ? { ...x, compiled_pdf_url: res.data.compiled_pdf_url, compiled_pdf_generated_at: new Date().toISOString() } : x));
        setToast({ type: "success", msg: "Compiled document generated" });
      } else {
        setToast({ type: "error", msg: res?.data?.errors?.[0] || "No approved takeoffs to compile yet" });
      }
    } catch (e) {
      setToast({ type: "error", msg: e.message || "Compile failed" });
    } finally { setBusyId(null); setTimeout(() => setToast(null), 2200); }
  };

  const regenerateSourcePdfs = async () => {
    setGenerating(true);
    try {
      await base44.functions.invoke("generateSourcePdfs", { force: false, limit: 100 });
      setToast({ type: "success", msg: "Source PDFs refreshed" });
      load();
    } catch (e) {
      setToast({ type: "error", msg: e.message || "Refresh failed" });
    } finally { setGenerating(false); setTimeout(() => setToast(null), 2000); }
  };

  const counts = useMemo(() => {
    const withDoc = projects.filter(p => p.source_pdf_url || p.compiled_pdf_url).length;
    const approved = projects.filter(p => ["estimating", "proposal", "submitted"].includes(p.stage)).length;
    return { total: projects.length, withDoc, pending: projects.length - approved };
  }, [projects]);

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Home" />
      <IndustrialTitle compact>Takeoff Document Center</IndustrialTitle>
      <p className="mb-4 text-sm text-black/55">Scan, validate, and approve the human-readable takeoff documents the system generates for every project.</p>

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Stat label="Documents" value={counts.withDoc} tone="info"/>
        <Stat label="Approved" value={counts.approved} tone="success"/>
        <Stat label="Pending" value={counts.pending} tone="warning"/>
      </div>

      <button
        onClick={regenerateSourcePdfs}
        disabled={generating}
        className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#FFC400] bg-white py-3 font-brand text-sm font-bold uppercase text-black disabled:opacity-50"
      >
        {generating ? <><Loader2 size={16} className="animate-spin"/>Generating PDFs…</> : <><Sparkles size={16}/>Refresh Source PDFs</>}
      </button>

      {loading ? (
        <Surface className="p-8 text-center text-sm text-black/45">Loading documents…</Surface>
      ) : projects.length === 0 ? (
        <Surface className="p-8 text-center">
          <p className="font-brand text-lg font-bold uppercase">No documents yet</p>
          <p className="mt-2 text-sm text-black/50">Run Auto Flow to generate takeoff documents for your projects.</p>
          <button onClick={() => nav("/dashboard")} className="mt-4 rounded-lg bg-[#FFC400] px-5 py-2.5 font-brand text-sm font-bold uppercase text-black">Go to Dashboard</button>
        </Surface>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const pTakeoffs = takeoffsByProject[p.id] || [];
            const approvedCount = pTakeoffs.filter(t => t.reviewer_decision === "approved").length;
            const isApproved = ["estimating", "proposal", "submitted"].includes(p.stage);
            const hasSourcePdf = !!p.source_pdf_url;
            const hasCompiled = !!p.compiled_pdf_url;
            return (
              <Surface key={p.id} className={`overflow-hidden ${isApproved ? "ring-1 ring-emerald-300" : ""}`}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[16px] font-bold leading-tight">{p.title}</h2>
                      <p className="mt-1 text-xs text-black/50">{p.jurisdiction || "—"} • {money(p.value, true)} • Due {fmtDate(p.bid_due_date)}</p>
                    </div>
                    {isApproved
                      ? <StatusPill tone="success"><ShieldCheck size={11}/>Approved</StatusPill>
                      : <StatusPill tone="warning">Pending review</StatusPill>}
                  </div>

                  {/* Document chips */}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <DocChip icon={FileText} label="Source PDF" available={hasSourcePdf} url={p.source_pdf_url} onClick={() => !hasSourcePdf && nav(`/projects/${p.id}/source`)}/>
                    <DocChip icon={FileCheck2} label="Compiled Scope + Takeoff" available={hasCompiled} url={p.compiled_pdf_url} onGenerate={() => generateCompiled(p)} generating={busyId === `compile-${p.id}`}/>
                  </div>

                  {/* Takeoff summary */}
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-black/[.03] px-3 py-2">
                    <p className="text-xs font-semibold text-black/60">{pTakeoffs.length} takeoff line item{pTakeoffs.length !== 1 ? "s" : ""}</p>
                    <p className="text-xs font-bold text-emerald-600">{approvedCount} approved</p>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => nav(`/projects/${p.id}/source`)} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-black/15 font-brand text-xs font-bold uppercase">
                      <FileText size={14}/>View Source
                    </button>
                    <button onClick={() => nav(`/projects/${p.id}/takeoff`)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-black/15 px-4 font-brand text-xs font-bold uppercase">
                      Takeoffs
                    </button>
                    <button
                      onClick={() => approveDoc(p)}
                      disabled={busyId === p.id || isApproved}
                      className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500 font-brand text-xs font-bold uppercase text-white disabled:opacity-40"
                    >
                      {busyId === p.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>}
                      {isApproved ? "Approved" : "Approve Doc"}
                    </button>
                  </div>
                </div>
              </Surface>
            );
          })}
        </div>
      )}

      {toast && (
        <div className={`fixed inset-x-4 bottom-24 z-[100] rounded-xl p-3 text-center text-sm font-bold text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </CommercialPage>
  );
}

function Stat({ label, value, tone }) {
  const tones = { success: "bg-emerald-50 text-emerald-700", warning: "bg-amber-50 text-amber-700", info: "bg-blue-50 text-blue-700" };
  return (
    <div className={`rounded-xl p-3 text-center ${tones[tone] || "bg-black/[.04] text-black"}`}>
      <p className="font-brand text-xl font-black">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}

function DocChip({ icon: Icon, label, available, url, onClick, onGenerate, generating }) {
  if (available) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700">
        <Icon size={13}/> {label} <Download size={12}/>
      </a>
    );
  }
  return (
    <button onClick={onGenerate || onClick} disabled={generating} className="flex items-center gap-1.5 rounded-lg border border-dashed border-black/20 px-2.5 py-1.5 text-[11px] font-bold text-black/50 disabled:opacity-50">
      {generating ? <Loader2 size={13} className="animate-spin"/> : <Icon size={13}/>} {label}
    </button>
  );
}