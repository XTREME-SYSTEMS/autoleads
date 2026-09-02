import React, { useState, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Legend } from "recharts";
import { DollarSign, TrendingUp, BriefcaseBusiness, FileText, Users, Building2, Award, Activity, Loader2, Target, Clock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BackButton from "@/components/autoleads/BackButton";

const STAGE_COLORS = {
  qualification: '#3b82f6', takeoff: '#f59e0b', estimating: '#8b5cf6',
  proposal: '#10b981', submitted: '#06b6d4', won: '#22c55e',
  scheduled: '#6366f1', in_progress: '#ec4899', completed: '#14b8a6',
  lost: '#ef4444',
};

export default function OwnerDashboard() {
  const [data, setData] = useState({ projects: [], proposals: [], invoices: [], payments: [], orgs: [], users: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [projects, proposals, invoices, payments, orgs, users] = await Promise.all([
          base44.entities.Project.list('-created_date', 500).catch(() => []),
          base44.entities.Proposal.list('-created_date', 500).catch(() => []),
          base44.entities.Invoice.list('-created_date', 200).catch(() => []),
          base44.entities.Payment.list('-created_date', 200).catch(() => []),
          base44.entities.Organization.list('-created_date', 100).catch(() => []),
          base44.entities.User.list('-created_date', 100).catch(() => []),
        ]);
        setData({ projects: projects || [], proposals: proposals || [], invoices: invoices || [], payments: payments || [], orgs: orgs || [], users: users || [] });
      } catch {} finally { setLoading(false); }
    })();
  }, []);

  const totalRevenue = data.payments.filter(p => p.status === 'completed').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalBilled = data.invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const outstanding = data.invoices.reduce((s, i) => s + Math.max(0, Number(i.total || 0) - Number(i.amount_paid || 0)), 0);
  const pipelineValue = data.projects.filter(p => ['qualification', 'takeoff', 'estimating', 'proposal', 'submitted'].includes(p.stage)).reduce((s, p) => s + Number(p.value || 0), 0);
  const wonValue = data.projects.filter(p => p.stage === 'won' || p.stage === 'completed').reduce((s, p) => s + Number(p.value || 0), 0);
  const wonCount = data.projects.filter(p => p.stage === 'won' || p.stage === 'completed').length;
  const submittedCount = data.proposals.filter(p => p.status === 'sent').length;
  const winRate = submittedCount > 0 ? ((wonCount / submittedCount) * 100).toFixed(1) : '0.0';
  const activeProjects = data.projects.filter(p => !['lost', 'completed'].includes(p.stage)).length;

  // Projects by stage
  const stageData = Object.keys(STAGE_COLORS).map(stage => ({
    name: stage, count: data.projects.filter(p => p.stage === stage).length, color: STAGE_COLORS[stage],
  })).filter(s => s.count > 0);

  // Monthly revenue
  const monthlyRevenue = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const period = d.toISOString().slice(0, 7);
    const rev = data.payments.filter(p => p.status === 'completed' && (p.created_date || '').slice(0, 7) === period).reduce((s, p) => s + Number(p.amount || 0), 0);
    const bids = data.proposals.filter(p => (p.sent_date || p.created_date || '').slice(0, 7) === period).length;
    monthlyRevenue.push({ month: d.toLocaleDateString(undefined, { month: 'short' }), revenue: Math.round(rev), bids });
  }

  // Top organizations by project count
  const orgStats = data.orgs.map(org => ({
    name: org.name?.slice(0, 15),
    projects: data.projects.filter(p => p.organization_id === org.id).length,
    value: data.projects.filter(p => p.organization_id === org.id).reduce((s, p) => s + Number(p.value || 0), 0),
  })).sort((a, b) => b.value - a.value).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-12">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <BackButton to="/dashboard" />
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#f2df0d] text-black"><Award size={18} /></span>
            <div>
              <h1 className="text-lg font-black text-white">Owner Dashboard</h1>
              <p className="text-xs text-white/40">Executive analytics & business intelligence</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6 space-y-5">
        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-white/30" size={32} /></div>
        ) : (
          <>
            {/* Executive KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ExecKpi icon={DollarSign} label="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(1)}K`} sub={`${data.payments.length} payments`} />
              <ExecKpi icon={TrendingUp} label="Pipeline Value" value={`$${(pipelineValue / 1000000).toFixed(1)}M`} sub={`${activeProjects} active projects`} accent />
              <ExecKpi icon={Target} label="Win Rate" value={`${winRate}%`} sub={`${wonCount} won / ${submittedCount} submitted`} />
              <ExecKpi icon={Clock} label="Outstanding" value={`$${(outstanding / 1000).toFixed(1)}K`} sub={`${data.invoices.length} invoices`} />
            </div>

            {/* Secondary KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <ExecKpi icon={BriefcaseBusiness} label="Total Projects" value={data.projects.length} sub={`${activeProjects} active`} />
              <ExecKpi icon={FileText} label="Proposals" value={data.proposals.length} sub={`${data.proposals.filter(p => p.status === 'sent').length} sent`} />
              <ExecKpi icon={Building2} label="Organizations" value={data.orgs.length} sub={`${data.orgs.filter(o => o.subscription_status === 'active').length} active subs`} />
              <ExecKpi icon={Users} label="Total Users" value={data.users.length} sub={`${data.users.filter(u => u.role === 'admin').length} admins`} />
            </div>

            {/* Charts */}
            <div className="grid gap-5 lg:grid-cols-2">
              {/* Revenue trend */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="font-black text-white">Revenue & Bids (6 Months)</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="month" stroke="#666" fontSize={11} />
                    <YAxis yAxisId="left" tickFormatter={(v) => `$${(v/1000).toFixed(0)}K`} stroke="#666" fontSize={11} />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={11} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }} formatter={(v, n) => n === 'revenue' ? `$${v.toLocaleString()}` : v} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="revenue" fill="#f2df0d" name="Revenue" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="bids" fill="#3b82f6" name="Bids" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Projects by stage */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="font-black text-white">Projects by Stage</h2>
                {stageData.length === 0 ? (
                  <p className="py-16 text-center text-sm text-white/30">No projects yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={stageData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e) => `${e.name}: ${e.count}`}>
                        {stageData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Top orgs */}
            {orgStats.length > 0 && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="font-black text-white">Top Organizations by Pipeline Value</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={orgStats} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} stroke="#666" fontSize={11} />
                    <YAxis type="category" dataKey="name" stroke="#666" fontSize={11} width={100} />
                    <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }} formatter={(v) => `$${v.toLocaleString()}`} />
                    <Bar dataKey="value" fill="#f2df0d" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Recent activity */}
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-3 font-black text-white">Recent Projects</h2>
                <div className="space-y-2">
                  {data.projects.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/5 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{p.title}</p>
                        <p className="text-xs text-white/40">{p.jurisdiction || '—'} · {p.stage}</p>
                      </div>
                      <p className="shrink-0 text-sm font-black text-[#f2df0d]">{p.value ? `$${(p.value / 1000000).toFixed(1)}M` : '—'}</p>
                    </div>
                  ))}
                  {data.projects.length === 0 && <p className="py-8 text-center text-sm text-white/30">No projects yet.</p>}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h2 className="mb-3 font-black text-white">Recent Payments</h2>
                <div className="space-y-2">
                  {data.payments.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between rounded-lg border border-white/5 p-3">
                      <div>
                        <p className="text-sm font-bold text-white">{p.description || 'Payment'}</p>
                        <p className="text-xs text-white/40">{p.status} · {new Date(p.created_date).toLocaleDateString()}</p>
                      </div>
                      <p className="text-sm font-black text-emerald-400">${Number(p.amount || 0).toLocaleString()}</p>
                    </div>
                  ))}
                  {data.payments.length === 0 && <p className="py-8 text-center text-sm text-white/30">No payments yet.</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function ExecKpi({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <Icon size={18} className={accent ? "text-[#f2df0d]" : "text-white/40"} />
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      <p className="text-xs text-white/50">{label}</p>
      <p className="text-[10px] text-white/30">{sub}</p>
    </div>
  );
}