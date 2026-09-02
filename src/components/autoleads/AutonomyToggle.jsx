import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

const OPTIONS = [
  { value: "manual", label: "Manual", desc: "You review everything" },
  { value: "semi_auto", label: "Hybrid", desc: "AI prepares, you approve" },
  { value: "full_auto", label: "Full Auto", desc: "AI runs autonomously" },
];

export default function AutonomyToggle({ className = "" }) {
  const [level, setLevel] = useState(null);
  const [configId, setConfigId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const configs = await base44.entities.AutomationConfig.list();
        if (configs?.length > 0) {
          setConfigId(configs[0].id);
          setLevel(configs[0].autonomy_level || "semi_auto");
        } else {
          setLevel("semi_auto");
        }
      } catch { setLevel("semi_auto"); }
    })();
  }, []);

  const choose = async (v) => {
    setLevel(v);
    setSaving(true);
    try {
      if (configId) {
        await base44.entities.AutomationConfig.update(configId, { autonomy_level: v });
      } else {
        const created = await base44.entities.AutomationConfig.create({ autonomy_level: v, scrape_cadence: "24h" });
        setConfigId(created.id);
      }
    } catch {} finally { setSaving(false); }
  };

  if (!level) return null;

  return (
    <div className={`inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white p-1 ${className}`}>
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          onClick={() => choose(o.value)}
          disabled={saving}
          title={o.desc}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-black transition ${level === o.value ? "bg-[#f2df0d] text-black" : "text-black/55 hover:bg-black/5"} disabled:opacity-60`}
        >
          {saving && level === o.value ? <Loader2 size={12} className="animate-spin" /> : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}