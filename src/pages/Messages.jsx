import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, Mail, MailCheck, MailPlus, Send } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, PrimaryAction } from "@/components/CommercialMobileUI";
import { useEntityList } from "@/hooks/useEntityList";

export default function Messages() {
  const nav = useNavigate();
  const { records, loading } = useEntityList("Message", { sort: "-created_date", limit: 50 });
  const [selected, setSelected] = useState(null);
  const messages = records || [];

  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Messages</IndustrialTitle>

    <div className="mb-3"><PrimaryAction onClick={() => nav('/outreach')}><MailPlus size={16}/>New Message</PrimaryAction></div>

    <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
      <Surface className="divide-y divide-black/[.07]">
        <div className="px-4 py-3"><p className="font-brand text-[14px] font-bold uppercase tracking-[.035em]">Inbox</p></div>
        {loading ? <div className="py-8 text-center text-sm text-black/40">Loading…</div> :
          messages.length === 0 ? <div className="p-8 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-dashed border-black/20 bg-white text-black/40"><Inbox size={26}/></span><p className="mt-3 text-sm text-black/50">No messages yet</p></div> :
          messages.map((m) => (
            <button key={m.id} onClick={() => setSelected(m)} className={`flex w-full items-start gap-3 px-4 py-3 text-left ${selected?.id === m.id ? "bg-[#FFF7DA]" : ""}`}>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${m.direction === "inbound" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                {m.direction === "inbound" ? <Mail size={18}/> : <Send size={18}/>}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-bold">{m.sender || m.recipient || "—"}</span>
                  {!m.read && m.direction === "inbound" && <span className="h-2 w-2 shrink-0 rounded-full bg-[#FFC400]"/>}
                </div>
                <p className="truncate text-xs text-black/50">{m.subject}</p>
              </div>
            </button>
          ))}
      </Surface>

      <Surface className="p-4">
        {selected ? (
          <div>
            <p className="mb-3 font-brand text-[15px] font-bold uppercase tracking-[.035em]">{selected.subject}</p>
            <div className="flex items-center gap-2 text-xs text-black/45">
              <span className="font-bold text-black">{selected.sender || "—"}</span>
              <span>→</span>
              <span>{selected.recipient || "—"}</span>
              <span className="ml-auto rounded bg-black/5 px-2 py-0.5 uppercase text-[10px] font-bold">{selected.channel}</span>
            </div>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-black/70">{selected.body || "(no body)"}</p>
            {selected.ai_generated && <p className="mt-4 rounded-lg bg-[#FFF7DA] p-3 text-xs font-bold text-[#a09308]">AI-generated · {selected.requires_approval ? "Approval required before sending" : "Approved"}</p>}
          </div>
        ) : (
          <div className="grid place-items-center p-8 text-center" style={{ minHeight: "300px" }}>
            <div>
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-black/20 bg-white text-black/40"><MailCheck size={29}/></span>
              <h3 className="mt-4 font-brand text-lg font-bold uppercase">Select a message</h3>
              <p className="mt-2 text-sm text-black/50">Choose a message from the inbox to read.</p>
            </div>
          </div>
        )}
      </Surface>
    </div>
  </CommercialPage>;
}