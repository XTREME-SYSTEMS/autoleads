import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Page } from "@/components/autoleads/UiPrimitives";
import { Sparkles, Send, Loader2, CheckCircle2, XCircle, ChevronDown, ChevronRight, Play, ClipboardCheck, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { TEST_MATRIX } from "@/lib/testMatrix";

const AGENT_NAME = "system_qa";
const TEST_PROMPT = "Run a full test cycle. Read every entity in the test matrix, report per-page SAVED or NOT SAVED, test the backend functions (runAutoScrape, syncCalendar, gmailSync), and give a summary table with counts and prioritized fixes.";

function ToolCallDisplay({ toolCall }) {
  const [expanded, setExpanded] = useState(false);
  const status = toolCall.status;
  const failed = status === "failed" || status === "error";
  const pending = status === "pending" || status === "running" || status === "in_progress";
  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;
  let parsedResults = toolCall.results;
  if (typeof parsedResults === "string") { try { parsedResults = JSON.parse(parsedResults); } catch {} }
  const resultFailed = parsedResults && typeof parsedResults === "object" && (parsedResults.success === false || /error|failed/i.test(JSON.stringify(parsedResults)));
  const isError = failed || resultFailed;
  const label = proj.label || toolCall.name || "tool";
  const activeLabel = proj.active_label || "Running…";
  const errorLabel = proj.error_label || "Failed";
  return (
    <div className="mt-2 rounded-lg border border-black/10 bg-black/[.02] p-2.5 text-xs">
      <button onClick={() => !hideDetails && setExpanded(!expanded)} className="flex w-full items-center gap-2 text-left">
        {isError ? <XCircle size={14} className="text-red-500" /> : pending ? <Loader2 size={14} className="animate-spin text-[#b0a209]" /> : <CheckCircle2 size={14} className="text-emerald-500" />}
        <span className="font-bold">{label}</span>
        <span className={`ml-auto text-[10px] font-bold ${isError ? "text-red-500" : pending ? "text-[#b0a209]" : "text-emerald-600"}`}>{isError ? errorLabel : pending ? activeLabel : "Done"}</span>
        {!hideDetails && (expanded ? <ChevronDown size={13} className="text-black/40" /> : <ChevronRight size={13} className="text-black/40" />)}
      </button>
      {expanded && !hideDetails && (
        <div className="mt-2 space-y-1.5 border-t border-black/10 pt-2">
          {toolCall.arguments_string && (<div><p className="text-[10px] font-black uppercase text-black/40">Parameters</p><pre className="mt-0.5 overflow-x-auto rounded bg-white p-1.5 text-[10px] leading-4">{toolCall.arguments_string}</pre></div>)}
          {parsedResults != null && (<div><p className="text-[10px] font-black uppercase text-black/40">Result</p><pre className="mt-0.5 max-h-40 overflow-auto rounded bg-white p-1.5 text-[10px] leading-4">{typeof parsedResults === "string" ? parsedResults : JSON.stringify(parsedResults, null, 2)}</pre></div>)}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div className={isUser ? "max-w-[85%]" : "w-full"}>
        {message.content && (isUser
          ? <div className="rounded-xl bg-[#f2df0d] px-3.5 py-2 text-sm font-semibold text-black">{message.content}</div>
          : <div className="rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm leading-6 text-black/80"><ReactMarkdown>{message.content}</ReactMarkdown></div>)}
        {message.tool_calls?.map((tc, i) => <ToolCallDisplay key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}

function MatrixRow({ item, status }) {
  const [open, setOpen] = useState(false);
  const icon = status === "saved" ? <CheckCircle2 size={15} className="text-emerald-500" /> : status === "notsaved" ? <XCircle size={15} className="text-red-400" /> : <Loader2 size={15} className="animate-spin text-black/30" />;
  return (
    <div className="border-b border-black/5 last:border-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-black/[.02]">
        {icon}
        <span className="text-xs font-bold">{item.title}</span>
        <span className="ml-auto text-[10px] text-black/40">{item.path}</span>
        {item.buttons?.length > 0 && (open ? <ChevronDown size={12} className="text-black/30" /> : <ChevronRight size={12} className="text-black/30" />)}
      </button>
      {open && item.buttons?.length > 0 && (
        <div className="bg-black/[.015] px-3 pb-2.5 pt-0.5">
          <p className="text-[10px] font-black uppercase text-black/40">Buttons to click-test</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {item.buttons.map((b) => <span key={b} className="rounded border border-black/10 bg-white px-1.5 py-0.5 text-[10px] font-bold text-black/60">{b}</span>)}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SystemQAAgent() {
  const [conversations, setConversations] = useState(/** @type {any[]} */ ([]));
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [input, setInput] = useState("");
  const [, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [entityStatus, setEntityStatus] = useState(/** @type {any} */ ({}));
  const [scanning, setScanning] = useState(false);
  const scrollRef = useRef(null);

  const runScan = async () => {
    setScanning(true);
    const status = {};
    const entities = [...new Set(TEST_MATRIX.map((t) => t.entity).filter(Boolean))];
    await Promise.all(entities.map(async (e) => {
      try {
        const list = await base44.entities[e].list("-updated_date", 1);
        status[e] = Array.isArray(list) && list.length > 0 ? "saved" : "notsaved";
      } catch { status[e] = "notsaved"; }
    }));
    setEntityStatus(status);
    setScanning(false);
  };

  useEffect(() => { runScan(); }, []);
  useEffect(() => {
    (async () => {
      try { const list = await base44.agents.listConversations({ agent_name: AGENT_NAME }); setConversations(list || []); } catch {}
      setLoading(false);
    })();
  }, []);
  useEffect(() => {
    if (!activeId) return;
    const unsubscribe = base44.agents.subscribeToConversation(activeId, (data) => setMessages(data.messages || []));
    return () => unsubscribe();
  }, [activeId]);
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [messages]);

  const startTest = async () => {
    try {
      const conv = await base44.agents.createConversation({ agent_name: AGENT_NAME, metadata: { name: "Test Cycle " + new Date().toLocaleTimeString(), description: "Full system test" } });
      setActiveId(conv.id);
      setConversations((p) => [conv, ...p]);
      setMessages([]);
      setSending(true);
      await base44.agents.addMessage(conv, { role: "user", content: TEST_PROMPT });
    } catch (e) { alert("Failed to start: " + (e?.message || "try again")); }
    finally { setSending(false); }
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeId || sending) return;
    const conv = conversations.find((c) => c.id === activeId);
    const text = input.trim();
    setInput("");
    setSending(true);
    try { await base44.agents.addMessage(conv, { role: "user", content: text }); }
    catch (e) { alert("Failed: " + (e?.message || "try again")); }
    finally { setSending(false); }
  };

  const savedCount = TEST_MATRIX.filter((t) => t.entity && entityStatus[t.entity] === "saved").length;
  const notSavedCount = TEST_MATRIX.filter((t) => t.entity && entityStatus[t.entity] === "notsaved").length;
  const totalCheckable = TEST_MATRIX.filter((t) => t.entity).length;

  return (
    <Page backTo="/dashboard" eyebrow="Auto Settings" title="Internal Testing Agent" description="Automatically cycles through every page, validates that each setting saved correctly, tests backend functions, and summarizes results.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button onClick={runScan} disabled={scanning} className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm font-bold hover:bg-black/[.02] disabled:opacity-40">
          {scanning ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Re-scan Save Status
        </button>
        <span className="text-xs font-bold text-black/50">{scanning ? "Scanning…" : `${savedCount}/${totalCheckable} pages saved · ${notSavedCount} not saved`}</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        {/* Live save-status matrix */}
        <div className="rounded-xl border border-black/10 bg-white">
          <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
            <ClipboardCheck size={16} className="text-[#b0a209]" />
            <span className="text-sm font-black">Page Save-Status Matrix</span>
            <span className="ml-auto text-[10px] font-bold text-black/40">{TEST_MATRIX.length} pages</span>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {TEST_MATRIX.map((t) => <MatrixRow key={t.path} item={t} status={t.entity ? entityStatus[t.entity] : "na"} />)}
          </div>
        </div>

        {/* Agent chat */}
        <div className="flex flex-col">
          <button onClick={startTest} disabled={sending} className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431] disabled:opacity-40">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Run Full Test Cycle
          </button>
          <div className="flex min-h-[460px] flex-col rounded-xl border border-black/10 bg-white">
            <div className="flex items-center gap-2 border-b border-black/10 px-4 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>
              <span className="text-sm font-black">Agent Summary</span>
            </div>
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fcf9cf] text-[#b0a209]"><Sparkles size={22} /></span>
                    <p className="mt-2 text-xs font-bold text-black/50">Click "Run Full Test Cycle" to audit everything.</p>
                  </div>
                </div>
              ) : messages.map((m, i) => <MessageBubble key={i} message={m} />)}
            </div>
            <form onSubmit={send} className="border-t border-black/10 p-2.5">
              <div className="flex items-center gap-2">
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={activeId ? "Ask a follow-up…" : "Run a test first…"} disabled={!activeId || sending} className="h-10 min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d] disabled:opacity-40" />
                <button type="submit" disabled={!activeId || !input.trim() || sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40"><Send size={16} /></button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Page>
  );
}