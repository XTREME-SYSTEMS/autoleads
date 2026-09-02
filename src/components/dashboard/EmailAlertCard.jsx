import React, { useState } from "react";
import { ChevronDown, ChevronUp, MailCheck, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Surface } from "@/components/CommercialMobileUI";

export default function EmailAlertCard({ alerts }) {
  const [expandedId, setExpandedId] = useState(null);
  const [messageCache, setMessageCache] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  const toggleAlert = async (n) => {
    if (expandedId === n.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(n.id);

    // Mark as read so the flashing stops
    if (!n.read) {
      base44.entities.Notification.update(n.id, { read: true }).catch(() => {});
    }

    // If we already fetched the message, skip
    if (messageCache[n.id] || !n.linked_record_id) return;

    setLoadingId(n.id);
    try {
      const msg = await base44.entities.Message.get(n.linked_record_id);
      setMessageCache((prev) => ({ ...prev, [n.id]: msg }));
    } catch {
      setMessageCache((prev) => ({ ...prev, [n.id]: null }));
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Surface className="mt-3 border-2 border-emerald-400 bg-emerald-50 p-4 animate-pulse-green">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white">
          <MailCheck size={18} className="animate-pulse-emerald" />
        </span>
        <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-emerald-700">
          {alerts.length} Email Response{alerts.length > 1 ? "s" : ""}!
        </p>
      </div>

      <div className="mt-2 space-y-1.5">
        {alerts.slice(0, 3).map((n) => {
          const isOpen = expandedId === n.id;
          const msg = messageCache[n.id];
          const isLoading = loadingId === n.id;
          return (
            <div key={n.id} className="rounded-lg bg-white">
              <button
                onClick={() => toggleAlert(n)}
                className="flex w-full items-center gap-2 p-2 text-left"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 animate-pulse-emerald" />
                <p className="min-w-0 flex-1 truncate text-xs font-semibold text-emerald-900">
                  {n.title}
                </p>
                {isOpen ? (
                  <ChevronUp size={16} className="shrink-0 text-emerald-700" />
                ) : (
                  <ChevronDown size={16} className="shrink-0 text-emerald-700" />
                )}
              </button>

              {isOpen && (
                <div className="border-t border-emerald-100 px-3 py-3">
                  {isLoading ? (
                    <p className="text-xs text-black/40">Loading message…</p>
                  ) : msg ? (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-[10px] text-black/45">
                        <span className="font-bold text-black/70">{msg.sender || "—"}</span>
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 uppercase text-[9px] font-bold text-emerald-700">
                          {msg.channel || "email"}
                        </span>
                      </div>
                      <p className="mb-2 text-xs font-bold text-black/80">
                        {msg.subject || n.title}
                      </p>
                      <p className="whitespace-pre-wrap text-xs leading-6 text-black/65">
                        {msg.body || "(no body)"}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="mb-1 text-xs font-bold text-black/80">{n.title}</p>
                      <p className="text-xs leading-6 text-black/65">
                        {n.body || "(no preview available)"}
                      </p>
                      <p className="mt-2 text-[10px] text-black/35">
                        Full message not linked — open Messages to view.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => setExpandedId(null)}
                    className="mt-3 inline-flex items-center gap-1 rounded-md bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700"
                  >
                    <X size={12} /> Close
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Surface>
  );
}