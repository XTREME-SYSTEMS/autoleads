import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { SCOPE_SYSTEMS, ALL_SYSTEMS, identifySystems, getSystemSummary } from "@/lib/scopeSystems";
import { Page, Card, Field, inputClass, StatusPanel } from "@/components/autoleads/UiPrimitives";
import { Search, Layers, DollarSign, Package, FileText, CheckCircle2, AlertCircle, Database, Tag } from "lucide-react";
import DriveBidScanner from "@/components/autoleads/DriveBidScanner";

export default function ScopeSystems() {
  const [searchText, setSearchText] = useState("");
  const [selectedScope, setSelectedScope] = useState(null);
  const [expandedSystem, setExpandedSystem] = useState(null);
  const [dbSystems, setDbSystems] = useState(null);
  const [dbLoading, setDbLoading] = useState(true);

  // Load scope systems from the database entity
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const records = await base44.entities.ScopeSystem.list("-created_date", 200);
        if (mounted) setDbSystems(records || []);
      } catch {
        if (mounted) setDbSystems([]);
      } finally {
        if (mounted) setDbLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const _summary = useMemo(() => getSystemSummary(), []);
  const _totalSystems = ALL_SYSTEMS.length;
  const _totalScopes = Object.keys(SCOPE_SYSTEMS).length;

  const identified = useMemo(() => {
    if (!searchText.trim()) return [];
    return identifySystems(searchText);
  }, [searchText]);

  // Use database records if available, otherwise fall back to static data
  const useDb = dbSystems && dbSystems.length > 0;
  const allSystemsForGrid = useDb
    ? dbSystems.map(r => ({
        code: r.code,
        name: r.name,
        scope: r.scope,
        description: r.description || "",
        aliases: r.aliases || [],
        specifications: r.specifications ? (typeof r.specifications === "string" ? JSON.parse(r.specifications) : r.specifications) : {},
        materials: r.materials || [],
        unit: r.unit || "SF",
        typical_price_low: r.price_low || 0,
        typical_price_high: r.price_high || 0,
        tags: r.tags || [],
      }))
    : ALL_SYSTEMS;

  const scopes = [...new Set(allSystemsForGrid.map(s => s.scope))].sort();
  const systemsToShow = selectedScope ? allSystemsForGrid.filter(s => s.scope === selectedScope) : allSystemsForGrid;

  return (
    <Page
      title="Scope Systems Library"
      description={`Database of ${allSystemsForGrid.length} construction system types across ${scopes.length} scopes. Each system has detailed specifications, materials, and pricing ranges. The system automatically identifies the correct system type from project descriptions, bid documents, and specs.`}
      eyebrow="CONSTRUCTION INTELLIGENCE"
      backTo="/settings"
    >
      {/* Drive Bid Scanner */}
      <DriveBidScanner />

      {/* Database Status Badge */}
      <div className="mb-4 flex items-center gap-2">
        <Database size={14} className={useDb ? "text-green-600" : "text-black/30"} />
        <span className="text-xs font-bold">
          {dbLoading ? "Loading from database…" : useDb ? `${dbSystems.length} systems loaded from database` : "Showing static reference data — seed database to enable editing"}
        </span>
      </div>

      {/* System Identification Tester */}
      <Card className="mb-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Search size={18} className="text-[#b0a209]" />
          <h2 className="text-lg font-black">System Identification Tester</h2>
        </div>
        <p className="mb-3 text-sm text-black/55">
          Paste project description, specs, or bid document text to test which system types the system identifies.
        </p>
        <Field label="Project Text">
          <textarea
            className={inputClass + " min-h-[100px] resize-y"}
            placeholder="e.g. Install flake epoxy floor system in commercial garage, 5,000 SF. Full broadcast vinyl flakes with two coats clear polyaspartic topcoat..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </Field>

        {identified.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-black uppercase tracking-wider text-[#b0a209]">Identified Systems</p>
            {identified.map((match, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border border-[#f2df0d]/30 bg-[#fcf9cf]/40 p-3">
                <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{match.system.name}</span>
                    <span className="rounded bg-black/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black/50">{match.scope}</span>
                  </div>
                  <p className="mt-1 text-xs text-black/50">
                    Matched: {match.matchedAliases.join(", ")} · Confidence: {Math.round(match.confidence * 100)}% · ${match.system.typical_price_low.toFixed(2)}-${match.system.typical_price_high.toFixed(2)}/{match.system.unit}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchText.trim() && identified.length === 0 && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
            <AlertCircle size={16} />
            No system types matched this text. Try adding more specific keywords like "flake epoxy", "800 grit polish", or "TPO membrane".
          </div>
        )}
      </Card>

      {/* Scope Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${!selectedScope ? "bg-[#f2df0d] text-black" : "border border-black/10 bg-white hover:bg-black/[.02]"}`}
          onClick={() => setSelectedScope(null)}
        >
          All Scopes ({allSystemsForGrid.length})
        </button>
        {scopes.map(scope => {
          const count = allSystemsForGrid.filter(s => s.scope === scope).length;
          return (
            <button
              key={scope}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${selectedScope === scope ? "bg-[#f2df0d] text-black" : "border border-black/10 bg-white hover:bg-black/[.02]"}`}
              onClick={() => setSelectedScope(scope)}
            >
              {scope} ({count})
            </button>
          );
        })}
      </div>

      {/* Systems Grid */}
      {dbLoading ? (
        <StatusPanel state="loading" />
      ) : (
        <div className="grid gap-4">
          {systemsToShow.map((sys) => {
            const isExpanded = expandedSystem === sys.code;
            const scope = sys.scope || selectedScope;
            return (
              <Card key={sys.code} className="overflow-hidden">
                <button
                  className="flex w-full items-start justify-between gap-4 p-5 text-left"
                  onClick={() => setExpandedSystem(isExpanded ? null : sys.code)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-[#0b0b0b] px-2 py-0.5 text-[10px] font-black tracking-wider text-white">{sys.code}</span>
                      <h3 className="text-base font-black">{sys.name}</h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-black/55">{sys.description}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center gap-1 font-bold text-[#b0a209]">
                        <DollarSign size={13} />
                        {Number(sys.typical_price_low || 0).toFixed(2)}-{Number(sys.typical_price_high || 0).toFixed(2)}/{sys.unit}
                      </span>
                      <span className="flex items-center gap-1 text-black/40">
                        <Layers size={13} />
                        {scope}
                      </span>
                      <span className="flex items-center gap-1 text-black/40">
                        <Package size={13} />
                        {sys.materials.length} materials
                      </span>
                      {useDb && sys.tags && sys.tags.length > 0 && (
                        <span className="flex items-center gap-1 text-black/40">
                          <Tag size={13} />
                          {sys.tags.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-black/5 bg-black/[.015] p-5">
                    {/* Specifications */}
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black/40">
                        <FileText size={13} /> Specifications
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {Object.entries(sys.specifications).map(([key, value]) => (
                          <div key={key} className="rounded-lg border border-black/5 bg-white p-3">
                            <p className="text-[10px] font-black uppercase tracking-wider text-black/40">{key.replace(/_/g, " ")}</p>
                            <p className="mt-1 text-xs leading-5 text-black/70">{value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Materials */}
                    <div className="mb-4">
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-black/40">
                        <Package size={13} /> Materials & Coverage
                      </p>
                      <div className="space-y-1.5">
                        {sys.materials.map((mat, i) => (
                          <div key={i} className="flex items-center justify-between rounded-lg border border-black/5 bg-white px-3 py-2">
                            <span className="text-sm font-medium">{mat.material}</span>
                            <div className="flex items-center gap-3 text-xs text-black/50">
                              <span className="font-bold">{mat.unit}</span>
                              <span>{mat.coverage}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Aliases */}
                    <div>
                      <p className="mb-2 text-xs font-black uppercase tracking-wider text-black/40">Identification Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {sys.aliases.map(alias => (
                          <span key={alias} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[11px] font-medium text-black/60">{alias}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </Page>
  );
}