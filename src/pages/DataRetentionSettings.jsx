import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Archive, Loader2, Save } from "lucide-react";
import { Card, Page, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import { useToast } from "@/components/ui/use-toast";

export default function DataRetentionSettings() {
  const { toast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.AutomationConfig.list('-created_date', 1)
      .then(r => setConfig(r?.[0] || null))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (config?.id) await base44.entities.AutomationConfig.update(config.id, { notification_frequency: config.notification_frequency });
      toast({ title: "Retention settings saved" });
    } catch { toast({ title: "Save failed", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-[#f2df0d]" /></div>;

  return (
    <Page title="Data Retention" description="Configure how long records are kept before automatic archival or deletion.">
      <Card className="p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Archive size={20} /></span>
          <div>
            <p className="font-black">Retention Policy</p>
            <p className="mt-1 text-sm text-black/50">Projects, proposals, and takeoffs are retained indefinitely by default. Lost or declined records are archived after 90 days. Scrape source logs are pruned after 30 days.</p>
          </div>
        </div>
      </Card>

      <Card className="mt-5 p-5">
        <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Notification Frequency</h2>
        <div className="flex flex-wrap gap-2">
          {['realtime','daily','weekly'].map(f => (
            <button key={f} onClick={() => setConfig(c => ({ ...c, notification_frequency: f }))}
              className={`rounded-lg border px-4 py-2.5 text-sm font-bold transition ${config?.notification_frequency === f ? 'border-[#f2df0d] bg-[#f2df0d] text-black' : 'border-black/15 bg-white hover:bg-black/[.02]'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <PrimaryButton onClick={save} disabled={saving || !config}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}Save Settings</PrimaryButton>
        </div>
      </Card>
    </Page>
  );
}