import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, Palette, Sparkles } from "lucide-react";
import AppHeader from "@/components/autoleads/AppHeader";
import AutoAppPhase from "@/components/autoleads/AutoAppPhase";
import PageStepGuide from "@/components/autoleads/PageStepGuide";
import BackButton from "@/components/autoleads/BackButton";
import SidebarChatInput from "@/components/autoleads/SidebarChatInput";

export default function AutoAppSetup() {
  const nav = useNavigate();
  const [companyInfo, setCompanyInfo] = useState(/** @type {any} */ ({}));
  const [companyLogo, setCompanyLogo] = useState(null);
  const [userTrades, setUserTrades] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [messages, setMessages] = useState([{ role: "ai", text: "Welcome to Auto Brand! I'll help you build your digital business card and branded brochure using your approved logo and proposal design. Ask me anything, or use the workflow steps below to jump anywhere in the system." }]);
  const scrollRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [companies, sources, brands] = await Promise.all([
          base44.entities.CompanyProfile.list().catch(() => []),
          base44.entities.ScrapeSource.list().catch(() => []),
          base44.entities.BrandAsset.list().catch(() => []),
        ]);
        const tradeSet = new Set();
        (companies || []).forEach(c => { if (c.trade) c.trade.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tradeSet.add(t)); });
        (sources || []).forEach(s => { if (s.trades) s.trades.split(",").map(t => t.trim()).filter(Boolean).forEach(t => tradeSet.add(t)); });
        if (tradeSet.size > 0) setUserTrades([...tradeSet].sort());
        if ((companies || []).length > 0) setCompanyInfo(companies[0]);
        const logo = (brands || []).find(b => b.type === "logo" && b.file_url);
        if (logo) setCompanyLogo(logo.file_url);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  const handleComplete = async () => {
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      nav("/onboarding");
    }, 1500);
  };

  return (
    <div className="flex h-screen flex-col bg-[#f5f5f5]">
      <AppHeader />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[320px] shrink-0 flex-col border-r border-black/10 bg-white lg:flex">
          <div className="flex h-[60px] items-center gap-3 border-b border-black/10 px-6"><Palette size={20} className="text-[#b0a209]" /><span className="text-lg font-black">Auto Brand</span></div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "ai" && <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span>}
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-6 ${m.role === "user" ? "bg-[#f2df0d] font-semibold text-black" : "border border-black/10 bg-black/[.02] text-black/80"}`}>{m.text}</div>
                </div>
              ))}
              {thinking && (
                <div className="flex gap-2.5"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#f2df0d]"><Sparkles size={14} className="text-black" /></span><div className="rounded-xl border border-black/10 bg-black/[.02] px-3 py-3"><div className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "0ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "150ms" }} /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: "300ms" }} /></div></div></div>
              )}
            </div>
          </div>
          <SidebarChatInput messages={messages} setMessages={setMessages} contextLabel="Auto Brand" companyInfo={companyInfo} userTrades={userTrades} />
          <p className="px-6 pb-4 text-[10px] text-black/40">AI can make mistakes. Verify important information.</p>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-10">
            <BackButton to="/onboarding" className="mb-4" />
            <p className="mb-1 text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Auto Brand</p>
            <h1 className="text-3xl font-black tracking-[-.03em] sm:text-[34px]">Auto Brand</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-black/55">Generate your digital business card and digital brochure using your approved logo and proposal design. Share professional branded assets with clients to win more work.</p>
            <PageStepGuide className="mt-6" title="How to use this page — Step-by-Step" steps={[{title:"Confirm your company info",description:"Name, trade, and logo pulled in from your onboarding."},{title:"Generate your digital business card",description:"Create a professional branded business card with your approved logo."},{title:"Build your digital brochure",description:"Generate a branded brochure using your approved proposal design and company info."},{title:"Choose a branded skin",description:"Pick a layout style and colors for your digital assets."},{title:"Publish & share",description:"Get your shareable links to send your business card and brochure to clients."}]} />
            <div className="mt-6 rounded-xl border border-black/10 bg-white p-5 shadow-sm">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-black/40">
                  <Loader2 size={18} className="animate-spin" /> Loading…
                </div>
              ) : (
                <AutoAppPhase
                  companyInfo={companyInfo}
                  companyLogo={companyLogo}
                  userTrades={userTrades}
                  onComplete={handleComplete}
                  thinking={thinking}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}