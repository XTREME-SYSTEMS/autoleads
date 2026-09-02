import React from "react";
import { BriefcaseBusiness, Building2, Globe, Image as ImageIcon, Mail, MapPin, Package, Phone, Share2, Shield } from "lucide-react";
import { Card } from "@/components/autoleads/UiPrimitives";
import { Image as SmartImage } from "@/components/ui/image";
import ProposalDocument from "@/components/autoleads/ProposalDocument";

function money(n) { return n != null && !isNaN(n) ? `$${Number(n).toLocaleString()}` : "—"; }

export default function BidPackagePanel({ proposal, project, company, pkg, logoUrl, contractorApp, projectImages, email }) {
  const items = proposal.items || [];
  const images = projectImages || [];
  const app = contractorApp;
  const appUrl = app?.share_slug ? `${window.location.origin}/contractor-app/${app.share_slug}` : null;

  return (
    <div className="space-y-5">
      <Section icon={Mail} title="Email Being Sent">
        <Card className="p-4">
          <div className="border-b border-black/10 pb-2">
            <p className="text-[10px] font-black uppercase text-black/40">To</p>
            <p className="text-sm font-bold">{email?.recipient || "—"}</p>
          </div>
          <div className="border-b border-black/10 py-2">
            <p className="text-[10px] font-black uppercase text-black/40">Subject</p>
            <p className="text-sm font-bold">{email?.subject || "—"}</p>
          </div>
          <div className="pt-3">
            <p className="text-[10px] font-black uppercase text-black/40">Body</p>
            <p className="mt-1 max-h-60 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-black/75">{email?.body || "—"}</p>
          </div>
          {email && !email.real && <p className="mt-3 rounded-lg bg-black/[.02] px-3 py-2 text-[11px] text-black/40">This cover email is generated from the proposal. When you approve and send, it goes out with the bid package attached.</p>}
        </Card>
      </Section>

      {pkg?.company_highlights && (
        <Section icon={Building2} title="Company Highlights">
          <Card className="p-4"><p className="text-sm leading-6 text-black/75">{pkg.company_highlights}</p></Card>
        </Section>
      )}

      {(pkg?.insurance_carrier || pkg?.workers_comp_carrier) && (
        <Section icon={Shield} title="Insurance Information">
          <div className="grid gap-3 sm:grid-cols-2">
            {pkg?.insurance_carrier && (
              <Card className="p-4">
                <p className="text-[10px] font-black uppercase text-black/40">General Liability</p>
                <p className="mt-1 text-sm font-bold">{pkg.insurance_carrier}</p>
                {pkg.insurance_policy_number && <p className="text-xs text-black/50">Policy #{pkg.insurance_policy_number}</p>}
                {pkg.insurance_limit && <p className="text-xs text-black/50">Limit: {pkg.insurance_limit}</p>}
              </Card>
            )}
            {pkg?.workers_comp_carrier && (
              <Card className="p-4">
                <p className="text-[10px] font-black uppercase text-black/40">Workers' Comp</p>
                <p className="mt-1 text-sm font-bold">{pkg.workers_comp_carrier}</p>
                {pkg.workers_comp_policy_number && <p className="text-xs text-black/50">Policy #{pkg.workers_comp_policy_number}</p>}
                {pkg.workers_comp_limit && <p className="text-xs text-black/50">Limit: {pkg.workers_comp_limit}</p>}
              </Card>
            )}
          </div>
        </Section>
      )}

      {(company?.website || company?.phone || company?.email || company?.address) && (
        <Section icon={Globe} title="Website & Contact">
          <Card className="p-4">
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
              {company?.website && <span className="inline-flex items-center gap-1.5"><Globe size={14} className="text-black/40"/>{company.website}</span>}
              {company?.phone && <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-black/40"/>{company.phone}</span>}
              {company?.email && <span className="inline-flex items-center gap-1.5"><Mail size={14} className="text-black/40"/>{company.email}</span>}
              {company?.address && <span className="inline-flex items-center gap-1.5"><MapPin size={14} className="text-black/40"/>{company.address}{company?.city ? `, ${company.city}` : ""}{company?.state ? `, ${company.state}` : ""}</span>}
            </div>
          </Card>
        </Section>
      )}

      {appUrl && (
        <Section icon={Share2} title="Contractor App">
          <Card className="p-4">
            <p className="text-sm text-black/75">Include a link to your contractor app so clients can view your portfolio, services, and contact info.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <a href={appUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black hover:bg-[#f4e431]"><Share2 size={13}/>{appUrl}</a>
              {app?.tagline && <span className="text-xs text-black/50">{app.tagline}</span>}
            </div>
          </Card>
        </Section>
      )}

      {images.length > 0 && (
        <Section icon={ImageIcon} title="Project Images">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.slice(0, 6).map((img, i) => (
              <Card key={i} className="overflow-hidden">
                <SmartImage src={img.image_url || img} alt={img.title || ""} className="h-32 w-full" fittingType="fill" />
                {img.title && <p className="truncate p-2 text-xs font-bold">{img.title}</p>}
              </Card>
            ))}
          </div>
        </Section>
      )}

      {items.length > 0 && (
        <Section icon={Package} title="Pricing & Line Items">
          <Card className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-[10px] font-black uppercase text-black/40">
                    <th className="pb-2 pr-3">Description</th>
                    <th className="pb-2 pr-3 text-right">Qty</th>
                    <th className="pb-2 pr-3">Unit</th>
                    <th className="pb-2 pr-3 text-right">Unit Price</th>
                    <th className="pb-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i} className="border-b border-black/5 last:border-0">
                      <td className="py-2.5 pr-3 font-bold">{it.description || "—"}</td>
                      <td className="py-2.5 pr-3 text-right">{it.quantity ?? "—"}</td>
                      <td className="py-2.5 pr-3 text-black/50">{it.unit || "—"}</td>
                      <td className="py-2.5 pr-3 text-right">{money(it.unit_price)}</td>
                      <td className="py-2.5 text-right font-black">{money((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-black/10">
                    <td colSpan={4} className="pt-3 text-right text-xs font-black uppercase text-black/40">Total Bid</td>
                    <td className="pt-3 text-right text-lg font-black">{money(proposal.total_value)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </Section>
      )}

      {pkg?.job_highlights?.length > 0 && (
        <Section icon={BriefcaseBusiness} title="Selected Past Projects">
          <div className="space-y-2">
            {pkg.job_highlights.slice(0, 4).map((j, i) => (
              <Card key={i} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">{j.title}</p>
                  {j.value != null && <span className="text-sm font-black">{money(j.value)}</span>}
                </div>
                {j.client && <p className="text-xs text-black/50">{j.client}{j.completion_date ? ` · ${new Date(j.completion_date).toLocaleDateString()}` : ""}</p>}
                {j.description && <p className="mt-1 text-xs text-black/60">{j.description}</p>}
              </Card>
            ))}
          </div>
        </Section>
      )}

      {pkg?.custom_sections?.map((s, i) => (
        <Section key={i} icon={Package} title={s.title}>
          <Card className="p-4"><p className="whitespace-pre-wrap text-sm leading-6 text-black/75">{s.content}</p></Card>
        </Section>
      ))}

      <Section icon={Package} title="Finished Proposal Document">
        <ProposalDocument proposal={proposal} project={project} company={company} pkg={pkg} logoUrl={logoUrl} />
      </Section>
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