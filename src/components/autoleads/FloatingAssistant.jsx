import React, { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sparkles, X, Send, ArrowRight, Bot } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { getPageTitle, AGENT_SYSTEM_PROMPT as SYSTEM_PROMPT } from "@/lib/agentContext";

export default function FloatingAssistant() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Reset conversation when page changes
  useEffect(() => {
    setMessages([]);
  }, [pathname]);

  const send = async (e) => {
    e?.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);
    setMessages(m => [...m, { role: "user", text: q }]);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `${SYSTEM_PROMPT}\n\nThe user is currently on the "${pageTitle}" page (route: ${pathname}). They asked: "${q}"\n\nRespond with a JSON object: { "reply": string (your helpful answer), "navigate_to": string|null (a route path if the user wants to go somewhere), "action_links": array of {label, route} (0-3 relevant quick-action buttons) }`,
        response_json_schema: {
          type: "object",
          properties: {
            reply: { type: "string" },
            navigate_to: { type: "string" },
            action_links: { type: "array", items: { type: "object", properties: { label: { type: "string" }, route: { type: "string" } } } },
          },
        },
      });
      const reply = res?.reply || "I can help with that.";
      const navigateTo = res?.navigate_to || null;
      const actionLinks = Array.isArray(res?.action_links) ? res.action_links : [];
      setMessages(m => [...m, { role: "ai", text: reply, navigateTo, actionLinks }]);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "Sorry, I couldn't process that right now. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-[#f2df0d] px-4 py-3 text-sm font-black text-black shadow-[0_8px_24px_rgba(255,196,0,.4)] hover:bg-[#f4e431] lg:bottom-6 lg:right-6"
        >
          <Bot size={20} />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 flex h-[520px] max-h-[80vh] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl lg:bottom-6 lg:right-6">
          {/* Header */}
          <div className="flex h-14 items-center justify-between border-b border-black/10 bg-white px-4">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={16} className="text-black" /></span>
              <div>
                <p className="text-sm font-black leading-tight">AI Assistant</p>
                <p className="text-[10px] font-bold text-black/40 leading-tight">Viewing: {pageTitle}</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-black/50 hover:bg-black/5"><X size={18} /></button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
            {messages.length === 0 ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-black/10 bg-black/[.02] p-3 text-sm leading-6 text-black/70">
                  I can see you're on the <strong>{pageTitle}</strong> page. Ask me anything — I can guide you through the workflow, navigate you to any page, or help you operate each step.
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-black/40">Quick actions</p>
                  {[
                    { label: "Take me to Auto Leads", route: "/leads" },
                    { label: "Review my bid inbox", route: "/bid-inbox" },
                    { label: "Go to Command Center", route: "/dashboard" },
                    { label: "Open Setup Hub", route: "/onboarding" },
                  ].map((a) => (
                    <button key={a.route} onClick={() => { nav(a.route); setOpen(false); }} className="flex w-full items-center justify-between rounded-lg border border-black/10 px-3 py-2.5 text-left text-xs font-bold hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                      {a.label} <ArrowRight size={14} className="text-black/40" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((m, i) => (
                  <div key={i}>
                    <div className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      {m.role === "ai" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>}
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                    </div>
                    {m.role === "ai" && m.navigateTo && (
                      <button onClick={() => { nav(m.navigateTo); setOpen(false); }} className="mt-2 ml-9 flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black hover:bg-[#f4e431]">
                        Go to {getPageTitle(m.navigateTo)} <ArrowRight size={12} />
                      </button>
                    )}
                    {m.role === "ai" && m.actionLinks && m.actionLinks.length > 0 && (
                      <div className="mt-2 ml-9 flex flex-wrap gap-2">
                        {m.actionLinks.map((a, j) => (
                          <button key={j} onClick={() => { nav(a.route); setOpen(false); }} className="flex items-center gap-1 rounded-lg border border-black/15 bg-white px-2.5 py-1.5 text-xs font-bold hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
                            {a.label} <ArrowRight size={11} className="text-black/40" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>
                    <div className="rounded-xl border border-black/10 bg-black/[.02] px-3 py-3">
                      <div className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "0ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "150ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "300ms" }} /></div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={send} className="border-t border-black/10 p-3">
            <div className="flex items-center gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20" placeholder="Ask anything or tell me where to go…" />
              <button type="submit" disabled={loading || !input.trim()} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40"><Send size={16} /></button>
            </div>
            <p className="mt-2 text-[10px] text-black/40">AI can make mistakes. Verify important information.</p>
          </form>
        </div>
      )}
    </>
  );
}