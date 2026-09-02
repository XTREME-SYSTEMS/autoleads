import React, { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";

const CATEGORIES = [
  { key: "city", label: "City", color: "#3b82f6" },
  { key: "county", label: "County", color: "#8b5cf6" },
  { key: "state", label: "State", color: "#10b981" },
  { key: "region", label: "Region", color: "#f59e0b" },
  { key: "national", label: "National", color: "#6b7280" },
  { key: "winning_bid", label: "Winning Bid", color: "#f2df0d" },
];

export default function PricingComparisonChart({ timeline = [] }) {
  const data = useMemo(() => {
    return (timeline || []).map(t => {
      const row = { date: t.date };
      CATEGORIES.forEach(c => {
        const val = t[c.key];
        row[c.key] = val != null && !isNaN(Number(val)) ? Number(val) : null;
      });
      return row;
    });
  }, [timeline]);

  const projectedIndex = useMemo(() => data.findIndex(d => {
    // find first projected point
    const src = (timeline || []).find(t => t.date === d.date);
    return src?.projected;
  }), [data, timeline]);

  if (data.length === 0) {
    return (
      <div className="grid h-48 place-items-center rounded-lg border border-dashed border-black/15 text-sm text-black/40">
        No pricing history to chart yet. Run the scrape to populate.
      </div>
    );
  }

  const refX = projectedIndex >= 0 ? data[projectedIndex].date : null;

  return (
    <div className="rounded-lg border border-black/10 bg-white p-4">
      <p className="mb-1 text-xs font-black uppercase tracking-wide text-black/50">Pricing Trend & Forecast</p>
      <p className="mb-3 text-[11px] text-black/40">Average price per unit across geographic levels vs. winning bid — solid = history, dashed = projected</p>
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 600 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
          <Tooltip
            contentStyle={{ borderRadius: 10, border: "1px solid #00000015", fontSize: 12, fontWeight: 600 }}
            formatter={(v) => (v != null ? `$${Number(v).toLocaleString()}` : "—")}
          />
          <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
          {refX && <ReferenceLine x={refX} stroke="#f2df0d" strokeDasharray="4 4" label={{ value: "Projected →", position: "top", fill: "#b0a209", fontSize: 10, fontWeight: 700 }} />}
          {CATEGORIES.map(c => {
            const isProjected = projectedIndex >= 0;
            return (
              <Line
                key={c.key}
                type="monotone"
                dataKey={c.key}
                name={c.label}
                stroke={c.color}
                strokeWidth={c.key === "winning_bid" ? 3 : 2}
                dot={{ r: 3 }}
                connectNulls
                strokeDasharray={isProjected ? "0" : undefined}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-3 flex flex-wrap gap-3">
        {CATEGORIES.map(c => (
          <span key={c.key} className="flex items-center gap-1.5 text-[11px] font-bold text-black/60">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.label}
          </span>
        ))}
      </div>
    </div>
  );
}