import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { Card } from "@/components/autoleads/UiPrimitives";

const TESTS = [
  { key: 'pipeline', label: 'Full Pipeline (scrape → verify → takeoff → estimate → proposal)', fn: () => base44.functions.invoke('runFullPipeline', {}), check: r => r?.success === true, extract: r => `verified=${r.verified} takeoffs=${r.takeoffs} estimates=${r.estimates} proposals=${r.proposals}` },
  { key: 'scrape', label: 'Auto Scrape Discovery', fn: () => base44.functions.invoke('runAutoScrape', {}), check: r => r && typeof r === 'object', extract: r => `created=${r?.created ?? r?.found ?? 0} sources` },
  { key: 'proposals', label: 'Auto Proposal Generation', fn: () => base44.functions.invoke('autoProposals', { limit: 5 }), check: r => r && typeof r === 'object', extract: r => `created=${r?.created ?? 0} proposals` },
];

export default function PipelineTest() {
  const [results, setResults] = useState(/** @type {any} */ ({}));
  const [running, setRunning] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setResults({});
    for (const t of TESTS) {
      setResults(r => ({ ...r, [t.key]: { status: 'running' } }));
      try {
        const res = await t.fn();
        const passed = t.check(res);
        setResults(r => ({ ...r, [t.key]: { status: passed ? 'pass' : 'fail', detail: t.extract(res), raw: res } }));
      } catch (e) {
        setResults(r => ({ ...r, [t.key]: { status: 'fail', detail: e?.message || 'Error' } }));
      }
    }
    setRunning(false);
  };

  const runOne = async (t) => {
    setResults(r => ({ ...r, [t.key]: { status: 'running' } }));
    try {
      const res = await t.fn();
      const passed = t.check(res);
      setResults(r => ({ ...r, [t.key]: { status: passed ? 'pass' : 'fail', detail: t.extract(res) } }));
    } catch (e) {
      setResults(r => ({ ...r, [t.key]: { status: 'fail', detail: e?.message || 'Error' } }));
    }
  };

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black uppercase tracking-wide text-black/40">Automated Pipeline Tests</h2>
          <p className="mt-1 text-xs text-black/50">Invokes backend functions directly and verifies the response shape.</p>
        </div>
        <button onClick={runAll} disabled={running} className="inline-flex items-center gap-2 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-sm font-black text-black transition hover:bg-[#f4e431] disabled:opacity-50">
          {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}Run All
        </button>
      </div>
      <div className="space-y-2">
        {TESTS.map(t => {
          const r = results[t.key];
          return (
            <div key={t.key} className="flex items-center justify-between rounded-lg border border-black/10 p-3">
              <div className="flex items-center gap-3 min-w-0">
                {r?.status === 'pass' ? <CheckCircle2 size={18} className="shrink-0 text-emerald-600" /> : r?.status === 'fail' ? <XCircle size={18} className="shrink-0 text-red-500" /> : r?.status === 'running' ? <Loader2 size={18} className="shrink-0 animate-spin text-[#f2df0d]" /> : <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-2 border-black/15" />}
                <div className="min-w-0"><p className="truncate text-sm font-bold">{t.label}</p>{r?.detail && <p className="truncate text-xs text-black/40">{r.detail}</p>}</div>
              </div>
              <button onClick={() => runOne(t)} disabled={r?.status === 'running'} className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-bold hover:bg-black/[.02] disabled:opacity-50">Run</button>
            </div>
          );
        })}
      </div>
    </Card>
  );
}