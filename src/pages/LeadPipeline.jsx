import React, { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { CalendarDays, Loader2, MapPin, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useEntityList } from "@/hooks/useEntityList";
import { useOrgTradeFilter } from "@/hooks/useOrgTradeFilter";
import { BackLink, CommercialPage, IndustrialTitle, StatusPill, Surface, fmtDate, money } from "@/components/CommercialMobileUI";
import { LEAD_CATEGORIES, categorizeProject, categoryMeta } from "@/lib/leadCategory";

const COLUMNS = [
  { key: "qualification", label: "Discovery", short: "New" },
  { key: "takeoff", label: "Takeoff", short: "Takeoff" },
  { key: "estimating", label: "Estimating", short: "Pricing" },
  { key: "proposal", label: "Proposal", short: "Bid Built" },
  { key: "submitted", label: "Bid Sent", short: "Sent" },
  { key: "follow_up", label: "Follow Up", short: "Follow" },
  { key: "won", label: "Won", short: "Won" },
  { key: "lost", label: "Rejected", short: "Rejected" },
];

const COL_ACCENT = {
  qualification: "#6b7280", takeoff: "#3b82f6", estimating: "#8b5cf6", proposal: "#f59e0b",
  submitted: "#0ea5e9", follow_up: "#ec4899", won: "#10b981", lost: "#ef4444",
};

export default function LeadPipeline() {
  const nav = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const { records, loading } = useEntityList("Project", { sort: "-bid_due_date", limit: 300, refreshKey });
  const { matchesTrade } = useOrgTradeFilter();
  const [cat, setCat] = useState("residential");
  const [busy, setBusy] = useState(null);
  const [confirmRejected, setConfirmRejected] = useState(false);
  const [confirmNoSpec, setConfirmNoSpec] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  const eligible = useMemo(() => (records || []).filter(p => {
    if (p.data_class === "NON_PRODUCTION_EXAMPLE") return false;
    if (!matchesTrade(p)) return false;
    // hide expired
    if (p.bid_due_date) { const due = new Date(p.bid_due_date); const today = new Date(); today.setHours(0, 0, 0, 0); if (due < today && p.stage !== "won" && p.stage !== "lost") return false; }
    // hide no-spec / no-info
    const hasInfo = Boolean((p.specs || "").trim() || (p.description || "").trim() || (p.contract_info || "").trim());
    if (!hasInfo) return false;
    return true;
  }).map(p => ({ ...p, _category: categorizeProject(p) })), [records, matchesTrade]);

  const byCat = useMemo(() => {
    const counts = { residential: 0, commercial: 0, gov: 0 };
    eligible.forEach(p => { counts[p._category] = (counts[p._category] || 0) + 1; });
    return counts;
  }, [eligible]);

  const visible = useMemo(() => eligible.filter(p => p._category === cat), [eligible, cat]);

  const columns = useMemo(() => COLUMNS.map(col => ({
    ...col,
    items: visible.filter(p => p.stage === col.key),
  })), [visible]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStage = destination.droppableId;
    setBusy(draggableId);
    try {
      await base44.entities.Project.update(draggableId, { stage: newStage });
      setRefreshKey(k => k + 1);
    } catch (e) {
      alert('Move failed: ' + (e?.message || 'unknown error'));
    } finally {
      setBusy(null);
    }
  };

  const deleteLead = async (p) => {
    if (!confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    setBusy(p.id);
    try { await base44.entities.Project.delete(p.id); setRefreshKey(k => k + 1); }
    catch (e) { alert('Delete failed: ' + (e?.message || 'unknown error')); }
    finally { setBusy(null); }
  };

  const deleteAllRejected = async () => {
    setCleaning(true);
    try {
      const rejected = eligible.filter(p => p.stage === "lost");
      let ok = 0, fail = 0;
      for (const p of rejected) { try { await base44.entities.Project.delete(p.id); ok++; } catch { fail++; } }
      setConfirmRejected(false); setRefreshKey(k => k + 1);
      alert(`Deleted ${ok} rejected project${ok === 1 ? '' : 's'}${fail ? `, ${fail} failed` : ''}.`);
    } catch (e) { alert('Bulk delete failed: ' + (e?.message || 'unknown error')); }
    finally { setCleaning(false); }
  };

  const cleanNoSpec = async () => {
    setCleaning(true);
    try {
      const all = records || [];
      const noSpec = all.filter(p => p.data_class !== "NON_PRODUCTION_EXAMPLE" && !Boolean((p.specs || "").trim() || (p.description || "").trim() || (p.contract_info || "").trim()));
      let ok = 0, fail = 0;
      for (const p of noSpec) { try { await base44.entities.Project.delete(p.id); ok++; } catch { fail++; } }
      setConfirmNoSpec(false); setRefreshKey(k => k + 1);
      alert(`Removed ${ok} project${ok === 1 ? '' : 's'} missing specs/info${fail ? `, ${fail} failed` : ''}.`);
    } catch (e) { alert('Clean failed: ' + (e?.message || 'unknown error')); }
    finally { setCleaning(false); }
  };

  const rejectedCount = eligible.filter(p => p.stage === "lost").length;

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Home" />
      <IndustrialTitle compact>Pipeline Board</IndustrialTitle>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {LEAD_CATEGORIES.map(c => {
          const isActive = cat === c.key;
          return (
            <button key={c.key} onClick={() => setCat(c.key)} className={`flex flex-col items-center gap-0.5 rounded-xl border-2 p-2.5 transition ${isActive ? "border-[#FFC400] bg-[#FFF7DA]" : "border-black/10 bg-white hover:border-black/20"}`}>
              <span className="text-base leading-none">{c.icon}</span>
              <span className="font-brand text-[11px] font-bold uppercase tracking-wide">{c.label}</span>
              <span className="text-[11px] font-bold text-black/45">{byCat[c.key] || 0}</span>
            </button>
          );
        })}
      </div>

      <Surface className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-black/55">{categoryMeta(cat).label} · {categoryMeta(cat).payment}</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => setConfirmNoSpec(true)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 font-brand text-xs font-bold uppercase text-amber-700">
              <Trash2 size={13} /> Clean No-Spec
            </button>
            <button onClick={() => setConfirmRejected(true)} disabled={rejectedCount === 0} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 font-brand text-xs font-bold uppercase text-red-700 disabled:opacity-40">
              <Trash2 size={13} /> Delete Rejected ({rejectedCount})
            </button>
          </div>
        </div>
      </Surface>

      {loading ? (
        <Surface className="p-10 text-center"><Loader2 className="mx-auto animate-spin text-[#E9A900]" size={28} /></Surface>
      ) : visible.length === 0 ? (
        <Surface className="p-8 text-center">
          <p className="font-brand text-xl font-bold uppercase">No {categoryMeta(cat).label.toLowerCase()} leads on the board</p>
          <p className="mt-2 text-sm text-black/50">Pursue leads from the Hot Opportunities feed to populate this board.</p>
        </Surface>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-3 overflow-x-auto pb-4" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(200px, 1fr))` }}>
            {columns.map(col => (
              <Droppable key={col.key} droppableId={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`rounded-xl border-2 bg-black/[.02] ${snapshot.isDraggingOver ? "border-[#FFC400]" : "border-black/10"}`}>
                    <div className="flex items-center justify-between border-b-2 px-3 py-2.5" style={{ borderColor: COL_ACCENT[col.key] + "40" }}>
                      <span className="font-brand text-[12px] font-bold uppercase tracking-wide" style={{ color: COL_ACCENT[col.key] }}>{col.label}</span>
                      <span className="grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold text-white" style={{ background: COL_ACCENT[col.key] }}>{col.items.length}</span>
                    </div>
                    <div className="space-y-2 p-2 min-h-[80px]">
                      {col.items.map((p, idx) => (
                        <Draggable key={p.id} draggableId={p.id} index={idx}>
                          {(drag, snap) => (
                            <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} className={`rounded-lg border bg-white p-2.5 shadow-sm ${snap.isDragging ? "ring-2 ring-[#FFC400] shadow-lg" : "border-black/10"}`}>
                              <div className="flex items-start justify-between gap-1.5">
                                <button onClick={() => nav(`/projects/${p.id}`)} className="min-w-0 flex-1 text-left">
                                  <h3 className="text-[13px] font-bold leading-tight line-clamp-2">{p.title}</h3>
                                  <p className="mt-1 flex items-center gap-1 text-[10px] text-black/45"><MapPin size={10} />{p.jurisdiction || p.address || "—"}</p>
                                </button>
                                <button onClick={() => deleteLead(p)} disabled={busy === p.id} title="Delete" className="grid h-7 w-7 shrink-0 place-items-center rounded text-red-500 hover:bg-red-50 disabled:opacity-40">
                                  {busy === p.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                                </button>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="font-brand text-[15px] font-bold text-[#E9A900]">{money(p.value, true)}</span>
                                {p.bid_due_date && <span className="flex items-center gap-0.5 text-[10px] text-black/45"><CalendarDays size={10} />{fmtDate(p.bid_due_date)}</span>}
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {p.trade && <StatusPill tone="info">{p.trade}</StatusPill>}
                                {Number(p.bidability_score || 0) >= 70 && <StatusPill tone="warning">Good Fit</StatusPill>}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {col.items.length === 0 && <p className="py-4 text-center text-[10px] text-black/30">Drag leads here</p>}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      {confirmRejected && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/45 p-4 sm:items-center sm:justify-center" onClick={() => setConfirmRejected(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-brand text-2xl font-bold uppercase text-red-600">Delete all rejected?</p>
              <button onClick={() => setConfirmRejected(false)}><X size={22} /></button>
            </div>
            <p className="text-sm text-black/50">Permanently deletes all {rejectedCount} rejected project{rejectedCount === 1 ? '' : 's'} (stage = Rejected). This cannot be undone.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmRejected(false)} disabled={cleaning} className="min-h-12 rounded-lg border border-black/15 font-bold">Cancel</button>
              <button onClick={deleteAllRejected} disabled={cleaning} className="min-h-12 rounded-lg bg-red-600 font-brand text-base font-bold uppercase text-white disabled:opacity-50">
                {cleaning ? <><Loader2 size={16} className="animate-spin" /> Deleting…</> : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmNoSpec && (
        <div className="fixed inset-0 z-[100] flex items-end bg-black/45 p-4 sm:items-center sm:justify-center" onClick={() => setConfirmNoSpec(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-5" onClick={e => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="font-brand text-2xl font-bold uppercase text-amber-600">Remove no-spec projects?</p>
              <button onClick={() => setConfirmNoSpec(false)}><X size={22} /></button>
            </div>
            <p className="text-sm text-black/50">Permanently deletes every project with no specs, description, or contract info attached. This cleans the database so only real, documented jobs remain. This cannot be undone.</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => setConfirmNoSpec(false)} disabled={cleaning} className="min-h-12 rounded-lg border border-black/15 font-bold">Cancel</button>
              <button onClick={cleanNoSpec} disabled={cleaning} className="min-h-12 rounded-lg bg-amber-600 font-brand text-base font-bold uppercase text-white disabled:opacity-50">
                {cleaning ? <><Loader2 size={16} className="animate-spin" /> Cleaning…</> : 'Clean All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CommercialPage>
  );
}