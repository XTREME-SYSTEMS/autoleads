import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Page, PrimaryButton, SecondaryButton, Card, EmptyState, Field, inputClass } from "@/components/autoleads/UiPrimitives";
import MobileSelect from "@/components/autoleads/MobileSelect";
import { Mail, Loader2, Sparkles, Trash2, Check, X, Send } from "lucide-react";
import { useOrgId } from "@/hooks/useOrgContext";

const PURPOSES = [
  { value: "follow_up", label: "Follow-up" },
  { value: "outreach", label: "Cold Outreach" },
  { value: "bid_response", label: "Bid Response" },
  { value: "introduction", label: "Introduction" },
  { value: "reminder", label: "Reminder" },
  { value: "thank_you", label: "Thank You" },
  { value: "custom", label: "Custom" },
];

export default function EmailTemplateCreator() {
  const orgId = useOrgId();
  const [templates, setTemplates] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("follow_up");
  const [trigger, setTrigger] = useState("");
  const [generating, setGenerating] = useState(false);
  const [draft, setDraft] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const recs = await base44.entities.EmailTemplate.filter({ organization_id: orgId }, "-created_date", 50);
      setTemplates(recs || []);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!trigger.trim() || generating) return;
    setGenerating(true);
    setDraft(null);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert construction business development writer. Create a professional email template for the following purpose: ${purpose}. Context/trigger: ${trigger}. Write a subject line and email body. Use [Client Name], [Project], [Company Name] as placeholders where appropriate. Keep it concise, professional, and action-oriented. Return JSON with "subject" and "body" fields.`,
        response_json_schema: { type: "object", properties: { subject: { type: "string" }, body: { type: "string" } } }
      });
      const data = typeof res === "string" ? JSON.parse(res) : res;
      setDraft({ subject: data.subject || "", body: data.body || "" });
    } catch (e) { alert("Generation failed: " + (e?.message || "try again")); }
    finally { setGenerating(false); }
  };

  const saveDraft = async (approvalStatus = "pending") => {
    if (!draft || !name.trim()) { alert("Add a template name first"); return; }
    try {
      await base44.entities.EmailTemplate.create({
        organization_id: orgId,
        name: name.trim(),
        subject: draft.subject,
        body: draft.body,
        purpose,
        trigger_description: trigger,
        ai_generated: true,
        approval_status: approvalStatus
      });
      setDraft(null); setName(""); setTrigger("");
      await load();
    } catch (e) { alert("Save failed: " + (e?.message || "try again")); }
  };

  const approve = async (id) => {
    try { await base44.entities.EmailTemplate.update(id, { approval_status: "approved" }); await load(); }
    catch { alert("Could not approve"); }
  };
  const reject = async (id) => {
    try { await base44.entities.EmailTemplate.update(id, { approval_status: "rejected" }); await load(); }
    catch { alert("Could not reject"); }
  };
  const toggleAuto = async (t) => {
    try { await base44.entities.EmailTemplate.update(t.id, { auto_send: !t.auto_send }); await load(); }
    catch { alert("Could not update"); }
  };
  const remove = async (id) => {
    if (!confirm("Delete this template?")) return;
    try { await base44.entities.EmailTemplate.delete(id); await load(); }
    catch { alert("Could not delete"); }
  };

  return (
    <Page backTo="/dashboard" title="Email Template Creator" eyebrow="Email Automation"
      description="AI generates email templates for your review. Approve templates to enable automated sending, or create your own from scratch.">
      <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black"><Sparkles size={18} className="text-[#b0a209]"/>Generate with AI</h2>
          <div className="mt-4 space-y-3">
            <Field label="Template name">
              <input className={inputClass} value={name} onChange={e=>setName(e.target.value)} placeholder="Post-bid follow-up"/>
            </Field>
            <Field label="Purpose">
              <MobileSelect className={inputClass} value={purpose} onChange={v=>setPurpose(v)}>
                {PURPOSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </MobileSelect>
            </Field>
            <Field label="When should this send? / Context" hint="Describe the trigger or scenario for this email">
              <textarea className={inputClass + " min-h-[80px]"} value={trigger} onChange={e=>setTrigger(e.target.value)} placeholder="Send 2 days after submitting a bid if no response received"/>
            </Field>
            <PrimaryButton onClick={generate} disabled={generating || !trigger.trim()} className="w-full">
              {generating ? <><Loader2 size={16} className="animate-spin"/>Generating…</> : <><Sparkles size={16}/>Generate Template</>}
            </PrimaryButton>
          </div>

          {draft && (
            <div className="mt-5 rounded-xl border border-[#f2df0d] bg-[#fdfbe1] p-4">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#b0a209]">AI Draft — Review & Save</p>
              <Field label="Subject"><input className={inputClass} value={draft.subject} onChange={e=>setDraft({...draft, subject: e.target.value})}/></Field>
              <p className="mb-2 mt-3 text-xs font-black">Body</p>
              <textarea className={inputClass + " min-h-[200px]"} value={draft.body} onChange={e=>setDraft({...draft, body: e.target.value})}/>
              <div className="mt-3 flex gap-2">
                <PrimaryButton onClick={()=>saveDraft("approved")}><Check size={16}/>Save & Approve</PrimaryButton>
                <SecondaryButton onClick={()=>saveDraft("pending")}>Save as Draft</SecondaryButton>
                <SecondaryButton onClick={()=>setDraft(null)}><X size={16}/>Discard</SecondaryButton>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="font-black">Saved Templates</h2>
          <p className="mt-1 text-sm text-black/50">Approve templates to enable automation. Toggle auto-send to let AI send without manual review.</p>
          {loading ? (
            <div className="mt-8 flex items-center justify-center gap-2 text-sm text-black/50"><Loader2 className="animate-spin"/>Loading…</div>
          ) : templates.length === 0 ? (
            <div className="mt-6"><EmptyState icon={Mail} title="No templates yet" description="Generate one with AI to get started."/></div>
          ) : (
            <div className="mt-5 space-y-3">
              {templates.map(t => (
                <div key={t.id} className="rounded-xl border border-black/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold">{t.name}</p>
                      <p className="truncate text-xs text-black/50">{t.subject}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${t.approval_status==="approved"?"bg-green-100 text-green-700":t.approval_status==="rejected"?"bg-red-100 text-red-700":"bg-amber-100 text-amber-700"}`}>{t.approval_status}</span>
                  </div>
                  {t.ai_generated && <span className="mt-1 inline-block rounded bg-[#fcf9cf] px-1.5 py-0.5 text-[10px] font-bold text-[#b0a209]">AI</span>}
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    {t.approval_status !== "approved" && <button onClick={()=>approve(t.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-green-50 text-green-600 hover:bg-green-100" title="Approve"><Check size={15}/></button>}
                    {t.approval_status !== "rejected" && <button onClick={()=>reject(t.id)} className="grid h-8 w-8 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Reject"><X size={15}/></button>}
                    <button onClick={()=>toggleAuto(t)} className={`flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold ${t.auto_send?"bg-[#f2df0d] text-black":"bg-black/5 text-black/50"}`} title="Toggle auto-send"><Send size={13}/>Auto</button>
                    <button onClick={()=>remove(t.id)} className="grid h-8 w-8 place-items-center rounded-lg text-red-500 hover:bg-red-50" title="Delete"><Trash2 size={15}/></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}