import React, { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, LineChart, Line, ResponsiveContainer, Tooltip, Legend, CartesianGrid } from "recharts";
import { DollarSign, TrendingUp, TrendingDown, Brain, Loader2, Plus, Trash2, Sparkles, AlertTriangle, Target, Activity } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import BackButton from "@/components/autoleads/BackButton";

const CATEGORY_COLORS = {
  labor: '#3b82f6', materials: '#f59e0b', equipment: '#8b5cf6', software: '#10b981',
  marketing: '#ec4899', overhead: '#6366f1', operations: '#14b8a6', subcontractors: '#f97316',
  insurance: '#ef4444', fuel: '#eab308', permits: '#06b6d4', other: '#94a3b8',
};

const CATEGORIES = ['labor', 'materials', 'equipment', 'software', 'marketing', 'overhead', 'operations', 'subcontractors', 'insurance', 'fuel', 'permits', 'other'];

export default function CostIntelligence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [metrics, setMetrics] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMetric, setNewMetric] = useState({ category: 'labor', subcategory: '', description: '', amount: '', period: new Date().toISOString().slice(0, 7), is_recurring: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r, inv, pay] = await Promise.all([
        base44.entities.CostMetric.list('-created_date', 200).catch(() => []),
        base44.entities.CostRecommendation.list('-created_date', 50).catch(() => []),
        base44.entities.Invoice.list('-created_date', 100).catch(() => []),
        base44.entities.Payment.list('-created_date', 100).catch(() => []),
      ]);
      setMetrics(m || []); setRecommendations(r || []); setInvoices(inv || []); setPayments(pay || []);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const addMetric = async () => {
    if (!newMetric.amount || !newMetric.period) return;
    try {
      await base44.entities.CostMetric.create({ ...newMetric, amount: Number(newMetric.amount), date: new Date().toISOString().slice(0, 10) });
      setNewMetric({ category: 'labor', subcategory: '', description: '', amount: '', period: new Date().toISOString().slice(0, 7), is_recurring: false });
      setShowAddForm(false);
      toast({ title: "Cost metric added" });
      loadData();
    } catch (e) { toast({ title: "Failed to add", description: e.message, variant: "destructive" }); }
  };

  const deleteMetric = async (id) => {
    try { await base44.entities.CostMetric.delete(id); loadData(); } catch {}
  };

  const runAIAnalysis = async () => {
    setAnalyzing(true);
    toast({ title: "AI analyzing costs...", description: "Generating predictions and recommendations." });
    try {
      await base44.functions.invoke('costIntelligence', { action: 'analyze' });
      toast({ title: "Analysis complete", description: "Recommendations generated." });
      loadData();
    } catch (e) { toast({ title: "Analysis failed", description: e.message, variant: "destructive" }); }
    finally { setAnalyzing(false); }
  };

  const dismissRec = async (id) => {
    try { await base44.entities.CostRecommendation.update(id, { status: 'dismissed' }); loadData(); } catch {}
  };

  // Compute cost breakdown by category
  const categoryBreakdown = CATEGORIES.map(cat => {
    const total = metrics.filter(m => m.category === cat && !m.is_predicted).reduce((s, m) => s + Number(m.amount || 0), 0);
    return { name: cat, value: Math.round(total), color: CATEGORY_COLORS[cat] };
  }).filter(c => c.value > 0);

  const totalCost = categoryBreakdown.reduce((s, c) => s + c.value, 0);
  const totalRevenue = payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalBilled = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const profit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0.0';

  // Monthly trend (last 6 months)
  const monthlyTrend = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const period = d.toISOString().slice(0, 7);
    const monthCost = metrics.filter(m => m.period === period && !m.is_predicted).reduce((s, m) => s + Number(m.amount || 0), 0);
    const monthRevenue = payments.filter(p => p.status === 'completed' && (p.created_date || '').slice(0, 7) === period).reduce((s, p) => s + Number(p.amount || 0), 0);
    monthlyTrend.push({ month: d.toLocaleDateString(undefined, { month: 'short' }), cost: Math.round(monthCost), revenue: Math.round(monthRevenue) });
  }

  // Top cost categories
  const topCosts = [...categoryBreakdown].sort((a, b) => b.value - a.value).slice(0, 6);

  return (
    <div className="min-h-screen bg-[#fafafa] pb-12">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <BackButton to="/admin-portal" />
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b0b0b] text-[#f2df0d]"><DollarSign size={18} /></span>
            <div>
              <h1 className="text-lg font-black">Cost Intelligence</h1>
              <p className="text-xs text-black/50">Monitor · predict · optimize with AI</p>
            </div>
          </div>
          <div className="ml-auto flex gap-2">
            <button onClick={() => setShowAddForm(v => !v)} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
              <Plus size={14} /> Add Cost
            </button>
            <button onClick={runAIAnalysis} disabled={analyzing} className="flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-4 py-2 text-xs font-black disabled:opacity-50">
              {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Brain size={14} />} AI Analyze
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6 space-y-5">
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-black/30" size={32} /></div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard icon={DollarSign} label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}K`} tone="emerald" />
              <KpiCard icon={TrendingDown} label="Total Costs" value={`$${(totalCost / 1000).toFixed(1)}K`} tone="red" />
              <KpiCard icon={profit >= 0 ? TrendingUp : TrendingDown} label="Net Profit" value={`$${(profit / 1000).toFixed(1)}K`} tone={profit >= 0 ? 'emerald' : 'red'} />
              <KpiCard icon={Target} label="Profit Margin" value={`${margin}%`} tone={Number(margin) > 15 ? 'emerald' : Number(margin) > 0 ? 'amber' : 'red'} />
            </div>

            {/* Add cost form */}
            {showAddForm && (
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <h2 className="font-black">Add Cost Metric</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  <select value={newMetric.category} onChange={e => setNewMetric(f => ({ ...f, category: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input placeholder="Subcategory" value={newMetric.subcategory} onChange={e => setNewMetric(f => ({ ...f, subcategory: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                  <input placeholder="Description" value={newMetric.description} onChange={e => setNewMetric(f => ({ ...f, description: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                  <input type="number" placeholder="Amount $" value={newMetric.amount} onChange={e => setNewMetric(f => ({ ...f, amount: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                  <input type="month" value={newMetric.period} onChange={e => setNewMetric(f => ({ ...f, period: e.target.value }))} className="rounded-lg border border-black/15 px-3 py-2 text-sm" />
                </div>
                <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={newMetric.is_recurring} onChange={e => setNewMetric(f => ({ ...f, is_recurring: e.target.checked }))} /> Recurring monthly</label>
                <button onClick={addMetric} className="mt-3 flex items-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-2.5 text-sm font-black">Add Metric</button>
              </div>
            )}

            {/* Charts */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Cost breakdown pie */}
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <h2 className="font-black">Cost Breakdown by Category</h2>
                <p className="text-xs text-black/40">Where your money goes</p>
                {categoryBreakdown.length === 0 ? (
                  <p className="py-10 text-center text-sm text-black/30">No cost data yet. Add cost metrics or run AI analysis.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name}: $${(e.value/1000).toFixed(1)}K`}>
                        {categoryBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top costs bar */}
              <div className="rounded-2xl border border-black/10 bg-white p-5">
                <h2 className="font-black">Top Cost Categories</h2>
                <p className="text-xs text-black/40">Highest spend areas</p>
                {topCosts.length === 0 ? (
                  <p className="py-10 text-center text-sm text-black/30">No data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={topCosts} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} stroke="#999" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="#999" fontSize={11} width={80} />
                      <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                        {topCosts.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Monthly trend */}
            <div className="rounded-2xl border border-black/10 bg-white p-5">
              <h2 className="font-black">Revenue vs Cost Trend</h2>
              <p className="text-xs text-black/40">Last 6 months</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#999" fontSize={11} />
                  <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} stroke="#999" fontSize={11} />
                  <Tooltip formatter={(v) => `$${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} name="Revenue" />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2.5} name="Cost" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* AI Recommendations */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={18} className="text-[#f2df0d]" />
                <h2 className="text-sm font-black uppercase tracking-wide text-black/60">AI Cost-Saving Recommendations</h2>
              </div>
              {recommendations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
                  <Brain size={32} className="mx-auto text-black/20" />
                  <p className="mt-3 text-sm text-black/40">No recommendations yet. Click "AI Analyze" to generate cost-saving insights.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.filter(r => r.status !== 'dismissed').map(r => (
                    <div key={r.id} className="rounded-xl border border-black/10 bg-white p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${r.priority === 'critical' ? 'bg-red-500' : r.priority === 'high' ? 'bg-orange-500' : r.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-black uppercase" style={{ background: (CATEGORY_COLORS[r.category] || '#94a3b8') + '20', color: CATEGORY_COLORS[r.category] || '#94a3b8' }}>{r.category}</span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${r.priority === 'critical' ? 'bg-red-100 text-red-700' : r.priority === 'high' ? 'bg-orange-100 text-orange-700' : r.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{r.priority}</span>
                          </div>
                          <p className="mt-2 font-black text-sm">{r.title}</p>
                          <p className="mt-1 text-xs text-black/50">{r.description}</p>
                          {r.ai_analysis && <p className="mt-2 rounded-lg bg-violet-50 p-2 text-xs text-violet-700">{r.ai_analysis}</p>}
                          {r.potential_savings_annual > 0 && (
                            <p className="mt-2 flex items-center gap-1 text-xs font-bold text-emerald-600"><TrendingUp size={12} /> Potential savings: ${r.potential_savings_annual.toLocaleString()}/year</p>
                          )}
                        </div>
                        <button onClick={() => dismissRec(r.id)} className="shrink-0 rounded-lg border border-black/15 px-2.5 py-1.5 text-xs font-bold hover:bg-black/5">Dismiss</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Cost metrics table */}
            {metrics.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-black/60">All Cost Metrics ({metrics.length})</h2>
                <div className="overflow-x-auto rounded-xl border border-black/10 bg-white">
                  <table className="w-full text-sm">
                    <thead className="border-b border-black/10 bg-black/[.02] text-left text-xs uppercase text-black/40">
                      <tr><th className="p-3">Category</th><th className="p-3">Description</th><th className="p-3">Period</th><th className="p-3 text-right">Amount</th><th className="p-3"></th></tr>
                    </thead>
                    <tbody>
                      {metrics.slice(0, 20).map(m => (
                        <tr key={m.id} className="border-b border-black/5">
                          <td className="p-3"><span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: (CATEGORY_COLORS[m.category] || '#94a3b8') + '20', color: CATEGORY_COLORS[m.category] || '#94a3b8' }}>{m.category}</span></td>
                          <td className="p-3">{m.description || m.subcategory || '—'}</td>
                          <td className="p-3 text-black/50">{m.period}</td>
                          <td className="p-3 text-right font-bold">${Number(m.amount).toLocaleString()}{m.is_predicted && <span className="ml-1 text-[10px] text-violet-500">predicted</span>}</td>
                          <td className="p-3"><button onClick={() => deleteMetric(m.id)} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }) {
  const tones = { emerald: 'text-emerald-600 bg-emerald-50', red: 'text-red-600 bg-red-50', amber: 'text-amber-600 bg-amber-50', blue: 'text-blue-600 bg-blue-50' };
  return (
    <div className="rounded-xl border border-black/10 bg-white p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${tones[tone] || tones.blue}`}><Icon size={18} /></span>
      <p className="mt-2 text-2xl font-black">{value}</p>
      <p className="text-xs text-black/50">{label}</p>
    </div>
  );
}