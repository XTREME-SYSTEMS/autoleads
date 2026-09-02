import React, { useMemo, useState } from "react";
import { DragDropContext, Draggable, Droppable } from "@hello-pangea/dnd";
import { CalendarDays, Loader2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useOrgTradeFilter } from "@/hooks/useOrgTradeFilter";
import { StatusPill, fmtDate, money } from "@/components/CommercialMobileUI";
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

export default function PipelineKanban({ projects = [], onMoved }) {
  const nav = useNavigate();
  const { matchesTrade } = useOrgTradeFilter();
  const [cat, setCat] = useState("residential");
  const [busy, setBusy] = useState(null);

  const eligible = useMemo(() => (projects || []).filter(p => {
    if (p.data_class === "NON_PRODUCTION_EXAMPLE") return false;
    if (!matchesTrade(p)) return false;
    if (p.bid_due_date) {
      const due = new Date(p.bid_due_date); const today = new Date(); today.setHours(0, 0, 0, 0);
      if (due < today && p.stage !== "won" && p.stage !== "lost") return false;
    }
    const hasInfo = Boolean((p.specs || "").trim() || (p.description || "").trim() || (p.contract_info || "").trim());
    if (!hasInfo) return false;
    return true;
  }).map(p => ({ ...p, _category: categorizeProject(p) })), [projects, matchesTrade]);

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
      if (onMoved) onMoved();
    } catch (e) {
      alert("Move failed: " + (e?.message || "unknown error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-3 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,.06)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="font-brand text-[15px] font-bold uppercase tracking-[.035em]">Pipeline Board</h2>
        <button onClick={() => nav("/leads/pipeline")} className="text-xs font-bold text-[#D99D00]">Full board →</button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2">
        {LEAD_CATEGORIES.map(c => {
          const isActive = cat === c.key;
          const isRes = c.key === "residential";
          return (
            <button key={c.key} onClick={() => setCat(c.key)} className={`relative flex flex-col items-center gap-0.5 rounded-xl border-2 p-2 text-center transition ${isActive ? "border-[#FFC400] bg-[#FFF7DA]" : "border-black/10 bg-white hover:border-black/20"}`}>
              {isRes && <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FFC400] px-1.5 text-[8px] font-black uppercase tracking-wide text-black shadow">Priority 1</span>}
              <span className="text-sm leading-none">{c.icon}</span>
              <span className="font-brand text-[10px] font-bold uppercase tracking-wide">{c.label}</span>
              <span className="text-[11px] font-bold text-black/45">{byCat[c.key] || 0}</span>
            </button>
          );
        })}
      </div>

      <p className="mb-2 text-[11px] font-semibold text-black/50">{categoryMeta(cat).label} · {categoryMeta(cat).payment}</p>

      {visible.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-black/10 p-6 text-center">
          <p className="font-brand text-sm font-bold uppercase text-black/40">No {categoryMeta(cat).label.toLowerCase()} leads on the board</p>
          <p className="mt-1 text-[11px] text-black/40">Pursue leads from Hot Opportunities to populate this board.</p>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid gap-2 overflow-x-auto pb-2" style={{ gridTemplateColumns: `repeat(${COLUMNS.length}, minmax(150px, 1fr))` }}>
            {columns.map(col => (
              <Droppable key={col.key} droppableId={col.key}>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`rounded-xl border-2 bg-black/[.02] ${snapshot.isDraggingOver ? "border-[#FFC400]" : "border-black/10"}`}>
                    <div className="flex items-center justify-between border-b-2 px-2 py-1.5" style={{ borderColor: COL_ACCENT[col.key] + "40" }}>
                      <span className="font-brand text-[10px] font-bold uppercase tracking-wide" style={{ color: COL_ACCENT[col.key] }}>{col.label}</span>
                      <span className="grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold text-white" style={{ background: COL_ACCENT[col.key] }}>{col.items.length}</span>
                    </div>
                    <div className="space-y-1.5 p-1.5 min-h-[60px]">
                      {col.items.map((p, idx) => (
                        <Draggable key={p.id} draggableId={p.id} index={idx}>
                          {(drag, snap) => (
                            <div ref={drag.innerRef} {...drag.draggableProps} {...drag.dragHandleProps} className={`rounded-lg border bg-white p-2 shadow-sm ${snap.isDragging ? "ring-2 ring-[#FFC400] shadow-lg" : "border-black/10"}`}>
                              <button onClick={() => nav(`/projects/${p.id}`)} className="block w-full text-left">
                                <h3 className="text-[11px] font-bold leading-tight line-clamp-2">{p.title}</h3>
                                <p className="mt-0.5 flex items-center gap-1 text-[9px] text-black/45"><MapPin size={9} />{p.jurisdiction || p.address || "—"}</p>
                              </button>
                              <div className="mt-1 flex items-center justify-between">
                                <span className="font-brand text-[12px] font-bold text-[#E9A900]">{money(p.value, true)}</span>
                                {busy === p.id && <Loader2 size={11} className="animate-spin text-black/40" />}
                                {p.bid_due_date && busy !== p.id && <span className="flex items-center gap-0.5 text-[9px] text-black/45"><CalendarDays size={9} />{fmtDate(p.bid_due_date)}</span>}
                              </div>
                              {p.trade && <div className="mt-1"><StatusPill tone="info">{p.trade}</StatusPill></div>}
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {col.items.length === 0 && <p className="py-3 text-center text-[9px] text-black/30">Drag here</p>}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}
    </section>
  );
}