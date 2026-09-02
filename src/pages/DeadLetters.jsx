import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { AlertOctagon, Loader2, Mail, Radar } from "lucide-react";
import { Card, EmptyState, Page } from "@/components/autoleads/UiPrimitives";

export default function DeadLetters() {
  const [messages, setMessages] = useState(/** @type {any[]} */ ([]));
  const [sources, setSources] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Message.filter({ status: 'failed' }).catch(() => []),
      base44.entities.ScrapeSource.filter({ status: 'error' }).catch(() => []),
    ]).then(([m, s]) => { setMessages(m || []); setSources(s || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-[#f2df0d]" /></div>;

  return (
    <Page title="Dead Letters" description="Failed messages and errored scrape sources that need manual review or retry.">
      <div className="grid gap-5 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Failed Messages ({messages.length})</h2>
          {messages.length === 0 ? <Card><EmptyState icon={Mail} title="No failed messages" description="All messages have been delivered successfully." /></Card> : (
            <Card className="divide-y divide-black/5">
              {messages.map(m => (
                <div key={m.id} className="p-4">
                  <div className="flex items-center justify-between"><p className="text-sm font-bold">{m.subject}</p><AlertOctagon size={15} className="text-red-500" /></div>
                  <p className="mt-1 truncate text-xs text-black/40">{m.body?.slice(0, 100) || 'No body'}</p>
                  <p className="mt-1 text-[10px] text-black/30">To: {m.recipient || '—'} · {m.channel}</p>
                </div>
              ))}
            </Card>
          )}
        </div>
        <div>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/40">Errored Sources ({sources.length})</h2>
          {sources.length === 0 ? <Card><EmptyState icon={Radar} title="No errored sources" description="All scrape sources are healthy." /></Card> : (
            <Card className="divide-y divide-black/5">
              {sources.map(s => (
                <div key={s.id} className="p-4">
                  <div className="flex items-center justify-between"><p className="text-sm font-bold">{s.name}</p><AlertOctagon size={15} className="text-red-500" /></div>
                  <p className="mt-1 truncate text-xs text-black/40">{s.last_error || 'Unknown error'}</p>
                  <p className="mt-1 text-[10px] text-black/30">{s.url || 'No URL'} · {s.error_count || 0} errors</p>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}