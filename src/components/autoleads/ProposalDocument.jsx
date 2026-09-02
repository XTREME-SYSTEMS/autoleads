import React from "react";
import { CheckCircle2, Globe, Mail, MapPin, Phone } from "lucide-react";

function money(n) { return n != null && !isNaN(n) ? `$${Number(n).toLocaleString()}` : "—"; }

export default function ProposalDocument({ proposal, project, company, pkg, logoUrl }) {
  const items = proposal.items || [];
  const computedTotal = items.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const total = proposal.total_value != null ? proposal.total_value : computedTotal;
  const companyName = company?.name || pkg?.company_name || "Your Company";
  const today = new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
      {/* Letterhead */}
      <div className="border-b-4 border-[#f2df0d] bg-white px-8 py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {logoUrl && <img src={logoUrl} alt={`${companyName} logo`} className="max-h-16 w-auto object-contain" />}
            <div>
              <h1 className="text-2xl font-black tracking-tight">{companyName}</h1>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-black uppercase tracking-[.18em] text-[#cebe0b]">Proposal</p>
            <p className="mt-1 text-xs text-black/50">{today}</p>
          </div>
        </div>
        {(company?.address || company?.website || company?.phone) && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-black/50">
            {company?.address && <span className="inline-flex items-center gap-1"><MapPin size={11}/>{company.address}{company?.city ? `, ${company.city}` : ""}{company?.state ? `, ${company.state}` : ""}</span>}
            {company?.phone && <span className="inline-flex items-center gap-1"><Phone size={11}/>{company.phone}</span>}
            {company?.email && <span className="inline-flex items-center gap-1"><Mail size={11}/>{company.email}</span>}
            {company?.website && <span className="inline-flex items-center gap-1"><Globe size={11}/>{company.website}</span>}
          </div>
        )}
      </div>

      <div className="px-8 py-6">
        {/* Recipient + project */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-black/40">Prepared For</p>
            <p className="mt-1 text-base font-black">{proposal.client_name || project?.client_name || "—"}</p>
            {project?.authority && <p className="text-sm text-black/55">{project.authority}</p>}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-black/40">Project</p>
            <p className="mt-1 text-base font-black">{project?.title || proposal.title}</p>
            {project?.jurisdiction && <p className="text-sm text-black/55">{project.jurisdiction}</p>}
            {project?.bid_due_date && <p className="text-sm font-bold text-[#a09308]">Bid Due: {new Date(project.bid_due_date).toLocaleDateString()}</p>}
          </div>
        </div>

        {/* Scope / description */}
        {project?.specs && (
          <div className="mt-6">
            <p className="text-[11px] font-black uppercase tracking-wide text-black/40">Scope of Work</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-black/75">{project.specs}</p>
          </div>
        )}

        {/* Line items */}
        <div className="mt-6">
          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-black/40">Pricing</p>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-black/15 p-4 text-sm text-black/40">No line items — total is a lump-sum bid.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-black/10 text-left text-[11px] font-black uppercase text-black/40">
                    <th className="pb-2 pr-3">Description</th>
                    <th className="pb-2 pr-3 text-right">Qty</th>
                    <th className="pb-2 pr-3">Unit</th>
                    <th className="pb-2 pr-3 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-black/5">
                      <td className="py-2.5 pr-3 font-bold">{it.description}</td>
                      <td className="py-2.5 pr-3 text-right">{it.quantity}</td>
                      <td className="py-2.5 pr-3">{it.unit}</td>
                      <td className="py-2.5 pr-3 text-right">{money(it.unit_price)}</td>
                      <td className="py-2.5 text-right font-black">{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between rounded-lg bg-[#fdfbe1] px-4 py-3">
            <span className="text-sm font-black uppercase tracking-wide text-black/60">Total Bid</span>
            <span className="text-2xl font-black">{money(total)}</span>
          </div>
        </div>

        {/* Company highlights */}
        {(pkg?.company_highlights || company?.website) && (
          <div className="mt-6">
            <p className="text-[11px] font-black uppercase tracking-wide text-black/40">Why {companyName}</p>
            <p className="mt-1 text-sm leading-6 text-black/75">{pkg?.company_highlights || `${companyName} is a trusted contractor delivering quality workmanship on time and on budget.`}</p>
          </div>
        )}

        {/* Insurance */}
        {pkg?.insurance_carrier && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-black/10 p-3">
              <p className="text-[11px] font-black uppercase tracking-wide text-black/40">General Liability</p>
              <p className="mt-1 text-sm font-bold">{pkg.insurance_carrier}</p>
              {pkg.insurance_policy_number && <p className="text-xs text-black/50">Policy #{pkg.insurance_policy_number}</p>}
              {pkg.insurance_limit && <p className="text-xs text-black/50">Limit: {pkg.insurance_limit}</p>}
            </div>
            {pkg?.workers_comp_carrier && (
              <div className="rounded-lg border border-black/10 p-3">
                <p className="text-[11px] font-black uppercase tracking-wide text-black/40">Workers' Comp</p>
                <p className="mt-1 text-sm font-bold">{pkg.workers_comp_carrier}</p>
                {pkg.workers_comp_policy_number && <p className="text-xs text-black/50">Policy #{pkg.workers_comp_policy_number}</p>}
                {pkg.workers_comp_limit && <p className="text-xs text-black/50">Limit: {pkg.workers_comp_limit}</p>}
              </div>
            )}
          </div>
        )}

        {/* Job highlights */}
        {pkg?.job_highlights?.length > 0 && (
          <div className="mt-6">
            <p className="text-[11px] font-black uppercase tracking-wide text-black/40">Selected Projects</p>
            <div className="mt-2 space-y-2">
              {pkg.job_highlights.slice(0, 4).map((j, i) => (
                <div key={i} className="rounded-lg border border-black/10 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold">{j.title}</p>
                    {j.value != null && <span className="text-sm font-black">{money(j.value)}</span>}
                  </div>
                  {j.client && <p className="text-xs text-black/50">{j.client}{j.completion_date ? ` · ${new Date(j.completion_date).toLocaleDateString()}` : ""}</p>}
                  {j.description && <p className="mt-1 text-xs text-black/60">{j.description}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom sections */}
        {pkg?.custom_sections?.map((s, i) => (
          <div key={i} className="mt-6">
            <p className="text-[11px] font-black uppercase tracking-wide text-black/40">{s.title}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-black/75">{s.content}</p>
          </div>
        ))}

        {/* Closing */}
        <div className="mt-8 rounded-lg bg-black/[.02] p-4 text-center">
          <p className="text-sm font-bold">Thank you for the opportunity to bid on this project.</p>
          <p className="mt-1 text-xs text-black/50">We're available to answer any questions and look forward to working with you.</p>
          <div className="mt-3 flex items-center justify-center gap-1 text-xs font-black text-emerald-600"><CheckCircle2 size={13}/> Proposal valid for 30 days</div>
        </div>
      </div>
    </div>
  );
}