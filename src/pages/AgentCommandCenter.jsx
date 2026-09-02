import React, { useEffect, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Send, Loader2, Plus, MessageSquare, Bot, Sparkles } from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";
import AgentMessageBubble from "@/components/autoleads/AgentMessageBubble";

const AGENT_NAME = "system_agent";

const SUGGESTIONS = [
  "Show me all open projects and their stages",
  "Create a new email template for bid follow-up",
  "Run a lead scrape for my service areas now",
  "Check my recent Gmail and summarize what needs a reply",
  "Generate draft proposals from qualified leads",
  "Create a new contractor app for my business"
];

export default function AgentCommandCenter() {
  const [conversations, setConversations] = useState(/** @type {any[]} */ ([]));
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [input, setInput] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  const loadConversations = async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
    } catch { setConversations([]); }
    finally { setLoadingConvos(false); }
  };

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    try {
      const convo = base44.agents.getConversation(activeId);
      setMessages(convo?.messages || []);
    } catch { setMessages([]); }
    const unsub = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data?.messages || []);
    });
    return () => unsub && unsub();
  }, [activeId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const newConversation = async () => {
    try {
      const convo = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: `Session ${new Date().toLocaleString()}` }
      });
      setConversations((c) => [convo, ...c]);
      setActiveId(convo.id);
    } catch { /* ignore */ }
  };

  const send = async (e, preset) => {
    const text = (preset || input).trim();
    if (!text || sending) return;
    e?.preventDefault();
    if (!activeId) { await newConversation(); }
    const convoId = activeId;
    if (!convoId) return;
    setInput("");
    setSending(true);
    try {
      const convo = base44.agents.getConversation(convoId);
      await base44.agents.addMessage(convo, { role: "user", content: text });
    } catch { /* subscription will surface error */ }
    finally { setSending(false); }
  };

  return (
    <div className="flex h-[calc(100vh-66px)] bg-white">
      {/* Conversation list */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-black/10 bg-[#fafafa] md:flex">
        <div className="p-3">
          <button onClick={newConversation} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-3 py-2.5 text-sm font-black text-black hover:bg-[#f4e431]">
            <Plus size={16} /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {loadingConvos ? (
            <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-black/30" /></div>
          ) : conversations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-black/40">No conversations yet. Start a new chat.</p>
          ) : conversations.map((c) => (
            <button key={c.id} onClick={() => setActiveId(c.id)} className={`mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition ${activeId === c.id ? "bg-[#fcf9cf] font-bold" : "hover:bg-black/5"}`}>
              <MessageSquare size={14} className="shrink-0 text-black/40" />
              <span className="truncate">{c.metadata?.name || "Untitled"}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Chat panel */}
      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-black/10 px-4 py-3">
          <BackButton to="/dashboard" />
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Bot size={18} /></span>
            <div>
              <h1 className="text-base font-black leading-tight">System Agent</h1>
              <p className="text-[11px] text-black/50">Full system control · email · scrape · discover · create</p>
            </div>
          </div>
        </header>

        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#fcf9cf] text-[#b0a209]"><Sparkles size={30} /></span>
            <div>
              <h2 className="text-xl font-black">Start a conversation</h2>
              <p className="mt-1 max-w-md text-sm text-black/50">The System Agent can edit anything in your system, send & read email, scrape leads, generate proposals, and create templates & apps. Try one of these:</p>
            </div>
            <div className="grid w-full max-w-lg gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => { newConversation().then(() => { setTimeout(() => send(null, s), 300); }); }} className="rounded-lg border border-black/10 bg-white px-4 py-2.5 text-left text-sm font-medium text-black/70 transition hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.length === 0 && (
                <div className="grid place-items-center py-12 text-center text-sm text-black/40">
                  <p>Send a message to start. The agent can read, create, update, and delete records across your whole system.</p>
                </div>
              )}
              {messages.map((m, i) => <AgentMessageBubble key={i} message={m} />)}
              {sending && <div className="flex justify-start"><div className="rounded-2xl bg-white border border-black/10 px-3.5 py-2.5"><Loader2 size={16} className="animate-spin text-black/40" /></div></div>}
            </div>
            <form onSubmit={send} className="border-t border-black/10 p-3">
              <div className="flex items-center gap-2 rounded-xl border border-black/15 bg-white p-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Ask the agent to do anything…" />
                <button type="submit" disabled={sending || !input.trim()} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40">
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}