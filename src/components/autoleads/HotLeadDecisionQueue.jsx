import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, SectionTitle, PrimaryButton, SecondaryButton } from "@/components/autoleads/UiPrimitives";
import { Zap, MapPin, Target, FileText, DollarSign, Calendar, ChevronDown, ChevronUp } from "lucide-react";

const PASS_REASONS = [
  "wrong_trade", "outside_practical_range", "project_too_small", "project_too_large",
  "deadline_too_close", "documents_insufficient", "capacity_conflict",
  "client_mismatch", "margin_concern", "not_interested", "other",
];

export default function HotLeadDecisionQueue({ hotLeads = [], onUpdate }) {
  const [expanded, setExpanded] = useState(null);
  const [processing, setProcessing] = useState(null);
  const [passReason, setPassReason] = useState({});
  const [showPassReason, setShowPassReason] = useState({});

  const handleDecision = async (matchId, decision, reason = null) => {
    setProcessing(matchId + decision);
    try {
      const updates = { pursue_decision: decision };
      if (decision === "pass" && reason) {
        updates.suppression_reason = reason;
        updates.suppressed = true;
      }
      await base44.entities.OrganizationOpportunityMatch.update(matchId, updates);
      if (onUpdate) await onUpdate();
    } catch (e) {
      console.error(e);
    } finally {
      setProcessing(null);
    }
  };

  if (hotLeads.length === 0) {
    return (
      <Card className="p-5">
        <SectionTitle title="Hot Lead Decision Queue" />
        <div className="grid place-items-center p-8 text-center">
          <Zap size={32} className="text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">No hot leads pending operator review.</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-[#f2df0d]/30">
      <div className="mb-4 flex items-center gap-2">
        <Zap size={18} className="text-[#b0a209]" />
        <h3 className="text-sm font-black uppercase tracking-wider">Hot Lead Decision Queue</h3>
        <span className="text-xs text-muted-foreground">{hotLeads.length} pending operator review · AI does NOT auto-decide</span>
      </div>

      <div className="space-y-3">
        {hotLeads.map((lead, idx) => {
          const isExpanded = expanded === idx;
          const decided = lead.pursue_decision && lead.pursue_decision !== "undecided";
          return (
            <div key={idx} className={`rounded-lg border p-4 ${decided ? "border-muted bg-muted/30" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black truncate">{lead.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin size={10} />{lead.jurisdiction || "—"}</span>
                    <span className="flex items-center gap-1"><Target size={10} />{lead.trade || "—"}</span>
                    <span className="flex items-center gap-1"><DollarSign size={10} />{lead.value ? `$${Number(lead.value).toLocaleString()}` : "—"}</span>
                    <span className="flex items-center gap-1"><Calendar size={10} />{lead.bid_due_date || "—"}</span>
                  </div>
                </div>
                {decided && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${lead.pursue_decision === "pursue" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                    {lead.pursue_decision.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Why It Matched */}
              {isExpanded && (
                <div className="mt-3 space-y-2 border-t border-border pt-3">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Why It Matched</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-muted-foreground">Location:</span> <b>{lead.location_eligibility || "—"}</b></div>
                    <div><span className="text-muted-foreground">Bidability:</span> <b>{lead.bidability_score || "—"}/100</b></div>
                    <div><span className="text-muted-foreground">Authority:</span> <b>{lead.authority || "—"}</b></div>
                    <div><span className="text-muted-foreground">Deadline:</span> <b>{lead.bid_due_date || "—"}</b></div>
                  </div>

                  {!decided && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PrimaryButton
                        onClick={() => handleDecision(lead.match_id, "pursue")}
                        disabled={processing === lead.match_id + "pursue"}
                        className="text-xs"
                      >Pursue</PrimaryButton>
                      <SecondaryButton
                        onClick={() => setShowPassReason({ ...showPassReason, [idx]: !showPassReason[idx] })}
                        className="text-xs"
                      >Pass</SecondaryButton>
                      <SecondaryButton
                        onClick={() => handleDecision(lead.match_id, "pursue")}
                        disabled={processing === lead.match_id + "pursue"}
                        className="text-xs"
                      >Deep Verify</SecondaryButton>
                    </div>
                  )}

                  {/* Pass reason capture */}
                  {showPassReason[idx] && !decided && (
                    <div className="mt-2 rounded-lg bg-muted p-3">
                      <p className="mb-2 text-[10px] font-black uppercase text-muted-foreground">Pass Reason (product-learning evidence)</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PASS_REASONS.map(r => (
                          <button
                            key={r}
                            onClick={() => setPassReason({ ...passReason, [idx]: r })}
                            className={`rounded-lg px-2 py-1 text-[10px] font-black transition ${passReason[idx] === r ? "bg-red-100 text-red-700 border border-red-300" : "border border-border bg-background hover:bg-muted"}`}
                          >
                            {r.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                      {passReason[idx] && (
                        <PrimaryButton
                          onClick={() => handleDecision(lead.match_id, "pass", passReason[idx])}
                          disabled={processing === lead.match_id + "pass"}
                          className="mt-2 text-xs"
                        >Confirm Pass: {passReason[idx].replace(/_/g, " ")}</PrimaryButton>
                      )}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setExpanded(isExpanded ? null : idx)}
                className="mt-2 flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {isExpanded ? "Hide details" : "Show details & decide"}
              </button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}