import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ClipboardCopy, Check, Play, Search, Zap, BookOpen, Layers,
  ArrowRight, Sparkles,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { PROMPT_CATEGORIES, ALL_PROMPTS, PROMPT_COUNT, CATEGORY_COUNT } from "@/lib/promptLibrary";

export default function PromptLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState('all');
  const [copiedId, setCopiedId] = useState(null);
  const [running, setRunning] = useState({});
  const [runResult, setRunResult] = useState(null);

  const filteredPrompts = useMemo(() => {
    let prompts = ALL_PROMPTS;
    if (activeCategory !== 'all') prompts = prompts.filter(p => p.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      prompts = prompts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q)
      );
    }
    return prompts;
  }, [search, activeCategory]);

  const copy = (p) => {
    navigator.clipboard?.writeText(p.prompt);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const invoke = async (p) => {
    if (!p.invokeFn) { copy(p); return; }
    setRunning(r => ({ ...r, [p.id]: true }));
    setRunResult(null);
    try {
      const res = await base44.functions.invoke(p.invokeFn, {});
      setRunResult({ fn: p.title, ok: true, data: res });
    } catch (e) {
      setRunResult({ fn: p.title, ok: false, error: e?.message || 'failed' });
    } finally {
      setRunning(r => ({ ...r, [p.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="sticky top-0 z-30 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#0b0b0b] text-[#f2df0d]"><BookOpen size={22} /></span>
            <div>
              <h1 className="text-xl font-black">Prompt Library</h1>
              <p className="text-xs text-black/50">{PROMPT_COUNT} prompts across {CATEGORY_COUNT} categories — invoke maximum system capability</p>
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => navigate('/capability-matrix')} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
                <Layers size={14} /> Capability Matrix
              </button>
              <button onClick={() => navigate('/system-test-suite')} className="flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-3 py-2 text-xs font-black">
                <Zap size={14} /> Test Suite
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        {/* Search */}
        <div className="mb-5 flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search prompts..."
              className="h-11 w-full rounded-lg border border-black/15 pl-10 pr-4 text-sm outline-none focus:border-[#f2df0d]"
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCategory('all')}
            className={`rounded-full px-3 py-1.5 text-xs font-bold ${activeCategory === 'all' ? 'bg-[#0b0b0b] text-white' : 'border border-black/15 text-black/60 hover:bg-black/5'}`}
          >
            All ({ALL_PROMPTS.length})
          </button>
          {PROMPT_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${activeCategory === cat.id ? 'text-white' : 'border border-black/15 text-black/60 hover:bg-black/5'}`}
              style={activeCategory === cat.id ? { background: cat.color } : {}}
            >
              <span>{cat.icon}</span> {cat.label} ({cat.prompts.length})
            </button>
          ))}
        </div>

        {/* Run result */}
        {runResult && (
          <div className={`mb-5 rounded-lg border p-3 text-sm ${runResult.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>
            <span className="font-black">{runResult.fn}</span> {runResult.ok ? 'completed successfully' : 'failed'}
            {runResult.error && <span className="ml-2 text-xs">{runResult.error}</span>}
          </div>
        )}

        {/* Prompts */}
        <div className="space-y-4">
          {filteredPrompts.map(p => (
            <div key={p.id} className="rounded-2xl border border-black/10 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase text-white" style={{ background: p.categoryColor }}>
                      {p.categoryIcon} {p.categoryLabel}
                    </span>
                    {p.invokeFn && (
                      <span className="flex items-center gap-1 rounded-full bg-[#f2df0d]/20 px-2 py-0.5 text-[10px] font-bold text-[#b0a209]">
                        <Sparkles size={10} /> Auto-invokeable
                      </span>
                    )}
                  </div>
                  <h3 className="mt-2 font-black">{p.title}</h3>
                  <p className="mt-1 text-xs text-black/50">{p.description}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => copy(p)} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
                    {copiedId === p.id ? <><Check size={14} /> Copied</> : <><ClipboardCopy size={14} /> Copy</>}
                  </button>
                  {p.invokeFn && (
                    <button onClick={() => invoke(p)} disabled={running[p.id]} className="flex items-center gap-1.5 rounded-lg bg-[#0b0b0b] px-3 py-2 text-xs font-black text-white disabled:opacity-50">
                      {running[p.id] ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Play size={14} />} Invoke
                    </button>
                  )}
                </div>
              </div>
              {/* Prompt preview (collapsed) */}
              <details className="mt-3 group">
                <summary className="flex cursor-pointer items-center gap-1 text-xs font-bold text-black/40 hover:text-black/60">
                  <ArrowRight size={12} className="transition group-open:rotate-90" /> View full prompt
                </summary>
                <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-[#0b0b0b] p-4 text-xs leading-relaxed text-white/80">{p.prompt}</pre>
              </details>
            </div>
          ))}
        </div>

        {filteredPrompts.length === 0 && (
          <div className="py-20 text-center">
            <Search size={32} className="mx-auto text-black/20" />
            <p className="mt-3 text-sm text-black/40">No prompts match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}