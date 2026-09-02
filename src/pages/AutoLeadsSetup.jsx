import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, Check, ArrowRight, Radar, MapPin, Briefcase } from "lucide-react";
import { US_STATES, getCounties, getCities, TRADES } from "@/lib/geoData";
import AppHeader from "@/components/autoleads/AppHeader";
import BackButton from "@/components/autoleads/BackButton";
import SidebarChatInput from "@/components/autoleads/SidebarChatInput";
import { useOrgId } from "@/hooks/useOrgContext";

const STEPS = [
  { key: "states", question: "Welcome to Auto Leads setup! I'll help you configure your lead discovery scraper. Which states do you want to target? Select all that apply.", type: "multiselect", options: US_STATES.map(s => ({ value: s.code, label: s.name })), required: true, icon: MapPin, label: "States" },
  { key: "counties", question: "Great! Which counties should I scan? Select all that apply, or skip for statewide coverage.", type: "multiselect", dynamic: "county", required: false, icon: MapPin, label: "Counties" },
  { key: "cities", question: "And which cities? Select all that apply, or skip for county-wide coverage.", type: "multiselect", dynamic: "city", required: false, icon: MapPin, label: "Cities" },
  { key: "trades", question: "Perfect! What trades should the scraper look for? Select all that match your business.", type: "multiselect", options: TRADES.map(t => ({ value: t, label: t })), required: true, icon: Briefcase, label: "Target Trades" },
];

export default function AutoLeadsSetup() {
  const nav = useNavigate();
  const orgId = useOrgId();
  const [messages, setMessages] = useState([{ role: "ai", text: STEPS[0].question }]);
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState(/** @type {any} */ ({}));
  const [selectedItems, setSelectedItems] = useState(/** @type {any[]} */ ([]));
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const currentStep = STEPS[stepIndex];
  const progress = done ? 100 : Math.round((stepIndex / STEPS.length) * 100);

  const getOptions = (step) => {
    if (step.dynamic === "county") {
      const states = data.states || [];
      const counties = [];
      states.forEach(stateCode => {
        getCounties(stateCode).forEach(c => {
          counties.push({ value: `${stateCode}|${c}`, label: `${c.replace(/_/g, " ")} (${stateCode})` });
        });
      });
      return counties;
    }
    if (step.dynamic === "city") {
      const states = data.states || [];
      const selectedCounties = data.counties || [];
      const cities = [];
      if (selectedCounties.length > 0) {
        selectedCounties.forEach(c => {
          const [stateCode, countyName] = c.split("|");
          getCities(stateCode, countyName).forEach(city => {
            cities.push({ value: `${stateCode}|${countyName}|${city}`, label: `${city} (${stateCode})` });
          });
        });
      } else {
        states.forEach(stateCode => {
          getCounties(stateCode).forEach(countyName => {
            getCities(stateCode, countyName).forEach(city => {
              cities.push({ value: `${stateCode}|${countyName}|${city}`, label: `${city} (${stateCode})` });
            });
          });
        });
      }
      return cities;
    }
    return step.options || [];
  };

  const acknowledge = (step, value, skipped) => {
    const fallbacks = ["Got it!", "Perfect!", "Great choice!", "Noted!", "Excellent!"];
    const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    // Fire-and-forget: don't block the flow waiting for an LLM acknowledgment
    base44.integrations.Core.InvokeLLM({
      prompt: `A construction company is setting up their Auto Leads scraper system on AUTOLEADS. They were asked: "${step.question}" and answered: ${skipped ? "they skipped this question" : `"${value}"`}. Write a brief, friendly one-sentence acknowledgment (max 15 words) that references their answer. Do NOT ask a question.`
    }).then(res => {
      const ack = typeof res === "string" ? res : res?.response || res?.text || fallback;
      setMessages(m => {
        const idx = m.findIndex(msg => msg.__pendingAck === step.key);
        if (idx >= 0) { const copy = [...m]; copy[idx] = { role: "ai", text: ack }; return copy; }
        return m;
      });
    }).catch(() => {});
    return { __pendingAck: step.key, text: fallback };
  };

  const formatDisplayValue = (step, value, skipped) => {
    if (skipped) return "Skip";
    if (!Array.isArray(value) || value.length === 0) return "Skip";
    if (step.key === "states") return value.map(v => US_STATES.find(s => s.code === v)?.name || v).join(", ");
    if (step.key === "counties") return value.map(v => v.split("|")[1]?.replace(/_/g, " ") || v).join(", ");
    if (step.key === "cities") return value.map(v => v.split("|")[2] || v).join(", ");
    return value.join(", ");
  };

  const advance = async (value, skipped = false) => {
    const step = currentStep;
    const newData = { ...data, [step.key]: skipped ? null : value };
    setData(newData);

    const displayValue = formatDisplayValue(step, value, skipped);
    setMessages(m => [...m, { role: "user", text: String(displayValue) }]);
    setSelectedItems([]);

    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      const ack = acknowledge(step, displayValue, skipped);
      setMessages(m => [...m, { role: "ai", text: ack.text, __pendingAck: step.key }, { role: "ai", text: STEPS[nextIndex].question }]);
      setStepIndex(nextIndex);
    } else {
      finish(newData);
    }
  };

  const finish = async (allData) => {
    setThinking(true);
    try {
      const states = allData.states || [];
      const counties = allData.counties || [];
      const cities = allData.cities || [];
      const trades = allData.trades || [];

      const parts = [];
      if (cities.length > 0) parts.push(cities.map(c => c.split("|")[2]).join(", "));
      if (counties.length > 0) parts.push(counties.map(c => c.split("|")[1].replace(/_/g, " ")).join(", "));
      if (states.length > 0) parts.push(states.join(", "));
      const jurisdiction = parts.join(" · ") || "National";

      await base44.entities.ScrapeSource.create({
        organization_id: orgId,
        name: `Auto Leads Discovery - ${jurisdiction}`,
        source_type: "aggregator",
        jurisdiction,
        trades: trades.join(", "),
        status: "active",
        schedule_cron: "0 8 * * *",
      });
      const fallback = "Your Auto Leads scraper is now active! Head to Auto Bids setup to configure your branding and proposals.";
      setMessages(m => [...m, { role: "ai", text: fallback, isFinal: true }]);
      setDone(true);
      // Non-blocking LLM summary — update the message when it arrives
      base44.integrations.Core.InvokeLLM({
        prompt: `A construction company just finished setting up their Auto Leads scraper on AUTOLEADS. They target ${jurisdiction} and these trades: ${trades.join(", ")}. Write a warm, enthusiastic message (2-3 sentences) confirming their scraper is now active and telling them to continue to Auto Bids setup to configure their logo, proposal template, and email templates.`
      }).then(res => {
        const summary = typeof res === "string" ? res : res?.response || res?.text || fallback;
        setMessages(m => {
          const idx = m.findIndex(msg => msg.isFinal);
          if (idx >= 0) { const copy = [...m]; copy[idx] = { role: "ai", text: summary, isFinal: true }; return copy; }
          return m;
        });
      }).catch(() => {});
    } catch {
      setMessages(m => [...m, { role: "ai", text: "Your Auto Leads scraper is configured! Continue to Auto Bids setup to configure your branding and proposals.", isFinal: true }]);
      setDone(true);
    } finally {
      setThinking(false);
    }
  };

  const handleSkip = () => { if (thinking) return; advance(null, true); };
  const toggleItem = (value) => { if (thinking) return; setSelectedItems(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]); };
  const allSelected = () => { const opts = getOptions(currentStep); return opts.length > 0 && opts.every(o => selectedItems.includes(o.value)); };
  const selectAll = () => { if (thinking) return; const opts = getOptions(currentStep); setSelectedItems(allSelected() ? [] : opts.map(o => o.value)); };
  const confirmItems = () => { if (thinking || selectedItems.length === 0) return; advance(selectedItems); };

  const formatValue = (stepKey, value) => {
    if (value == null) return null;
    if (stepKey === "states" && Array.isArray(value)) return value.map(v => US_STATES.find(s => s.code === v)?.name || v).join(", ");
    if (stepKey === "counties" && Array.isArray(value)) return value.map(v => v.split("|")[1]?.replace(/_/g, " ") || v).join(", ");
    if (stepKey === "cities" && Array.isArray(value)) return value.map(v => v.split("|")[2] || v).join(", ");
    if (stepKey === "trades" && Array.isArray(value)) return value.join(", ");
    return value;
  };

  const renderInput = (isMobile = false) => {
    if (done) return null;
    const options = getOptions(currentStep);
    return (
      <div className="space-y-2">
        <div className={`overflow-y-auto rounded-lg border border-black/15 bg-white p-2 ${isMobile ? "max-h-40" : "max-h-48"}`}>
          {options.length === 0 ? (
            <p className="px-2.5 py-3 text-sm text-black/40">{currentStep.dynamic === "county" ? "Select states first to see counties." : "Select states or counties first to see cities."}</p>
          ) : (
            <>
              {options.length > 1 && (
                <button type="button" onClick={selectAll} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left ${isMobile ? "text-xs" : "text-sm"} font-bold text-[#b0a209] transition hover:bg-[#fdfbe1]`}>
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${allSelected() ? "border-[#f2df0d] bg-[#f2df0d]" : "border-black/20 bg-white"}`}>{allSelected() && <Check size={12} className="text-black" />}</span>
                  {allSelected() ? "Deselect All" : "Select All"}
                </button>
              )}
              {options.map((o) => {
                const checked = selectedItems.includes(o.value);
                return (
                  <button key={o.value} type="button" onClick={() => toggleItem(o.value)} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left ${isMobile ? "text-xs" : "text-sm"} font-medium transition ${checked ? "bg-[#fdfbe1] text-black" : "text-black/70 hover:bg-black/5"}`}>
                    <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${checked ? "border-[#f2df0d] bg-[#f2df0d]" : "border-black/20 bg-white"}`}>{checked && <Check size={12} className="text-black" />}</span>
                    {o.label}
                  </button>
                );
              })}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={confirmItems} disabled={thinking || selectedItems.length === 0} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">
            Confirm {selectedItems.length > 0 && `(${selectedItems.length})`}
          </button>
          {!currentStep.required && <button onClick={handleSkip} disabled={thinking} className="shrink-0 text-xs font-bold text-black/40 hover:text-black/60 disabled:opacity-40">Skip →</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f5f5]">
      <AppHeader />

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-black/10 bg-white lg:flex">
          <div className="flex h-[60px] items-center gap-3 border-b border-black/10 px-6">
            <Radar size={20} className="text-[#b0a209]" />
            <span className="text-lg font-black">Auto Leads Setup</span>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "ai" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2.5">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>
                  <div className="rounded-xl border border-black/10 bg-black/[.02] px-3 py-3">
                    <div className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "0ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "150ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "300ms" }} /></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <SidebarChatInput messages={messages} setMessages={setMessages} contextLabel="Auto Leads Setup" companyInfo={{}} userTrades={(data.trades || [])} />
          {!done && <div className="border-t border-black/10 p-4">{renderInput()}</div>}
          {done && <div className="border-t border-black/10 p-4"><button onClick={() => nav("/auto-bids-setup")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">Continue to Auto Bids <ArrowRight size={16} /></button></div>}
          <p className="px-6 pb-4 text-[10px] text-black/40">AI can make mistakes. Verify important information.</p>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
            <BackButton to="/onboarding" className="mb-4" />
            <p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Auto Leads</p>
            <h1 className="text-3xl font-black tracking-[-.03em] sm:text-[34px]">Scraper System Setup</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">Answer the AI assistant's questions on the left to configure your lead discovery scraper. Select multiple states, counties, cities, and trades to broaden your coverage.</p>

            <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-black">Setup Progress</span>
                <span className="text-sm font-bold text-black/50">{progress}%</span>
              </div>
              <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-black/5"><div className="h-full rounded-full bg-[#f2df0d] transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            </div>

            <div className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black"><Radar size={18} className="text-[#b0a209]" />Scraper Configuration</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {STEPS.map((s, i) => {
                  const val = data[s.key];
                  const filled = val != null && val !== "" && (!Array.isArray(val) || val.length > 0);
                  const isCurrent = i === stepIndex && !done;
                  const isPast = i < stepIndex || done;
                  return (
                    <div key={s.key} className={`flex items-start gap-3 rounded-lg border p-3 transition ${filled ? "border-[#f2df0d]/40 bg-[#fdfbe1]" : isCurrent ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 bg-white"}`}>
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${filled ? "bg-[#f2df0d] text-black" : isCurrent ? "bg-[#f2df0d]/20 text-[#b0a209]" : "bg-black/5 text-black/30"}`}>{filled ? <Check size={16} /> : <s.icon size={16} />}</span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-black/40">{s.label}{filled && Array.isArray(val) ? ` (${val.length})` : ""}</p>
                        <p className={`text-sm font-bold ${filled ? "text-black" : isCurrent ? "text-[#b0a209]" : "text-black/30"}`}>{filled ? formatValue(s.key, val) : isCurrent ? "Selecting…" : isPast ? "Skipped" : "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {done && (
              <div className="mt-5 rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-6 text-center shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f2df0d]"><Check size={28} className="text-black" /></span>
                <h2 className="mt-4 text-xl font-black">Scraper Activated!</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/60">Your Auto Leads discovery scraper is now configured and active. Continue to Auto Bids setup to configure your branding and proposals.</p>
                <button onClick={() => nav("/auto-bids-setup")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f2df0d] px-6 py-3 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">Continue to Auto Bids <ArrowRight size={16} /></button>
              </div>
            )}

            <div className="mt-6 lg:hidden">
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-black"><Radar size={16} className="text-[#b0a209]" />AI Assistant</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-5 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                    </div>
                  ))}
                  {thinking && <p className="text-xs text-black/40">AI is typing…</p>}
                </div>
                <div className="mt-3 border-t border-black/10 pt-3">{renderInput(true)}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}