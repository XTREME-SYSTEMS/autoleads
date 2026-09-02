import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChevronDown, CheckCircle2, Loader2, XCircle, Wrench } from "lucide-react";

const STATUS_META = {
  pending: { icon: Loader2, spin: true, text: "Queued", cls: "text-black/40" },
  running: { icon: Loader2, spin: true, text: "Running", cls: "text-black/50" },
  in_progress: { icon: Loader2, spin: true, text: "Working", cls: "text-black/50" },
  completed: { icon: CheckCircle2, spin: false, text: "Done", cls: "text-emerald-600" },
  success: { icon: CheckCircle2, spin: false, text: "Done", cls: "text-emerald-600" },
  failed: { icon: XCircle, spin: false, text: "Failed", cls: "text-red-600" },
  error: { icon: XCircle, spin: false, text: "Error", cls: "text-red-600" }
};

function prettify(str) {
  if (!str) return null;
  try { return JSON.stringify(JSON.parse(str), null, 2); } catch { return String(str); }
}

function ToolCall({ toolCall }) {
  const [open, setOpen] = useState(false);
  const status = toolCall.status || 'pending';
  const meta = STATUS_META[status] || STATUS_META.pending;
  const proj = toolCall.display_projection || {};
  const hideDetails = proj.hide_details && proj.details_redacted;
  const Icon = meta.icon;
  const label = proj.active_label && ['pending','running','in_progress'].includes(status)
    ? proj.active_label
    : (status === 'failed' || status === 'error') && proj.error_label
      ? proj.error_label
      : (proj.label || toolCall.name);

  let failed = status === 'failed' || status === 'error';
  let parsedResults = toolCall.results;
  if (typeof parsedResults === 'string') {
    try { parsedResults = JSON.parse(parsedResults); } catch { /* keep raw */ }
  }
  if (parsedResults && typeof parsedResults === 'object' && parsedResults.success === false) failed = true;

  if (hideDetails) {
    return (
      <div className="mt-1.5 flex items-center gap-1.5 text-xs">
        <Icon size={13} className={`${meta.cls} ${meta.spin ? 'animate-spin' : ''}`} />
        <span className={failed ? 'text-red-600' : meta.cls}>{label}</span>
      </div>
    );
  }

  return (
    <div className="mt-1.5 rounded-lg border border-black/10 bg-black/[.02] text-xs">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left">
        <Icon size={13} className={`${failed ? 'text-red-600' : meta.cls} ${meta.spin ? 'animate-spin' : ''}`} />
        <Wrench size={11} className="text-black/40" />
        <span className="font-bold text-black/70">{label}</span>
        <span className={failed ? 'text-red-600' : meta.cls}>· {meta.text}</span>
        <ChevronDown size={12} className={`ml-auto text-black/30 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-black/10 px-2.5 py-2 space-y-1.5">
          {toolCall.arguments_string && (
            <div>
              <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-black/40">Parameters</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-white p-1.5 text-[11px] text-black/70">{prettify(toolCall.arguments_string)}</pre>
            </div>
          )}
          {toolCall.results != null && (
            <div>
              <p className="mb-0.5 text-[10px] font-black uppercase tracking-wide text-black/40">Result</p>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded bg-white p-1.5 text-[11px] text-black/70">{prettify(typeof toolCall.results === 'string' ? toolCall.results : JSON.stringify(toolCall.results))}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentMessageBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${isUser ? 'bg-[#f2df0d] text-black' : 'bg-white border border-black/10 text-black'}`}>
        {message.content && (isUser
          ? <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          : <div className="prose prose-sm max-w-none text-sm"><ReactMarkdown>{message.content}</ReactMarkdown></div>
        )}
        {message.tool_calls?.map((tc, i) => <ToolCall key={i} toolCall={tc} />)}
      </div>
    </div>
  );
}