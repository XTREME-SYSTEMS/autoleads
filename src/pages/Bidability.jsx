import React from "react";
import PageHeader from "@/components/common/PageHeader";
import Section from "@/components/common/Section";

const FACTORS = [
  "Trade fit", "Geographic fit", "Project stage", "Document readiness",
  "Relationship strength", "Deadline feasibility", "Margin potential", "Source confidence",
];

export default function Bidability() {
  return (
    <>
      <PageHeader title="Bidability Score" subtitle="Eight independent factors, each with its own evidence. No unexplained AI score." />

      <div className="grid sm:grid-cols-2 gap-4">
        {FACTORS.map((f) => (
          <div key={f} className="rounded-xl border border-black/10 p-4">
            <div className="flex items-baseline gap-2">
              <p className="text-[14px] font-semibold flex-1">{f}</p>
              <span className="text-[20px] font-bold">—</span>
              <span className="text-[12px] text-black/40">/ 100</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.07] mt-3" />
            <p className="text-[12px] text-black/50 mt-3">Evidence Required — factor blocked until a verified opportunity is selected.</p>
          </div>
        ))}
      </div>

      <Section title="Decision" className="mt-6">
        <div className="flex flex-wrap gap-2">
          {["Pursue", "Review", "Decline"].map((d) => (
            <span key={d} className="rounded-md border border-black/15 px-4 py-2 text-[13px] text-black/45">{d}</span>
          ))}
        </div>
        <p className="text-[13px] text-black/50 mt-4">Select a verified opportunity to calculate a decision.</p>
      </Section>
    </>
  );
}