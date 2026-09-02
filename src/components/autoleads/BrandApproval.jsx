import React from "react";
import { X, Check, Image as ImageIcon, FileText, Mail } from "lucide-react";
import HtmlPreview from "./HtmlPreview";

export default function BrandApproval({ open, onClose, logo, designOptions, selectedDesign, onSelectDesign, bulkEmailTemplates }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-black/10 px-6 py-4">
          <div>
            <h2 className="text-xl font-black">Brand Approval Center</h2>
            <p className="text-xs text-black/50">Review your logo, proposal designs, and email templates all in one place</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-black/5"><X size={20} /></button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto p-6">
          <div className="space-y-10">
            {/* Logo */}
            {logo && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><ImageIcon size={18} /></span> Company Logo</h3>
                <div className="rounded-xl border border-black/10 bg-white p-8 text-center">
                  <img src={logo} className="mx-auto max-h-32 object-contain" alt="Company logo" />
                </div>
              </section>
            )}

            {/* Proposals */}
            {designOptions.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><FileText size={18} /></span> Proposal Designs ({designOptions.length})</h3>
                <div className="space-y-4">
                  {designOptions.map((d) => (
                    <div key={d.key} className={`rounded-xl border-2 p-4 transition ${selectedDesign === d.key ? "border-[#f2df0d] bg-[#fdfbe1]" : "border-black/10 bg-white"}`}>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-base font-black">{d.name}</span>
                        {selectedDesign === d.key ? (
                          <span className="flex items-center gap-1 text-sm font-black text-[#b0a209]"><Check size={16} /> Selected</span>
                        ) : (
                          <button onClick={() => onSelectDesign(d)} className="rounded-lg bg-[#f2df0d] px-4 py-2 text-sm font-black text-black hover:bg-[#f4e431]">Use this design</button>
                        )}
                      </div>
                      <HtmlPreview html={d.content} minHeight={500} className="rounded-lg border border-black/10" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Emails */}
            {bulkEmailTemplates.length > 0 && (
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-black"><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Mail size={18} /></span> Email Templates ({bulkEmailTemplates.length})</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {bulkEmailTemplates.map((t, i) => (
                    <div key={i} className="rounded-xl border border-black/10 bg-white p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-black">{t.purposeLabel}</span>
                        <span className="rounded-full bg-[#fcf9cf] px-2 py-0.5 text-[10px] font-black text-[#b0a209]">{t.purpose}</span>
                      </div>
                      <p className="mb-2 text-xs font-bold text-black/60">{t.subject}</p>
                      <HtmlPreview html={t.body} minHeight={300} className="rounded-lg border border-black/10" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(!logo && designOptions.length === 0 && bulkEmailTemplates.length === 0) && (
              <div className="py-20 text-center text-sm text-black/40">No branding assets generated yet. Generate proposal designs or email templates first.</div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end border-t border-black/10 px-6 py-4">
          <button onClick={onClose} className="rounded-lg bg-[#f2df0d] px-6 py-2.5 text-sm font-black text-black hover:bg-[#f4e431]">Done Reviewing</button>
        </div>
      </div>
    </div>
  );
}