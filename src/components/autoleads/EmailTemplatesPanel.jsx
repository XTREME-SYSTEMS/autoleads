import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, PrimaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import MobileSelect from "@/components/autoleads/MobileSelect";
import { Mail, Plus, Trash2, Loader2 } from "lucide-react";

const PURPOSES = ["follow_up", "outreach", "bid_response", "introduction", "reminder", "thank_you", "custom"];

export default function EmailTemplatesPanel() {
  const [templates, setTemplates] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", subject: "", body: "", purpose: "follow_up" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const list = await base44.entities.EmailTemplate.list(); setTemplates(list || []); } catch { setTemplates([]); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await base44.entities.EmailTemplate.create({ name: form.name, subject: form.subject, body: form.body, purpose: form.purpose });
      setForm({ name: "", subject: "", body: "", purpose: "follow_up" });
      setShowForm(false);
      load();
    } catch (err) { alert("Save failed: " + (err?.message || "try again")); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    try { await base44.entities.EmailTemplate.delete(id); load(); } catch {}
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-black"><Mail size={18} className="text-[#b0a209]" />Email Templates</h2>
        <button onClick={() => setShowForm(s => !s)} className="inline-flex items-center gap-1 rounded-lg bg-[#f2df0d] px-3 py-1.5 text-xs font-black text-black"><Plus size={14} />New</button>
      </div>
      {showForm && (
        <form onSubmit={create} className="mt-4 space-y-2 rounded-lg border border-black/10 p-3">
          <input className={inputClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Template name" required />
          <input className={inputClass} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Subject" required />
          <textarea className={`${inputClass} min-h-24`} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Email body…" required />
          <MobileSelect className={inputClass} value={form.purpose} onChange={v => setForm(f => ({ ...f, purpose: v }))}>
            {PURPOSES.map(p => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
          </MobileSelect>
          <PrimaryButton type="submit" disabled={saving} className="w-full">{saving ? <><Loader2 size={14} className="animate-spin" />Saving…</> : "Save Template"}</PrimaryButton>
        </form>
      )}
      <div className="mt-4 space-y-2">
        {loading ? <p className="text-sm text-black/40">Loading…</p> :
          templates.length === 0 ? <p className="text-sm text-black/40">No templates yet. Create your first one.</p> :
          templates.map(t => (
            <div key={t.id} className="flex items-start gap-2 rounded-lg border border-black/10 p-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{t.name}</p>
                <p className="truncate text-xs text-black/50">{t.subject}</p>
                <span className="text-[10px] font-black uppercase text-[#b0a209]">{(t.purpose || "custom").replace("_", " ")}</span>
              </div>
              <button onClick={() => remove(t.id)} className="text-black/30 hover:text-red-500"><Trash2 size={15} /></button>
            </div>
          ))}
      </div>
    </Card>
  );
}