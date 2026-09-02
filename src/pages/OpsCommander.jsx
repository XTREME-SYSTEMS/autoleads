import React, { useEffect, useState, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Page, Card, PrimaryButton, SecondaryButton, StatusPanel, StatCard } from "@/components/autoleads/UiPrimitives";
import AgentMessageBubble from "@/components/autoleads/AgentMessageBubble";
import { Send, Loader2, Plus, Activity, ShieldCheck, AlertTriangle, CheckCircle2, Zap, Stethoscope, Gauge, Bell } from "lucide-react";

const AGENT_NAME = "ops_commander";

const QUICK_ACTIONS = [
  { label: "Run Full Ops Cycle", text: "Run a full ops cycle: audit, analyze, auto-fix safe issues, optimize, and create approval items for anything sensitive. Report the summary.", icon: Activity },
  { label: "Audit System Health", text: "Run runSystemAudit and runUiAudit. Report the system health score, open gaps by severity, and which pages have no data backing.", icon: ShieldCheck },
  { label: "Auto-Heal & Recompute", text: "Run runAutoHeal, recomputeHotLeadTruth, recomputeMatchEligibility, and canonicalizeProjects. Report what was fixed and what still needs attention.", icon: Stethoscope },
  { label: "Optimize Sources", text: "Run scoreSourceQuality and check SourceVerificationQueue for FAILED and AUTH_REQUIRED FL sources. Report source coverage and recommend which AUTH_REQUIRED sources are worth credential acquisition.", icon: Gauge },
];

export default function OpsCommander() {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [sending, setSending] = useState(false);
  const [approvalTasks, setApprovalTasks] = useState([]);
  const [systemGaps, setSystemGaps] = useState([]);
  const [systemScore, setSystemScore] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const scrollRef = useRef(null);

  const loadDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const [tasks, gaps, scores, events] = await Promise.all([
        base44.entities.AgentTask.filter({ requires_approval: true, status: "open" }, "-created_date", 20).catch(() => []),
        base44.entities.SystemGap.filter({ status: "open" }, "-created_date", 20).catch(() => []),
        base44.entities.SystemScore.list("-created_date", 1).catch(() => []),
        base44.entities.PipelineEvent.filter({ step: "email" }, "-occurred_at", 10).catch(() => []),
      ]);
      setApprovalTasks(tasks || []);
      setSystemGaps(gaps || []);
      setSystemScore((scores && scores[0]) || null);
      setRecentEvents((events || []).slice(0, 5));
    } catch { /* ignore */ }
    finally { setLoadingDashboard(false); }
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const list = await base44.agents.listConversations({ agent_name: AGENT_NAME });
      setConversations(list || []);
    } catch { setConversations([]); }
    finally { setLoadingConvos(false); }
  }, []);

  useEffect(() => { loadConversations(); loadDashboard(); }, [loadConversations, loadDashboard]);

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
        metadata: { name: `Ops Cycle ${new Date().toLocaleString()}` }
      });
      setConversations((c) => [convo, ...c]);
      setActiveId(convo.id);
      return convo.id;
    } catch { return null; }
  };

  const send = async (e, preset) => {
    const text = (preset || input).trim();
    if (!text || sending) return;
    e?.preventDefault();
    let convoId = activeId;
    if (!convoId) convoId = await newConversation();
    if (!convoId) return;
    setInput("");
    setSending(true);
    try {
      const convo = base44.agents.getConversation(convoId);
      await base44.agents.addMessage(convo, { role: "user", content: text });
    } catch { /* subscription will surface error */ }
    finally { setSending(false); }
  };

  const approveTask = async (taskId) => {
    try {
      await base44.entities.AgentTask.update(taskId, { status: "done", requires_approval: false });
      setApprovalTasks((t) => t.filter((x) => x.id !== taskId));
    } catch { /* ignore */ }
  };

  const resolveGap = async (gapId) => {
    try {
      await base44.entities.SystemGap.update(gapId, { status: "fixed", fix_summary: "Resolved via Ops Commander UI" });
      setSystemGaps((g) => g.filter((x) => x.id !== gapId));
    } catch { /* ignore */ }
  };

  const severityColor = { critical: "text-red-600 bg-red-50", high: "text-orange-600 bg-orange-50", medium: "text-amber-600 bg-amber-50", low: "text-blue-600 bg-blue-50" };

  return (
    <Page
      title="Ops Commander"
      description="Autonomous operations agent — auto-audits, auto-fixes, auto-heals, auto-optimizes end-to-end. Sensitive actions create approval-gated tasks for your review."
      eyebrow="Autonomous Operations"
      actions={<PrimaryButton onClick={loadDashboard}><Activity size={16} />Refresh</PrimaryButton>}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left: Chat (2 cols) */}
        <div className="lg:col-span-2">
          <Card className="flex h-[calc(100vh-220px)] flex-col">
            {/* Conversation header */}
            <div className="flex items-center justify-between border-b border-border p-3">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-[#b0a209]" />
                <span className="text-sm font-black uppercase tracking-wider">Ops Commander Chat</span>
              </div>
              <SecondaryButton onClick={newConversation} className="!min-h-9 !px-3 !py-1.5 !text-xs"><Plus size={14} />New Cycle</SecondaryButton>
            </div>

            {/* Conversation list */}
            {conversations.length > 0 && (
              <div className="flex gap-1 overflow-x-auto border-b border-border p-2 sidebar-scroll">
                {conversations.slice(0, 10).map((c) => (
                  <button key={c.id} onClick={() => setActiveId(c.id)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition ${activeId === c.id ? "bg-[#f2df0d] text-black" : "bg-muted hover:bg-muted/70"}`}>
                    {c.metadata?.name || "Session"}
                  </button>
                ))}
              </div>
            )}

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 sidebar-scroll">
              {loadingConvos ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>
              ) : messages.length === 0 ? (
                <div className="grid h-full place-items-center text-center">
                  <div>
                    <Activity size={32} className="mx-auto text-muted-foreground" />
                    <p className="mt-3 text-sm font-bold">Start an ops cycle or ask the commander</p>
                    <p className="mt-1 text-xs text-muted-foreground">The agent will audit, analyze, fix safe issues, and create approval tasks for sensitive actions.</p>
                  </div>
                </div>
              ) : (
                messages.map((m, i) => <AgentMessageBubble key={i} message={m} />)
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-wrap gap-1.5 border-t border-border p-2">
              {QUICK_ACTIONS.map((qa) => (
                <button key={qa.label} onClick={(e) => send(e, qa.text)} disabled={sending} className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold transition hover:bg-muted disabled:opacity-50">
                  <qa.icon size={12} />{qa.label}
                </button>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={send} className="flex gap-2 border-t border-border p-3">
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask the commander to audit, heal, fix, or optimize…" className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20" />
              <PrimaryButton type="submit" disabled={sending || !input.trim()}>{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}Send</PrimaryButton>
            </form>
          </Card>
        </div>

        {/* Right: Approval Analytics Dashboard (1 col) */}
        <div className="space-y-4">
          {/* System Health */}
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Gauge size={16} className="text-[#b0a209]" />
              <h3 className="text-sm font-black uppercase tracking-wider">System Health</h3>
            </div>
            <StatusPanel state={loadingDashboard ? "loading" : "empty"}>
              {systemScore ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-muted-foreground">Overall Score</span>
                    <span className="text-2xl font-black">{systemScore.overall_score != null ? `${systemScore.overall_score}/100` : "N/A"}</span>
                  </div>
                  {systemScore.data_quality_score != null && (
                    <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Data Quality</span><span className="font-bold">{systemScore.data_quality_score}/100</span></div>
                  )}
                  {systemScore.pipeline_efficiency_score != null && (
                    <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Pipeline</span><span className="font-bold">{systemScore.pipeline_efficiency_score}/100</span></div>
                  )}
                  {systemScore.security_score != null && (
                    <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Security</span><span className="font-bold">{systemScore.security_score}/100</span></div>
                  )}
                  {systemScore.ui_completeness_score != null && (
                    <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">UI Complete</span><span className="font-bold">{systemScore.ui_completeness_score}/100</span></div>
                  )}
                </div>
              ) : <p className="text-xs text-muted-foreground">No system score yet. Run an audit.</p>}
            </StatusPanel>
          </Card>

          {/* Approval Queue */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#b0a209]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Approval Queue</h3>
              </div>
              <span className="rounded-full bg-[#f2df0d] px-2 py-0.5 text-xs font-black text-black">{approvalTasks.length}</span>
            </div>
            <StatusPanel state={loadingDashboard ? "loading" : "empty"}>
              {approvalTasks.length > 0 ? (
                <div className="space-y-2">
                  {approvalTasks.map((t) => (
                    <div key={t.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${severityColor[t.priority] || "bg-muted"}`}>{t.priority}</span>
                          <p className="mt-1 text-xs font-bold">{t.title}</p>
                          {t.description && <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{t.description}</p>}
                          {t.linked_route && <a href={t.linked_route} className="mt-1 inline-block text-[11px] font-bold text-blue-600 hover:underline">Open →</a>}
                        </div>
                        <button onClick={() => approveTask(t.id)} className="shrink-0 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700 hover:bg-emerald-100">Approve</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No pending approvals. The agent will create tasks here for sensitive actions.</p>}
            </StatusPanel>
          </Card>

          {/* System Gaps */}
          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#b0a209]" />
                <h3 className="text-sm font-black uppercase tracking-wider">Open System Gaps</h3>
              </div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-black">{systemGaps.length}</span>
            </div>
            <StatusPanel state={loadingDashboard ? "loading" : "empty"}>
              {systemGaps.length > 0 ? (
                <div className="space-y-2">
                  {systemGaps.slice(0, 8).map((g) => (
                    <div key={g.id} className="flex items-start justify-between gap-2 rounded-lg border border-border p-2">
                      <div className="flex-1">
                        <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${severityColor[g.severity] || "bg-muted"}`}>{g.severity}</span>
                        <p className="mt-1 text-xs font-bold">{g.title}</p>
                        <p className="text-[10px] text-muted-foreground">{g.category}</p>
                      </div>
                      <button onClick={() => resolveGap(g.id)} className="shrink-0 rounded-lg bg-muted px-2 py-1 text-[10px] font-black hover:bg-muted/70"><CheckCircle2 size={12} /></button>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground">No open gaps. System is healthy.</p>}
            </StatusPanel>
          </Card>
        </div>
      </div>
    </Page>
  );
}