import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, Database, FileSearch } from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";

export default function ModuleShell({ title, eyebrow = "AUTOLEADS", description, actions = [], children = null, backTo = "/settings" }) {
  return (
    <main className="min-h-full bg-white rounded-2xl border border-black/5 overflow-hidden">
      <div className="px-5 md:px-8 pt-5"><BackButton to={backTo} /></div>
      <section className="border-b border-black/10 bg-[#F8F9FA] px-5 md:px-8 py-7">
        <div className="text-[10px] font-black tracking-[0.24em] text-[#938808]">{eyebrow}</div>
        <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-[-0.035em] text-[#0D0D0D]">{title}</h1>
        <p className="mt-3 max-w-3xl text-sm md:text-base leading-relaxed text-black/55">{description}</p>
        {actions.length > 0 && <div className="mt-6 flex flex-wrap gap-3">{actions.map((action) => (
          <Link key={action.label} to={action.to || "#"} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-bold ${action.primary ? "bg-[#f2df0d] text-black" : "border border-black/15 bg-white text-black"}`}>
            {action.label}<ArrowRight className="h-4 w-4" />
          </Link>
        ))}</div>}
      </section>
      <section className="p-5 md:p-8">
        {children || <div className="grid gap-4 md:grid-cols-3">
          {/** @type {[React.ComponentType<any>,string,string][]} */ ([
            [FileSearch, "Ready to begin", "No verified records have been loaded into this workspace yet."],
            [Database, "Evidence first", "Every project, contractor, quantity, and price must retain source provenance."],
            [Bot, "Governed AI", "AUTOLEADS drafts and analyzes. Approval gates control external or destructive actions."],
          ]).map(([Icon, heading, body]) => <div key={heading} className="rounded-2xl border border-black/10 p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-[#f2df0d]"><Icon className="h-5 w-5" /></span>
            <h2 className="mt-4 font-black text-black">{heading}</h2><p className="mt-2 text-sm leading-relaxed text-black/50">{body}</p>
          </div>)}
        </div>}
      </section>
    </main>
  );
}