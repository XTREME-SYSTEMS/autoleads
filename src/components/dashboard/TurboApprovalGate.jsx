import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Check, Send, Loader2, ShieldCheck, Square, CheckSquare, Wrench } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Surface } from "@/components/CommercialMobileUI";

const money = (n) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "—";
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
};

// Proposals that have cleared bid-package build and are waiting on the
// final human sign-off before the bid email goes out.
const READY_STATUSES = ["internal_review", "approved", "send_pending"];

// Build a lookup of the user's trade scopes (from ScopeSystem settings).
// Keyed by both system_code and scope name (lowercased) so takeoff line items
// can be matched back to the trade they belong to.
function buildScopeMap(scopeSystems) {
  const byCode = new Map();
  const byScope = new Map();
  (scopeSystems || []).forEach(s => {
    if (s.data_class === "NON_PRODUCTION_EXAMPLE") return;
    const unitPrice = (s.price_low && s.price_high)
      ? (Number(s.price_low) + Number(s.price_high)) / 2
      : Number(s.price_low || s.price_high || 0);
    const entry = { code: s.code, scope: s.scope, name: s.name || s.scope, unit: s.unit, unitPrice };
    if (s.code) byCode.set(String(s.code).toUpperCase(), entry);
    if (s.scope) byScope.set(String(s.scope).toLowerCase(), entry);
  });
  return { byCode, byScope };
}

function matchTakeoffToScope(t, scopeMap) {
  if (!t) return null;
  if (t.system_code) {
    const m = scopeMap.byCode.get(String(t.system_code).toUpperCase());
    if (m) return m;
  }
  if (t.scope) {
    const m = scopeMap.byScope.get(String(t.scope).toLowerCase());
    if (m) return m;
  }
  return null;
}

export default function TurboApprovalGate({ onSent }) {
  const [proposals, setProposals] = useState([]);
  const [projects, setProjects] = useState({});
  const [takeoffsByProject, setTakeoffsByProject] = useState({});
  const [scopeSystems, setScopeSystems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [checked, setChecked] = useState({});
  const [sending, setSending] = useState(null);
  const [toast, setToast] = useState(null);

  const load = async () => {
    try {
      const [allProposals, allTakeoffs, allScopes] = await Promise.all([
        base44.entities.Proposal.list("-created_date", 100).catch(() => []),
        base44.entities.Takeoff.list("-created_date", 1000).catch(() => []),
        base44.entities.ScopeSystem.list("-created_date", 200).catch(() => []),
      ]);
      const ready = (allProposals || []).filter(p => p.data_class !== "NON_PRODUCTION_EXAMPLE" && READY_STATUSES.includes(p.status));
      setProposals(ready);
      setScopeSystems(allScopes || []);

      // Group takeoffs by project
      const byProj = {};
      (allTakeoffs || []).forEach(t => {
        if (!byProj[t.project_id]) byProj[t.project_id] = [];
        byProj[t.project_id].push(t);
      });
      setTakeoffsByProject(byProj);

      // Fetch linked projects
      const pIds = [...new Set(ready.map(p => p.project_id).filter(Boolean))];
      const results = await Promise.all(pIds.map(pid => base44.entities.Project.get(pid).catch(() => null)));
      const map = {};
      results.forEach(p => { if (p) map[p.id] = p; });
      setProjects(map);
      if (ready.length > 0 && !expanded) setExpanded(ready[0].id);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const scopeMap = buildScopeMap(scopeSystems);
  const userTradeNames = [...new Set((scopeSystems || [])
    .filter(s => s.data_class !== "NON_PRODUCTION_EXAMPLE" && s.scope)
    .map(s => s.scope))];

  // Build per-proposal line items from takeoffs matched to the user's trade scopes.
  // Only scopes that match one of the user's configured trades are shown — this is
  // the "scopes specific to the trades I have in my settings" requirement.
  const buildLineItems = (projectId) => {
    const tks = takeoffsByProject[projectId] || [];
    return tks
      .map(t => {
        const matched = matchTakeoffToScope(t, scopeMap);
        if (!matched) return null; // not one of the user's trade scopes
        const qty = Number(t.final_quantity || t.raw_quantity || 0);
        const unitPrice = matched.unitPrice || 0;
        return {
          id: t.id,
          description: matched.name || t.scope || t.system_code || "Scope",
          scope: matched.scope,
          system_code: matched.code || t.system_code,
          quantity: qty,
          unit: t.unit || matched.unit || "SF",
          unit_price: unitPrice,
          total: qty * unitPrice,
        };
      })
      .filter(Boolean);
  };

  const toggleItem = (pid, idx) => {
    setChecked(prev => {
      const set = new Set(prev[pid] || []);
      if (set.has(idx)) set.delete(idx); else set.add(idx);
      return { ...prev, [pid]: set };
    });
  };
  const toggleAll = (pid, count) => {
    setChecked(prev => {
      const set = new Set(prev[pid] || []);
      const all = set.size === count;
      return { ...prev, [pid]: all ? new Set() : new Set(Array.from({ length: count }, (_, i) => i)) };
    });
  };
  const allChecked = (pid, count) => count > 0 && (checked[pid]?.size || 0) === count;

  const send = async (p) => {
    const items = buildLineItems(projects[p.id]?.id || p.project_id);
    if (!allChecked(p.id, items.length)) return;
    setSending(p.id);
    try {
      await base44.functions.invoke("submitProposal", { proposal_id: p.id, method: "email" });
      setToast({ type: "success", msg: `${p.title || "Bid"} sent!` });
      setChecked(prev => { const n = { ...prev }; delete n[p.id]; return n; });
      if (onSent) onSent();
      setTimeout(() => load(), 800);
    } catch (err) {
      setToast({ type: "error", msg: err.message || "Send failed" });
    } finally {
      setSending(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  if (loading) return null;

  // Filter to proposals that have at least one trade-scoped line item.
  const visible = proposals.map(p => {
    const proj = projects[p.project_id];
    const items = buildLineItems(p.project_id);
    return { p, proj, items };
  }).filter(x => x.items.length > 0);

  if (visible.length === 0) return null;

  return (
    <Surface className="mt-3 border-2 border-emerald-300 p-4">
      <div className="flex items-center gap-2">
        <ShieldCheck size={16} className="text-emerald-600" />
        <p className="font-brand text-[13px] font-bold uppercase tracking-[.04em] text-emerald-700">Final Approval Gate</p>
      </div>
      <p className="mt-0.5 text-[10px] font-semibold text-black/45">Review trade scopes, square footage & pricing before sending.</p>

      {userTradeNames.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-black/40"><Wrench size={11}/>Your trades:</span>
          {userTradeNames.map(t => (
            <span key={t} className="rounded-full bg-black/[.05] px-2 py-0.5 text-[9px] font-bold text-black/60">{t}</span>
          ))}
        </div>
      )}

      <div className="mt-3 space-y-2">
        {visible.map(({ p, proj, items }) => {
          const isOpen = expanded === p.id;
          const cSet = checked[p.id] || new Set();
          const checkedCount = cSet.size;
          const ready = allChecked(p.id, items.length);
          const projectScopes = [...new Set(items.map(i => i.scope).filter(Boolean))];
          const grandTotal = items.reduce((s, i) => s + i.total, 0);
          return (
            <div key={p.id} className={`rounded-xl border-2 transition ${isOpen ? "border-[#FFC400] bg-[#FFF7DA]" : "border-black/10 bg-white"}`}>
              <button onClick={() => setExpanded(isOpen ? null : p.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${ready ? "bg-emerald-500" : "bg-black/5"}`}>
                  {ready ? <Check size={18} className="text-white" /> : <span className="text-[11px] font-black text-black/50">{checkedCount}/{items.length}</span>}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold">{proj?.title || p.title}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1">
                    {projectScopes.map(s => (
                      <span key={s} className="rounded bg-[#FFC400]/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#9a7400]">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-brand text-[15px] font-bold text-[#E9A900]">{money(grandTotal)}</p>
                  {isOpen ? <ChevronUp size={15} className="ml-auto text-black/40" /> : <ChevronDown size={15} className="ml-auto text-black/40" />}
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-black/10 px-3 pb-3 pt-2">
                  <button onClick={() => toggleAll(p.id, items.length)} className="mb-2 flex w-full items-center justify-between rounded-lg bg-black/[.03] px-3 py-2">
                    <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-black/60">
                      {checkedCount === items.length && items.length > 0 ? <CheckSquare size={15} className="text-emerald-600" /> : <Square size={15} className="text-black/30" />}
                      Check all line items
                    </span>
                    <span className="text-[10px] font-bold text-black/45">{checkedCount}/{items.length} approved</span>
                  </button>

                  <div className="space-y-1.5">
                    {items.map((it, idx) => {
                      const on = cSet.has(idx);
                      const isSF = String(it.unit || "").toUpperCase() === "SF";
                      return (
                        <label key={it.id || idx} className={`flex items-start gap-2.5 rounded-lg border p-2.5 transition ${on ? "border-emerald-300 bg-emerald-50" : "border-black/10 bg-white"}`}>
                          <button onClick={() => toggleItem(p.id, idx)} className="mt-0.5 shrink-0">
                            {on ? <CheckSquare size={20} className="text-emerald-600" /> : <Square size={20} className="text-black/25" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-bold leading-snug">{it.description}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-black/55">
                              <span>{isSF ? "Sq Ft: " : "Qty: "}<b className="text-black">{Number(it.quantity || 0).toLocaleString()} {it.unit || ""}</b></span>
                              <span>Rate: <b className="text-black">{money(it.unit_price)}/{it.unit || "ea"}</b></span>
                              <span className="ml-auto font-brand text-[12px] font-bold text-[#E9A900]">{money(it.total)}</span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-black/10 pt-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-black/50">Scope Total</span>
                    <span className="font-brand text-[16px] font-bold text-black">{money(grandTotal)}</span>
                  </div>

                  <button
                    onClick={() => send(p)}
                    disabled={!ready || sending === p.id}
                    className={`mt-2.5 flex min-h-12 w-full items-center justify-center gap-2 rounded-lg font-brand text-[14px] font-bold uppercase tracking-wide transition ${ready ? "bg-[#FFC400] text-black shadow-[0_6px_16px_rgba(255,196,0,.25)]" : "bg-black/5 text-black/40"}`}
                  >
                    {sending === p.id ? <><Loader2 size={16} className="animate-spin" />Sending…</> : <><Send size={16} />{ready ? "Send Bid Package" : `Check all ${items.length} items to send`}</>}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {toast && <div className={`mt-2 rounded-lg p-2.5 text-center text-[11px] font-bold text-white ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>{toast.msg}</div>}
    </Surface>
  );
}