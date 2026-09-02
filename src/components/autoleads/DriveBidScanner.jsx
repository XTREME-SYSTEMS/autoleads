import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import { Scan, FileText, CheckCircle2, AlertCircle, Loader2, HardDrive } from "lucide-react";

export default function DriveBidScanner() {
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setScanning(true);
    setError(null);
    setResults(null);
    try {
      const res = await base44.functions.invoke("scanDriveBids", {});
      setResults(res);
    } catch (e) {
      setError(e.message || "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="mb-6 p-5">
      <div className="mb-3 flex items-center gap-2">
        <HardDrive size={18} className="text-[#b0a209]" />
        <h2 className="text-lg font-black">Google Drive Bid Scanner</h2>
      </div>
      <p className="mb-4 text-sm leading-6 text-black/55">
        Automatically scan PDF bid documents in your connected Google Drive. The AI extracts project scopes, identifies construction systems from the scope library, and creates new project records — all tagged with the matching system specifications.
      </p>
      <PrimaryButton onClick={handleScan} disabled={scanning}>
        {scanning ? (
          <><Loader2 size={16} className="animate-spin" /> Scanning Drive…</>
        ) : (
          <><Scan size={16} /> Scan Drive for Bid Documents</>
        )}
      </PrimaryButton>

      {error && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {results && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-green-700">
            <CheckCircle2 size={16} />
            Scanned {results.scanned} PDF file{results.scanned !== 1 ? "s" : ""} · {results.totalCreated} project{results.totalCreated !== 1 ? "s" : ""} created
          </div>
          {results.results?.map((r, i) => (
            <div key={i} className="rounded-lg border border-black/10 p-3">
              <div className="flex items-center gap-2">
                <FileText size={14} className="shrink-0 text-black/40" />
                <span className="text-sm font-bold">{r.name}</span>
              </div>
              {r.error ? (
                <p className="mt-1 text-xs text-red-600">{r.error}</p>
              ) : (
                <div className="mt-1 space-y-1">
                  <p className="text-xs text-black/50">
                    {r.projectsFound} project{r.projectsFound !== 1 ? "s" : ""} found · {r.created} created
                  </p>
                  {r.identifiedSystems && (
                    <p className="text-xs text-[#b0a209]">
                      Systems: {r.identifiedSystems}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}