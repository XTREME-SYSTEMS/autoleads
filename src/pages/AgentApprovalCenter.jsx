import React, { useEffect, useRef, useState } from "react";
import { Send, Loader2, ShieldCheck, User, Bot, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, Surface } from "@/components/CommercialMobileUI";

const AGENT_NAME = "expert_approval_proxy";

export default function AgentApprovalCenter() {
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const existing = await base44.agents.listConversations({ agent_name: AGENT_NAME }).catch(() => []);
        let conv = (existing || [])[0];
        if (!conv) {
          conv = await base44.agents.createConversation({
            agent_name: AGENT_NAME,
            metadata: { name: "Expert Approval Proxy", description: "20-year construction expert AI approval agent" },
          });
        }
        setConversation(conv);
        setMessages(conv.messages || []);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!conversation?.id) return;
    const unsub = base44.agents.subscribeToConversation(conversation.id, (data) => {
      setMessages(data.messages || []);
    });
    return () => unsub();
  }, [conversation?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !conversation || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);
    try {
      await base44.agents.addMessage(conversation, { role: "user", content: text });
    } catch { /* ignore */ }
    finally { setSending(false); }
  };

  if (loading) {
    return <CommercialPage><BackLink to="/dashboard"/><IndustrialTitle compact>AI Approval Proxy</IndustrialTitle><Surface className="p-8 text-center text-sm text-black/45">Loading agent…</Surface></CommercialPage>;
  }

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Home"/>
      <IndustrialTitle compact>AI Approval Proxy</IndustrialTitle>
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#FFC400] bg-[#FFF7DA] p-3">
        <ShieldCheck size={20} className="text-[#E9A900]"/>
        <p className="text-xs text-black/70"><strong>20-Year Expert Agent.</strong> Reviews, validates, modifies, and approves all pipeline stages — takeoffs, bid packages, change orders, scheduling, contracts, invoices. Has browser access and full project authority.</p>
      </div>

      <Surface className="flex h-[60vh] flex-col p-0">
        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Bot size={40} className="mb-3 text-[#E9A900]"/>
              <p className="text-sm font-bold text-black/70">Ask the expert to review or approve anything</p>
              <p className="mt-1 text-xs text-black/45">e.g. "Review and approve all pending takeoffs" or "Check the latest bid packages and send test emails"</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#FFC400]"><Bot size={15}/></span>}
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${msg.role === "user" ? "bg-[#FFC400] text-black" : "bg-black/[.04] text-black"}`}>
                {msg.content && <ReactMarkdown className="text-sm leading-relaxed">{msg.content}</ReactMarkdown>}
                {msg.tool_calls?.map((tc, j) => (
                  <div key={j} className="mt-1.5 rounded-lg border border-black/10 bg-white/80 p-2 text-xs">
                    <span className="font-bold text-[#E9A900]">{tc.name}</span>
                    <span className="ml-2 text-black/50">{tc.status}</span>
                  </div>
                ))}
              </div>
              {msg.role === "user" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/10"><User size={15}/></span>}
            </div>
          ))}
          {sending && <div className="flex items-center gap-2 text-xs text-black/40"><Loader2 size={14} className="animate-spin"/>Agent is thinking…</div>}
          <div ref={scrollRef}/>
        </div>

        {/* Input */}
        <div className="border-t border-black/10 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask the expert to review, approve, or modify…"
              className="min-h-12 flex-1 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#FFC400]"
            />
            <button onClick={sendMessage} disabled={!input.trim() || sending} className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#FFC400] disabled:opacity-40">
              {sending ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
            </button>
          </div>
        </div>
      </Surface>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => setInput("Review and approve all pending takeoffs. Use validateTakeoff for each project with approved takeoffs.")} className="rounded-lg border border-black/10 bg-white p-2.5 text-left text-xs font-semibold text-black/70">📋 Review & approve takeoffs</button>
        <button onClick={() => setInput("Check all internal_review proposals, validate them with validateBidPackage, and send test emails to jeremy@nationalconcretepolishing.net for any that pass.")} className="rounded-lg border border-black/10 bg-white p-2.5 text-left text-xs font-semibold text-black/70">📦 Validate & send test bids</button>
        <button onClick={() => setInput("Review all pending change orders and approve or flag them with reasoning.")} className="rounded-lg border border-black/10 bg-white p-2.5 text-left text-xs font-semibold text-black/70">📝 Review change orders</button>
        <button onClick={() => setInput("Generate a safety booklet for my trade and include it with the next bid package.")} className="rounded-lg border border-black/10 bg-white p-2.5 text-left text-xs font-semibold text-black/70">🦺 Generate safety booklet</button>
      </div>
    </CommercialPage>
  );
}