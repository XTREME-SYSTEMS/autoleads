import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Inbox, Target } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const EVENT_STYLES = {
  bid_due: { icon: Target, cls: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500", label: "Bid Due" },
  deadline: { icon: Clock, cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", label: "Deadline" },
  follow_up: { icon: Inbox, cls: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500", label: "Follow-Up" },
  task: { icon: CalendarDays, cls: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500", label: "Task" },
};

function toDateStr(d) {
  if (!d) return null;
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return null;
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  } catch { return null; }
}

export default function CalendarWorkspace() {
  const nav = useNavigate();
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(toDateStr(today));

  const { records: projects } = useEntityList("Project", { limit: 500 });
  const { records: invitations } = useEntityList("BidInvitation", { limit: 200 });
  const { records: tasks } = useEntityList("ActionItem", { filter: { status: "open" }, limit: 200 });

  const events = useMemo(() => {
    const map = {};
    (projects || []).forEach(p => {
      const ds = toDateStr(p.bid_due_date);
      if (!ds) return;
      (map[ds] = map[ds] || []).push({
        type: "bid_due", title: p.title, meta: p.authority || p.jurisdiction || "",
        route: `/projects/${p.id}`, id: p.id,
      });
    });
    (invitations || []).forEach(inv => {
      const ds = toDateStr(inv.deadline);
      if (!ds) return;
      (map[ds] = map[ds] || []).push({
        type: "deadline", title: inv.subject, meta: inv.sender || "",
        route: "/bid-inbox", id: inv.id,
      });
    });
    (tasks || []).forEach(t => {
      const ds = toDateStr(t.due_date);
      if (!ds) return;
      (map[ds] = map[ds] || []).push({
        type: "task", title: t.title, meta: t.category || "",
        route: t.linked_route || "/tasks", id: t.id,
      });
    });
    return map;
  }, [projects, invitations, tasks]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr: ds, events: events[ds] || [] });
    }
    return days;
  }, [viewYear, viewMonth, events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const todayStr = toDateStr(today);
  const selectedEvents = selectedDate ? (events[selectedDate] || []) : [];
  const upcomingEvents = Object.entries(events)
    .filter(([ds]) => ds >= todayStr)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 8);

  return (
    <Page backTo="/dashboard" eyebrow="Schedule" title="Calendar"
      description="Track bid deadlines, site visits, follow-ups, and project milestones in one governed calendar."
      actions={<PrimaryButton onClick={() => { setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); setSelectedDate(todayStr); }}><CalendarDays size={16}/>Today</PrimaryButton>}>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Calendar grid */}
        <Card className="lg:col-span-2 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-black">{MONTHS[viewMonth]} {viewYear}</h2>
            <div className="flex gap-1.5">
              <button onClick={prevMonth} className="grid h-9 w-9 place-items-center rounded-lg border border-black/15 hover:bg-black/5"><ChevronLeft size={18}/></button>
              <button onClick={nextMonth} className="grid h-9 w-9 place-items-center rounded-lg border border-black/15 hover:bg-black/5"><ChevronRight size={18}/></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {WEEKDAYS.map(d => <div key={d} className="pb-2 text-center text-[11px] font-black uppercase text-black/40">{d}</div>)}
            {calendarDays.map((cell, i) => {
              if (!cell) return <div key={`e${i}`} />;
              const isToday = cell.dateStr === todayStr;
              const isSelected = cell.dateStr === selectedDate;
              const hasEvents = cell.events.length > 0;
              return (
                <button key={cell.dateStr} onClick={() => setSelectedDate(cell.dateStr)}
                  className={`relative flex min-h-[64px] flex-col items-center rounded-lg border p-1.5 transition sm:min-h-[80px] ${
                    isSelected ? "border-[#f2df0d] bg-[#fdfbe1] ring-2 ring-[#f2df0d]/20"
                    : isToday ? "border-[#f2df0d]/40 bg-[#fdfbe1]/50"
                    : "border-black/8 bg-white hover:border-black/15"
                  }`}>
                  <span className={`text-sm font-black ${isToday ? "text-[#b0a209]" : "text-black/70"}`}>{cell.day}</span>
                  {hasEvents && (
                    <div className="mt-1 flex flex-wrap justify-center gap-1">
                      {cell.events.slice(0, 3).map((e, j) => {
                        const s = EVENT_STYLES[e.type];
                        return <span key={j} className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />;
                      })}
                      {cell.events.length > 3 && <span className="text-[9px] font-bold text-black/40">+{cell.events.length - 3}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Selected day + upcoming */}
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 font-black">
              {selectedDate ? new Date(selectedDate + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }) : "Select a day"}
            </h3>
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-black/40">No events scheduled for this day.</p>
            ) : (
              <div className="space-y-2.5">
                {selectedEvents.map((e, i) => {
                  const s = EVENT_STYLES[e.type];
                  const Icon = s.icon;
                  return (
                    <button key={i} onClick={() => nav(e.route)} className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:shadow-sm ${s.cls}`}>
                      <Icon size={18} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{e.title}</p>
                        <p className="truncate text-xs text-black/50">{e.meta || s.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-black">Upcoming</h3>
            {upcomingEvents.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming events" description="Bid deadlines and follow-ups will appear here as they're scheduled." minHeight="120px" />
            ) : (
              <div className="space-y-2">
                {upcomingEvents.map(([ds, evts]) => (
                  <div key={ds}>
                    <p className="mb-1 text-[11px] font-black uppercase text-black/40">
                      {new Date(ds + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </p>
                    {evts.slice(0, 2).map((e, i) => {
                      const s = EVENT_STYLES[e.type];
                      return (
                        <button key={i} onClick={() => nav(e.route)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-black/5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                          <span className="truncate font-bold">{e.title}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}