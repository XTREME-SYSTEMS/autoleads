import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mail, Loader2 } from "lucide-react";

// Renders the branded email template that will be sent to the client.
// Uses the shared buildBrandedBidEmail function via the sendEmail backend
// function to generate the exact HTML the client will receive.

export default function EmailTemplatePreview({ proposal, project }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!proposal || !project) return;
      setLoading(true);
      try {
        // Fetch company profile and brand assets for the email template
        const [companies, brandAssets, projectImages] = await Promise.all([
          base44.entities.CompanyProfile.filter({ organization_id: project.organization_id }).catch(() => []),
          base44.entities.BrandAsset.filter({ organization_id: project.organization_id }).catch(() => []),
          base44.entities.ProjectImage.filter({ project_id: project.id }).catch(() => []),
        ]);
        const company = companies[0] || {};
        const logo = (brandAssets || []).find(b => b.type === "logo" && b.file_url) || null;
        const appUrl = window.location.origin;

        // Build the branded email HTML using the same function the backend uses
        // We'll inline the buildBrandedBidEmail logic here since it's a shared util
        const logoHtml = logo?.file_url
          ? `<img src="${logo.file_url}" alt="${company.name || "Company"}" style="max-height:80px;max-width:200px;margin-bottom:20px;"/>`
          : `<h1 style="font-size:28px;font-weight:900;color:#080808;margin:0 0 20px;">${company.name || "AUTOLEADS"}</h1>`;

        const showcaseHtml = (projectImages || []).slice(0, 4).map(img =>
          `<img src="${img.file_url || img.url}" style="width:100%;max-width:280px;border-radius:8px;margin:4px;display:inline-block;"/>`
        ).join("");

        const contactEmail = company.email || "";
        const contactPhone = company.phone || "";

        const emailHtml = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f5f5f5;font-family:Inter,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:20px;">
  <div style="text-align:center;padding:30px 20px;background:#fff;border-radius:12px 12px 0 0;">
    ${logoHtml}
  </div>
  <div style="background:#fff;padding:0 30px 30px;border-radius:0 0 12px 12px;">
    <p style="font-size:16px;color:#080808;">Dear ${proposal?.client_name || project?.client_name || "Valued Client"},</p>
    <p style="font-size:15px;line-height:1.6;color:#333;">
      Thank you for the opportunity to submit a proposal for <strong>${project?.title || "your project"}</strong>.
      ${company.name || "Our team"} is a licensed and insured ${company.trade || "construction"} contractor
      serving ${company.city || ""}${company.city && company.state ? ", " : ""}${company.state || ""}.
      We take pride in delivering quality workmanship on every project.
    </p>
    <div style="background:#FFF7DA;border-radius:8px;padding:20px;margin:20px 0;">
      <p style="font-size:14px;font-weight:bold;color:#080808;margin:0 0 10px;text-transform:uppercase;">Project Summary</p>
      <table style="width:100%;font-size:14px;color:#333;">
        <tr><td style="padding:4px 0;color:#666;">Project:</td><td style="padding:4px 0;font-weight:bold;">${project?.title || "N/A"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Location:</td><td style="padding:4px 0;font-weight:bold;">${project?.jurisdiction || project?.address || "N/A"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Bid Value:</td><td style="padding:4px 0;font-weight:bold;color:#E9A900;">${proposal?.total_value ? "$" + Number(proposal.total_value).toLocaleString() : project?.value ? "$" + Number(project.value).toLocaleString() : "TBD"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Bid Due:</td><td style="padding:4px 0;font-weight:bold;">${project?.bid_due_date ? new Date(project.bid_due_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "N/A"}</td></tr>
        <tr><td style="padding:4px 0;color:#666;">Trade:</td><td style="padding:4px 0;font-weight:bold;">${project?.trade || company.trade || "N/A"}</td></tr>
      </table>
    </div>
    <p style="font-size:14px;font-weight:bold;color:#080808;margin:20px 0 8px;">Why Choose ${company.name || "Us"}:</p>
    <ul style="font-size:14px;color:#333;padding-left:20px;line-height:1.8;">
      <li>Licensed & Insured ${company.trade || "Contractor"}${company.license_number ? ` (Lic#${company.license_number})` : ""}</li>
      <li>${company.bonding_capacity ? `Bonding capacity up to $${Number(company.bonding_capacity).toLocaleString()}` : "Bonded & Insured"}</li>
      <li>Proven track record of quality workmanship and on-time delivery</li>
      <li>Professional team committed to your project's success</li>
    </ul>
    ${showcaseHtml ? `<p style="font-size:14px;font-weight:bold;color:#080808;margin:20px 0 8px;">Our Recent Work:</p><div style="text-align:center;margin-bottom:20px;">${showcaseHtml}</div>` : ""}
    <div style="text-align:center;margin:30px 0;">
      <a href="${appUrl}/proposals/${proposal?.id || ""}" style="display:inline-block;padding:16px 40px;background:#FFC400;color:#080808;text-decoration:none;font-weight:bold;font-size:16px;border-radius:8px;">View Full Bid Package →</a>
    </div>
    <p style="font-size:15px;line-height:1.6;color:#333;">
      We are available to answer any questions and can schedule a site visit at your convenience.
      Please don't hesitate to reach out.
    </p>
  </div>
  <div style="background:#080808;padding:25px 30px;border-radius:12px;margin-top:20px;text-align:center;">
    <p style="font-size:18px;font-weight:bold;color:#FFC400;margin:0 0 10px;">${company.name || "AUTOLEADS"}</p>
    <div style="font-size:14px;color:#fff;line-height:1.8;">
      ${contactPhone ? `<a href="tel:${contactPhone}" style="color:#FFC400;text-decoration:none;">📞 ${contactPhone}</a> &nbsp;|&nbsp; ` : ""}
      ${contactEmail ? `<a href="mailto:${contactEmail}" style="color:#FFC400;text-decoration:none;">✉️ ${contactEmail}</a>` : ""}
      ${company.website ? `<br/><a href="${company.website}" style="color:#FFC400;text-decoration:none;">🌐 ${company.website}</a>` : ""}
    </div>
    <p style="font-size:11px;color:#666;margin:15px 0 0;">${company.license_number ? `Licensed #${company.license_number} &nbsp;|&nbsp; ` : ""}Bonded & Insured</p>
  </div>
  <p style="text-align:center;font-size:11px;color:#999;margin-top:15px;">Sent via AUTOLEADS — Autonomous Preconstruction Operating System</p>
</div>
</body></html>`;

        setHtml(emailHtml);
      } catch (err) {
        setHtml(`<p style="padding:20px;color:#999;">Could not load email template: ${err?.message || "error"}</p>`);
      } finally {
        setLoading(false);
      }
    })();
  }, [proposal?.id, project?.id]);

  if (loading) {
    return (
      <div className="grid min-h-[400px] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f2df0d]" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-lg bg-[#FFF7DA] px-4 py-3">
        <Mail size={16} className="text-[#D99D00]" />
        <p className="text-sm font-bold text-black/70">
          This is the branded email the client will receive when you send the bid.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-black/10 shadow-sm">
        <iframe
          srcDoc={html}
          title="Email Preview"
          className="h-[600px] w-full border-0"
          sandbox="allow-same-origin"
        />
      </div>
    </div>
  );
}