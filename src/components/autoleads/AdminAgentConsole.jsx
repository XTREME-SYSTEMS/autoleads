import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Loader2, Bot, Sparkles } from "lucide-react";

const AGENT_NAME = "system_agent";

const QUICK_COMMANDS = [
  "Run a full system audit and tell me the scores",
  "Fix and heal all open system gaps",
  "Run the full pipeline: scrape, verify, takeoff, and propose",
  "Research competitors and benchmark AUTOLEADS",
  "Check all scrape sources and report which are broken",
  "Audit every page for empty data and fix what you can",
];

export default function AdminAgentConsole() {
  const [convoId, setConvoId] = useState(null);
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        if (list && list.length > 0) {
          setConvoId(list[0].id);
        } else {
          const convo = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: "Admin Control" },
          });
          setConvoId(convo.id);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  useEffect(() => {
    if (!convoId) { setMessages([]); return; }
    try {
      const convo = base44.agents.getConversation(convoId);
      setMessages(convo?.messages || []);
    } catch { setMessages([]); }
    const unsub = base44.agents.subscribeToConversation(convoId, (data) => {
      setMessages(data?.messages || []);
    });
    return () => unsub && unsub();
  }, [convoId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const send = async (e, preset) => {
    const text = (preset || input).trim();
    if (!text || sending || !convoId) return;
    e?.preventDefault();
    setInput("");
    setSending(true);
    try {
      const convo = base44.agents.getConversation(convoId);
      await base44.agents.addMessage(convo, { role: "user", content: text });
    } catch { /* subscription surfaces error */ }
    finally { setSending(false); }
  };

  return (
    <div className="flex h-[520px] flex-col rounded-xl border border-black/10 bg-white">
      <header className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Bot size={16} /></span>
        <div>
          <p className="text-sm font-black leading-tight">Agent Command Console</p>
          <p className="text-[11px] text-black/50">Instruct the AI to build, fix, audit, or heal the system — no developer needed</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#fcf9cf] text-[#b0a209]"><Sparkles size={22} /></span>
            <p className="max-w-xs text-xs text-black/50">Tell the agent what to build, fix, or audit. It has full system access and can self-heal.</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-[#f2df0d] text-black font-medium" : "border border-black/10 bg-white"}`}>
              <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
        {sending && <div className="flex justify-start"><div className="rounded-2xl border border-black/10 bg-white px-3.5 py-2.5"><Loader2 size={16} className="animate-spin text-black/40" /></div></div>}
      </div>

      <div className="border-t border-black/10 px-3 pb-2 pt-2">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK_COMMANDS.map((q) => (
            <button key={q} onClick={(e) => send(e, q)} disabled={sending} className="rounded-full border border-black/10 bg-[#fafafa] px-2.5 py-1 text-[11px] font-medium text-black/60 transition hover:border-[#f2df0d] hover:bg-[#fdfbe1] disabled:opacity-40">
              {q}
            </button>
          ))}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 rounded-xl border border-black/15 bg-white p-1.5">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Instruct the agent…" />
          <button type="submit" disabled={sending || !input.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40">
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </form>
      </div>
    </div>
  );
}