import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, ChevronRight, Loader2, ShieldCheck, AlertCircle, Sparkles, FileText, Send, Calendar, Mail, FileCheck2, BookOpen, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, StatusPill, Surface, money, fmtDate } from "@/components/CommercialMobileUI";

export default function BidPackageFinalReview() {
  const nav = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState(null);
  const [sending, setSending] = useState(false);
  const [generatingBooklet, setGeneratingBooklet] = useState(false);
  const [safetyBooklet, setSafetyBooklet] = useState(null);
  const [toast, setToast] = useState(null);
  const [testEmail, setTestEmail] = useState("jeremy@nationalconcretepolishing.net");

  useEffect(() => {
    (async () => {
      try {
        const props = await base44.entities.Proposal.filter({ status: "internal_review" }, "-created_date", 50).catch(() => []);
        const reviewable = (props || []).filter(p => p.data_class !== "NON_PRODUCTION_EXAMPLE");
        setProposals(reviewable);
        // Fetch linked projects
        const pIds = [...new Set(reviewable.map(p => p.project_id).filter(Boolean))];
        const projectResults = await Promise.all(pIds.map(pid => base44.entities.Project.get(pid).catch(() => null)));
        const pMap = {};
        projectResults.forEach(p => { if (p) pMap[p.id] = p; });
        setProjects(pMap);
        if (reviewable.length > 0) setSelected(reviewable[0].id);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const currentProposal = useMemo(() => proposals.find(p => p.id === selected), [proposals, selected]);
  const currentProject = useMemo(() => currentProposal ? projects[currentProposal.project_id] : null, [currentProposal, projects]);

  const validatePackage = async () => {
    if (!selected) return;
    setValidating(true);
    setValidation(null);
    try {
      const result = await base44.functions.invoke('validateBidPackage', { proposal_id: selected });
      setValidation(result);
    } catch (err) {
      setValidation({ verdict: 'issues_found', summary: err.message || 'Validation failed', issues: ['Could not reach AI validator'], checks: [] });
    }
    finally { setValidating(false); }
  };

  const generateBooklet = async () => {
    setGeneratingBooklet(true);
    try {
      const result = await base44.functions.invoke('generateSafetyBooklet', {
        organization_id: currentProposal?.organization_id,
        project_id: currentProject?.id,
        trade: currentProject?.trade,
      });
      setSafetyBooklet(result);
      setToast({ type: 'success', msg: 'Safety booklet generated!' });
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Booklet generation failed' });
    }
    finally { setGeneratingBooklet(false); }
  };

  const sendBid = async () => {
    if (!selected) return;
    setSending(true);
    try {
      // Send the branded bid email via submitProposal
      const result = await base44.functions.invoke('submitProposal', {
        proposal_id: selected,
        method: 'email',
        recipient: testEmail || undefined,
      });
      setToast({ type: 'success', msg: 'Bid package sent! Calendar synced + follow-ups configured.' });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Send failed — check Gmail connection' });
    }
    finally { setSending(false); }
  };

  if (loading) {
    return <CommercialPage><BackLink to="/dashboard"/><IndustrialTitle compact>Bid Package Review</IndustrialTitle><Surface className="p-8 text-center text-sm text-black/45">Loading bid packages…</Surface></CommercialPage>;
  }

  if (proposals.length === 0) {
    return <CommercialPage><BackLink to="/dashboard"/><IndustrialTitle compact>Bid Package Review</IndustrialTitle>
      <Surface className="p-8 text-center"><p className="font-brand text-xl font-bold uppercase">No bid packages ready</p>
      <p className="mt-2 text-sm text-black/50">Approve takeoffs first to generate bid packages.</p>
      <button onClick={() => nav('/takeoff-review')} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#FFC400] px-5 py-2.5 font-brand text-sm font-bold uppercase text-black">Review Takeoffs <ArrowRight size={15}/></button></Surface></CommercialPage>;
  }

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Home"/>
      <IndustrialTitle compact>Bid Package Review</IndustrialTitle>
      <p className="mb-4 text-sm text-black/55">Validate with AI, generate safety booklet, then send branded bid package to contractor.</p>

      {/* Proposal selector */}
      <div className="mb-4 space-y-2">
        {proposals.map(p => {
          const proj = projects[p.project_id];
          return (
            <button key={p.id} onClick={() => { setSelected(p.id); setValidation(null); setSafetyBooklet(null); }}
              className={`w-full rounded-xl border-2 p-3 text-left transition ${selected === p.id ? 'border-[#FFC400] bg-[#FFF7DA]' : 'border-black/10 bg-white'}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{proj?.title || p.title}</p><p className="text-xs text-black/50">{p.client_name || 'Client'} · {p.client_email || 'No email'}</p></div>
                <div className="text-right"><p className="font-brand text-lg font-bold text-[#E9A900]">{money(p.total_value, true)}</p></div>
              </div>
            </button>
          );
        })}
      </div>

      {currentProposal && (
        <Surface className="p-4">
          {/* Bid package details */}
          <p className="font-brand text-[13px] font-bold uppercase tracking-wide text-[#E9A900]">Bid Package Contents</p>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-black/50">Client</span><span className="font-semibold">{currentProposal.client_name || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-black/50">Client Email</span><span className="font-semibold">{currentProposal.client_email || 'N/A'}</span></div>
            <div className="flex justify-between"><span className="text-black/50">Total Value</span><span className="font-bold text-[#E9A900]">{money(currentProposal.total_value)}</span></div>
            <div className="flex justify-between"><span className="text-black/50">Line Items</span><span className="font-semibold">{Array.isArray(currentProposal.items) ? currentProposal.items.length : 0}</span></div>
            {currentProject && <div className="flex justify-between"><span className="text-black/50">Bid Due</span><span className="font-semibold">{fmtDate(currentProject.bid_due_date)}</span></div>}
          </div>

          {/* AI Validation */}
          {validation && (
            <div className={`mt-4 rounded-lg border p-3 ${validation.verdict === 'approved' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center gap-2">
                {validation.verdict === 'approved' ? <ShieldCheck size={18} className="text-emerald-600"/> : <AlertCircle size={18} className="text-amber-600"/>}
                <p className={`font-bold ${validation.verdict === 'approved' ? 'text-emerald-700' : 'text-amber-700'}`}>{validation.verdict === 'approved' ? 'All Good — Ready to Send!' : 'Issues Found — Fix Before Sending'}</p>
                {Number(validation.confidence) > 0 && <span className="ml-auto text-xs font-bold text-black/50">{Math.round(validation.confidence)}%</span>}
              </div>
              <p className="mt-1 text-xs text-black/65">{validation.summary}</p>
              {validation.issues && validation.issues.length > 0 && <ul className="mt-2 space-y-1">{validation.issues.map((issue, i) => <li key={i} className="text-xs text-amber-800">• {issue}</li>)}</ul>}
              {validation.missing_items && validation.missing_items.length > 0 && <div className="mt-2"><p className="text-[10px] font-bold uppercase text-black/40">Missing:</p><p className="text-xs text-amber-700">{validation.missing_items.join(', ')}</p></div>}
            </div>
          )}

          {/* Safety Booklet */}
          {safetyBooklet && (
            <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2"><BookOpen size={16} className="text-blue-600"/><p className="font-bold text-blue-700">Safety Booklet Generated!</p></div>
              <p className="mt-1 text-xs text-black/65">{safetyBooklet.company_name} — {safetyBooklet.trade} safety regulations booklet ready to include in bid package.</p>
            </div>
          )}

          {/* Test email override */}
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">Test Email Override</p>
            <p className="mt-0.5 text-xs text-black/55">Bid emails will be sent here instead of the client (for testing)</p>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="mt-2 min-h-11 w-full rounded-lg border border-blue-200 bg-white px-3 text-sm outline-none focus:border-[#FFC400]"
            />
          </div>

          {/* Action buttons */}
          <div className="mt-4 space-y-2">
            <button onClick={validatePackage} disabled={validating} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-[#FFC400] bg-white font-brand text-sm font-bold uppercase text-black disabled:opacity-50">
              {validating ? <><Loader2 size={16} className="animate-spin"/>Validating…</> : <><Sparkles size={16}/>AI Validate Before Sending</>}
            </button>
            <button onClick={generateBooklet} disabled={generatingBooklet} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg border border-black/15 bg-white font-brand text-sm font-bold uppercase text-black disabled:opacity-50">
              {generatingBooklet ? <><Loader2 size={16} className="animate-spin"/>Generating…</> : <><BookOpen size={16}/>Generate Safety Booklet</>}
            </button>
            <button onClick={sendBid} disabled={sending} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-lg bg-[#FFC400] font-brand text-base font-bold uppercase text-black shadow-[0_8px_20px_rgba(255,196,0,.22)] disabled:opacity-50">
              {sending ? <><Loader2 size={18} className="animate-spin"/>Sending…</> : <><Send size={18}/>Send Branded Bid Package</>}
            </button>
          </div>

          {/* What happens next */}
          <div className="mt-4 rounded-lg bg-black/[.02] p-3">
            <p className="text-[10px] font-black uppercase tracking-wide text-black/40">When you press send:</p>
            <ul className="mt-1.5 space-y-1 text-xs text-black/60">
              <li className="flex items-center gap-1.5"><Mail size={11}/> Branded email sent to contractor with your logo & contact info</li>
              <li className="flex items-center gap-1.5"><Calendar size={11}/> "Bid Sent" event added to your Google Calendar</li>
              <li className="flex items-center gap-1.5"><Clock size={11}/> Weekly follow-up reminders set in calendar</li>
              <li className="flex items-center gap-1.5"><FileCheck2 size={11}/> Follow-up email sequence configured (approval-gated)</li>
            </ul>
          </div>
        </Surface>
      )}

      {toast && <div className={`fixed inset-x-4 bottom-24 z-[100] rounded-xl p-4 text-center font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.msg}</div>}
    </CommercialPage>
  );
}