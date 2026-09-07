import React from "react";
import { FileText, Calendar, MapPin, User, DollarSign, Shield } from "lucide-react";

// Full bid package document preview — shows the proposal as a professional
// document with cover letter, scope of work, detailed line items, terms,
// and signature block. This is what the client sees when they receive the bid.

export default function BidPackagePreview({ proposal, project, company, takeoffs = [] }) {
  if (!proposal) return null;

  const items = proposal.items || [];
  const total = proposal.total_value || items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const proposalNumber = `PROP-${String(proposal.version || 1).padStart(3, "0")}`;

  // Build scope of work from project specs and takeoffs
  const scopeOfWork = project?.specs || project?.description || "";
  const takeoffDetails = takeoffs.map(t => 
    `• ${t.scope || t.system_code || "Scope"}: ${t.final_quantity || t.raw_quantity || 0} ${t.unit || ""}${t.spec_evidence ? ` — ${t.spec_evidence}` : ""}`
  ).join("\n");

  return (
    <div className="mx-auto max-w-4xl rounded-xl border border-black/10 bg-white p-8 shadow-sm sm:p-12">
      {/* Letterhead */}
      <div className="flex items-start justify-between border-b-2 border-[#f2df0d] pb-6">
        <div>
          {proposal.logo_url ? (
            <img src={proposal.logo_url} alt="Company logo" className="mb-3 max-h-20 w-auto object-contain" />
          ) : (
            <h1 className="text-2xl font-black">{company?.name || "AUTOLEADS"}</h1>
          )}
          <p className="mt-1 text-sm text-black/60">
            {company?.trade || "Licensed Contractor"}
            {company?.license_number ? ` · Lic#${company.license_number}` : ""}
          </p>
          <p className="text-sm text-black/60">
            {company?.city || ""}{company?.city && company?.state ? ", " : ""}{company?.state || ""}
            {company?.phone ? ` · ${company.phone}` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-black uppercase tracking-wide text-black/40">Proposal</p>
          <p className="text-lg font-black">{proposalNumber}</p>
          <p className="mt-1 text-xs text-black/50">{today}</p>
          {project?.bid_due_date && (
            <p className="mt-1 text-xs font-bold text-red-600">
              Bid Due: {new Date(project.bid_due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      {/* Cover Letter */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[#D99D00]">Cover Letter</h2>
        {proposal.cover_letter ? (
          <div className="whitespace-pre-wrap text-sm leading-7 text-black/75">{proposal.cover_letter}</div>
        ) : (
          <>
            <p className="text-sm leading-7 text-black/75">
              Dear {proposal.client_name || project?.client_name || "Valued Client"},
            </p>
            <p className="mt-2 text-sm leading-7 text-black/75">
              Thank you for the opportunity to submit a proposal for <strong>{proposal.title || project?.title}</strong>.
              {" "}{company?.name || "Our team"} is a licensed and insured {company?.trade || "construction"} contractor
              {" "}serving {company?.city || ""}{company?.city && company?.state ? ", " : ""}{company?.state || ""}.
              We have reviewed the project requirements and specifications and are pleased to submit our bid for your consideration.
            </p>
            <p className="mt-2 text-sm leading-7 text-black/75">
              Our proposal includes all labor, materials, equipment, and supervision necessary to complete the work
              described in the scope below. We are committed to delivering quality workmanship on schedule and within budget.
            </p>
          </>
        )}
      </div>

      {/* Project Information */}
      <div className="mt-6 rounded-lg bg-[#FFF7DA] p-5">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[#080808]">Project Information</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs font-bold uppercase text-black/40">Project</p>
            <p className="font-bold">{project?.title || proposal.title}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-black/40">Location</p>
            <p className="font-bold">{project?.jurisdiction || project?.address || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-black/40">Client / Authority</p>
            <p className="font-bold">{proposal.client_name || project?.authority || project?.client_name || "N/A"}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase text-black/40">Trade</p>
            <p className="font-bold">{project?.trade || company?.trade || "N/A"}</p>
          </div>
          {project?.square_footage && (
            <div>
              <p className="text-xs font-bold uppercase text-black/40">Square Footage</p>
              <p className="font-bold">{Number(project.square_footage).toLocaleString()} SF</p>
            </div>
          )}
          {project?.floor_finish && (
            <div>
              <p className="text-xs font-bold uppercase text-black/40">Floor Finish</p>
              <p className="font-bold">{project.floor_finish}</p>
            </div>
          )}
        </div>
      </div>

      {/* Scope of Work */}
      {(proposal.scope_of_work || scopeOfWork || takeoffDetails) && (
        <div className="mt-6">
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[#D99D00]">Scope of Work</h2>
          {proposal.scope_of_work ? (
            <div className="whitespace-pre-wrap text-sm leading-7 text-black/75">{proposal.scope_of_work}</div>
          ) : scopeOfWork ? (
            <p className="whitespace-pre-wrap text-sm leading-7 text-black/75">{scopeOfWork}</p>
          ) : null}
          {takeoffDetails && (
            <div className="mt-3">
              <p className="text-xs font-bold uppercase text-black/40">Measured Quantities (from takeoff):</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm leading-6 text-black/70">{takeoffDetails}</pre>
            </div>
          )}
        </div>
      )}

      {/* Line Items */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[#D99D00]">Bid Pricing</h2>
        {items.length === 0 ? (
          <p className="text-sm text-black/40">No line items on this proposal.</p>
        ) : (
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-black/20 text-left text-xs font-black uppercase text-black/50">
                <th className="py-2 pr-3">#</th>
                <th className="py-2 pr-3">Description</th>
                <th className="py-2 pr-3 text-right">Qty</th>
                <th className="py-2 pr-3">Unit</th>
                <th className="py-2 pr-3 text-right">Unit Price</th>
                <th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} className="border-b border-black/10">
                  <td className="py-3 pr-3 text-black/40">{i + 1}</td>
                  <td className="py-3 pr-3">
                    <p className="font-bold">{it.description}</p>
                    {it.source && <span className="text-[10px] text-black/40">{it.source.replace(/_/g, " ")}</span>}
                  </td>
                  <td className="py-3 pr-3 text-right">{Number(it.quantity || 0).toLocaleString()}</td>
                  <td className="py-3 pr-3 text-black/60">{it.unit}</td>
                  <td className="py-3 pr-3 text-right">${Number(it.unit_price || 0).toLocaleString()}</td>
                  <td className="py-3 text-right font-black">${Number((it.quantity || 0) * (it.unit_price || 0)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-black/20">
                <td colSpan={5} className="py-3 text-right text-sm font-black uppercase">Total Bid:</td>
                <td className="py-3 text-right text-xl font-black text-[#D99D00]">${Number(total).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Terms and Conditions */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-[#D99D00]">Terms & Conditions</h2>
        <div className="space-y-2 text-sm leading-6 text-black/70">
          <p><strong>1. Validity:</strong> This proposal is valid for 30 days from the date above.</p>
          <p><strong>2. Payment:</strong> Payment is due Net 30 upon completion of work, unless otherwise agreed. A deposit may be required prior to commencement.</p>
          <p><strong>3. Schedule:</strong> Work will commence upon acceptance and site availability. Estimated completion time will be provided upon contract execution.</p>
          <p><strong>4. Warranty:</strong> All work is guaranteed against defects in workmanship for a period of one (1) year from completion, unless otherwise specified.</p>
          <p><strong>5. Changes:</strong> Any changes to the scope of work will be handled via change order and may affect the total price and schedule.</p>
          <p><strong>6. Permits:</strong> Unless otherwise noted, permits and fees are the responsibility of the owner.</p>
          <p><strong>7. Insurance:</strong> {company?.name || "Contractor"} carries general liability and workers' compensation insurance. Certificates available upon request.</p>
        </div>
      </div>

      {/* Acceptance Block */}
      <div className="mt-8 rounded-lg border-2 border-black/10 p-5">
        <p className="text-sm font-bold">Acceptance of Proposal</p>
        <p className="mt-1 text-xs text-black/50">By signing below, the client accepts this proposal and authorizes {company?.name || "the contractor"} to proceed with the work described.</p>
        <div className="mt-4 grid grid-cols-2 gap-6">
          <div>
            <div className="border-b border-black/30 pb-8" />
            <p className="mt-1 text-xs font-bold">Client Signature</p>
            <p className="text-xs text-black/50">Date: _______________</p>
          </div>
          <div>
            <div className="border-b border-black/30 pb-8" />
            <p className="mt-1 text-xs font-bold">{company?.name || "Contractor"} Signature</p>
            <p className="text-xs text-black/50">Date: _______________</p>
          </div>
        </div>
      </div>

      {/* Contact Footer */}
      <div className="mt-6 rounded-lg bg-[#080808] p-5 text-center">
        <p className="text-lg font-black text-[#f2df0d]">{company?.name || "AUTOLEADS"}</p>
        <div className="mt-1 text-sm text-white/80">
          {company?.phone && <span>📞 {company.phone}</span>}
          {company?.phone && company?.email && <span className="mx-2">|</span>}
          {company?.email && <span>✉️ {company.email}</span>}
          {company?.website && <span className="mx-2">|</span>}
          {company?.website && <span>🌐 {company.website}</span>}
        </div>
        <p className="mt-2 text-xs text-white/40">
          {company?.license_number ? `Licensed #${company.license_number} | ` : ""}Bonded & Insured
        </p>
      </div>
    </div>
  );
}