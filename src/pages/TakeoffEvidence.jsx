import React from "react";
import { AlertTriangle, CheckCircle2, Layers3, Maximize2, Ruler, ScanSearch } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, SecondaryAction, PrimaryAction, DataRow } from "@/components/CommercialMobileUI";

export default function TakeoffEvidence() {
  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Takeoff Evidence</IndustrialTitle>

    <div className="mb-3 grid grid-cols-2 gap-2">
      <SecondaryAction><Layers3 size={16}/>Compare Revision</SecondaryAction>
      <PrimaryAction><CheckCircle2 size={16}/>Approve Items</PrimaryAction>
    </div>

    <Surface className="mb-3 overflow-hidden">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
        <p className="font-brand text-[14px] font-bold uppercase tracking-[.035em]">Plan & Spec Evidence</p>
        <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">Review Required</span>
      </div>
      <div className="grid min-h-[400px] place-items-center bg-[#f6f6f6] p-8 text-center">
        <div>
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-dashed border-black/20 bg-white text-black/40"><ScanSearch size={29}/></span>
          <h3 className="mt-4 font-brand text-lg font-bold uppercase">Upload or select plans</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-black/50">The plan viewer will display highlighted measurement regions, sheet references, calibration, and specification citations.</p>
          <div className="mt-4 flex justify-center"><PrimaryAction className="max-w-[200px]">Choose Document</PrimaryAction></div>
        </div>
      </div>
    </Surface>

    <Surface className="mb-3 p-4">
      <p className="mb-3 font-brand text-[14px] font-bold uppercase tracking-[.035em]">Selected Quantity</p>
      <DataRow label="Sheet" value="—"/>
      <DataRow label="Detail / region" value="—"/>
      <DataRow label="Detected scale" value="—"/>
      <DataRow label="Measurement formula" value="—"/>
      <DataRow label="Raw quantity" value="—"/>
      <DataRow label="Waste factor" value="—"/>
      <DataRow label="Final quantity" value="—" accent/>
      <DataRow label="Confidence" value="—"/>
    </Surface>

    <Surface className="p-4">
      <p className="mb-3 font-brand text-[14px] font-bold uppercase tracking-[.035em]">Review Checks</p>
      <div className="space-y-2">
        {[[Ruler, "Scale confirmed"], [Maximize2, "Geometry confirmed"], [AlertTriangle, "Plan/spec conflict checked"]].map(([Icon, t]) => (
          <label key={t} className="flex min-h-12 items-center gap-3 rounded-lg border border-black/10 p-3 text-sm font-bold">
            <input type="checkbox" className="h-5 w-5 accent-[#FFC400]"/>
            <Icon size={17}/>
            {t}
          </label>
        ))}
      </div>
    </Surface>
  </CommercialPage>;
}