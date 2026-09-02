import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, PrimaryButton, inputClass } from "@/components/autoleads/UiPrimitives";
import { Send, Loader2, Check } from "lucide-react";

const CHANNELS = ["email", "sms", "portal", "whatsapp", "other"];

export default function MessageCreator() {
  const [form, setForm] = useState({ recipient: "", subject: "", body: "", channel: "email" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await base44.entities.Message.create({
        subject: form.subject || "(no subject)",
        body: form.body,
        recipient: form.recipient,
        channel: form.channel,
        direction: "outbound",
        status: "draft",
      });
      setForm({ recipient: "", subject: "", body: "", channel: "email" });
      setSaved(true);
    } catch (err) { alert("Save failed: " + (err?.message || "try again")); }
    finally { setSaving(false); }
  };

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-black"><Send size={18} className="text-[#b0a209]" />Message Creator</h2>
      <p className="mt-1 text-sm text-black/50">Compose a message and save it as a draft. Saved drafts appear in your Messages inbox.</p>
      <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label><span className="mb-1 block text-xs font-black">Recipient</span><input className={inputClass} value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} placeholder="name or email" /></label>
        <label><span className="mb-1 block text-xs font-black">Channel</span>
          <select className={inputClass} value={form.channel} onChange={e => setForm(f => ({ ...f, channel: e.target.value }))}>
            {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black">Subject</span><input className={inputClass} value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></label>
        <label className="sm:col-span-2"><span className="mb-1 block text-xs font-black">Message</span><textarea className={`${inputClass} min-h-28`} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Type your message…" /></label>
        <div className="sm:col-span-2 flex items-center gap-3">
          <PrimaryButton type="submit" disabled={saving}>{saving ? <><Loader2 size={16} className="animate-spin" />Saving…</> : <><Send size={16} />Save Draft</>}</PrimaryButton>
          {saved && <span className="flex items-center gap-1 text-sm font-bold text-emerald-600"><Check size={16} />Saved as draft</span>}
        </div>
      </form>
    </Card>
  );
}