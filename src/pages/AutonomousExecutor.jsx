import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bot, Send, Loader2, Sparkles, Zap, ShieldCheck, Rocket,
  Plus, MessageSquare, Trash2, ChevronRight,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";

const AGENT_NAME = "autonomous_executor";

const QUICK_COMMANDS = [
  { label: "Full System Audit", text: "Run a complete forensic audit of the entire AUTOLEADS system. Score every layer, identify every gap, and create SystemFlag records for all issues found." },
  { label: "Fix All Issues", text: "Fix every open SystemGap and SystemFlag. Auto-heal the system, fix broken pages and functions, and verify all fixes." },
  { label: "Run Full Pipeline", text: "Run the full autonomous pipeline end-to-end: scrape → verify → takeoff → estimate → proposal → validate → submit." },
  { label: "Test Until 100", text: "Run the full test suite. Fix every failing test. Continue until every category scores 100. Then run 3 consecutive E2E passes." },
  { label: "Harden for Production", text: "Harden the system for production: verify RLS, security, integrations, workflows. Fix every issue. Certify production readiness." },
  { label: "Master Implementation", text: "Execute the full master autonomous implementation: install everything needed, audit, fix, optimize, test, harden, and deploy the entire system end-to-end. Do not stop until certified at 100." },
];

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${isUser ? "bg-[#f2df0d] text-black" : "bg-white border border-black/10 text-black"}`}>
        {!isUser && (
          <div className="mb-1 flex items-center gap-1.5">
            <span className="grid h-5 w-5 place-items-center rounded bg-[#0b0b0b] text-[#f2df0d]"><Bot size={12} /></span>
            <span className="text-[10px] font-black uppercase tracking-wide text-black/50">Autonomous Executor</span>
          </div>
        )}
        {message.content && (
          isUser
            ? <p className="text-sm font-medium whitespace-pre-wrap">{message.content}</p>
            : <div className="text-sm prose prose-sm max-w-none"><ReactMarkdown>{message.content}</ReactMarkdown></div>
        )}
        {message.tool_calls?.map((tc, i) => (
          <ToolCallDisplay key={i} toolCall={tc} />
        ))}
      </div>
    </div>
  );
}

function ToolCallDisplay({ toolCall: tc }) {
  const [expanded, setExpanded] = useState(false);
  const status = tc.status || "pending";
  const isFailed = ["failed", "error"].includes(status) || /error|failed/i.test(String(tc.results || ""));
  const icon = status === "completed" || status === "success" ? "✓" : isFailed ? "✗" : "⟳";
  const color = status === "completed" || status === "success" ? "text-emerald-600" : isFailed ? "text-red-500" : "text-amber-500";

  let parsedResults = tc.results;
  try { parsedResults = typeof tc.results === "string" ? JSON.parse(tc.results) : tc.results; } catch {}

  return (
    <div className="mt-2 rounded-lg bg-black/5 p-2 text-xs">
      <button onClick={() => setExpanded(!expanded)} className="flex w-full items-center gap-2 text-left">
        <span className={`font-bold ${color}`}>{icon}</span>
        <span className="font-bold text-black/70">{tc.name || "function"}</span>
        <span className={`ml-auto text-[10px] ${color}`}>{status}</span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1">
          {tc.arguments_string && (
            <div>
              <p className="font-bold text-black/40">Args:</p>
              <pre className="max-h-40 overflow-auto rounded bg-black/90 p-2 text-[10px] text-white/80">{tc.arguments_string}</pre>
            </div>
          )}
          {parsedResults && (
            <div>
              <p className="font-bold text-black/40">Result:</p>
              <pre className="max-h-40 overflow-auto rounded bg-black/90 p-2 text-[10px] text-white/80">{JSON.stringify(parsedResults, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AutonomousExecutor() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);

  // Load conversations
  useEffect(() => {
    (async () => {
      try {
        const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
        setConversations(list || []);
        if (list && list.length > 0 && !activeId) {
          setActiveId(list[0].id);
        }
      } catch {
        // agent may not have conversations yet
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Subscribe to active conversation
  useEffect(() => {
    if (!activeId) return;
    const unsub = base44.agents.subscribeToConversation(activeId, (data) => {
      setMessages(data.messages || []);
    });
    return () => { if (typeof unsub === "function") unsub(); };
  }, [activeId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const newConversation = async () => {
    try {
      const conv = await base44.agents.createConversation({
        agent_name: AGENT_NAME,
        metadata: { name: `Autonomous Run ${new Date().toLocaleString()}`, description: "Autonomous executor session" },
      });
      setConversations(prev => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
    } catch (e) {
      alert("Could not create conversation: " + (e?.message || "unknown error"));
    }
  };

  const send = async (text) => {
    const content = text || input;
    if (!content.trim() || sending) return;
    if (!activeId) {
      // auto-create a conversation if none exists
      await newConversation();
      // retry send after creation — but we need the new ID, so just set input and let user click again
      // Actually, let's create then send in one flow
    }

    setSending(true);
    setInput("");
    try {
      const conv = conversations.find(c => c.id === activeId) || await base44.agents.getConversation(activeId);
      await base44.agents.addMessage(conv, { role: "user", content });
      // subscription will update messages
    } catch (e) {
      alert("Send failed: " + (e?.message || "unknown error"));
    } finally {
      setSending(false);
    }
  };

  const deleteConv = async (id) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await base44.agents.updateConversation(id, { metadata: { name: "_deleted", description: "" } });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeId === id) { setActiveId(null); setMessages([]); }
    } catch {}
  };

  return (
    <div className="flex h-screen bg-[#fafafa]">
      {/* Sidebar — conversations */}
      <div className="hidden w-72 shrink-0 flex-col border-r border-black/10 bg-white md:flex">
        <div className="border-b border-black/10 p-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b0b0b] text-[#f2df0d]"><Bot size={22} /></span>
            <div>
              <h1 className="text-sm font-black">Autonomous Executor</h1>
              <p className="text-[10px] text-black/50">Full-access autonomous AI</p>
            </div>
          </div>
        </div>
        <div className="p-3">
          <button onClick={newConversation} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-3 py-2.5 text-xs font-black text-black hover:bg-[#e0cc0a]">
            <Plus size={15} /> New Session
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-3">
          {conversations.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-black/30">No sessions yet</p>
          )}
          {conversations.map(c => (
            <div key={c.id} className={`group flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${activeId === c.id ? "bg-[#f2df0d]/20" : "hover:bg-black/5"}`}>
              <button onClick={() => setActiveId(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <MessageSquare size={13} className="shrink-0 text-black/40" />
                <span className="truncate font-bold">{c.metadata?.name || "Untitled"}</span>
              </button>
              <button onClick={() => deleteConv(c.id)} className="opacity-0 group-hover:opacity-100">
                <Trash2 size={13} className="text-red-400" />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-black/10 p-3">
          <button onClick={() => navigate("/prompt-library")} className="flex w-full items-center gap-2 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
            <Sparkles size={13} /> Prompt Library
          </button>
        </div>
      </div>

      {/* Main chat */}
      <div className="flex flex-1 flex-col">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-black/10 bg-white px-4 py-3 md:hidden">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Bot size={16} /></span>
            <span className="text-sm font-black">Autonomous Executor</span>
          </div>
          <button onClick={newConversation} className="rounded-lg bg-[#f2df0d] px-2.5 py-1.5 text-xs font-black"><Plus size={14} /></button>
        </div>

        {/* Quick commands */}
        {messages.length === 0 && (
          <div className="border-b border-black/10 bg-white px-4 py-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-black/40">Quick Commands</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {QUICK_COMMANDS.map(cmd => (
                <button key={cmd.label} onClick={() => send(cmd.text)} disabled={sending}
                  className="flex items-start gap-2 rounded-xl border border-black/10 p-3 text-left text-xs hover:border-[#f2df0d] hover:bg-[#f2df0d]/5 disabled:opacity-50">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]">
                    {cmd.label.includes("Audit") ? <ShieldCheck size={14} /> : cmd.label.includes("Fix") ? <Zap size={14} /> : cmd.label.includes("Pipeline") ? <ChevronRight size={14} /> : cmd.label.includes("Test") ? <ShieldCheck size={14} /> : cmd.label.includes("Harden") ? <ShieldCheck size={14} /> : <Rocket size={14} />}
                  </span>
                  <div>
                    <p className="font-black">{cmd.label}</p>
                    <p className="mt-0.5 text-[10px] text-black/40 line-clamp-2">{cmd.text.slice(0, 80)}…</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-black/20" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-[#0b0b0b] text-[#f2df0d]"><Bot size={32} /></span>
              <p className="mt-4 text-lg font-black">Autonomous Executor Ready</p>
              <p className="mt-1 max-w-md text-sm text-black/50">
                This AI has full system access. It can install dependencies, audit, fix, optimize, test, harden, and deploy the entire AUTOLEADS system end-to-end. Send a command or use a quick command above to begin.
              </p>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-4">
              {messages.map(m => <MessageBubble key={m.id || m.created_date} message={m} />)}
              {sending && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2 rounded-2xl bg-white border border-black/10 px-4 py-3">
                    <Loader2 size={16} className="animate-spin text-black/40" />
                    <span className="text-xs text-black/40">Executor is working…</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-black/10 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Command the autonomous executor… (e.g., 'Run the full master implementation cycle')"
              className="max-h-32 min-h-[44px] flex-1 resize-none rounded-xl border border-black/15 px-4 py-3 text-sm outline-none focus:border-[#f2df0d]"
              rows={1}
            />
            <button onClick={() => send()} disabled={sending || !input.trim()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#0b0b0b] text-[#f2df0d] disabled:opacity-40">
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="mx-auto mt-1.5 max-w-3xl text-center text-[10px] text-black/30">
            ⚠ Full-access agent — can modify, delete, send, and execute any system operation autonomously
          </p>
        </div>
      </div>
    </div>
  );
}