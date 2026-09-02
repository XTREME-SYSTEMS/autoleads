import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Link2, Loader2, Mail, Zap } from "lucide-react";
import { Card, Page } from "@/components/autoleads/UiPrimitives";
import GmailConnect from "@/components/autoleads/GmailConnect";
import CalendarConnect from "@/components/autoleads/CalendarConnect";

const CONNECTORS = [
  { name: "Google Drive", id: "googledrive", icon: Link2, scopes: "drive.readonly" },
  { name: "Google Calendar", id: "googlecalendar", icon: Zap, scopes: "calendar events" },
  { name: "Gmail", id: "gmail", icon: Mail, scopes: "gmail send" },
  { name: "Google Sheets", id: "googlesheets", icon: Link2, scopes: "sheets" },
  { name: "Google Docs", id: "googledocs", icon: Link2, scopes: "docs" },
  { name: "Google Tasks", id: "googletasks", icon: CheckCircle2, scopes: "tasks" },
  { name: "HubSpot", id: "hubspot", icon: Zap, scopes: "crm" },
  { name: "Supabase", id: "supabase", icon: Zap, scopes: "database" },
];

export default function IntegrationSettings() {
  const [sources, setSources] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.ScrapeSource.list('-created_date', 50)
      .then(s => setSources(s || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Page title="Integrations" description="Connect approved Base44 connectors and verify scopes before activation.">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Workspace Connectors</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONNECTORS.map(c => (
          <Card key={c.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><c.icon size={20} /></span>
                <div><p className="font-black">{c.name}</p><p className="text-xs text-black/40">{c.scopes}</p></div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-700">Registered</span>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="mb-3 mt-6 text-sm font-black uppercase tracking-wide text-black/40">Your Google Connections</h2>
      <p className="mb-4 text-sm text-black/50">Connect your own Gmail and Calendar so AUTOLEADS can sync your inbox, send bids, and track deadlines on your behalf.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <GmailConnect />
        <CalendarConnect />
      </div>

      <h2 className="mb-3 mt-6 text-sm font-black uppercase tracking-wide text-black/40">Scrape Sources</h2>
      {loading ? <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-[#f2df0d]" /></div> : sources.length === 0 ? (
        <Card className="p-8 text-center text-sm text-black/40">No scrape sources configured yet.</Card>
      ) : (
        <Card className="divide-y divide-black/5">
          {sources.map(s => (
            <div key={s.id} className="flex items-center justify-between p-4">
              <div className="min-w-0"><p className="truncate text-sm font-bold">{s.name}</p><p className="truncate text-xs text-black/40">{s.url || 'No URL'}</p></div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${s.status === 'active' ? 'bg-emerald-100 text-emerald-700' : s.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{s.status}</span>
            </div>
          ))}
        </Card>
      )}
    </Page>
  );
}