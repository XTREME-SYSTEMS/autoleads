import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Sparkles, Send, Check, ArrowRight, Building2, MapPin, Briefcase, Globe, Phone, Mail, FileText, Shield } from "lucide-react";
import { US_STATES, getCounties, getCities, TRADES } from "@/lib/geoData";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";
import BackButton from "@/components/autoleads/BackButton";
import MobileSelect from "@/components/autoleads/MobileSelect";
import { useOrgId } from "@/hooks/useOrgContext";

const STEPS = [
  { key: "company_name", question: "Hi! I'm your AUTOLEADS AI assistant. I'll walk you through a quick setup so we can customize everything for your business. Let's start simple — what's your company name?", type: "text", placeholder: "e.g. Apex Construction", required: true, icon: Building2, label: "Company Name" },
  { key: "trade", question: "Great! What trade or industry are you in? You can pick multiple if your business covers several. I'll tailor your experience based on your selections.", type: "multiselect", options: TRADES.map(t => ({ value: t, label: t })), required: true, icon: Briefcase, label: "Trades / Industries" },
  { key: "state", question: "Where do you operate? Which state is your primary market?", type: "select", options: US_STATES.map(s => ({ value: s.code, label: s.name })), required: true, icon: MapPin, label: "State" },
  { key: "county", question: "Which county do you primarily work in? (or skip if you cover the whole state)", type: "select", dynamic: "county", required: false, icon: MapPin, label: "County" },
  { key: "city", question: "And which city? (or skip)", type: "select", dynamic: "city", required: false, icon: MapPin, label: "City" },
  { key: "years_experience", question: "How many years has your company been in business? (or skip)", type: "number", placeholder: "e.g. 15", required: false, icon: Briefcase, label: "Years Experience" },
  { key: "website", question: "What's your website? (or skip)", type: "text", placeholder: "www.company.com", required: false, icon: Globe, label: "Website" },
  { key: "phone", question: "What's your business phone? (or skip)", type: "text", placeholder: "(555) 123-4567", required: false, icon: Phone, label: "Phone" },
  { key: "email", question: "What's your business email? (or skip)", type: "text", placeholder: "info@company.com", required: false, icon: Mail, label: "Email" },
  { key: "license_number", question: "What's your contractor license number? (or skip)", type: "text", placeholder: "BC-12345", required: false, icon: FileText, label: "License Number" },
  { key: "bonding_capacity", question: "What's your bonding capacity in dollars? (or skip)", type: "number", placeholder: "5000000", required: false, icon: Shield, label: "Bonding Capacity" },
];

export default function GetStarted() {
  const nav = useNavigate();
  const orgId = useOrgId();
  const [messages, setMessages] = useState([{ role: "ai", text: STEPS[0].question }]);
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState(/** @type {any} */ ({}));
  const [input, setInput] = useState("");
  const [selectedTrades, setSelectedTrades] = useState(/** @type {any[]} */ ([]));
  const [thinking, setThinking] = useState(false);
  const [done, setDone] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  useEffect(() => {
    if (inputRef.current && STEPS[stepIndex]?.type === "text") inputRef.current.focus();
  }, [stepIndex]);

  const currentStep = STEPS[stepIndex];
  const progress = done ? 100 : Math.round((stepIndex / STEPS.length) * 100);

  const getOptions = (step) => {
    if (step.dynamic === "county") return getCounties(data.state).map(c => ({ value: c, label: c.replace(/_/g, " ") }));
    if (step.dynamic === "city") return getCities(data.state, data.county).map(c => ({ value: c, label: c }));
    return step.options || [];
  };

  const acknowledge = async (step, value, skipped) => {
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `A construction company is onboarding on the AUTOLEADS platform. They were asked: "${step.question}" and answered: ${skipped ? "they skipped this question" : `"${value}"`}. Write a brief, friendly one-sentence acknowledgment (max 15 words) that references their answer. Do NOT ask a question. Be warm and specific.`
      });
      return typeof res === "string" ? res : res?.response || res?.text || "Got it!";
    } catch {
      return "Got it!";
    }
  };

  const advance = async (value, skipped = false) => {
    const step = currentStep;
    const newData = { ...data, [step.key]: skipped ? null : value };
    setData(newData);

    let displayValue = skipped ? "Skip" : value;
    if (!skipped && step.type === "select") {
      const opts = getOptions(step);
      displayValue = opts.find(o => o.value === value)?.label || value;
    }
    if (!skipped && step.type === "multiselect") {
      displayValue = Array.isArray(value) && value.length ? value.join(", ") : "Skip";
    }
    setMessages(m => [...m, { role: "user", text: String(displayValue) }]);
    setInput("");
    setSelectedTrades([]);

    const nextIndex = stepIndex + 1;
    if (nextIndex < STEPS.length) {
      setThinking(true);
      const ack = await acknowledge(step, displayValue, skipped);
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
      if (allData.company_name) {
        await base44.entities.CompanyProfile.create({
          organization_id: orgId,
          name: allData.company_name,
          trade: Array.isArray(allData.trade) ? allData.trade.join(", ") : allData.trade,
          state: allData.state,
          city: allData.city,
          website: allData.website,
          phone: allData.phone,
          email: allData.email,
          license_number: allData.license_number,
          bonding_capacity: allData.bonding_capacity ? Number(allData.bonding_capacity) : null,
        });
        
        // Auto-scrape for opportunities based on trade and location
        const tradeStr = Array.isArray(allData.trade) ? allData.trade.join(", ") : allData.trade || "general construction";
        const location = [allData.city, allData.state].filter(Boolean).join(", ") || allData.state || "United States";
        try {
          const scrapeRes = await base44.integrations.Core.InvokeLLM({
            prompt: `Search the web for current construction bid opportunities and upcoming projects in ${location} for a contractor specializing in ${tradeStr}. Find 5-8 real, current construction projects or bid opportunities in this area. Include project title, jurisdiction/authority, estimated value, bid due date, and source URL if available. Return a JSON object with "opportunities" array, each with: title, jurisdiction, value (number), bid_due_date (YYYY-MM-DD), authority, source_url, description.`,
            add_context_from_internet: true,
            model: "gemini_3_flash",
            response_json_schema: {
              type: "object",
              properties: {
                opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      jurisdiction: { type: "string" },
                      value: { type: "number" },
                      bid_due_date: { type: "string" },
                      authority: { type: "string" },
                      source_url: { type: "string" },
                      description: { type: "string" },
                    },
                  },
                },
              },
            },
          });
          if (scrapeRes?.opportunities && scrapeRes.opportunities.length > 0) {
            await base44.entities.Opportunity.bulkCreate(
              scrapeRes.opportunities.map(o => ({
                organization_id: orgId,
                title: o.title,
                jurisdiction: o.jurisdiction || location,
                value: o.value || null,
                bid_due_date: o.bid_due_date || null,
                authority: o.authority || null,
                source_url: o.source_url || null,
                stage: "qualification",
                retrieval_date: new Date().toISOString(),
              }))
            );
          }
        } catch {}
      }
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `A construction company just finished onboarding on AUTOLEADS. Their info: ${JSON.stringify(allData)}. Write a warm, enthusiastic welcome message (2-3 sentences) that references their trade and location specifically, and tells them to continue to Auto Leads setup to configure their lead discovery scraper.`
      });
      const summary = typeof res === "string" ? res : res?.response || res?.text || "You're all set! Let's build your business.";
      setMessages(m => [...m, { role: "ai", text: summary, isFinal: true }]);
      setDone(true);
    } catch {
      setMessages(m => [...m, { role: "ai", text: "You're all set! Continue to Auto Leads setup to configure your scraper.", isFinal: true }]);
      setDone(true);
    } finally {
      setThinking(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || thinking) return;
    advance(input.trim());
  };

  const handleSelect = (value) => {
    if (thinking || !value) return;
    advance(value);
  };

  const handleSkip = () => {
    if (thinking) return;
    advance(null, true);
  };

  const toggleTrade = (value) => {
    if (thinking) return;
    setSelectedTrades(prev => prev.includes(value) ? prev.filter(t => t !== value) : [...prev, value]);
  };

  const confirmTrades = () => {
    if (thinking || selectedTrades.length === 0) return;
    advance(selectedTrades);
  };

  const formatValue = (stepKey, value) => {
    if (value == null) return null;
    if (stepKey === "state") return US_STATES.find(s => s.code === value)?.name || value;
    if (stepKey === "county") return String(value).replace(/_/g, " ");
    if (stepKey === "bonding_capacity") return "$" + Number(value).toLocaleString();
    if (stepKey === "years_experience") return value + " years";
    if (stepKey === "trade" && Array.isArray(value)) return value.join(", ");
    return value;
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f5f5]">
      {/* Header */}
      <header className="z-10 h-[66px] border-b border-black/10 bg-white px-4 sm:px-6">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-3"><BackButton to="/onboarding" /><AutoLeadsLogo height={38} /></div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-black/50">{Math.min(stepIndex + 1, STEPS.length)} of {STEPS.length}</span>
            <div className="h-2 w-24 overflow-hidden rounded-full bg-black/10 sm:w-40">
              <div className="h-full rounded-full bg-[#f2df0d] transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </header>

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
              {currentStep.type === "multiselect" ? (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto rounded-lg border border-black/15 bg-white p-2">
                    {getOptions(currentStep).map((o) => {
                      const checked = selectedTrades.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => toggleTrade(o.value)}
                          className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm font-medium transition ${checked ? "bg-[#fdfbe1] text-black" : "text-black/70 hover:bg-black/5"}`}
                        >
                          <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${checked ? "border-[#f2df0d] bg-[#f2df0d]" : "border-black/20 bg-white"}`}>
                            {checked && <Check size={12} className="text-black" />}
                          </span>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={confirmTrades}
                    disabled={thinking || selectedTrades.length === 0}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40"
                  >
                    Confirm {selectedTrades.length > 0 && `(${selectedTrades.length})`}
                  </button>
                </div>
              ) : currentStep.type === "select" ? (
                <div className="space-y-2">
                  <MobileSelect
                    className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm font-medium outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20"
                    value=""
                    onChange={(v) => v && handleSelect(v)}
                    disabled={thinking}
                  >
                    <option value="">Tap to select…</option>
                    {getOptions(currentStep).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </MobileSelect>
                  {!currentStep.required && (
                    <button onClick={handleSkip} disabled={thinking} className="text-xs font-bold text-black/40 hover:text-black/60 disabled:opacity-40">
                      Skip this step →
                    </button>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type={currentStep.type === "number" ? "number" : "text"}
                    className="h-11 min-w-0 flex-1 rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={currentStep.placeholder}
                    disabled={thinking}
                  />
                  <button type="submit" disabled={thinking || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40">
                    <Send size={17} />
                  </button>
                  {!currentStep.required && (
                    <button type="button" onClick={handleSkip} disabled={thinking} className="shrink-0 text-xs font-bold text-black/40 hover:text-black/60 disabled:opacity-40">
                      Skip
                    </button>
                  )}
                </form>
              )}
            </div>
          )}
          {done && (
            <div className="border-t border-black/10 p-4">
              <button onClick={() => nav("/auto-leads-setup")} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">
                Continue to Auto Leads <ArrowRight size={16} />
              </button>
            </div>
          )}
          <p className="px-6 pb-4 text-[10px] text-black/40">AI can make mistakes. Verify important information.</p>
        </aside>

        {/* Content (right) */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
            <p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Setup</p>
            <h1 className="text-3xl font-black tracking-[-.03em] sm:text-[34px]">Company Onboarding</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">Answer the AI assistant's questions on the left to build your company profile. Your answers appear here in real time.</p>

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

            {/* Live profile card */}
            <div className="mt-5 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              <h2 className="flex items-center gap-2 font-black"><Building2 size={18} className="text-[#b0a209]" />Your Company Profile</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {STEPS.map((s, i) => {
                  const val = data[s.key];
                  const filled = val != null && val !== "";
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
                          {filled ? formatValue(s.key, val) : isCurrent ? "Answering…" : isPast ? "Skipped" : "—"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Completion card */}
            {done && (
              <div className="mt-5 rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-6 text-center shadow-sm">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#f2df0d]">
                  <Check size={28} className="text-black" />
                </span>
                <h2 className="mt-4 text-xl font-black">Onboarding Complete!</h2>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-black/60">Your company profile has been saved. Continue to Auto Leads setup to configure your lead discovery scraper.</p>
                <button onClick={() => nav("/auto-leads-setup")} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#f2df0d] px-6 py-3 text-sm font-black text-black shadow-[0_4px_12px_rgba(255,196,0,.22)] hover:bg-[#f4e431]">
                  Continue to Auto Leads <ArrowRight size={16} />
                </button>
              </div>
            )}

            {/* Mobile chat (below content) */}
            <div className="mt-6 lg:hidden">
              <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
                <p className="mb-3 flex items-center gap-2 text-sm font-black"><Sparkles size={16} className="text-[#b0a209]" />AI Assistant</p>
                <div className="max-h-64 space-y-2 overflow-y-auto">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-5 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {thinking && <p className="text-xs text-black/40">AI is typing…</p>}
                </div>
                {!done && (
                  <div className="mt-3 border-t border-black/10 pt-3">
                    {currentStep.type === "multiselect" ? (
                      <div className="space-y-2">
                        <div className="max-h-40 overflow-y-auto rounded-lg border border-black/15 bg-white p-2">
                          {getOptions(currentStep).map((o) => {
                            const checked = selectedTrades.includes(o.value);
                            return (
                              <button key={o.value} type="button" onClick={() => toggleTrade(o.value)} className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium transition ${checked ? "bg-[#fdfbe1] text-black" : "text-black/70 hover:bg-black/5"}`}>
                                <span className={`grid h-5 w-5 shrink-0 place-items-center rounded border-2 ${checked ? "border-[#f2df0d] bg-[#f2df0d]" : "border-black/20 bg-white"}`}>
                                  {checked && <Check size={12} className="text-black" />}
                                </span>
                                {o.label}
                              </button>
                            );
                          })}
                        </div>
                        <button onClick={confirmTrades} disabled={thinking || selectedTrades.length === 0} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black text-black disabled:opacity-40">
                          Confirm {selectedTrades.length > 0 && `(${selectedTrades.length})`}
                        </button>
                      </div>
                    ) : currentStep.type === "select" ? (
                      <MobileSelect className="h-11 w-full rounded-lg border border-black/15 px-3 text-sm" value="" onChange={(v) => v && handleSelect(v)} disabled={thinking}>
                        <option value="">Tap to select…</option>
                        {getOptions(currentStep).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </MobileSelect>
                    ) : (
                      <form onSubmit={handleSubmit} className="flex items-center gap-2">
                        <input ref={inputRef} type={currentStep.type === "number" ? "number" : "text"} className="h-11 min-w-0 flex-1 rounded-lg border border-black/15 px-3 text-sm" value={input} onChange={(e) => setInput(e.target.value)} placeholder={currentStep.placeholder} disabled={thinking} />
                        <button type="submit" disabled={thinking || !input.trim()} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-[#f2df0d] text-black disabled:opacity-40"><Send size={17} /></button>
                        {!currentStep.required && <button type="button" onClick={handleSkip} disabled={thinking} className="text-xs font-bold text-black/40">Skip</button>}
                      </form>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}