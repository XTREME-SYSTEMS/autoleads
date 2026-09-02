import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { CheckCircle2, FileQuestion, FileText, Loader2, Radar } from "lucide-react";
import { Card, Page, StatCard } from "@/components/autoleads/UiPrimitives";

const STAGE_COLORS = { qualification: '#fbbf24', takeoff: '#f59e0b', estimating: '#3b82f6', proposal: '#8b5cf6', submitted: '#06b6d4', won: '#10b981', lost: '#ef4444' };

export default function Analytics() {
  const [projects, setProjects] = useState(/** @type {any[]} */ ([]));
  const [proposals, setProposals] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Project.list('-created_date', 500).catch(() => []),
      base44.entities.Proposal.list('-created_date', 500).catch(() => []),
    ]).then(([p, pr]) => { setProjects(p || []); setProposals(pr || []); })
      .finally(() => setLoading(false));
  }, []);

  const stageData = ['qualification','takeoff','estimating','proposal','submitted','won','lost'].map(s => ({ stage: s, count: projects.filter(p => p.stage === s).length }));
  const verified = projects.filter(p => p.verification_status === 'verified').length;
  const unverified = projects.filter(p => p.verification_status === 'unverified').length;
  const failed = projects.filter(p => p.verification_status === 'failed').length;
  const verifyData = [
    { name: 'Verified', value: verified, color: '#10b981' },
    { name: 'Unverified', value: unverified, color: '#fbbf24' },
    { name: 'Failed', value: failed, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const wonProposals = proposals.filter(p => p.status === 'won').length;
  const submittedProposals = proposals.filter(p => ['submitted','delivered','responded','won','lost'].includes(p.status)).length;
  const winRate = submittedProposals > 0 ? Math.round((wonProposals / submittedProposals) * 100) : 0;

  if (loading) return <div className="grid min-h-[60vh] place-items-center"><Loader2 className="animate-spin text-[#f2df0d]" /></div>;

  return (
    <Page backTo="/dashboard" title="Analytics" description="Pipeline performance, verification rates, and proposal win metrics.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Radar} title="Total Projects" value={projects.length} note="Discovered opportunities" />
        <StatCard icon={CheckCircle2} title="Verified" value={verified} note={`${unverified} pending verification`} />
        <StatCard icon={FileText} title="Proposals" value={proposals.length} note={`${submittedProposals} submitted`} />
        <StatCard icon={FileQuestion} title="Win Rate" value={`${winRate}%`} note={`${wonProposals} won`} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-black/40">Projects by Stage</h2>
          {projects.length === 0 ? <p className="py-12 text-center text-sm text-black/40">No projects yet.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageData}>
                <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#666' }} angle={-25} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 10, fill: '#666' }} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="count" radius={[6,6,0,0]}>
                  {stageData.map((e, i) => <Cell key={i} fill={STAGE_COLORS[e.stage] || '#ccc'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-sm font-black uppercase tracking-wide text-black/40">Verification Status</h2>
          {verifyData.length === 0 ? <p className="py-12 text-center text-sm text-black/40">No verification data.</p> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={verifyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {verifyData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </Page>
  );
}