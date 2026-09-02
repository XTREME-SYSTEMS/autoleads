import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Mail, Save, Send } from "lucide-react";
import { Card, Page, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import { useToast } from "@/components/ui/use-toast";
import { useOrgId } from "@/hooks/useOrgContext";

export default function OutreachSettings() {
  const { toast } = useToast();
  const orgId = useOrgId();
  const [templates, setTemplates] = useState(/** @type {any[]} */ ([]));
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      base44.entities.EmailTemplate.filter({ organization_id: orgId }, '-created_date', 50).catch(() => []),
      base44.entities.AutomationConfig.filter({ organization_id: orgId }, '-created_date', 1).catch(() => []),
    ]).then(([t, c]) => { setTemplates(t || []); setConfig(c?.[0] || null); })
      .finally(() => setLoading(false));
  }, [orgId]);

  const toggleAutoSend = async (id, val) => {
    try { await base44.entities.EmailTemplate.update(id, { auto_send: val }); 
      setTemplates(ts => ts.map(t => t.id === id ? { ...t, auto_send: val } : t));
    } catch { toast({ title: "Update failed", variant: "destructive" }); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (config?.id) await base44.entities.AutomationConfig.update(config.id, { auto_outreach: config.auto_outreach });
      toast({ title: "Outreach settings saved" });
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-[#f2df0d]" /></div>;

  return (
    <Page title="Outreach Settings" description="Configure automated outreach behavior, email template auto-send rules, and approval thresholds.">
      <Card className="p-5">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Outreach Automation Mode</h2>
        <div className="flex flex-wrap gap-2">
          {['auto','review','manual'].map(m => (
            <button key={m} onClick={() => setConfig(c => ({ ...c, auto_outreach: m }))}
              className={`rounded-lg border px-4 py-2.5 text-sm font-bold transition ${config?.auto_outreach === m ? 'border-[#f2df0d] bg-[#f2df0d] text-black' : 'border-black/15 bg-white hover:bg-black/[.02]'}`}>
              {m === 'auto' ? 'Full Auto' : m === 'review' ? 'Review First' : 'Manual Only'}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-black/40">{config?.auto_outreach === 'auto' ? 'Outreach emails send automatically using approved templates.' : config?.auto_outreach === 'review' ? 'Outreach emails are drafted for your review before sending.' : 'All outreach must be manually composed and sent.'}</p>
        <div className="mt-4"><PrimaryButton onClick={saveConfig} disabled={saving || !config}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save Mode</PrimaryButton></div>
      </Card>

      <h2 className="mb-3 mt-6 text-sm font-black uppercase tracking-wide text-black/40">Email Templates ({templates.length})</h2>
      {templates.length === 0 ? <Card className="p-8 text-center text-sm text-black/40">No email templates yet. Create one in Email Template Creator.</Card> : (
        <Card className="divide-y divide-black/5">
          {templates.map(t => (
            <div key={t.id} className="flex items-center justify-between p-4">
              <div className="min-w-0 flex items-center gap-3">
                <Mail size={18} className="shrink-0 text-black/40" />
                <div className="min-w-0"><p className="truncate text-sm font-bold">{t.name}</p><p className="truncate text-xs text-black/40">{t.subject}</p></div>
              </div>
              <button onClick={() => toggleAutoSend(t.id, !t.auto_send)} className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-black uppercase transition ${t.auto_send ? 'bg-emerald-100 text-emerald-700' : 'bg-black/5 text-black/50'}`}>
                <Send size={11} />{t.auto_send ? 'Auto-Send' : 'Manual'}
              </button>
            </div>
          ))}
        </Card>
      )}
    </Page>
  );
}