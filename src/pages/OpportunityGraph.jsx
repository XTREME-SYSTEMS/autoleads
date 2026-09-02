import React, { useState, useMemo } from "react";
import { Building2, Network, RefreshCw, Search, UserRound, MapPin, DollarSign } from "lucide-react";
import { Card, EmptyState, Page, SecondaryButton, SectionTitle, inputClass, StatusPanel } from "@/components/autoleads/UiPrimitives";
import { useEntityList } from "@/hooks/useEntityList";

export default function OpportunityGraph() {
  const [search, setSearch] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [filter, setFilter] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  const projects = useEntityList("Project", { sort: "-created_date", limit: 100, refreshKey });
  const companies = useEntityList("CompanyProfile", { sort: "-created_date", limit: 50, refreshKey });
  const contacts = useEntityList("Contact", { sort: "-created_date", limit: 50, refreshKey });

  const loading = projects.loading || companies.loading || contacts.loading;
  const error = projects.error || companies.error || contacts.error;

  // Build graph nodes from real data
  const graphData = useMemo(() => {
    const projectList = projects.records || [];
    const companyList = companies.records || [];
    const contactList = contacts.records || [];

    const filteredProjects = projectList.filter(p => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (p.title || "").toLowerCase().includes(q) ||
             (p.jurisdiction || "").toLowerCase().includes(q) ||
             (p.authority || "").toLowerCase().includes(q) ||
             (p.trade || "").toLowerCase().includes(q);
    });

    // Group projects by jurisdiction for the graph
    const byJurisdiction = {};
    filteredProjects.forEach(p => {
      const j = p.jurisdiction || "Unknown";
      if (!byJurisdiction[j]) byJurisdiction[j] = [];
      byJurisdiction[j].push(p);
    });

    // Top jurisdictions by project count
    const topJurisdictions = Object.entries(byJurisdiction)
      .sort(([, a], [, b]) => b.length - a.length)
      .slice(0, 6);

    // Top companies by relationship strength
    const topCompanies = companyList
      .filter(c => filter === "all" || c.relationship_strength === filter)
      .sort((a, b) => {
        const order = { strong: 3, moderate: 2, weak: 1, none: 0 };
        return (order[b.relationship_strength] || 0) - (order[a.relationship_strength] || 0);
      })
      .slice(0, 8);

    // Top contacts
    const topContacts = contactList
      .sort((a, b) => {
        const order = { strong: 3, moderate: 2, weak: 1, none: 0 };
        return (order[b.relationship_strength] || 0) - (order[a.relationship_strength] || 0);
      })
      .slice(0, 6);

    // Calculate total pipeline value
    const totalValue = filteredProjects.reduce((sum, p) => sum + (p.value || 0), 0);

    return { topJurisdictions, topCompanies, topContacts, totalValue, projectCount: filteredProjects.length };
  }, [projects.records, companies.records, contacts.records, search, filter]);

  const handleNodeClick = (node) => setSelectedNode(node);

  return (
    <Page backTo="/dashboard" eyebrow="Relationship Intelligence" title="Opportunity Graph"
      description="Connect projects, owners, contractors, contacts, and prior relationships into one explainable graph — powered by live pipeline data."
      actions={<>
        <SecondaryButton onClick={() => setRefreshKey(k => k + 1)}>
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />Refresh
        </SecondaryButton>
      </>}>
      
      {/* Search & Filter Bar */}
      <Card className="p-4 mb-5">
        <div className="grid gap-3 md:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className={`${inputClass} pl-10`} placeholder="Search project, company, contact, jurisdiction…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className={inputClass} value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="all">All relationships</option>
            <option value="strong">Strong relationships</option>
            <option value="moderate">Moderate relationships</option>
            <option value="weak">Weak relationships</option>
            <option value="none">No relationship yet</option>
          </select>
        </div>
      </Card>

      {/* Summary Stats */}
      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Building2 size={20} /></span>
            <div>
              <p className="text-xs font-bold text-muted-foreground">Active Projects</p>
              <p className="text-2xl font-black">{graphData.projectCount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><DollarSign size={20} /></span>
            <div>
              <p className="text-xs font-bold text-muted-foreground">Pipeline Value</p>
              <p className="text-2xl font-black">${Math.round(graphData.totalValue / 1000000).toLocaleString()}M</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Network size={20} /></span>
            <div>
              <p className="text-xs font-bold text-muted-foreground">Jurisdictions</p>
              <p className="text-2xl font-black">{graphData.topJurisdictions.length}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_.55fr]">
        {/* Graph Workspace */}
        <Card className="min-h-[560px] overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <SectionTitle title="Graph Workspace" />
            <span className="text-xs font-bold text-muted-foreground">{graphData.projectCount} nodes</span>
          </div>
          <div className="relative min-h-[500px] overflow-auto bg-[radial-gradient(circle_at_center,rgba(242,223,13,.06),transparent_45%)] p-6">
            <StatusPanel state={loading ? "loading" : error ? "error" : "default"}>
              {graphData.topJurisdictions.length === 0 ? (
                <EmptyState icon={Network} title="No projects found" description="Try adjusting your search or filters to see relationship nodes." minHeight="400px" />
              ) : (
                <div className="mx-auto max-w-3xl space-y-6">
                  {/* Jurisdiction clusters */}
                  {graphData.topJurisdictions.map(([jurisdiction, projectList]) => (
                    <div key={jurisdiction} className="rounded-xl border border-border bg-card/50 p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <MapPin size={16} className="text-[#b0a209]" />
                        <h3 className="text-sm font-black">{jurisdiction}</h3>
                        <span className="ml-auto rounded-full bg-[#fcf9cf] px-2 py-0.5 text-xs font-bold text-[#b0a209]">{projectList.length} projects</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {projectList.slice(0, 6).map(p => (
                          <button key={p.id} onClick={() => handleNodeClick({ type: "project", data: p })}
                            className={`rounded-lg border p-3 text-left transition hover:border-[#f2df0d] ${selectedNode?.data?.id === p.id ? "border-[#f2df0d] bg-[#fcf9cf]" : "border-border bg-background"}`}>
                            <p className="line-clamp-2 text-xs font-bold">{p.title}</p>
                            <div className="mt-1.5 flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">{p.trade || "General"}</span>
                              {p.value > 0 && <span className="text-[10px] font-bold text-[#b0a209]">${(p.value / 1000000).toFixed(1)}M</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StatusPanel>
          </div>
        </Card>

        {/* Side Panel */}
        <div className="space-y-5">
          {/* Relationship Explanation */}
          <Card className="p-5">
            <SectionTitle title="Relationship Explanation" />
            {selectedNode ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#fcf9cf] px-2 py-1 text-[10px] font-black uppercase text-[#b0a209]">{selectedNode.type}</span>
                </div>
                <h3 className="font-black">{selectedNode.data.title || selectedNode.data.name || selectedNode.data.full_name}</h3>
                {selectedNode.data.jurisdiction && <p className="text-sm text-muted-foreground">{selectedNode.data.jurisdiction}</p>}
                {selectedNode.data.description && <p className="line-clamp-3 text-sm text-muted-foreground">{selectedNode.data.description}</p>}
                <div className="space-y-1.5 border-t border-border pt-3">
                  {selectedNode.data.value > 0 && <DataRow label="Value" value={`$${selectedNode.data.value.toLocaleString()}`} />}
                  {selectedNode.data.trade && <DataRow label="Trade" value={selectedNode.data.trade} />}
                  {selectedNode.data.stage && <DataRow label="Stage" value={selectedNode.data.stage} />}
                  {selectedNode.data.authority && <DataRow label="Authority" value={selectedNode.data.authority} />}
                  {selectedNode.data.relationship_strength && <DataRow label="Relationship" value={selectedNode.data.relationship_strength} accent />}
                  {selectedNode.data.email && <DataRow label="Email" value={selectedNode.data.email} />}
                  {selectedNode.data.phone && <DataRow label="Phone" value={selectedNode.data.phone} />}
                </div>
              </div>
            ) : (
              <EmptyState icon={Network} title="Select a graph node" description="Click any project, company, or contact node to see its full relationship details and evidence." minHeight="210px" />
            )}
          </Card>

          {/* Top Companies */}
          <Card className="p-5">
            <SectionTitle title="Key Companies" />
            <div className="space-y-2">
              {(graphData.topCompanies || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No companies yet.</p>
              ) : graphData.topCompanies.map(c => (
                <button key={c.id} onClick={() => handleNodeClick({ type: "company", data: c })}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-[#f2df0d] ${selectedNode?.data?.id === c.id ? "border-[#f2df0d] bg-[#fcf9cf]" : "border-border"}`}>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><Building2 size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.trade || "General"} · {c.city || ""}{c.state ? `, ${c.state}` : ""}</p>
                  </div>
                  {c.relationship_strength && c.relationship_strength !== "none" && (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">{c.relationship_strength}</span>
                  )}
                </button>
              ))}
            </div>
          </Card>

          {/* Top Contacts */}
          <Card className="p-5">
            <SectionTitle title="Key Contacts" />
            <div className="space-y-2">
              {(graphData.topContacts || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No contacts yet.</p>
              ) : graphData.topContacts.map(c => (
                <button key={c.id} onClick={() => handleNodeClick({ type: "contact", data: c })}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition hover:border-[#f2df0d] ${selectedNode?.data?.id === c.id ? "border-[#f2df0d] bg-[#fcf9cf]" : "border-border"}`}>
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted"><UserRound size={15} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold">{c.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.role || "—"}{c.company_name ? ` · ${c.company_name}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

function DataRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-right text-xs font-bold ${accent ? "text-[#b0a209]" : ""}`}>{value || "—"}</span>
    </div>
  );
}