import React from "react";
import { Calendar, MapPin, Clock, Users } from "lucide-react";

const MOCK_EVENTS = [
  { day: '15', month: 'Sep', title: 'Orange County Convention Center — Bid Due', time: '2:00 PM', location: 'Orlando, FL', type: 'deadline', color: 'red' },
  { day: '20', month: 'Sep', title: 'Site Walk — Miami-Dade School', time: '10:00 AM', location: 'Miami, FL', type: 'meeting', color: 'blue' },
  { day: '22', month: 'Sep', title: 'Miami-Dade School — Bid Due', time: '3:00 PM', location: 'Miami, FL', type: 'deadline', color: 'red' },
  { day: '30', month: 'Sep', title: 'Jacksonville Riverfront — Bid Due', time: '1:00 PM', location: 'Jacksonville, FL', type: 'deadline', color: 'red' },
  { day: '01', month: 'Oct', title: 'Tampa Airport — Pre-bid Meeting', time: '9:00 AM', location: 'Tampa, FL', type: 'meeting', color: 'blue' },
  { day: '10', month: 'Oct', title: 'Fort Lauderdale Resort — Bid Due', time: '12:00 PM', location: 'Fort Lauderdale, FL', type: 'deadline', color: 'red' },
];

const COLOR_MAP = {
  red: 'border-red-500/30 bg-red-500/10 text-red-400',
  blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
};

export default function MockCalendar() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
        <p className="text-xs font-bold text-amber-400">⚠ SIMULATION ENVIRONMENT — Mock events, not live calendar</p>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-white">Mock Calendar</h2>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/60">{MOCK_EVENTS.length} events</span>
      </div>
      <div className="space-y-2">
        {MOCK_EVENTS.map((ev, i) => (
          <div key={i} className={`flex items-center gap-3 rounded-xl border p-4 ${COLOR_MAP[ev.color]}`}>
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-white/10">
              <p className="text-lg font-black leading-none">{ev.day}</p>
              <p className="text-[10px] font-bold uppercase">{ev.month}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{ev.title}</p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-white/40">
                <span className="flex items-center gap-1"><Clock size={12} />{ev.time}</span>
                <span className="flex items-center gap-1"><MapPin size={12} />{ev.location}</span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-white/10 px-2 py-1 text-[10px] font-black uppercase">{ev.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}