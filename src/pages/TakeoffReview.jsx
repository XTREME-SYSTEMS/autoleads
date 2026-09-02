import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Loader2, Ruler, ShieldCheck, AlertCircle, Sparkles, FileCheck2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, StatusPill, Surface, money, fmtDate } from "@/components/CommercialMobileUI";
import { useOrgTradeFilter } from "@/hooks/useOrgTradeFilter";

export default function TakeoffReview() {
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [takeoffs, setTakeoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [approving, setApproving] = useState(false);
  const [validating, setValidating] = useState(null);
  const [validationResults, setValidationResults] = useState({});
  const [toast, setToast] = useState(null);
  const { matchesTrade } = useOrgTradeFilter();

  useEffect(() => {
    (async () => {
      try {
        const [allProjects, allTakeoffs] = await Promise.all([
          base44.entities.Project.filter({ stage: "takeoff" }, "-created_date", 200).catch(() => []),
          base44.entities.Takeoff.list("-created_date", 500).catch(() => []),
        ]);
        const takeoffProjectIds = new Set((allTakeoffs || []).map(t => t.project_id));
        const reviewable = (allProjects || []).filter(p => {
          if (!takeoffProjectIds.has(p.id) || p.data_class === "NON_PRODUCTION_EXAMPLE") return false;
          if (!matchesTrade(p)) return false;
          if (p.bid_due_date) { const due = new Date(p.bid_due_date); const today = new Date(); today.setHours(0,0,0,0); if (due < today) return false; }
          const hasInfo = Boolean((p.specs || "").trim() || (p.description || "").trim() || (p.contract_info || "").trim());
          if (!hasInfo) return false;
          return true;
        });
        setProjects(reviewable);
        setTakeoffs(allTakeoffs || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [matchesTrade]);

  const takeoffsByProject = useMemo(() => {
    const map = {};
    (takeoffs || []).forEach(t => {
      if (!map[t.project_id]) map[t.project_id] = [];
      map[t.project_id].push(t);
    });
    return map;
  }, [takeoffs]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(projects.map(p => p.id)));
  const clearSel = () => setSelected(new Set());
  const allSelected = projects.length > 0 && selected.size === projects.length;

  const validateProject = async (projectId) => {
    setValidating(projectId);
    try {
      const result = await base44.functions.invoke('validateTakeoff', { project_id: projectId });
      setValidationResults(prev => ({ ...prev, [projectId]: result }));
    } catch (err) {
      setValidationResults(prev => ({ ...prev, [projectId]: { verdict: 'issues_found', summary: err.message || 'Validation failed', issues: ['Could not reach AI validator'], checks: [] } }));
    }
    finally { setValidating(null); }
  };

  const approveSelected = async () => {
    if (selected.size === 0) return;
    setApproving(true);
    try {
      const ids = [...selected];
      // Approve takeoffs and advance projects
      const projectTakeoffs = ids.flatMap(pid => (takeoffsByProject[pid] || []).map(t => t.id));
      if (projectTakeoffs.length > 0) {
        await base44.entities.Takeoff.bulkUpdate(projectTakeoffs.map(id => ({ id, reviewer_decision: "approved", approval_state: "approved" })));
      }
      // Advance projects to estimating stage
      await Promise.all(ids.map(pid => base44.entities.Project.update(pid, { stage: "estimating" }).catch(() => {})));
      // Log approval events
      await base44.entities.PipelineEvent.bulkCreate(ids.map(pid => ({
        project_id: pid,
        step: "takeoff",
        status: "completed",
        event_type: "takeoff_approved",
        message: "Operator approved takeoffs for bid package generation",
        occurred_at: new Date().toISOString(),
      })));
      // Trigger bid package creation
      base44.functions.invoke('batchCreateBidPackages', { project_ids: ids }).catch(() => {});
      setToast({ type: 'success', msg: `${ids.length} project${ids.length > 1 ? 's' : ''} approved! Building bid packages now…` });
      setSelected(new Set());
      setTimeout(() => { setToast(null); nav('/bid-final-review'); }, 2500);
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Approval failed' });
    }
    finally { setApproving(false); }
  };

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Home" />
      <IndustrialTitle compact>Takeoff Review</IndustrialTitle>
      <p className="mb-4 text-sm text-black/55">Review completed takeoffs, validate with AI, then approve to build bid packages.</p>

      {loading ? (
        <Surface className="p-8 text-center text-sm text-black/45">Loading takeoffs…</Surface>
      ) : projects.length === 0 ? (
        <Surface className="p-8 text-center">
          <p className="font-brand text-xl font-bold uppercase">No takeoffs ready</p>
          <p className="mt-2 text-sm text-black/50">Select projects from Fresh Opportunities and gather details to generate takeoffs.</p>
          <button onClick={() => nav('/leads')} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FFC400] px-5 py-2.5 font-brand text-sm font-bold uppercase text-black">🔥 See Fresh Opportunities <ArrowRight size={15}/></button>
        </Surface>
      ) : (
        <>
          {/* Select All bar */}
          <div className="mb-3 flex items-center justify-between">
            <p className="font-brand text-[15px] font-bold uppercase"><FileCheck2 className="mr-2 inline text-[#E9A900]" size={18}/>{projects.length} ready for review</p>
            {projects.length > 0 && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-bold">
                <input type="checkbox" checked={allSelected} onChange={allSelected ? clearSel : selectAll} className="h-5 w-5 cursor-pointer accent-[#FFC400]"/>
                Select All
              </label>
            )}
          </div>

          {/* Project cards with takeoffs */}
          <div className="space-y-4">
            {projects.map((p, idx) => {
              const isSel = selected.has(p.id);
              const pTakeoffs = takeoffsByProject[p.id] || [];
              const validation = validationResults[p.id];
              const isValidating = validating === p.id;
              return (
                <Surface key={p.id} className={`overflow-hidden relative ${isSel ? 'ring-2 ring-[#FFC400]' : ''}`}>
                  <div className="absolute left-3 top-4 z-10">
                    <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)} className="h-6 w-6 cursor-pointer rounded border-2 border-black/20 accent-[#FFC400]"/>
                  </div>
                  <div className="p-4 pl-14">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black uppercase text-[#cebe0b]">#{idx + 1}</p>
                        <h2 className="text-[17px] font-bold leading-tight">{p.title}</h2>
                        <p className="mt-1 text-xs text-black/50">{p.jurisdiction || p.address || "Location not published"}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-brand text-[20px] font-bold text-[#E9A900]">{money(p.value, true)}</p>
                        <p className="text-[10px] text-black/45">Due {fmtDate(p.bid_due_date)}</p>
                      </div>
                    </div>

                    {/* Takeoff line items */}
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[10px] font-black uppercase tracking-wide text-black/40">Takeoff Quantities</p>
                      {pTakeoffs.map(t => (
                        <div key={t.id} className="flex items-center justify-between rounded-lg border border-black/[.06] bg-white p-2">
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold">{t.scope || t.system_code || "Scope"}</p>
                            {t.spec_evidence && <p className="truncate text-[10px] text-black/40">{t.spec_evidence}</p>}
                          </div>
                          <div className="ml-2 text-right">
                            <p className="font-brand text-base font-bold text-black">{Number(t.final_quantity || t.raw_quantity || 0).toLocaleString()} <span className="text-[10px] font-medium text-black/50">{t.unit || ""}</span></p>
                            {Number(t.confidence) > 0 && <p className="text-[9px] font-bold text-black/40">{Math.round(t.confidence)}% conf</p>}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI Validation */}
                    {validation && (
                      <div className={`mt-3 rounded-lg border p-3 ${validation.verdict === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                        <div className="flex items-center gap-2">
                          {validation.verdict === 'approved' ? <ShieldCheck size={16} className="text-emerald-600"/> : <AlertCircle size={16} className="text-amber-600"/>}
                          <p className={`text-sm font-bold ${validation.verdict === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>{validation.verdict === 'approved' ? 'All Good!' : 'Issues Found'}</p>
                          {Number(validation.confidence) > 0 && <span className="ml-auto text-xs font-bold text-black/50">{Math.round(validation.confidence)}% confidence</span>}
                        </div>
                        <p className="mt-1 text-xs text-black/65">{validation.summary}</p>
                        {validation.issues && validation.issues.length > 0 && (
                          <ul className="mt-2 space-y-1">
                            {validation.issues.map((issue, i) => <li key={i} className="text-xs text-amber-800">• {issue}</li>)}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => validateProject(p.id)} disabled={isValidating} className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#FFC400] bg-white font-brand text-xs font-bold uppercase text-black disabled:opacity-50">
                        {isValidating ? <><Loader2 size={14} className="animate-spin"/>Validating…</> : <><Sparkles size={14}/>Validate with AI</>}
                      </button>
                      <button onClick={() => nav(`/projects/${p.id}/takeoff`)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-lg border border-black/15 px-4 font-brand text-xs font-bold uppercase">View</button>
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>

          {/* Approve bar */}
          {selected.size > 0 && (
            <div className="sticky bottom-4 z-50 mt-6">
              <div className="flex items-center gap-3 rounded-2xl bg-[#FFC400] p-4 shadow-[0_8px_24px_rgba(255,196,0,.3)] ring-2 ring-[#E9A900]">
                <div>
                  <p className="font-brand text-sm font-bold uppercase">{selected.size} selected</p>
                  <p className="text-[10px] font-medium text-black/60">Approve to build bid packages</p>
                </div>
                <button onClick={approveSelected} disabled={approving} className="ml-auto flex min-h-12 items-center gap-2 rounded-xl bg-black px-6 font-brand text-base font-bold uppercase text-[#FFC400] disabled:opacity-50">
                  {approving ? <><Loader2 size={18} className="animate-spin"/>Building…</> : <>Approve <CheckCircle2 size={18}/></>}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed inset-x-4 bottom-24 z-[100] rounded-xl p-4 text-center font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}
    </CommercialPage>
  );
}