import React, { useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Send, Loader2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
import { WORKFLOW_STEPS, findCurrentStep } from "@/lib/workflowSteps";

export default function SidebarChatInput({ messages, setMessages, contextLabel, companyInfo, userTrades }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const currentStep = findCurrentStep(contextLabel);

  const askAI = async (q, userLabel) => {
    setLoading(true);
    setMessages((m) => [...m, { role: "user", text: userLabel || q }]);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant helping a construction company set up their AUTOLEADS preconstruction system. They are currently on the "${contextLabel}" setup page.
Company: ${companyInfo?.name || "N/A"}
Trade: ${userTrades?.join(", ") || companyInfo?.trade || "N/A"}
Location: ${companyInfo?.city || ""}, ${companyInfo?.state || ""}

The user asked: "${q}"

Respond helpfully and concisely (2-3 sentences). Do NOT ask follow-up questions unless necessary.`
      });
      const reply = typeof res === "string" ? res : res?.response || res?.text || "I can help with that!";
      setMessages((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Sorry, I couldn't process that right now." }]);
    } finally {
      setLoading(false);
    }
  };

  const send = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    askAI(q);
  };

  const onStepPress = (step) => {
    if (loading) return;
    askAI(
      `The user clicked "Step ${step.step}: ${step.title}" in the workflow. In 2-3 sentences, explain the quick function of this step: what it does, why it matters, and what they get. Here is the step info — Purpose: ${step.purpose}. Result: ${step.quick}. Be direct and encouraging. End by telling them to click Open to go do it.`,
      `Step ${step.step}: ${step.title}`
    );
  };

  return (
    <div className="border-t border-black/10">
      {/* Workflow step buttons — collapsible so chat stays visible */}
      <div className="px-4 pt-4">
        <button type="button" onClick={() => setShowSteps((s) => !s)} className="flex w-full items-center justify-between text-left">
          <span className="text-[10px] font-black uppercase tracking-wide text-black/40">Your Workflow — Tap a Step</span>
          <span className="flex items-center gap-1 text-[10px] font-black text-[#b0a209]">{WORKFLOW_STEPS.length} steps {showSteps ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</span>
        </button>
        {showSteps && (
          <div className="mt-2 space-y-1.5">
            {WORKFLOW_STEPS.map((s) => {
              const isCurrent = currentStep?.key === s.key;
              const Icon = s.icon;
              return (
                <div
                  key={s.step}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 transition ${isCurrent ? "border-[#f2df0d] bg-[#fdfbe1] ring-1 ring-[#f2df0d]/30" : "border-black/10 bg-white hover:border-black/20"}`}
                >
                  <button
                    type="button"
                    onClick={() => onStepPress(s)}
                    disabled={loading}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left disabled:opacity-40"
                  >
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${isCurrent ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/50"}`}>{s.step}</span>
                    <Icon size={13} className={isCurrent ? "text-[#b0a209]" : "text-black/40"} />
                    <span className={`truncate text-xs font-bold ${isCurrent ? "text-black" : "text-black/70"}`}>{s.title}</span>
                  </button>
                  <Link to={s.to} className="flex shrink-0 items-center gap-0.5 text-[10px] font-black text-[#b0a209] hover:text-[#f2df0d]">
                    Open <ArrowRight size={11} />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Chat input */}
      <form onSubmit={send} className="p-4 pt-3">
        <p className="mb-2 text-[10px] font-black uppercase tracking-wide text-black/40">Ask the AI a question</p>
        <div className="flex items-center gap-2 rounded-xl border border-black/10 bg-white p-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} className="min-w-0 flex-1 bg-transparent px-2 text-sm outline-none" placeholder="Type a question…" />
          <button type="submit" disabled={loading || !input.trim()} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40">{loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}</button>
        </div>
      </form>
    </div>
  );
}