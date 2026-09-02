import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Sparkles, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Card, Field, Page, PrimaryButton, SecondaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import MobileSelect from "@/components/autoleads/MobileSelect";
import { TRADES } from "@/lib/geoData";
import { useToast } from "@/components/ui/use-toast";
import { useOrgId } from "@/hooks/useOrgContext";

const STAGES = ["qualification", "takeoff", "estimating", "proposal", "submitted", "won", "lost"];

export default function NewLead() {
  const nav = useNavigate();
  const { toast } = useToast();
  const orgId = useOrgId();
  const [saving, setSaving] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [form, setForm] = useState({
    title: "", authority: "", bid_due_date: "", jurisdiction: "", trade: "", stage: "qualification", scope: "", source_url: "",
    client_name: "", contract_info: "", address: "", value: ""
  });
  const [pasteText, setPasteText] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    const missing = [];
    if (!form.title.trim()) missing.push("Project name");
    if (!form.scope.trim()) missing.push("Scope summary");
    if (!form.source_url.trim()) missing.push("Source URL");
    if (!form.jurisdiction.trim()) missing.push("Jurisdiction");
    if (!form.authority.trim()) missing.push("Company / agency");
    if (!form.trade.trim()) missing.push("Trade");
    if (!form.client_name.trim()) missing.push("Client name");
    if (!form.contract_info.trim()) missing.push("Contact info");
    if (!form.address.trim()) missing.push("Address");
    if (missing.length) {
      toast({ title: "Required fields missing", description: missing.join(", "), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await base44.entities.Project.create({
        organization_id: orgId,
        title: form.title.trim(),
        authority: form.authority,
        bid_due_date: form.bid_due_date || null,
        jurisdiction: form.jurisdiction,
        trade: form.trade,
        stage: form.stage,
        description: form.scope,
        specs: form.scope,
        source_url: form.source_url,
        client_name: form.client_name,
        contract_info: form.contract_info,
        address: form.address,
        value: form.value ? parseFloat(form.value) : null,
        verification_status: "unverified",
      });
      toast({ title: "Project created", description: "Opening project detail." });
      nav(`/projects/${created.id}`);
    } catch (e) {
      toast({ title: "Failed to create project", description: e?.message || "try again", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const extract = async () => {
    if (!pasteText.trim()) return;
    setExtracting(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Extract structured project fields from this bid invitation / project notice text. Return JSON with: title, authority (owner/agency), jurisdiction (city, state), bid_due_date (YYYY-MM-DD or null), trade (one of: ${TRADES.join(", ")}), scope (2-3 sentence scope summary), source_url (if a URL appears in the text, else null), client_name (owner/client name), contract_info (contact name, email, phone, address), address (project site address), value (numeric project value or null). Only use information present in the text.\n\nTEXT:\n${pasteText}`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" }, authority: { type: "string" }, jurisdiction: { type: "string" },
            bid_due_date: { type: "string" }, trade: { type: "string" }, scope: { type: "string" }, source_url: { type: "string" },
            client_name: { type: "string" }, contract_info: { type: "string" }, address: { type: "string" }, value: { type: "number" }
          }
        }
      });
      setForm((f) => ({
        ...f,
        title: res?.title || f.title,
        authority: res?.authority || f.authority,
        jurisdiction: res?.jurisdiction || f.jurisdiction,
        bid_due_date: res?.bid_due_date || f.bid_due_date,
        trade: TRADES.includes(res?.trade) ? res.trade : f.trade,
        scope: res?.scope || f.scope,
        source_url: res?.source_url || f.source_url,
        client_name: res?.client_name || f.client_name,
        contract_info: res?.contract_info || f.contract_info,
        address: res?.address || f.address,
        value: res?.value ? String(res.value) : f.value,
      }));
      toast({ title: "Fields extracted", description: "Review and save the project." });
    } catch {
      toast({ title: "Extraction failed", variant: "destructive" });
    } finally { setExtracting(false); }
  };

  return (
    <Page backTo="/leads" eyebrow="Auto Leads" title="Create Project" description="Add a project manually or paste a bid invitation for AI field extraction. Projects are marked unverified until their source is checked."
      actions={<>
        <SecondaryButton onClick={extract} disabled={extracting || !pasteText.trim()}>
          {extracting ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}Extract Fields
        </SecondaryButton>
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>}Save Project
        </PrimaryButton>
      </>}>
      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card className="grid gap-4 p-5 md:grid-cols-2">
          <Field label="Project name"><input className={inputClass} value={form.title} onChange={set("title")} placeholder="e.g. City Hall Renovation"/></Field>
          <Field label="Source URL"><input className={inputClass} value={form.source_url} onChange={set("source_url")} placeholder="https://…"/></Field>
          <Field label="Company / agency"><input className={inputClass} value={form.authority} onChange={set("authority")} placeholder="Owner / authority"/></Field>
          <Field label="Bid due date"><input type="date" className={inputClass} value={form.bid_due_date} onChange={set("bid_due_date")}/></Field>
          <Field label="Jurisdiction"><input className={inputClass} value={form.jurisdiction} onChange={set("jurisdiction")} placeholder="City, State"/></Field>
          <Field label="Trade">
            <MobileSelect className={inputClass} value={form.trade} onChange={v => setForm(f => ({ ...f, trade: v }))}>
              <option value="">Select trade…</option>
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </MobileSelect>
          </Field>
          <Field label="Project stage">
            <MobileSelect className={inputClass} value={form.stage} onChange={v => setForm(f => ({ ...f, stage: v }))}>
              {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </MobileSelect>
          </Field>
          <Field label="Client name"><input className={inputClass} value={form.client_name} onChange={set("client_name")} placeholder="Owner / client name"/></Field>
          <Field label="Project value"><input type="number" className={inputClass} value={form.value} onChange={set("value")} placeholder="0.00"/></Field>
          <Field label="Address"><input className={inputClass} value={form.address} onChange={set("address")} placeholder="Project site address"/></Field>
          <div className="md:col-span-2">
            <Field label="Contact info"><textarea className={`${inputClass} h-20 py-3`} value={form.contract_info} onChange={set("contract_info")} placeholder="Contact name, email, phone, address…"/></Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Scope summary"><textarea className={`${inputClass} h-32 py-3`} value={form.scope} onChange={set("scope")} placeholder="Scope of work…"/></Field>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-black">AI Field Extraction</h2>
          <p className="mt-2 text-sm leading-6 text-black/50">Paste a bid invitation, URL, or project notice. The AI extracts structured fields — nothing is marked verified until its source is reviewed.</p>
          <textarea className={`${inputClass} mt-5 h-52 py-3`} placeholder="Paste source text…" value={pasteText} onChange={(e) => setPasteText(e.target.value)}/>
          <PrimaryButton onClick={extract} disabled={extracting || !pasteText.trim()} className="mt-4 w-full">
            {extracting ? <Loader2 size={16} className="animate-spin"/> : <Sparkles size={16}/>}Extract Fields
          </PrimaryButton>
        </Card>
      </div>
    </Page>
  );
}