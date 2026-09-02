import React, { useState, useEffect } from "react";
import { Page, PrimaryButton, SecondaryButton, Card, EmptyState } from "@/components/autoleads/UiPrimitives";
import { ClipboardCopy, Check, Plus, Trash2, FlaskConical, X } from "lucide-react";
import PipelineTest from "@/components/autoleads/PipelineTest";

const STORAGE_KEY = "autoleads_test_goals_v1";

export default function TestRunner() {
  const [goals, setGoals] = useState(/** @type {any[]} */ ([]));
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    try { setGoals(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { setGoals([]); }
  }, []);

  const persist = (next) => {
    setGoals(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };
  const save = () => {
    if (!title.trim() || !text.trim()) return;
    persist([{ id: Date.now(), title: title.trim(), text: text.trim(), status: "pending", notes: "" }, ...goals]);
    setTitle(""); setText("");
  };
  const update = (id, patch) => persist(goals.map(g => g.id === id ? { ...g, ...patch } : g));
  const remove = (id) => persist(goals.filter(g => g.id !== id));
  const copy = (g) => {
    navigator.clipboard?.writeText(g.text);
    setCopiedId(g.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <Page backTo="/dashboard" title="Test Runner" description="Internal QA tool. Write test goals, copy them into the Testing Agent (test-tube icon in the side panel), run, then log the result." eyebrow="Builder Only">
      <PipelineTest />
      <Card className="mb-6 p-5">
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Goal title (e.g. Submit Auto Leads setup)" className="h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-[#f2df0d]" />
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Goal in plain English (e.g. Fill out the Auto Leads setup form and submit it)" className="h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-[#f2df0d]" />
          <PrimaryButton onClick={save}><Plus size={16} /> Save Goal</PrimaryButton>
        </div>
      </Card>

      <div className="mb-4 rounded-lg border border-[#f2df0d]/40 bg-[#fdfbe1] p-3 text-xs leading-5 text-black/70">
        <strong className="font-black">How to run:</strong> Click Copy on a goal → open the Testing Agent (test-tube icon in the side panel) → paste the goal → press Run → come back and mark Pass/Fail + notes.
      </div>

      {goals.length === 0 ? (
        <EmptyState icon={FlaskConical} title="No test goals yet" description="Write your first goal above. Keep each goal to one clear action." />
      ) : (
        <div className="space-y-3">
          {goals.map(g => (
            <Card key={g.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black">{g.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${g.status === 'pass' ? 'bg-green-100 text-green-700' : g.status === 'fail' ? 'bg-red-100 text-red-700' : 'bg-black/5 text-black/50'}`}>{g.status.toUpperCase()}</span>
                  </div>
                  <p className="mt-1 text-sm text-black/60">{g.text}</p>
                  <input value={g.notes} onChange={e => update(g.id, { notes: e.target.value })} placeholder="Result notes…" className="mt-2 h-9 w-full rounded-lg border border-black/10 px-2.5 text-xs outline-none focus:border-[#f2df0d]" />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <SecondaryButton className="!px-3 !py-1.5 !min-h-9" onClick={() => copy(g)}>{copiedId === g.id ? <><Check size={14} /> Copied</> : <><ClipboardCopy size={14} /> Copy</>}</SecondaryButton>
                  <div className="flex gap-1.5">
                    <button onClick={() => update(g.id, { status: 'pass' })} className="grid h-9 w-9 place-items-center rounded-lg bg-green-500 text-white" title="Pass"><Check size={15} /></button>
                    <button onClick={() => update(g.id, { status: 'fail' })} className="grid h-9 w-9 place-items-center rounded-lg bg-red-500 text-white" title="Fail"><X size={15} /></button>
                    <button onClick={() => remove(g.id)} className="grid h-9 w-9 place-items-center rounded-lg bg-black/10 text-black/60" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}