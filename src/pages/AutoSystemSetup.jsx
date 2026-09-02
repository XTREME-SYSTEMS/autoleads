import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check, ArrowRight, Calendar, Clock, FileSearch, FileText, Loader2, Mail, Bell, Bot, Zap } from "lucide-react";
import AppHeader from "@/components/autoleads/AppHeader";
import SidebarChatInput from "@/components/autoleads/SidebarChatInput";
import PageStepGuide from "@/components/autoleads/PageStepGuide";
import BackButton from "@/components/autoleads/BackButton";
import { useOrgId } from "@/hooks/useOrgContext";

const CADENCE_OPTIONS = [
  { value: "1h", label: "Every Hour", desc: "Maximum coverage — get notified the moment new projects appear", icon: Zap },
  { value: "4h", label: "Every 4 Hours", desc: "High frequency — catch opportunities fast", icon: Clock },
  { value: "6h", label: "Every 6 Hours", desc: "Balanced — morning, noon, and evening scans", icon: Clock },
  { value: "12h", label: "Every 12 Hours", desc: "Twice daily — morning and evening scans", icon: Clock },
  { value: "24h", label: "Every 24 Hours", desc: "Daily — one comprehensive daily report", icon: Clock },
];

const AUTO_OPTIONS = [
  { value: "auto", label: "Fully Automatic", desc: "AI does it and you review the results" },
  { value: "review", label: "Prepare for Review", desc: "AI prepares it, you approve before it goes out" },
  { value: "manual", label: "Manual", desc: "AI suggests, you do it yourself" },
];

const NOTIFY_OPTIONS = [
  { value: "realtime", label: "Real-time", desc: "Notify me the moment something happens" },
  { value: "daily", label: "Daily Digest", desc: "One summary email each morning" },
  { value: "weekly", label: "Weekly Summary", desc: "One summary each week" },
];

const AUTONOMY_OPTIONS = [
  { value: "full_auto", label: "Full Autopilot", desc: "AI handles everything — scanning, takeoffs, proposals, and outreach. You review results and check back for new opportunities.", icon: Zap },
  { value: "semi_auto", label: "Semi-Autopilot", desc: "AI prepares everything for your approval. Nothing goes out without your sign-off.", icon: Check },
  { value: "manual", label: "Assisted Manual", desc: "AI suggests opportunities and drafts, but you decide and execute everything.", icon: FileSearch },
];

const STEPS = [
  { key: "scrape_cadence", question: "Last step! Let's configure your automated system. How often do you want AUTOLEADS to scan for new leads and opportunities?", type: "choice", options: CADENCE_OPTIONS, required: true, icon: Clock, label: "Scan Frequency" },
  { key: "auto_takeoff", question: "Do you want AI to automatically perform quantity takeoffs on promising projects?", type: "choice", options: AUTO_OPTIONS, required: true, icon: FileSearch, label: "Automated Takeoffs" },
  { key: "auto_proposal", question: "Do you want AI to automatically draft proposals for qualified projects?", type: "choice", options: AUTO_OPTIONS, required: true, icon: FileText, label: "Automated Proposals" },
  { key: "auto_outreach", question: "Do you want AI to automatically send follow-up emails to leads and clients?", type: "choice", options: AUTO_OPTIONS, required: true, icon: Mail, label: "Automated Outreach" },
  { key: "notification_frequency", question: "How do you want to be notified about new opportunities and AI activity?", type: "choice", options: NOTIFY_OPTIONS, required: true, icon: Bell, label: "Notifications" },
  { key: "autonomy_level", question: "Finally, what's your preferred autonomy level? This is the big one — it determines how much AUTOLEADS does for you vs. with you.", type: "choice", options: AUTONOMY_OPTIONS, required: true, icon: Zap, label: "Autonomy Level" },
];

export default function AutoSystemSetup() {
  const nav = useNavigate();
  const orgId = useOrgId();
  const [messages, setMessages] = useState([{ role: "ai", text: STEPS[0].question }]);
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState(/** @type {any} */ ({}));
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const [calSyncing, setCalSyncing] = useState(false);
  const [calConnected, setCalConnected] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const currentStep = STEPS[stepIndex];
  const progress = done ? 100 : Math.round((stepIndex / STEPS.length) * 100);

  const checkCal = async () => {
    try { await base44.functions.invoke('syncCalendar', { check: true }); setCalConnected(true); }
    catch { setCalConnected(false); }
  };
  useEffect(() => { checkCal(); }, []);
  const connectCalendar = async () => {
    try {
      const url = await base44.connectors.connectAppUser("69ddcb305a599e0b4a1b3cff");
      const popup = window.open(url, "_blank");
      const timer = setInterval(() => { if (!popup || popup.closed) { clearInterval(timer); checkCal(); } }, 500);
    } catch (e) { alert("Connect failed: " + (e?.message || "try again")); }
  };
  const syncCal = async () => {
    setCalSyncing(true);
    try { await base44.functions.invoke('syncCalendar', {}); alert("Synced to your Google Calendar!"); }
    catch (e) { alert("Calendar sync failed: " + (e?.message || "try again")); }
    finally { setCalSyncing(false); }
  };

  const acknowledge = async (step, label) => {
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `A construction company is setting up their AUTOLEADS automation. They were asked: "${step.question}" and chose: "${label}". Write a brief, friendly one-sentence acknowledgment (max 15 words) that references their choice. Do NOT ask a question. Be warm and specific.`
      });
      return typeof res === "string" ? res : res?.response || res?.text || "Great choice!";
    } catch {
      return "Great choice!";
    }
  };

  const advance = async (value, label) => {
    const step = currentStep;
    const newData = { ...data, [step.key]: value };
    setData(newData);
    setMessages(m => [...m, { role: "user", text: label }]);

    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setThinking(true);
      const ack = await acknowledge(step, label);
      setThinking(false);
      setMessages(m => [...m, { role: "ai", text: ack }, { role: "ai", text: STEPS[nextIndex].question }]);
      setStepIndex(nextIndex);
    } else {
      finish(newData);
    }
  };

  const finish = async (allData) => {
    setThinking(true);
    try {
      await base44.entities.AutomationConfig.create({ ...allData, organization_id: orgId });
      const cadenceLabel = CADENCE_OPTIONS.find(c => c.value === allData.scrape_cadence)?.label || "daily";
      const autonomyLabel = AUTONOMY_OPTIONS.find(a => a.value === allData.autonomy_level)?.label || "Semi-Autopilot";
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `A construction company just finished setting up their AUTOLEADS automation. They chose ${cadenceLabel} scanning and ${autonomyLabel} autonomy. Write a warm, exciting 2-3 sentence summary that tells them their automated system is now active and explains they should check their Daily Autopilot dashboard regularly to see new opportunities, AI-completed takeoffs, and drafted proposals waiting for them.`
      });
      const summary = typeof res === "string" ? res : res?.response || res?.text || "Your automated system is now active! Check your Daily Autopilot dashboard regularly for new opportunities.";
      setMessages(m => [...m, { role: "ai", text: summary, isFinal: true }]);
      setDone(true);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "Your automated system is now active! Check your Daily Autopilot dashboard regularly for new opportunities.", isFinal: true }]);
      setDone(true);
    } finally {
      setThinking(false);
    }
  };

  const formatValue = (stepKey, value) => {
    if (value == null) return null;
    const allOpts = [...CADENCE_OPTIONS, ...AUTO_OPTIONS, ...NOTIFY_OPTIONS, ...AUTONOMY_OPTIONS];
    return allOpts.find(o => o.value === value)?.label || value;
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f5f5]">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        {/* AI Chat Rail (left) */}
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-black/10 bg-white lg:flex">
          <div className="flex h-[60px] items-center gap-3 border-b border-black/10 px-6">
            <Sparkles size={20} className="text-[#b0a209]" />
            <span className="text-lg font-black">AI Assistant</span>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "ai" && (
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]">
                      <Sparkles size={14} className="text-black" />
                    </span>
                  )}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]">
                    <Sparkles size={14} className="text-black" />
                  </span>
                  <div className="rounded-xl border border-black/10 bg-black/[.02] px-3 py-3">
                    <div className="flex gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          {!done && (
            <div className="border-t border-black/10 p-4">
              <p className="mb-2 text-xs font-bold text-black/40">Tap your choice below →</p>
              <div className="space-y-1.5">
                {currentStep.options.map((o) => {
                  const Icon = o.icon || Check;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => !thinking && advance(o.value, o.label)}
                      disabled={thinking}
                      className="flex w-full items-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2 text-left transition hover:border-[#f2df0d] hover:bg-[#fdfbe1] disabled:opacity-40"
                    >
                      <Icon size={14} className="shrink-0 text-[#b0a209]" />
                      <span className="text-sm font-bold">{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <SidebarChatInput messages={messages} setMessages={setMessages} contextLabel="Auto System Setup" companyInfo={{}} userTrades={[]} />
          {done && (
            <div className="border-t border-black/10 p-4">
              <button onClick={() => nav("/onboarding")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">
                Finish Setup <ArrowRight size={16} />
              </button>
            </div>
          )}
          <p className="px-6 pb-4 text-[10px] text-black/40">AI can make mistakes. Verify important information.</p>
        </aside>

        {/* Content (right) */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
            <BackButton to="/onboarding" className="mb-4" />
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-[#f2df0d]"><Bot size={24} className="text-black" /></span>
            <p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Step 4 of 4</p>
            <h1 className="text-3xl font-black tracking-[-.03em] sm:text-[34px]">Automated System Setup</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">Configure how often AUTOLEADS works for you and what it does automatically. This is what makes AUTOLEADS your autonomous preconstruction partner — set it once and check back for results.</p>

            <PageStepGuide className="mt-6" title="How to use this page — Step-by-Step" steps={[{title:"Set your scan cadence",description:"How often AUTOLEADS scans for new opportunities."},{title:"Choose AI autonomy",description:"Auto, review, or manual for takeoffs, proposals, and outreach."},{title:"Set notification frequency",description:"Realtime, daily, or weekly alerts."},{title:"Set overall autonomy level",description:"Full auto, semi auto, or manual."},{title:"Save & activate",description:"Your workflow runs on your schedule."}]} />

            {/* Progress card */}
            <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black">Setup Progress</span>
                <span className="text-sm font-bold text-black/50">{progress}%</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/5">
                <div className="h-full rounded-full bg-[#f2df0d] transition-all duration-500" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Live config card */}
            <div className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black"><Zap size={18} className="text-[#b0a209]" />Your Automation Settings</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {STEPS.map((s, i) => {
                  const val = data[s.key];
                  const filled = val != null;
                  const isCurrent = i === stepIndex && !done;
                  const isPast = i < stepIndex || done;
                  return (
                    <div key={s.key} className={`flex items-center gap-3 rounded-lg border p-3 transition ${filled ? "border-[#f2df0d]/40 bg-[#fdfbe1]" : isCurrent ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 bg-white"}`}>
                      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${filled ? "bg-[#f2df0d] text-black" : isCurrent ? "bg-[#f2df0d]/20 text-[#b0a209]" : "bg-black/5 text-black/30"}`}>
                        {filled ? <Check size={16} /> : <s.icon size={16} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-black/40">{s.label}</p>
                        <p className={`truncate text-sm font-bold ${filled ? "text-black" : isCurrent ? "text-[#b0a209]" : "text-black/30"}`}>
                          {filled ? formatValue(s.key, val) : isCurrent ? "Choosing…" : isPast ? "Skipped" : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Auto Schedule */}
            <div className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black"><Clock size={18} className="text-[#b0a209]" />Your Auto Schedule</h2>
              <p className="mt-1 text-xs text-black/50">Based on your scan cadence, AUTOLEADS runs automatically on this schedule.</p>
              <div className="mt-4 space-y-2">
                {(() => {
                  const cadence = data.scrape_cadence;
                  if (!cadence) return <p className="text-sm text-black/40">Choose a scan cadence above to see your schedule.</p>;
                  const hours = parseInt(cadence) || 24;
                  const now = new Date();
                  return Array.from({ length: 5 }).map((_, i) => {
                    const run = new Date(now.getTime() + (i + 1) * hours * 3600 * 1000);
                    return (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-black/10 p-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Clock size={15} /></span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold">Scheduled Run #{i + 1}</p>
                          <p className="text-xs text-black/50">{run.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
              <div className="mt-4">
                {calConnected === false && <button onClick={connectCalendar} className="flex w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-4 py-2.5 text-sm font-bold hover:bg-black/[.02]"><Calendar size={16} />Connect Google Calendar</button>}
                {calConnected && <button onClick={syncCal} disabled={calSyncing} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-sm font-black text-black disabled:opacity-40">{calSyncing ? <><Loader2 size={16} className="animate-spin" />Syncing…</> : <><Calendar size={16} />Sync to Google Calendar</>}</button>}
              </div>
            </div>

            {/* Mobile choice area */}
            {!done && (
              <div className="mt-6 lg:hidden">
                <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                  <p className="mb-3 flex items-center gap-2 text-sm font-black"><Sparkles size={16} className="text-[#b0a209]" />{currentStep.question}</p>
                  <div className="space-y-2">
                    {currentStep.options.map((o) => {
                      const Icon = o.icon || Check;
                      return (
                        <button key={o.value} type="button" onClick={() => !thinking && advance(o.value, o.label)} disabled={thinking} className="flex w-full items-start gap-3 rounded-lg border border-black/15 p-3 text-left disabled:opacity-40">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Icon size={16} /></span>
                          <div><p className="text-sm font-black">{o.label}</p><p className="mt-0.5 text-xs text-black/50">{o.desc}</p></div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Completion card */}
            {done && (
              <div className="mt-5 rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-6 text-center shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f2df0d]">
                  <Check size={28} className="text-black" />
                </span>
                <h2 className="mt-4 text-xl font-black">Your Automated System is Live! 🎉</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/60">AUTOLEADS is now scanning for opportunities on your schedule and preparing takeoffs, proposals, and outreach automatically. Check your Daily Autopilot dashboard regularly to see what's new.</p>
                <button onClick={() => nav("/onboarding")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-black text-white shadow-[0_4px_12px_rgba(16,185,129,.22)] hover:bg-emerald-600">
                  Finish & Go to Landing Page <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}