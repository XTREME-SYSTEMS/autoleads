import React from "react";
import { motion } from "framer-motion";
import { TrendingDown, Trophy, Target } from "lucide-react";

export default function MoneyOnTable({ pursued, skipped, wonValue, skippedValue }) {
  const totalSeen = pursued + skipped;
  const pursueRate = totalSeen > 0 ? Math.round((pursued / totalSeen) * 100) : 0;

  const stats = [
    { label: "Skipped Value", value: `$${Math.round(skippedValue / 1000)}K`, icon: TrendingDown, color: "text-red-500", bg: "bg-red-50 dark:bg-red-500/10", border: "border-red-100 dark:border-red-500/20" },
    { label: "Won", value: `$${Math.round(wonValue / 1000)}K`, icon: Trophy, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10", border: "border-emerald-100 dark:border-emerald-500/20" },
    { label: "Pursued", value: pursued, icon: Target, color: "text-[#b0a209]", bg: "bg-[#fdfbe1] dark:bg-[#f2df0d]/10", border: "border-[#f2df0d]/30" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 shadow-[0_4px_20px_-8px_rgba(0,0,0,0.1)]"
    >
      <div className="flex items-center gap-2.5 border-b border-border/50 px-4 py-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10">
          <TrendingDown size={17}/>
        </span>
        <div>
          <p className="text-sm font-black text-foreground">Money on the Table</p>
          <p className="text-[11px] text-muted-foreground">Bids you skipped that matched your trade</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-px bg-border/40">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, duration: 0.25 }}
              className="bg-card p-3.5"
            >
              <span className={`mb-2 inline-grid h-7 w-7 place-items-center rounded-lg ${stat.bg} ${stat.color}`}>
                <Icon size={14}/>
              </span>
              <p className={`text-2xl font-black leading-none ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
          <span>Pursuit Rate</span>
          <span className={pursueRate >= 50 ? "text-emerald-600" : "text-[#b0a209]"}>{pursueRate}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pursueRate}%` }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            className="h-full rounded-full bg-gradient-to-r from-[#f2df0d] to-[#f4e431]"
          />
        </div>
      </div>
    </motion.div>
  );
}