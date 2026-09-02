import React from "react";
import { Sparkles, Info, ChevronRight, Paperclip, Mic, SendHorizonal, X } from "lucide-react";

const TOOLS = [
  "Build today's action plan",
  "Find new opportunities",
  "Explain project relationships",
  "Calculate bidability",
  "Summarize bid invitations",
  "Analyze plans and estimates",
  "Explain takeoff evidence",
  "Create pricing drafts",
  "Build proposal drafts",
  "Draft a follow-up email",
  "Research companies",
];

export default function AssistantPanel({ onClose }) {
  return (
    <aside className="w-full md:w-[320px] shrink-0 bg-white border-r border-black/10 flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-4 border-b border-black/5">
        <Sparkles className="w-4 h-4 text-[#f2df0d]" />
        <span className="font-semibold text-[15px]">AUTOLEADS AI Assistant</span>
        <Info className="w-4 h-4 text-black/30 ml-auto" />
        {onClose && (
          <button onClick={onClose} aria-label="Close assistant" className="p-1 text-black/40 hover:text-black">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="rounded-xl border border-black/10 p-3 flex gap-3">
          <div className="w-7 h-7 rounded-full bg-[#080808] grid place-items-center shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-[#f2df0d]" />
          </div>
          <p className="text-[13px] leading-relaxed text-black/70">
            I'm your construction intelligence assistant. Every action I take creates an audit receipt — I never send email, submit bids, or approve proposals on my own.
          </p>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-2 overflow-y-auto flex-1">
        {TOOLS.map((t) => (
          <button
            key={t}
            className="w-full flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2.5 text-[13px] text-left hover:border-black/30 hover:bg-black/[0.02] transition"
          >
            <span className="flex-1">{t}</span>
            <ChevronRight className="w-4 h-4 text-black/30" />
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-black/5">
        <div className="rounded-xl border border-black/10 p-2">
          <div className="flex items-start gap-2">
            <textarea
              rows={2}
              placeholder="Ask anything..."
              className="flex-1 resize-none text-[13px] outline-none placeholder:text-black/35 bg-transparent"
            />
            <button className="w-8 h-8 rounded-lg bg-[#f2df0d] grid place-items-center shrink-0" aria-label="Send">
              <SendHorizonal className="w-4 h-4 text-black" />
            </button>
          </div>
          <div className="flex gap-3 pt-1 text-black/40">
            <button aria-label="Attach"><Paperclip className="w-4 h-4" /></button>
            <button aria-label="Voice"><Mic className="w-4 h-4" /></button>
          </div>
        </div>
        <p className="text-[10px] text-black/40 text-center mt-2">AUTOLEADS AI can make mistakes. Verify important info.</p>
      </div>
    </aside>
  );
}