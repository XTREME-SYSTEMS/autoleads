import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import {
  Activity, AlertTriangle, ArrowRight, CheckCircle2, ChevronDown, Database,
  Flag, Loader2, MapPin, RefreshCw, Search, Shield, Wrench, Zap,
} from "lucide-react";
import BackButton from "@/components/autoleads/BackButton";

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

const COVERAGE_STYLES = {
  fully_covered: { label: 'Full', cls: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  partially_covered: { label: 'Partial', cls: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  minimal: { label: 'Minimal', cls: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  uncovered: { label: 'None', cls: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  in_progress: { label: 'In Progress', cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
};

export default function StateControl() {
  const { user } = useAuth();
  const [coverage, setCoverage] = useState([]);
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);
  const [fixing, setFixing] = useState({});
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [expandedState, setExpandedState] = useState(null);
  const [auditResult, setAuditResult] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cov, flg] = await Promise.all([
        base44.entities.StateCoverage.list('-state_code', 100),
        base44.entities.SystemFlag.list('-created_date', 200),
      ]);
      setCoverage(cov);
      setFlags(flg.filter(f => f.status === 'open' || f.status === 'fixing'));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const runAudit = async () => {
    setAuditing(true);
    setAuditResult(null);
    try {
      const res = await base44.functions.invoke('runStateCoverageAudit', {});
      setAuditResult(res);
      await loadData();
    } catch (e) { setAuditResult({ error: e?.message || 'Audit failed' }); }
    finally { setAuditing(false); }
  };

  const fixFlag = async (flagId) => {
    setFixing(f => ({ ...f, [flagId]: true }));
    try {
      await base44.functions.invoke('autoFixFlag', { flag_id: flagId });
      await loadData();
    } catch { /* ignore */ }
    finally { setFixing(f => ({ ...f, [flagId]: false })); }
  };

  const fixAllForState = async (stateCode) => {
    const stateFlags = flags.filter(f => f.state_code === stateCode && f.auto_fix_available);
    for (const f of stateFlags) {
      setFixing(prev => ({ ...prev, [f.id]: true }));
      try { await base44.functions.invoke('autoFixFlag', { flag_id: f.id }); } catch { /* ignore */ }
      setFixing(prev => ({ ...prev, [f.id]: false }));
    }
    await loadData();
  };

  const covMap = useMemo(() => {
    const m = {};
    for (const c of coverage) m[c.state_code] = c;
    return m;
  }, [coverage]);

  const flagsByState = useMemo(() => {
    const m = {};
    for (const f of flags) {
      const key = f.state_code || 'OTHER';
      if (!m[key]) m[key] = [];
      m[key].push(f);
    }
    return m;
  }, [flags]);

  const filteredStates = useMemo(() => {
    return US_STATES.filter(s => {
      const matchesSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase());
      const cov = covMap[s.code];
      const matchesFilter = filterStatus === 'all' || (cov?.coverage_status || 'uncovered') === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [search, filterStatus, covMap]);

  const stats = useMemo(() => {
    let covered = 0, uncovered = 0, partial = 0, totalSources = 0, totalFlags = flags.length;
    for (const s of US_STATES) {
      const c = covMap[s.code];
      if (!c || c.coverage_status === 'uncovered') uncovered++;
      else if (c.coverage_status === 'fully_covered') covered++;
      else partial++;
      if (c) totalSources += c.total_sources || 0;
    }
    return { covered, uncovered, partial, totalSources, totalFlags };
  }, [covMap, flags]);

  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-[#fafafa] pb-12">
      <header className="sticky top-0 z-40 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4">
          <BackButton to="/admin-portal" />
          <div>
            <h1 className="text-lg font-black">50-State Control System</h1>
            <p className="text-xs text-black/50">Source coverage, building departments & flags for every state</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-black/15 px-3 py-2 text-xs font-bold hover:bg-black/5">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={runAudit} disabled={auditing} className="flex items-center gap-1.5 rounded-lg bg-[#f2df0d] px-4 py-2 text-xs font-black disabled:opacity-50">
              {auditing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />} Run Full Audit
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Fully Covered', value: stats.covered, icon: CheckCircle2, cls: 'text-emerald-600' },
            { label: 'Partial', value: stats.partial, icon: Activity, cls: 'text-blue-600' },
            { label: 'Uncovered', value: stats.uncovered, icon: AlertTriangle, cls: 'text-red-600' },
            { label: 'Total Sources', value: stats.totalSources, icon: Database, cls: 'text-black' },
            { label: 'Open Flags', value: stats.totalFlags, icon: Flag, cls: 'text-amber-600' },
          ].map(({ label, value, icon: Icon, cls }) => (
            <div key={label} className="rounded-xl border border-black/10 bg-white p-4">
              <Icon size={18} className={cls} />
              <p className="mt-2 text-2xl font-black">{value}</p>
              <p className="text-xs text-black/50">{label}</p>
            </div>
          ))}
        </div>

        {auditResult && (
          <div className={`mt-4 rounded-lg border p-3 text-sm ${auditResult.error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {auditResult.error ? `✗ ${auditResult.error}` : `✓ Audit complete: ${auditResult.states_covered}/${auditResult.total_states} states covered, ${auditResult.total_flags} flags generated`}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-black/15 bg-white px-3 py-2">
            <Search size={16} className="text-black/40" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search states..." className="bg-transparent text-sm outline-none w-40" />
          </div>
          <div className="flex gap-1.5">
            {['all', 'fully_covered', 'partially_covered', 'minimal', 'uncovered'].map(st => (
              <button key={st} onClick={() => setFilterStatus(st)} className={`rounded-lg px-3 py-2 text-xs font-bold ${filterStatus === st ? 'bg-black text-white' : 'border border-black/15 bg-white hover:bg-black/5'}`}>
                {st === 'all' ? 'All' : COVERAGE_STYLES[st]?.label || st}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-black/30" size={32} /></div>
        ) : (
          <div className="mt-4 space-y-2">
            {filteredStates.map(state => {
              const cov = covMap[state.code];
              const status = cov?.coverage_status || 'uncovered';
              const style = COVERAGE_STYLES[status] || COVERAGE_STYLES.uncovered;
              const stateFlags = flagsByState[state.code] || [];
              const isExpanded = expandedState === state.code;

              return (
                <div key={state.code} className="overflow-hidden rounded-xl border border-black/10 bg-white">
                  <button onClick={() => setExpandedState(isExpanded ? null : state.code)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-black/[.02]">
                    <span className={`h-3 w-3 shrink-0 rounded-full ${style.dot}`} />
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-black/5 text-xs font-black">{state.code}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-black">{state.name}</p>
                      <p className="text-xs text-black/40">{cov ? `${cov.total_sources} sources · ${cov.active_sources} active · ${cov.counties_covered} counties · ${cov.cities_covered} cities` : 'No sources configured'}</p>
                    </div>
                    {stateFlags.length > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700"><Flag size={11} /> {stateFlags.length}</span>
                    )}
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${style.cls}`}>{style.label}</span>
                    <ChevronDown size={18} className={`shrink-0 text-black/30 transition ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  {isExpanded && (
                    <div className="border-t border-black/10 bg-[#fafafa] p-4">
                      {cov ? (
                        <div className="grid gap-4 lg:grid-cols-3">
                          <div>
                            <p className="mb-2 text-xs font-black uppercase text-black/40">Sources Tracked</p>
                            {cov.source_names ? (
                              <div className="space-y-1">
                                {JSON.parse(cov.source_names || '[]').map((name, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs"><Database size={12} className="text-black/40" /> {name}</div>
                                ))}
                              </div>
                            ) : <p className="text-xs text-black/40">No sources</p>}
                          </div>
                          <div>
                            <p className="mb-2 text-xs font-black uppercase text-black/40">Data Collected</p>
                            <div className="flex flex-wrap gap-1.5">
                              {cov.data_types_collected ? JSON.parse(cov.data_types_collected || '[]').map((dt, i) => (
                                <span key={i} className="rounded bg-blue-100 px-2 py-1 text-[10px] font-bold text-blue-700">{dt}</span>
                              )) : <span className="text-xs text-black/40">None</span>}
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              <div className="rounded-lg bg-white p-2 text-center"><p className="text-lg font-black">{cov.counties_covered || 0}</p><p className="text-[10px] text-black/40">Counties</p></div>
                              <div className="rounded-lg bg-white p-2 text-center"><p className="text-lg font-black">{cov.cities_covered || 0}</p><p className="text-[10px] text-black/40">Cities</p></div>
                              <div className="rounded-lg bg-white p-2 text-center"><p className="text-lg font-black">{cov.building_depts_tracked || 0}</p><p className="text-[10px] text-black/40">Building Depts</p></div>
                              <div className="rounded-lg bg-white p-2 text-center"><p className="text-lg font-black">{cov.active_sources || 0}</p><p className="text-[10px] text-black/40">Active</p></div>
                            </div>
                          </div>
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-black uppercase text-black/40">Flags & Issues</p>
                              {stateFlags.some(f => f.auto_fix_available) && (
                                <button onClick={() => fixAllForState(state.code)} className="flex items-center gap-1 rounded bg-[#f2df0d] px-2 py-1 text-[10px] font-black"><Wrench size={10} /> Fix All</button>
                              )}
                            </div>
                            {stateFlags.length === 0 ? (
                              <div className="flex items-center gap-2 text-xs text-emerald-600"><CheckCircle2 size={14} /> No issues flagged</div>
                            ) : (
                              <div className="space-y-2">
                                {stateFlags.map(f => (
                                  <div key={f.id} className="rounded-lg border border-black/10 bg-white p-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <span className={`h-2 w-2 rounded-full ${f.severity === 'critical' ? 'bg-red-500' : f.severity === 'high' ? 'bg-orange-500' : 'bg-amber-500'}`} />
                                          <p className="text-xs font-bold">{f.title}</p>
                                        </div>
                                        <p className="mt-1 text-[11px] text-black/50">{f.description}</p>
                                        {f.fix_description && <p className="mt-1.5 flex items-start gap-1 text-[11px] text-emerald-700"><Wrench size={11} className="mt-0.5 shrink-0" /> {f.fix_description}</p>}
                                      </div>
                                      {f.auto_fix_available && (
                                        <button onClick={() => fixFlag(f.id)} disabled={fixing[f.id]} className="shrink-0 rounded bg-black px-2 py-1 text-[10px] font-black text-white disabled:opacity-50">
                                          {fixing[f.id] ? <Loader2 size={10} className="animate-spin" /> : 'Fix'}
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center">
                          <AlertTriangle size={24} className="mx-auto text-red-400" />
                          <p className="mt-2 text-sm font-bold text-red-600">No coverage for {state.name}</p>
                          <p className="text-xs text-black/50">Run a full audit or discover sources for this state.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}