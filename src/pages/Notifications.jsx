import React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";
import { useNavigate } from "react-router-dom";

const TYPE_ICONS = {
  opportunity: "🎯",
  bid_invitation: "📥",
  takeoff: "📐",
  proposal: "📄",
  source_health: "⚠️",
  deadline: "⏰",
  system: "🔔",
};

export default function Notifications() {
  const nav = useNavigate();
  const { records, loading } = useEntityList("Notification", { sort: "-created_date", limit: 50 });
  const notifications = records || [];
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <Page backTo="/dashboard" eyebrow="Activity Stream" title="Notifications" description="Review user and system notifications without fabricated activity."
      actions={<PrimaryButton><CheckCheck size={17}/>Mark all read</PrimaryButton>}>
      <div className="mb-4">
        <Card className="p-4"><div className="flex items-center justify-between"><span className="text-sm font-bold text-black/55">Unread notifications</span><span className="text-2xl font-black">{unread}</span></div></Card>
      </div>
      {loading ? <div className="py-12 text-center text-sm text-black/40">Loading…</div> :
       notifications.length === 0 ? <Card><EmptyState icon={Bell} title="No notifications yet" description="System and workflow notifications will appear here as your sources and pipelines activate." minHeight="320px"/></Card> :
       <Card className="overflow-hidden">
         <div className="divide-y divide-black/5">
           {notifications.map((n) => (
             <div key={n.id} className={`flex items-start gap-3 p-4 ${n.read?'':'bg-[#fdfbe1]'}`}>
               <span className="text-xl">{TYPE_ICONS[n.type]||"🔔"}</span>
               <div className="min-w-0 flex-1">
                 <div className="flex items-center justify-between">
                   <h3 className="text-sm font-black">{n.title}</h3>
                   <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${n.priority==='critical'?'bg-red-50 text-red-600':n.priority==='high'?'bg-amber-50 text-amber-700':'bg-black/5 text-black/40'}`}>{n.priority}</span>
                 </div>
                 {n.body && <p className="mt-1 text-xs leading-5 text-black/50">{n.body}</p>}
                 {n.linked_route && <button onClick={()=>nav(n.linked_route)} className="mt-2 text-xs font-black text-[#a09308]">Open →</button>}
               </div>
               {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-[#f2df0d]"/>}
             </div>
           ))}
         </div>
       </Card>}
    </Page>
  );
}