import React, { useEffect, useState } from "react";
import { ShieldCheck, AlertCircle, Loader2, RefreshCw, CheckCircle2, XCircle, Wrench, FileText, Package, ChevronDown, ChevronUp } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { BackLink, CommercialPage, IndustrialTitle, Surface, StatusPill } from "@/components/CommercialMobileUI";

const GATES = {
  lead_intake: { name: "Lead Intake", subtitle: "Gate 1 — Before human review", Icon: FileText, color: "#3b82f6" },
  prepared_takeoff: { name: "Prepared Takeoff", subtitle: "Gate 2 — Before takeoff review", Icon: Wrench, color: "#8b5cf6" },
  bid_package: { name: "Bid Package", subtitle: "Gate 3 — Before delivery", Icon: Package, color: "#E9A900" },
};

export default function ValidationGateDashboard() {
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [expandedLog, setExpandedLog] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [logData, projectData] = await Promise.all([
          base44.entities.ValidationLog.list('-created_date', 50).catch(() => []),
          base44.entities.Project.filter({ detected_state: "FL" }, '-created_date', 30).catch(() => []),
        ]);
        setLogs((logData || []).filter(l => l.data_class !== "NON_PRODUCTION_EXAMPLE"));
        setProjects((projectData || []).filter(p => p.data_class !== "NON_PRODUCTION_EXAMPLE"));
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const runGate = async (gate, projectId) => {
    setRunning(`${gate}:${projectId}`);
    try {
      const result = await base44.functions.invoke('validationGate', { gate, project_id: projectId, auto_remediate: true });
      setToast({ type: result.validation_status === 'passed' || result.validation_status === 'remediated' ? 'success' : 'error', msg: `${GATES[gate].name}: ${result.summary}` });
      // Refresh logs
      const logData = await base44.entities.ValidationLog.list('-created_date', 50).catch(() => []);
      setLogs((logData || []).filter(l => l.data_class !== "NON_PRODUCTION_EXAMPLE"));
    } catch (err) {
      setToast({ type: 'error', msg: err.message || 'Validation failed' });
    }
    finally { setRunning(null); }
    setTimeout(() => setToast(null), 4000);
  };

  const runAllGatesForProject = async (projectId) => {
    for (const gate of ["lead_intake", "prepared_takeoff", "bid_package"]) {
      await runGate(gate, projectId);
    }
  };

  if (loading) {
    return <CommercialPage><BackLink to="/dashboard"/><IndustrialTitle compact>Validation Gates</IndustrialTitle><Surface className="p-8 text-center text-sm text-black/45">Loading validation system…</Surface></CommercialPage>;
  }

  return (
    <CommercialPage>
      <BackLink to="/dashboard" label="Back to Home"/>
      <IndustrialTitle compact>Validation Gates</IndustrialTitle>
      <p className="mb-4 text-sm text-black/55">Mandatory checklists at every step. If something's missing, the system auto-fixes it before you see it. No one gets embarrassed.</p>

      {/* Gate overview cards */}
      <div className="mb-5 space-y-2">
        {Object.entries(GATES).map(([key, gate]) => {
          const gateLogs = logs.filter(l => l.gate === key);
          const passed = gateLogs.filter(l => l.status === 'passed' || l.status === 'remediated').length;
          const blocked = gateLogs.filter(l => l.status === 'blocked' || l.status === 'failed').length;
          return (
            <Surface key={key} className="p-3">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg" style={{ background: `${gate.color}15`, color: gate.color }}><gate.Icon size={20}/></span>
                <div className="min-w-0 flex-1">
                  <p className="font-brand text-sm font-bold uppercase">{gate.name}</p>
                  <p className="text-xs text-black/45">{gate.subtitle}</p>
                </div>
                <div className="flex gap-1.5">
                  {passed > 0 && <StatusPill tone="success">{passed} passed</StatusPill>}
                  {blocked > 0 && <StatusPill tone="danger">{blocked} blocked</StatusPill>}
                </div>
              </div>
            </Surface>
          );
        })}
      </div>

      {/* Projects to validate */}
      {projects.length > 0 && (
        <div className="mb-5">
          <p className="mb-2 font-brand text-[13px] font-bold uppercase tracking-wide text-[#E9A900]">Florida Projects — Run Validation</p>
          <div className="space-y-2">
            {projects.slice(0, 10).map(p => (
              <Surface key={p.id} className="p-3">
                <p className="truncate text-sm font-bold">{p.title}</p>
                <p className="text-xs text-black/45">{p.jurisdiction || 'N/A'} · {p.trade || 'N/A'}</p>
                <div className="mt-2 flex gap-1.5">
                  {Object.entries(GATES).map(([gateKey, gate]) => (
                    <button
                      key={gateKey}
                      onClick={() => runGate(gateKey, p.id)}
                      disabled={running === `${gateKey}:${p.id}`}
                      className="flex min-h-9 flex-1 items-center justify-center gap-1 rounded-lg border border-black/10 bg-white text-[10px] font-bold uppercase disabled:opacity-50"
                    >
                      {running === `${gateKey}:${p.id}` ? <Loader2 size={12} className="animate-spin"/> : <gate.Icon size={12}/>}
                      {gate.name.split(' ')[0]}
                    </button>
                  ))}
                  <button
                    onClick={() => runAllGatesForProject(p.id)}
                    disabled={running?.includes(p.id)}
                    className="flex min-h-9 items-center justify-center gap-1 rounded-lg bg-[#FFC400] px-3 text-[10px] font-bold uppercase text-black disabled:opacity-50"
                  >
                    <RefreshCw size={12}/> All
                  </button>
                </div>
              </Surface>
            ))}
          </div>
        </div>
      )}

      {/* Validation logs */}
      <p className="mb-2 font-brand text-[13px] font-bold uppercase tracking-wide text-[#E9A900]">Validation Log</p>
      {logs.length === 0 ? (
        <Surface className="p-6 text-center text-sm text-black/45">No validations yet. Run a gate above to start logging.</Surface>
      ) : (
        <div className="space-y-2">
          {logs.slice(0, 20).map(log => {
            const checklist = (() => { try { return JSON.parse(log.checklist); } catch { return []; } })();
            const remediations = (() => { try { return JSON.parse(log.remediation_actions || '[]'); } catch { return []; } })();
            const isExpanded = expandedLog === log.id;
            const gate = GATES[log.gate] || { name: log.gate, Icon: FileText, color: '#666' };
            return (
              <Surface key={log.id} className="p-3">
                <button onClick={() => setExpandedLog(isExpanded ? null : log.id)} className="flex w-full items-center gap-2 text-left">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${gate.color}15`, color: gate.color }}><gate.Icon size={15}/></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{gate.name} · {log.passed_count}/{log.passed_count + log.failed_count}</p>
                    <p className="text-[10px] text-black/40">{new Date(log.created_date).toLocaleString()}</p>
                  </div>
                  {log.status === 'passed' && <CheckCircle2 size={16} className="text-emerald-500"/>}
                  {log.status === 'remediated' && <ShieldCheck size={16} className="text-blue-500"/>}
                  {log.status === 'blocked' && <AlertCircle size={16} className="text-red-500"/>}
                  {log.status === 'failed' && <XCircle size={16} className="text-red-500"/>}
                  {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                </button>
                {isExpanded && (
                  <div className="mt-2 space-y-1 border-t border-black/[.06] pt-2">
                    {checklist.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        {item.passed ? <CheckCircle2 size={12} className="text-emerald-500"/> : <XCircle size={12} className="text-red-500"/>}
                        <span className={item.passed ? 'text-black/70' : 'text-red-600 font-semibold'}>{item.label}</span>
                        {!item.passed && item.remediation && <span className="ml-auto text-[9px] font-bold uppercase text-blue-500">→ {item.remediation}</span>}
                      </div>
                    ))}
                    {remediations.length > 0 && (
                      <div className="mt-2 rounded-lg bg-blue-50 p-2">
                        <p className="text-[10px] font-bold uppercase text-blue-700">Remediation Actions:</p>
                        {remediations.map((r, i) => (
                          <p key={i} className="text-xs text-blue-800">• {r.function}: {r.success ? '✅ Fixed' : '❌ Failed'}</p>
                        ))}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-black/40">{log.summary}</p>
                  </div>
                )}
              </Surface>
            );
          })}
        </div>
      )}

      {toast && <div className={`fixed inset-x-4 bottom-24 z-[100] rounded-xl p-3 text-center text-sm font-bold text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>{toast.msg}</div>}
    </CommercialPage>
  );
}