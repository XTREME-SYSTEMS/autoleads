import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Flag, Loader2, Search, Filter, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, Surface, StatusPill, money, fmtDate } from "@/components/CommercialMobileUI";

// BulkTakeoffReview — a single flat table of every takeoff line item across
// all active projects. Approve or flag individual scopes directly from the
// table without opening each project.
export default function BulkTakeoffReview() {
  const [projects, setProjects] = useState([]);
  const [takeoffs, setTakeoffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [scopeFilter, setScopeFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [allProjects, allTakeoffs] = await Promise.all([
        base44.entities.Project.list("-created_date", 300).catch(() => []),
        base44.entities.Takeoff.list("-created_date", 1000).catch(() => []),
      ]);
      const activeStages = ["qualification", "takeoff", "estimating", "proposal", "submitted"];
      const activeIds = new Set((allProjects || []).filter(p => activeStages.includes(p.stage)).map(p => p.id));
      setProjects((allProjects || []).filter(p => activeIds.has(p.id)));
      setTakeoffs((allTakeoffs || []).filter(t => activeIds.has(t.project_id)));
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const projectMap = useMemo(() => {
    const m = {}; (projects || []).forEach(p => { m[p.id] = p; }); return m;
  }, [projects]);

  const scopeOptions = useMemo(() => {
    const s = new Set(); (takeoffs || []).forEach(t => s.add(t.scope || t.system_code || "—"));
    return ["all", ...[...s].sort()];
  }, [takeoffs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (takeoffs || []).filter(t => {
      if (scopeFilter !== "all" && (t.scope || t.system_code) !== scopeFilter) return false;
      if (!q) return true;
      const p = projectMap[t.project_id] || {};
      return `${p.title || ""} ${t.scope || ""} ${t.system_code || ""} ${t.spec_evidence || ""}`.toLowerCase().includes(q);
    });
  }, [takeoffs, query, scopeFilter, projectMap]);

  const setDecision = async (t, decision) => {
    setBusyId(t.id);
    try {
      const approval_state = decision === "approved" ? "approved" : "unreviewed";
      await base44.entities.Takeoff.update(t.id, { reviewer_decision: decision, approval_state });
      setTakeoffs(prev => prev.map(x => x.id === t.id ? { ...x, reviewer_decision: decision, approval_state } : x));
      setToast({ type: "success", msg: decision === "approved" ? "Scope approved" : "Scope flagged" });
    } catch (e) {
      setToast({ type: "error", msg: e.message || "Update failed" });
    } finally { setBusyId(null); setTimeout(() => setToast(null), 1800); }
  };

  const approveAllForProject = async (projectId) => {
    const pRows = rows.filter(t => t.project_id === projectId && t.reviewer_decision !== "approved");
    if (pRows.length === 0) return;
    setBusyId(`proj-${projectId}`);
    try {
      await base44.entities.Takeoff.bulkUpdate(pRows.map(t => ({ id: t.id, reviewer_decision: "approved", approval_state: "approved" })));
      const ids = new Set(pRows.map(t => t.id));
      setTakeoffs(prev => prev.map(x => ids.has(x.id) ? { ...x, reviewer_decision: "approved", approval_state: "approved" } : x));
      setToast({ type: "success", msg: `${pRows.length} scopes approved` });
    } catch (e) {
      setToast({ type: "error", msg: e.message || "Bulk approve failed" });
    } finally { setBusyId(null); setTimeout(() => setToast(null), 1800); }
  };

  const counts = useMemo(() => {
    const approved = rows.filter(t => t.reviewer_decision === "approved").length;
    const flagged = rows.filter(t => t.reviewer_decision === "rejected").length;
    const pending = rows.length - approved - flagged;
    return { approved, flagged, pending, total: rows.length };
  }, [rows]);

  const projectsInRows = useMemo(() => {
    const seen = new Map();
    rows.forEach(t => { if (!seen.has(t.project_id)) seen.set(t.project_id, projectMap[t.project_id]); });
    return [...seen.values()].filter(Boolean);
  }, [rows, projectMap]);

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Home" />
      <IndustrialTitle compact>Bulk Takeoff Review</IndustrialTitle>
      <p className="mb-4 text-sm text-black/55">Every takeoff line item across all active projects. Approve or flag scopes directly from this table.</p>

      {/* Stat chips */}
      <div className="mb-4 grid grid-cols-4 gap-2">
        <StatChip label="Total" value={counts.total} tone="neutral"/>
        <StatChip label="Approved" value={counts.approved} tone="success"/>
        <StatChip label="Flagged" value={counts.flagged} tone="danger"/>
        <StatChip label="Pending" value={counts.pending} tone="warning"/>
      </div>

      {/* Filters */}
      <Surface className="mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30"/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search project, scope, evidence…" className="w-full rounded-lg border border-black/15 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-[#FFC400]"/>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-black/40"/>
            <select value={scopeFilter} onChange={e=>setScopeFilter(e.target.value)} className="rounded-lg border border-black/15 py-2.5 px-3 text-sm outline-none focus:border-[#FFC400]">
              {scopeOptions.map(o => <option key={o} value={o}>{o === "all" ? "All scopes" : o}</option>)}
            </select>
          </div>
        </div>
      </Surface>

      {loading ? (
        <Surface className="p-8 text-center text-sm text-black/45">Loading takeoffs…</Surface>
      ) : rows.length === 0 ? (
        <Surface className="p-8 text-center">
          <p className="font-brand text-lg font-bold uppercase">No takeoff line items</p>
          <p className="mt-2 text-sm text-black/50">Run Auto Flow to generate takeoffs for your active projects.</p>
        </Surface>
      ) : (
        <div className="space-y-5">
          {projectsInRows.map((p) => {
            const pRows = rows.filter(t => t.project_id === p.id);
            const allApproved = pRows.every(t => t.reviewer_decision === "approved");
            return (
              <div key={p.id}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-bold leading-tight">{p.title}</p>
                    <p className="text-[10px] text-black/45">{p.jurisdiction || "—"} • {money(p.value, true)} • Due {fmtDate(p.bid_due_date)}</p>
                  </div>
                  <button
                    onClick={() => approveAllForProject(p.id)}
                    disabled={busyId === `proj-${p.id}` || allApproved}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-500 px-3 py-2 text-[11px] font-bold uppercase text-white disabled:opacity-40"
                  >
                    {busyId === `proj-${p.id}` ? <Loader2 size={13} className="animate-spin"/> : <CheckCircle2 size={13}/>}
                    {allApproved ? "All approved" : "Approve all"}
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-black/10">
                  <div className="hidden grid-cols-[1.6fr_.7fr_.6fr_.5fr_.7fr_auto] gap-2 bg-black/[.03] px-3 py-2 text-[9px] font-black uppercase tracking-wide text-black/50 sm:grid">
                    <span>Scope</span><span>Code</span><span className="text-right">Qty</span><span>Unit</span><span>Confidence</span><span className="text-right">Action</span>
                  </div>
                  {pRows.map(t => {
                    const isApproved = t.reviewer_decision === "approved";
                    const isFlagged = t.reviewer_decision === "rejected";
                    return (
                      <div key={t.id} className={`grid grid-cols-2 gap-2 border-t border-black/[.06] px-3 py-2.5 text-sm sm:grid-cols-[1.6fr_.7fr_.6fr_.5fr_.7fr_auto] sm:items-center ${isApproved ? "bg-emerald-50/50" : isFlagged ? "bg-red-50/50" : "bg-white"}`}>
                        <div className="col-span-2 sm:col-span-1">
                          <p className="font-semibold leading-tight">{t.scope || t.system_code || "Scope"}</p>
                          {t.spec_evidence && <p className="mt-0.5 line-clamp-2 text-[10px] text-black/40">{t.spec_evidence}</p>}
                        </div>
                        <span className="text-xs font-bold text-black/60">{t.system_code || "—"}</span>
                        <span className="font-brand text-sm font-bold sm:text-right">{Number(t.final_quantity || t.raw_quantity || 0).toLocaleString()}</span>
                        <span className="text-xs text-black/50">{t.unit || ""}</span>
                        <span className="text-xs">{Number(t.confidence) > 0 ? <StatusPill tone={Number(t.confidence) >= 0.7 ? "success" : "warning"}>{Math.round(Number(t.confidence) * 100)}%</StatusPill> : "—"}</span>
                        <div className="col-span-2 flex justify-end gap-1.5 sm:col-span-1">
                          <button
                            onClick={() => setDecision(t, "approved")}
                            disabled={busyId === t.id || isApproved}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase ${isApproved ? "bg-emerald-500 text-white" : "border border-emerald-300 text-emerald-700 disabled:opacity-40"}`}
                          >
                            <CheckCircle2 size={13}/> {isApproved ? "Approved" : "Approve"}
                          </button>
                          <button
                            onClick={() => setDecision(t, "rejected")}
                            disabled={busyId === t.id || isFlagged}
                            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold uppercase ${isFlagged ? "bg-red-500 text-white" : "border border-red-300 text-red-600 disabled:opacity-40"}`}
                          >
                            <Flag size={13}/> {isFlagged ? "Flagged" : "Flag"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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

function StatChip({ label, value, tone }) {
  const tones = { success: "bg-emerald-50 text-emerald-700", danger: "bg-red-50 text-red-600", warning: "bg-amber-50 text-amber-700", neutral: "bg-black/[.04] text-black" };
  return (
    <div className={`rounded-xl p-3 text-center ${tones[tone] || tones.neutral}`}>
      <p className="font-brand text-xl font-black">{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wide opacity-70">{label}</p>
    </div>
  );
}