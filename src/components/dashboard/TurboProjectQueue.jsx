import React, { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, Check, Loader2, Send, Ruler, DollarSign, Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Surface } from "@/components/CommercialMobileUI";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const sf = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

export default function TurboProjectQueue({ projectIds, onAllSent, onSend }) {
  const [projects, setProjects] = useState([]);
  const [takeoffsByProject, setTakeoffsByProject] = useState({});
  const [proposalsByProject, setProposalsByProject] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [checked, setChecked] = useState(new Set());
  const [sendingId, setSendingId] = useState(null);
  const [sentIds, setSentIds] = useState(new Set());
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      if (!projectIds || projectIds.length === 0) { setLoading(false); return; }
      setLoading(true);
      try {
        // Fetch all projects
        const allProjects = await base44.entities.Project.list('-created_date', 300).catch(() => []);
        const queued = (allProjects || []).filter(p => projectIds.includes(p.id));
        setProjects(queued);

        // Fetch takeoffs + proposals for each project in parallel
        const [allTakeoffs, allProposals] = await Promise.all([
          base44.entities.Takeoff.list('-created_date', 500).catch(() => []),
          base44.entities.Proposal.list('-created_date', 500).catch(() => []),
        ]);

        const tMap = {};
        (allTakeoffs || []).forEach(t => {
          if (!tMap[t.project_id]) tMap[t.project_id] = [];
          tMap[t.project_id].push(t);
        });
        setTakeoffsByProject(tMap);

        const pMap = {};
        (allProposals || []).forEach(p => {
          // Keep the most relevant proposal (approved/ready/internal_review preferred)
          const existing = pMap[p.project_id];
          if (!existing || ['approved', 'ready', 'pending_send', 'internal_review'].includes(p.status)) {
            pMap[p.project_id] = p;
          }
        });
        setProposalsByProject(pMap);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectIds]);

  const toggleExpand = (id) => {
    setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };
  const toggleCheck = (id) => {
    setChecked(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  const approveAndSend = async (projectId) => {
    const proposal = proposalsByProject[projectId];
    if (!proposal) { setError(`No proposal for project`); return; }
    setSendingId(projectId);
    try {
      await base44.functions.invoke("submitProposal", { proposal_id: proposal.id, method: "email" });
      setSentIds(prev => new Set(prev).add(projectId));
      setChecked(prev => { const n = new Set(prev); n.delete(projectId); return n; });
      if (onSend) onSend();
      if (onAllSent) {
        const remaining = projects.filter(p => !sentIds.has(p.id) && p.id !== projectId);
        if (remaining.length === 0) onAllSent();
      }
    } catch (e) {
      setError(`Send failed: ${e.message}`);
    } finally {
      setSendingId(null);
    }
  };

  if (loading) {
    return <Surface className="p-6 text-center"><Loader2 size={20} className="mx-auto animate-spin text-[#D99D00]"/><p className="mt-2 text-xs text-black/45">Lining up projects…</p></Surface>;
  }

  if (projects.length === 0) {
    return <Surface className="p-6 text-center text-sm text-black/45">No projects to bid yet. Run Turbo to generate takeoffs and proposals first.</Surface>;
  }

  return (
    <div className="space-y-2.5">
      {error && <div className="rounded-lg bg-red-50 p-2 text-[11px] font-semibold text-red-600">{error}</div>}
      {projects.map(project => {
        const takeoffs = takeoffsByProject[project.id] || [];
        const proposal = proposalsByProject[project.id];
        const isExpanded = expanded.has(project.id);
        const isChecked = checked.has(project.id);
        const isSent = sentIds.has(project.id);
        const isSending = sendingId === project.id;

        // Flooring scopes = takeoffs with SF unit (or any takeoff — flooring is the trade)
        const flooringTakeoffs = takeoffs.filter(t => (t.unit || '').toUpperCase() === 'SF' || (t.unit || '').toUpperCase() === 'SQFT' || !t.unit);
        const totalSqft = flooringTakeoffs.reduce((sum, t) => sum + Number(t.final_quantity || 0), 0);

        // Match proposal items to takeoff scopes for pricing
        const proposalItems = (proposal?.items || []).filter(i => i.description && i.quantity != null);
        const totalBid = proposal?.total_value || proposalItems.reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);

        return (
          <Surface key={project.id} className={`overflow-hidden ${isSent ? 'border-emerald-300' : ''}`}>
            {/* Project header row with checkbox */}
            <div className="flex items-center gap-2.5 p-3">
              <button
                onClick={() => toggleCheck(project.id)}
                disabled={isSent}
                className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border-2 transition ${isChecked || isSent ? 'border-emerald-500 bg-emerald-500' : 'border-black/20 bg-white'} disabled:opacity-50`}
              >
                {(isChecked || isSent) && <Check size={16} className="text-white"/>}
              </button>
              <button onClick={() => toggleExpand(project.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                <Building2 size={16} className="shrink-0 text-[#D99D00]"/>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{project.title}</p>
                  <p className="truncate text-[10px] text-black/45">{project.jurisdiction || project.trade || 'N/A'}</p>
                </div>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <span className="flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700"><Ruler size={11}/>{sf(totalSqft)} SF</span>
                <span className="flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700"><DollarSign size={11}/>{money(totalBid)}</span>
                <button onClick={() => toggleExpand(project.id)} className="grid h-7 w-7 place-items-center rounded-md border border-black/10">
                  {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
              </div>
            </div>

            {/* Expanded scope breakdown */}
            {isExpanded && (
              <div className="border-t border-black/[.07] bg-black/[.015] p-3">
                <p className="mb-2 font-brand text-[10px] font-bold uppercase tracking-wide text-[#D99D00]">Scope of Work — Flooring</p>
                {flooringTakeoffs.length === 0 && proposalItems.length === 0 ? (
                  <p className="text-xs text-black/40">No takeoff scopes or proposal line items yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {/* Render each scope: description, sq ft, unit price, line total */}
                    {proposalItems.length > 0 ? proposalItems.map((item, i) => {
                      const lineTotal = Number(item.quantity || 0) * Number(item.unit_price || 0);
                      const matchingTakeoff = flooringTakeoffs.find(t => (t.scope || '').toLowerCase().includes((item.description || '').toLowerCase().slice(0, 12)) || (item.description || '').toLowerCase().includes((t.scope || '').toLowerCase().slice(0, 12)));
                      return (
                        <div key={i} className="rounded-lg border border-black/[.06] bg-white p-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11px] font-bold leading-tight">{item.description}</p>
                            <p className="shrink-0 text-[11px] font-black text-emerald-700">{money(lineTotal)}</p>
                          </div>
                          <div className="mt-1 flex items-center gap-3 text-[10px] text-black/50">
                            <span>{sf(item.quantity)} {item.unit || 'SF'}</span>
                            <span>@ {money(item.unit_price)}/{item.unit || 'SF'}</span>
                            {matchingTakeoff?.spec_evidence && <span className="truncate text-black/35">· {matchingTakeoff.spec_evidence.slice(0, 40)}</span>}
                          </div>
                        </div>
                      );
                    }) : flooringTakeoffs.map((t, i) => (
                      <div key={i} className="rounded-lg border border-black/[.06] bg-white p-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[11px] font-bold leading-tight">{t.scope}</p>
                          <p className="shrink-0 text-[11px] font-black text-black/60">{sf(t.final_quantity)} {t.unit || 'SF'}</p>
                        </div>
                        {t.spec_evidence && <p className="mt-1 text-[10px] text-black/45">{t.spec_evidence}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {/* Total price at bottom */}
                <div className="mt-2.5 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                  <span className="font-brand text-[11px] font-bold uppercase tracking-wide text-emerald-700">Total Bid</span>
                  <span className="text-[16px] font-black text-emerald-700">{money(totalBid)}</span>
                </div>
              </div>
            )}

            {/* Approve & Send button (shows when checked, not sent) */}
            {isChecked && !isSent && (
              <div className="border-t border-black/[.07] p-2.5">
                <button
                  onClick={() => approveAndSend(project.id)}
                  disabled={isSending}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFC400] py-2.5 font-brand text-[12px] font-bold uppercase tracking-wide text-black disabled:opacity-50 active:scale-[.98]"
                >
                  {isSending ? <><Loader2 size={14} className="animate-spin"/> Sending…</> : <><Send size={14}/> Approve & Send Bid</>}
                </button>
              </div>
            )}
            {isSent && (
              <div className="flex items-center justify-center gap-1.5 border-t border-emerald-200 bg-emerald-50 py-2 text-[11px] font-bold text-emerald-700">
                <Check size={14}/> Bid Sent
              </div>
            )}
          </Surface>
        );
      })}
    </div>
  );
}