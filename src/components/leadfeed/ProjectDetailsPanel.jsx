import React from "react";
import { Building2, CalendarDays, FileText, MapPin, Phone, Mail, Users, DollarSign, ClipboardList, Link2, AlertCircle, ShieldCheck, Ruler } from "lucide-react";
import { money, fmtDate } from "@/components/CommercialMobileUI";

export default function ProjectDetailsPanel({ project }) {
  const docs = Array.isArray(project.documents) ? project.documents : [];
  return (
    <div className="space-y-3 border-t border-black/[.06] bg-black/[.015] p-4">
      {/* Description */}
      {project.description && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-black/40"><FileText size={11}/> Project Description</p>
          <p className="text-sm leading-5 text-black/70">{project.description}</p>
        </div>
      )}

      {/* Specs */}
      {project.specs && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-black/40"><ClipboardList size={11}/> Specifications / Scope of Work</p>
          <p className="whitespace-pre-wrap text-sm leading-5 text-black/70">{project.specs}</p>
        </div>
      )}

      {/* Contract / Contact Info */}
      {project.contract_info && (
        <div className="rounded-lg border border-black/10 bg-white p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-black/40"><Users size={11}/> Contract Contact Information</p>
          <p className="whitespace-pre-wrap text-sm leading-5 text-black/75">{project.contract_info}</p>
        </div>
      )}

 {/* Key Details Grid */}
      <div className="grid grid-cols-2 gap-2">
        <DetailRow icon={Building2} label="Client" value={project.client_name} />
        <DetailRow icon={Users} label="Authority" value={project.authority} />
        <DetailRow icon={MapPin} label="Address" value={project.address} />
        <DetailRow icon={DollarSign} label="Project Value" value={project.value ? money(project.value) : null} accent />
        <DetailRow icon={CalendarDays} label="Bid Due" value={project.bid_due_date ? fmtDate(project.bid_due_date) : null} />
        <DetailRow icon={CalendarDays} label="Pre-Bid Meeting" value={project.prebid_meeting_date ? fmtDate(project.prebid_meeting_date) : null} />
        <DetailRow icon={Ruler} label="Trade" value={project.trade} />
        <DetailRow icon={ShieldCheck} label="Verification" value={project.verification_status} />
      </div>

      {/* Validation Gaps */}
      {project.validation_gaps && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5">
          <p className="mb-0.5 flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-700"><AlertCircle size={11}/> Missing Information</p>
          <p className="text-xs text-amber-800">{project.validation_gaps}</p>
        </div>
      )}

      {/* Document Links */}
      {(project.plans_url || project.addenda_url || docs.length > 0) && (
        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide text-black/40"><Link2 size={11}/> Project Documents</p>
          <div className="space-y-1.5">
            {project.plans_url && <DocLink label="Plans / Drawings" url={project.plans_url} />}
            {project.addenda_url && <DocLink label="Addenda / Clarifications" url={project.addenda_url} />}
            {docs.map((d, i) => <DocLink key={i} label={d.name || d.type || "Document"} url={d.url} type={d.type} />)}
          </div>
        </div>
      )}

      {/* Source URL */}
      {project.source_url && (
        <div>
          <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-black/40">Source</p>
          <a href={project.source_url} target="_blank" rel="noopener noreferrer" className="block truncate text-xs font-semibold text-[#D99D00] underline">{project.source_url}</a>
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon: Icon, label, value, accent }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-black/[.06] bg-white p-2">
      <Icon size={13} className="mt-0.5 shrink-0 text-black/40" />
      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase tracking-wide text-black/40">{label}</p>
        <p className={`truncate text-xs font-semibold ${accent ? "text-[#E9A900]" : "text-black/75"}`}>{String(value)}</p>
      </div>
    </div>
  );
}

function DocLink({ label, url, type }) {
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-lg border border-black/10 bg-white p-2.5 text-left">
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#FFF7DA] text-black"><FileText size={15}/></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-black">{label}</p>
        {type && <p className="text-[10px] font-bold uppercase text-black/40">{type}</p>}
      </div>
      <Link2 size={15} className="shrink-0 text-[#D99D00]"/>
    </a>
  );
}