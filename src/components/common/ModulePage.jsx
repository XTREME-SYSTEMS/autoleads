import React from "react";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import Section from "./Section";

export default function ModulePage({ title = "", subtitle = "", requirements = [], emptyTitle = "Import Required", emptyDescription = "" }) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <EmptyState title={emptyTitle || "Import Required"} description={emptyDescription} />
      {requirements.length > 0 && (
        <Section title="Required evidence and provenance" className="mt-6">
          <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2">
            {requirements.map((r) => (
              <li key={r} className="text-[13px] text-black/60 flex gap-2">
                <span className="text-black/25">—</span>
                {r}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}