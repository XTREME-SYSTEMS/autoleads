import React from "react";
import { Building2, CalendarClock, CheckCircle2, ClipboardList, DollarSign, ExternalLink, FileText, MapPin, ShieldCheck } from "lucide-react";
import { Card } from "@/components/autoleads/UiPrimitives";

function money(n) { return n != null && !isNaN(n) ? `$${Number(n).toLocaleString()}` : "—"; }
function fmtDate(d) { try { return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch { return "—"; } }

export default function ProjectOpportunityPanel({ project, proposal }) {
  const p = project || {};
  return (
    <div className="space-y-5">
      {p.description && (
        <Section icon={FileText} title="Project Description">
          <Card className="p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-black/75">{p.description}</p></Card>
        </Section>
      )}

      {p.specs && (
        <Section icon={ClipboardList} title="Scope of Work / Specs">
          <Card className="p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-black/75">{p.specs}</p></Card>
        </Section>
      )}

      <Section icon={Building2} title="Project Information">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Project Type" value={p.project_type || "—"} />
          <InfoCard label="Trade" value={p.trade || "—"} />
          <InfoCard label="Jurisdiction" value={p.jurisdiction || "—"} icon={MapPin} />
          <InfoCard label="Address" value={p.address || "—"} icon={MapPin} />
          <InfoCard label="Bid Due Date" value={p.bid_due_date ? fmtDate(p.bid_due_date) : "—"} icon={CalendarClock} />
          <InfoCard label="Estimated Value" value={money(p.value)} icon={DollarSign} />
        </div>
      </Section>

      <Section icon={ShieldCheck} title="Contractor & Owner Information">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoCard label="Client / Owner" value={p.client_name || "—"} />
          <InfoCard label="Authority" value={p.authority || "—"} />
          <InfoCard label="Contract Info" value={p.contract_info || "—"} />
        </div>
      </Section>

      {p.source_url && (
        <Section icon={ExternalLink} title="Source & Plans">
          <Card className="p-4">
            <p className="text-sm text-black/75">View the original source and download plans and documents:</p>
            <a href={p.source_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black hover:bg-[#f4e431]"><ExternalLink size={13}/>Open Source & Get Plans</a>
          </Card>
        </Section>
      )}

      <Section icon={CheckCircle2} title="Verification & Scores">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <InfoCard label="Verification" value={(p.verification_status || "unverified").replace("_", " ")} />
          <InfoCard label="Verified Date" value={p.verified_date ? fmtDate(p.verified_date) : "—"} />
          <InfoCard label="Confidence" value={p.confidence != null ? `${Math.round(p.confidence * 100)}%` : "—"} />
          <InfoCard label="Bidability" value={p.bidability_score != null ? `${Math.round(p.bidability_score)}/100` : "—"} />
        </div>
      </Section>

      {proposal && (
        <Section icon={DollarSign} title="Linked Proposal">
          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-black">{proposal.title}</p>
                <p className="text-xs text-black/50">Status: {(proposal.status || "").replace("_", " ")}</p>
              </div>
              <span className="text-2xl font-black">{money(proposal.total_value)}</span>
            </div>
          </Card>
        </Section>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Icon size={15}/></span>
        <h3 className="text-sm font-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoCard({ label, value, icon: Icon = null }) {
  return (
    <Card className="p-3">
      <p className="text-[10px] font-black uppercase text-black/40">{label}</p>
      <p className="mt-1 flex items-start gap-1.5 text-sm font-bold">
        {Icon && <Icon size={14} className="mt-0.5 shrink-0 text-black/40"/>}
        <span className="break-words">{value}</span>
      </p>
    </Card>
  );
}