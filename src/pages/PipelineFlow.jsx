import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2, Search, Wrench, FileText, Mail, Repeat, PenTool, CreditCard, Calendar, CheckCircle2,
} from "lucide-react";
import ProgressTracker from "@/components/pipeline/ProgressTracker";
import StepSection from "@/components/pipeline/StepSection";
import StatCard from "@/components/pipeline/StatCard";
import CityLeadsBrowser from "@/components/pipeline/CityLeadsBrowser";

function extractEmail(text) {
  if (!text) return "";
  const m = String(text).match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0] : "";
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="grid place-items-center py-8 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[#E0E0E0] text-[#999] dark:border-white/10">
        <Icon size={26} />
      </span>
      <p className="mt-3 text-sm font-bold text-black dark:text-white">{title}</p>
      <p className="mt-1 max-w-xs text-xs text-[#666] dark:text-white/50">{desc}</p>
    </div>
  );
}

function NoLead({ icon: Icon }) {
  return (
    <EmptyState icon={Icon} title="No lead selected" desc="Pick a lead in Step 1 above to start this step." />
  );
}

const LS_KEY = "autoleads_pipeline_project";

export default function PipelineFlow() {
  const nav = useNavigate();
  const { toast } = useToast();
  const [projects, setProjects] = useState(/** @type {any[]} */ ([]));
  const [projectId, setProjectId] = useState(() => {
    try { return localStorage.getItem(LS_KEY) || ""; } catch { return ""; }
  });
  const [project, setProject] = useState(null);
  const [takeoffs, setTakeoffs] = useState(/** @type {any[]} */ ([]));
  const [proposals, setProposals] = useState(/** @type {any[]} */ ([]));
  const [estimates, setEstimates] = useState(/** @type {any[]} */ ([]));
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [esignDocs, setEsignDocs] = useState(/** @type {any[]} */ ([]));
  const [invoices, setInvoices] = useState(/** @type {any[]} */ ([]));
  const [sources, setSources] = useState(/** @type {any[]} */ ([]));
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingProject, setLoadingProject] = useState(false);
  const [busy, setBusy] = useState(null);
  const [emailForm, setEmailForm] = useState({ to: "", subject: "", body: "" });
  const [scrapeFilters, setScrapeFilters] = useState({ stateCode: "", counties: [], trades: [] });

  useEffect(() => {
    (async () => {
      try {
        const [list, srcList] = await Promise.all([
          base44.entities.Project.list("-created_date", 200).catch(() => []),
          base44.entities.ScrapeSource.list().catch(() => []),
        ]);
        setProjects(list || []);
        setSources(srcList || []);
      } catch {}
      setLoadingProjects(false);
    })();
  }, []);

  const loadProject = async (id = projectId) => {
    if (!id) return;
    setLoadingProject(true);
    try {
      const p = await base44.entities.Project.get(id);
      setProject(p);
      const [t, pr, est, msg, esign, inv] = await Promise.all([
        base44.entities.Takeoff.filter({ project_id: id }).catch(() => []),
        base44.entities.Proposal.filter({ project_id: id }).catch(() => []),
        base44.entities.Estimate.filter({ project_id: id }).catch(() => []),
        base44.entities.Message.filter({ project_id: id }).catch(() => []),
        base44.entities.EsignDocument.filter({ project_id: id }).catch(() => []),
        base44.entities.Invoice.filter({ project_id: id }).catch(() => []),
      ]);
      setTakeoffs(t || []); setProposals(pr || []); setEstimates(est || []);
      setMessages(msg || []); setEsignDocs(esign || []); setInvoices(inv || []);
      if (pr && pr.length > 0) {
        const prop = pr[0];
        setEmailForm({
          to: prop.client_email || extractEmail(p.contract_info) || "",
          subject: `Proposal: ${prop.title || p.title}`,
          body: `Hi ${prop.client_name || p.client_name || ""},\n\nThank you for the opportunity to bid on ${p.title}. Please find our proposal below:\n\nProject: ${p.title}\nTotal: $${Number(prop.total_value || 0).toLocaleString()}\n\nWe'd be happy to discuss any questions. Looking forward to working with you.\n\nBest regards`,
        });
      } else { setEmailForm({ to: "", subject: "", body: "" }); }
    } catch { setProject(null); }
    finally { setLoadingProject(false); }
  };

  useEffect(() => { if (projectId) loadProject(projectId); }, [projectId]);

  const _targetCities = useMemo(() => {
    const set = new Set();
    (sources || []).forEach(s => (s.target_cities || []).forEach(c => c && set.add(c)));
    return Array.from(set);
  }, [sources]);

  const sentMessages = useMemo(() => messages.filter(m => m.direction === "outbound" && m.status === "sent"), [messages]);
  const followups = useMemo(() => messages.filter(m => m.direction === "outbound" && m.ai_generated && m.status === "draft"), [messages]);
  const paidInvoices = useMemo(() => invoices.filter(i => i.status === "paid"), [invoices]);
  const latestProposal = proposals[0];
  const latestEstimate = estimates[0];
  const latestEsign = esignDocs[0];
  const latestInvoice = invoices[0];
  const hasProject = !!project;

  const currentStep = useMemo(() => {
    if (!project) return 0;
    if (takeoffs.length === 0) return 1;
    if (proposals.length === 0) return 2;
    if (sentMessages.length === 0) return 3;
    if (followups.length === 0) return 4;
    if (esignDocs.length === 0) return 5;
    if (paidInvoices.length === 0) return 6;
    if (!project.bid_due_date) return 7;
    return 8;
  }, [project, takeoffs, proposals, sentMessages, followups, esignDocs, paidInvoices]);

  const takeoffStats = useMemo(() => {
    const totalQty = takeoffs.reduce((s, t) => s + Number(t.final_quantity || 0), 0);
    const avgConf = takeoffs.length > 0 ? Math.round((takeoffs.reduce((s, t) => s + Number(t.confidence || 0), 0) / takeoffs.length) * 100) : 0;
    return { scopes: takeoffs.length, totalQty, avgConf };
  }, [takeoffs]);

  const msgStats = useMemo(() => ({
    sent: sentMessages.length,
    opened: messages.filter(m => m.status === "opened").length,
    replied: messages.filter(m => m.status === "replied").length,
    won: (project?.stage === "won" ? 1 : 0),
  }), [sentMessages, messages, project]);

  const runAction = async (fn, label, payload) => {
    setBusy(label);
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 90000));
      const res = await Promise.race([base44.functions.invoke(fn, payload || { project_id: projectId }), timeout]);
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      const errMsgs = Array.isArray(data?.errors) && data.errors.length > 0 ? data.errors : [];
      toast({
        title: `${label} complete`,
        description: errMsgs.length > 0 ? `${errMsgs.length} source(s) had errors — first: ${errMsgs[0]}` : undefined,
      });
      await loadProject();
    } catch (e) {
      const isTimeout = e?.message === "timeout";
      toast({
        title: isTimeout ? `${label} in progress` : `${label} failed`,
        description: isTimeout ? "Still running in the background. Refresh in a moment." : (e?.message || "Something went wrong."),
        variant: isTimeout ? "default" : "destructive",
      });
      if (isTimeout) await loadProject();
    } finally { setBusy(null); }
  };

  const sendBidEmail = async () => {
    if (!emailForm.to || !emailForm.subject || !emailForm.body) {
      toast({ title: "Missing fields", description: "To, subject, and body are required.", variant: "destructive" });
      return;
    }
    setBusy("send");
    try {
      const res = await base44.functions.invoke("sendEmail", { to: emailForm.to, subject: emailForm.subject, body: emailForm.body, project_id: projectId });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      if (proposals.length > 0) {
        try { await base44.entities.Proposal.update(proposals[0].id, { status: "delivered", sent_date: new Date().toISOString() }); } catch {}
      }
      toast({ title: "Bid email sent", description: `Delivered to ${emailForm.to}` });
      await loadProject();
    } catch (e) {
      toast({ title: "Email failed", description: e?.message || "Something went wrong.", variant: "destructive" });
    } finally { setBusy(null); }
  };

  const openProject = (p) => {
    try { localStorage.setItem(LS_KEY, p.id); } catch {}
    setProjectId(p.id);
    nav(`/leads/${p.id}`);
  };

  const inputCls = "h-11 w-full rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm outline-none focus:border-[#FFC107] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white";

  const loadingBody = (
    <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-[#FFC107]" size={26} /></div>
  );

  return (
    <div className="min-h-screen bg-[#F9F9F9] pb-24 dark:bg-[#0B0B0B]">
      <ProgressTracker currentStep={currentStep} />

      {/* STEP 1: SCRAPE */}
      <StepSection number={1} title="Scrape Leads" subtitle="Choose a state, county, and trade — then scrape exactly what you want." ctaLabel="START SCRAPING" ctaIcon={Search} onCta={() => runAction("runAutoScrape", "Scrape", scrapeFilters)} busy={busy === "Scrape"}>
        {loadingProjects ? (
          <div className="grid place-items-center py-8"><Loader2 className="animate-spin text-[#FFC107]" size={28} /></div>
        ) : (
          <CityLeadsBrowser
            projects={projects}
            selectedId={projectId}
            onOpenProject={openProject}
            onFiltersChange={setScrapeFilters}
          />
        )}
      </StepSection>

      {/* STEP 2: TAKE OFF */}
      <StepSection number={2} title="Take Off" subtitle="All measures in seconds. No manual work." ctaLabel={takeoffs.length > 0 ? "RE-RUN TAKE OFF" : "RUN TAKE OFF"} ctaIcon={Wrench} onCta={() => runAction("autoTakeoff", "Takeoff")} busy={busy === "Takeoff"} disabled={!hasProject}>
        {loadingProject && !hasProject ? loadingBody : !hasProject ? (
          <NoLead icon={Wrench} />
        ) : takeoffs.length === 0 ? (
          <EmptyState icon={Wrench} title="No takeoffs yet" desc="Run the AI takeoff to extract material and labor quantities." />
        ) : (
          <>
            <StatCard stats={[
              { label: "Scopes", value: takeoffStats.scopes },
              { label: "Total Qty", value: takeoffStats.totalQty.toLocaleString() },
              { label: "Confidence", value: `${takeoffStats.avgConf}%` },
            ]} />
            <div className="mt-3 space-y-2">
              {takeoffs.slice(0, 3).map(t => (
                <div key={t.id} className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-[#1a1a1a]">
                  <p className="font-bold text-black dark:text-white">{t.scope || "Untitled scope"}</p>
                  <p className="text-[#666] dark:text-white/50">{Number(t.final_quantity || 0).toLocaleString()} {t.unit}{t.system_code ? ` · ${t.system_code}` : ""}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </StepSection>

      {/* STEP 3: AUTO BID */}
      <StepSection number={3} title="Auto Bid" subtitle="AI builds accurate bids in seconds." ctaLabel={proposals.length > 0 ? "REBUILD BID" : "REVIEW & SEND BID"} ctaIcon={FileText} onCta={() => runAction("autoProposals", "Bid")} busy={busy === "Bid"} disabled={!hasProject}>
        {loadingProject && !hasProject ? loadingBody : !hasProject ? (
          <NoLead icon={FileText} />
        ) : !latestProposal ? (
          <EmptyState icon={FileText} title="No bid built yet" desc="Generate a proposal with line items and pricing." />
        ) : (
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-[#666] dark:text-white/50">Your Estimated Bid</h3>
              <span className="text-xs font-bold text-[#28A745]">{latestEstimate?.margin_pct ? `${Math.round(latestEstimate.margin_pct)}% margin` : ""}</span>
            </div>
            <p className="mt-2 text-3xl font-black text-black dark:text-white">${Number(latestProposal.total_value || 0).toLocaleString()}</p>
            <div className="mt-4 space-y-1.5">
              {latestEstimate && <>
                <Row label="Materials" value={latestEstimate.material_total} />
                <Row label="Labor" value={latestEstimate.labor_total} />
                <Row label="Equipment" value={latestEstimate.equipment_total} />
                <Row label="Overhead" value={latestEstimate.overhead_total} />
                <Row label="Profit" value={latestEstimate.margin_total} />
              </>}
            </div>
          </div>
        )}
      </StepSection>

      {/* STEP 4: EMAIL */}
      <StepSection number={4} title="Send Email" subtitle="Professional proposals that get replies." ctaLabel="SEND EMAIL" ctaIcon={Mail} onCta={sendBidEmail} busy={busy === "send"} disabled={!hasProject || !latestProposal}>
        {loadingProject && !hasProject ? loadingBody : !hasProject ? (
          <NoLead icon={Mail} />
        ) : !latestProposal ? (
          <EmptyState icon={Mail} title="Build a bid first" desc="Generate a proposal in Step 3 before sending an email." />
        ) : (
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-[#666] dark:text-white/50">To</span>
              <input className={inputCls} value={emailForm.to} onChange={e => setEmailForm({ ...emailForm, to: e.target.value })} placeholder="client@email.com" />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-bold text-[#666] dark:text-white/50">Subject</span>
              <input className={inputCls} value={emailForm.subject} onChange={e => setEmailForm({ ...emailForm, subject: e.target.value })} />
            </label>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-bold text-[#666] dark:text-white/50">Body</span>
              <textarea className={inputCls + " min-h-[120px] resize-y"} value={emailForm.body} onChange={e => setEmailForm({ ...emailForm, body: e.target.value })} />
            </label>
            <div className="mt-3 flex items-center justify-between border-t border-[#E0E0E0] pt-3 dark:border-white/10">
              <span className="text-xs font-bold text-[#666] dark:text-white/50">Total Bid</span>
              <span className="text-sm font-black text-black dark:text-white">${Number(latestProposal.total_value || 0).toLocaleString()}</span>
            </div>
          </div>
        )}
      </StepSection>

      {/* STEP 5: FOLLOW UP */}
      <StepSection number={5} title="Follow Up" subtitle="Automated follow ups that close more jobs." ctaLabel="VIEW FOLLOW UPS" ctaIcon={Repeat} onCta={() => runAction("autoFollowUp", "Follow-Up")} busy={busy === "Follow-Up"} disabled={!hasProject || sentMessages.length === 0}>
        {loadingProject && !hasProject ? loadingBody : !hasProject ? (
          <NoLead icon={Repeat} />
        ) : (
          <>
            <StatCard stats={[
              { label: "Sent", value: msgStats.sent },
              { label: "Opened", value: msgStats.opened },
              { label: "Replied", value: msgStats.replied },
              { label: "Won", value: msgStats.won },
            ]} />
            {followups.length > 0 && (
              <div className="mt-3 space-y-2">
                {followups.slice(0, 2).map(m => (
                  <div key={m.id} className="rounded-lg border border-[#E0E0E0] bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-[#1a1a1a]">
                    <p className="font-bold text-black dark:text-white">{m.subject || "(no subject)"}</p>
                    <p className="line-clamp-1 text-[#666] dark:text-white/50">{m.body}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </StepSection>

      {/* STEP 6: CONTRACT */}
      <StepSection number={6} title="Sign Contract" subtitle="E-Sign contracts in one tap." ctaLabel="VIEW CONTRACT" ctaIcon={PenTool} onCta={() => nav("/contracts")} busy={false} disabled={!hasProject}>
        {loadingProject && !hasProject ? loadingBody : !hasProject ? (
          <NoLead icon={PenTool} />
        ) : !latestEsign ? (
          <EmptyState icon={PenTool} title="No contract yet" desc="Generate and send a contract for e-signature." />
        ) : (
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <h3 className="text-xs font-bold uppercase text-[#666] dark:text-white/50">Contract</h3>
            <p className="mt-2 text-sm font-bold text-black dark:text-white">{latestEsign.title}</p>
            <div className="mt-3 flex items-center gap-2">
              {latestEsign.status === "signed" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F5E9] px-3 py-1 text-xs font-bold text-[#28A745]">
                  <CheckCircle2 size={14} /> Client Signed
                </span>
              ) : (
                <span className="rounded-full bg-[#F0F0F0] px-3 py-1 text-xs font-bold text-[#666] dark:bg-white/10">{latestEsign.status || "Pending"}</span>
              )}
            </div>
          </div>
        )}
      </StepSection>

      {/* STEP 7: PAYMENT */}
      <StepSection number={7} title="Take Payment" subtitle="Get paid fast and securely." ctaLabel="VIEW PAYMENT" ctaIcon={CreditCard} onCta={() => nav("/invoices")} busy={false} disabled={!hasProject}>
        {loadingProject && !hasProject ? loadingBody : !hasProject ? (
          <NoLead icon={CreditCard} />
        ) : !latestInvoice ? (
          <EmptyState icon={CreditCard} title="No payment yet" desc="Send an invoice to collect payment." />
        ) : (
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <h3 className="text-xs font-bold uppercase text-[#666] dark:text-white/50">Payment {latestInvoice.status === "paid" ? "Received" : "Pending"}</h3>
            <p className="mt-2 text-3xl font-black text-black dark:text-white">${Number(latestInvoice.total || 0).toLocaleString()}</p>
            <div className="mt-4 space-y-1.5 border-t border-[#E0E0E0] pt-3 dark:border-white/10">
              <Row label="Invoice #" value={latestInvoice.invoice_number} />
              <Row label="Due Date" value={latestInvoice.due_date} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666] dark:text-white/50">Status</span>
                <span className={`text-xs font-bold ${latestInvoice.status === "paid" ? "text-[#28A745]" : "text-[#666] dark:text-white/50"}`}>{latestInvoice.status || "Pending"}</span>
              </div>
            </div>
          </div>
        )}
      </StepSection>

      {/* STEP 8: SCHEDULE */}
      <StepSection number={8} title="Schedule Job" subtitle="Get on the calendar and get to work." ctaLabel="ADD TO CALENDAR" ctaIcon={Calendar} onCta={() => runAction("syncCalendar", "Schedule", { project_id: projectId })} busy={busy === "Schedule"} disabled={!hasProject}>
        {loadingProject && !hasProject ? loadingBody : !hasProject ? (
          <NoLead icon={Calendar} />
        ) : (
          <div className="rounded-2xl border border-[#E0E0E0] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <div className="space-y-2">
              <Row label="Job Date" value={project.bid_due_date || "Not set"} />
              <Row label="Client" value={project.client_name || "N/A"} />
              <Row label="Address" value={project.address || "N/A"} />
            </div>
          </div>
        )}
      </StepSection>

      {/* ALL DONE */}
      {hasProject && currentStep >= 8 && (
        <div className="px-5 py-8">
          <div className="mx-auto max-w-[600px] text-center">
            <div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#28A745] shadow-lg">
              <CheckCircle2 size={40} className="text-white" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-black dark:text-white">All Done!</h2>
            <p className="mt-1 text-sm text-[#666] dark:text-white/50">Job scheduled and ready to make money.</p>
            <div className="mt-5 rounded-2xl border border-[#E0E0E0] bg-white p-5 text-left shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
              <Row label="Lead" value={project.title} />
              <Row label="Job Date" value={project.bid_due_date} />
              <Row label="Bid Amount" value={latestProposal ? `$${Number(latestProposal.total_value || 0).toLocaleString()}` : "N/A"} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#666] dark:text-white/50">Status</span>
                <span className="text-xs font-bold text-[#28A745]">{project.stage || "Scheduled"}</span>
              </div>
            </div>
            <button onClick={() => nav("/auto-pipeline")} className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#FFC107] text-sm font-black text-black shadow-sm transition hover:bg-[#FFD54F]">
              VIEW PIPELINE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[#666] dark:text-white/50">{label}</span>
      <span className="text-xs font-bold text-black dark:text-white">{value != null ? String(value) : "N/A"}</span>
    </div>
  );
}