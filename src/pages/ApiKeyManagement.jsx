import React, { useState, useEffect, useCallback } from "react";
import { Key, Plus, Trash2, Loader2, Copy, Check, Eye, EyeOff, DollarSign, Activity, Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useToast } from "@/components/ui/use-toast";
import BackButton from "@/components/autoleads/BackButton";

const TIERS = [
  { key: 'free', label: 'Free', price: 0, rateHour: 100, rateDay: 1000, color: 'bg-blue-100 text-blue-700' },
  { key: 'starter', label: 'Starter', price: 99, rateHour: 500, rateDay: 5000, color: 'bg-emerald-100 text-emerald-700' },
  { key: 'pro', label: 'Pro', price: 299, rateHour: 2000, rateDay: 20000, color: 'bg-violet-100 text-violet-700' },
  { key: 'enterprise', label: 'Enterprise', price: 999, rateHour: 10000, rateDay: 100000, color: 'bg-amber-100 text-amber-700' },
];

const ENDPOINTS = ['leads', 'projects', 'proposals', 'estimates', 'takeoffs', 'invoices', 'payments', 'sources', 'analytics'];

export default function ApiKeyManagement() {
  const { toast } = useToast();
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState(null);
  const [showKey, setShowKey] = useState(false);
  const [form, setForm] = useState({ key_name: '', tier: 'free', buyer_email: '', buyer_name: '', allowed_endpoints: ['leads', 'projects'] });

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ApiKey.list('-created_date', 100);
      setKeys(data || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const createKey = async () => {
    if (!form.key_name.trim()) return;
    setCreating(true);
    try {
      const tier = TIERS.find(t => t.key === form.tier);
      const res = await base44.functions.invoke('createApiKey', {
        key_name: form.key_name,
        tier: form.tier,
        rate_limit_per_hour: tier.rateHour,
        rate_limit_per_day: tier.rateDay,
        price_per_month: tier.price,
        buyer_email: form.buyer_email,
        buyer_name: form.buyer_name,
        allowed_endpoints: form.allowed_endpoints,
      });
      setNewKey(res);
      setForm({ key_name: '', tier: 'free', buyer_email: '', buyer_name: '', allowed_endpoints: ['leads', 'projects'] });
      toast({ title: "API Key created", description: "Copy it now — you won't see it again." });
      loadKeys();
    } catch (e) { toast({ title: "Failed to create key", description: e.message, variant: "destructive" }); }
    finally { setCreating(false); }
  };

  const revokeKey = async (id) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try { await base44.entities.ApiKey.update(id, { status: 'revoked' }); loadKeys(); } catch {}
  };

  const deleteKey = async (id) => {
    if (!confirm('Delete this API key permanently?')) return;
    try { await base44.entities.ApiKey.delete(id); loadKeys(); } catch {}
  };

  const toggleEndpoint = (ep) => {
    setForm(f => ({ ...f, allowed_endpoints: f.allowed_endpoints.includes(ep) ? f.allowed_endpoints.filter(e => e !== ep) : [...f.allowed_endpoints, ep] }));
  };

  const copyKey = () => { navigator.clipboard.writeText(newKey?.api_key || ''); toast({ title: "Copied to clipboard" }); };

  const totalRevenue = keys.filter(k => k.status === 'active').reduce((s, k) => s + Number(k.price_per_month || 0), 0);

  return (
    <div className="min-h-screen bg-[#fafafa] pb-12">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <BackButton to="/admin-portal" />
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><Key size={18} /></span>
            <div>
              <h1 className="text-lg font-black">API Key Management</h1>
              <p className="text-xs text-black/50">Sell data access · manage keys · track usage</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6 space-y-5">
        {/* Revenue summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <DollarSign size={18} className="text-emerald-500" />
            <p className="mt-2 text-2xl font-black">${totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-black/50">Monthly API Revenue</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <Key size={18} className="text-blue-500" />
            <p className="mt-2 text-2xl font-black">{keys.filter(k => k.status === 'active').length}</p>
            <p className="text-xs text-black/50">Active Keys</p>
          </div>
          <div className="rounded-xl border border-black/10 bg-white p-4">
            <Activity size={18} className="text-violet-500" />
            <p className="mt-2 text-2xl font-black">{keys.reduce((s, k) => s + (k.usage_count || 0), 0)}</p>
            <p className="text-xs text-black/50">Total API Calls</p>
          </div>
        </div>

        {/* New key display */}
        {newKey && (
          <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5">
            <div className="flex items-center gap-2">
              <Check size={18} className="text-emerald-600" />
              <h2 className="font-black text-emerald-800">API Key Created — Copy Now!</h2>
            </div>
            <p className="mt-1 text-xs text-emerald-700">This is the only time the full key will be shown.</p>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-white p-3">
              <code className="flex-1 truncate font-mono text-sm">{showKey ? newKey.api_key : '•'.repeat(40)}</code>
              <button onClick={() => setShowKey(v => !v)} className="shrink-0 text-black/40 hover:text-black">{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              <button onClick={copyKey} className="shrink-0 text-black/40 hover:text-black"><Copy size={16} /></button>
            </div>
            <button onClick={() => { setNewKey(null); setShowKey(false); }} className="mt-3 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Done</button>
          </div>
        )}

        {/* Create key form */}
        <div className="rounded-2xl border border-black/10 bg-white p-5">
          <h2 className="font-black">Create New API Key</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-xs font-bold text-black/50">Key Name</label>
              <input value={form.key_name} onChange={e => setForm(f => ({ ...f, key_name: e.target.value }))} placeholder="Acme Corp Data Access" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-black/50">Tier</label>
              <select value={form.tier} onChange={e => setForm(f => ({ ...f, tier: e.target.value }))} className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm">
                {TIERS.map(t => <option key={t.key} value={t.key}>{t.label} — ${t.price}/mo ({t.rateHour}/hr)</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-black/50">Buyer Email</label>
              <input type="email" value={form.buyer_email} onChange={e => setForm(f => ({ ...f, buyer_email: e.target.value }))} placeholder="buyer@company.com" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-black/50">Buyer Name</label>
              <input value={form.buyer_name} onChange={e => setForm(f => ({ ...f, buyer_name: e.target.value }))} placeholder="John Doe" className="mt-1 w-full rounded-lg border border-black/15 px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-bold text-black/50">Allowed Endpoints (à la carte)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {ENDPOINTS.map(ep => (
                <button key={ep} onClick={() => toggleEndpoint(ep)} className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${form.allowed_endpoints.includes(ep) ? 'border-[#f2df0d] bg-[#f2df0d] text-black' : 'border-black/15 text-black/40 hover:bg-black/5'}`}>
                  {ep}
                </button>
              ))}
            </div>
          </div>
          <button onClick={createKey} disabled={creating || !form.key_name.trim()} className="mt-4 flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black disabled:opacity-50">
            {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Generate API Key
          </button>
        </div>

        {/* Keys list */}
        <div>
          <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/60">API Keys ({keys.length})</h2>
          {loading ? (
            <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-black/30" size={24} /></div>
          ) : keys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
              <Key size={32} className="mx-auto text-black/20" />
              <p className="mt-3 text-sm text-black/40">No API keys yet. Create one above to start selling data access.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {keys.map(k => {
                const tier = TIERS.find(t => t.key === k.tier) || TIERS[0];
                return (
                  <div key={k.id} className="rounded-xl border border-black/10 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm">{k.key_name}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${tier.color}`}>{k.tier}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${k.status === 'active' ? 'bg-emerald-100 text-emerald-700' : k.status === 'suspended' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{k.status}</span>
                        </div>
                        <p className="mt-1 font-mono text-xs text-black/40">{k.key_prefix}••••••••••••••••</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-black/40">
                          <span className="flex items-center gap-1"><DollarSign size={11} />${k.price_per_month || 0}/mo</span>
                          <span className="flex items-center gap-1"><Zap size={11} />{k.rate_limit_per_hour}/hr</span>
                          <span className="flex items-center gap-1"><Activity size={11} />{k.usage_count || 0} calls</span>
                          {k.buyer_email && <span>· {k.buyer_email}</span>}
                        </div>
                        {k.allowed_endpoints && k.allowed_endpoints.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {k.allowed_endpoints.map(ep => <span key={ep} className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-bold text-black/50">{ep}</span>)}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        {k.status === 'active' && <button onClick={() => revokeKey(k.id)} className="rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50">Revoke</button>}
                        <button onClick={() => deleteKey(k.id)} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}