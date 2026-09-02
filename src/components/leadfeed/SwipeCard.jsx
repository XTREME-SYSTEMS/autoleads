import React from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { MapPin, Clock, Briefcase, Check, TrendingUp, Building2 } from "lucide-react";

function money(n){ return n!=null && !isNaN(n) ? `$${Number(n).toLocaleString()}` : "—"; }
function fmtDate(d){ try { return new Date(d).toLocaleDateString(undefined,{month:'short',day:'numeric'}); } catch { return ""; } }
function daysUntil(d){ if(!d) return null; const diff=new Date(d)-new Date(); return Math.ceil(diff/86400000); }

export default function SwipeCard({ project, onSwipe, index, isTop }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-18, 18]);
  const opacityRight = useTransform(x, [30, 150], [0, 1]);
  const opacityLeft = useTransform(x, [-150, -30], [1, 0]);
  const cardScale = useTransform(x, [-200, 0, 200], [0.98, 1, 0.98]);

  const handleDragEnd = (event, info) => {
    if (info.offset.x > 120) onSwipe(project, "pursue");
    else if (info.offset.x < -120) onSwipe(project, "skip");
  };

  const dueDays = daysUntil(project?.bid_due_date);
  const dueColor = dueDays != null ? (dueDays <= 2 ? "text-red-500" : dueDays <= 7 ? "text-amber-500" : "text-black/50") : "text-black/50";
  const dueBg = dueDays != null ? (dueDays <= 2 ? "bg-red-50 dark:bg-red-500/10" : dueDays <= 7 ? "bg-amber-50 dark:bg-amber-500/10" : "bg-black/5") : "bg-black/5";
  const tradeMatch = project?.trade && project.confidence != null && project.confidence > 0.6;
  const confidencePct = project?.confidence != null ? Math.round(project.confidence * 100) : null;

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate, scale: cardScale, zIndex: isTop ? 10 : 10 - index }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={handleDragEnd}
      initial={{ scale: 1, y: 0 }}
      animate={{ scale: isTop ? 1 : 0.94, y: isTop ? 0 : 12 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-[0_10px_40px_-15px_rgba(0,0,0,0.25),0_4px_12px_-6px_rgba(0,0,0,0.1)]">
        {/* Gold gradient header with value */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#f2df0d] via-[#f4e431] to-[#e5cd08] px-5 py-5">
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-black/5"/>
          <div className="pointer-events-none absolute -right-4 top-10 h-16 w-16 rounded-full bg-white/10"/>

          <div className="relative flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Building2 size={11} className="text-black/60"/>
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-black/60">{project.authority || "Source"}</p>
              </div>
              <p className="mt-1.5 text-3xl font-black leading-none tracking-tight text-black">{money(project.value)}</p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-black/50">Project Value</p>
            </div>
            {tradeMatch && (
              <span className="ml-2 shrink-0 inline-flex items-center gap-1 rounded-full bg-black px-3 py-1.5 text-[10px] font-black text-[#f2df0d] shadow-md">
                <Check size={10}/> TRADE MATCH
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col p-5">
          <h2 className="text-lg font-black leading-snug text-foreground">{project.title}</h2>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap gap-2">
            {project.trade && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground/70">
                <Briefcase size={11}/> {project.trade}
              </span>
            )}
            {project.jurisdiction && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-[11px] font-bold text-foreground/70">
                <MapPin size={11}/> {project.jurisdiction}
              </span>
            )}
          </div>

          {project.description && (
            <p className="mt-3 line-clamp-3 text-sm leading-5 text-muted-foreground">{project.description}</p>
          )}

          {/* Due date badge */}
          {project.bid_due_date && (
            <div className="mt-auto pt-4">
              <div className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 ${dueBg}`}>
                <Clock size={14} className={dueColor}/>
                <span className={`text-sm font-black ${dueColor}`}>
                  {dueDays != null ? (dueDays <= 0 ? "DUE TODAY" : dueDays === 1 ? "DUE TOMORROW" : `${dueDays} days left`) : ""}
                </span>
                <span className="text-xs text-muted-foreground">· {fmtDate(project.bid_due_date)}</span>
              </div>
            </div>
          )}

          {/* Confidence bar */}
          {confidencePct != null && (
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                <span className="inline-flex items-center gap-1"><TrendingUp size={10}/> AI Match Confidence</span>
                <span className={confidencePct >= 70 ? "text-emerald-600" : confidencePct >= 40 ? "text-amber-600" : "text-red-500"}>{confidencePct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${confidencePct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut", delay: 0.1 }}
                  className={`h-full rounded-full ${confidencePct >= 70 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" : confidencePct >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-red-400 to-red-500"}`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Swipe indicators */}
        <motion.div style={{ opacity: opacityLeft }} className="pointer-events-none absolute left-6 top-6 z-20 rotate-[-12deg] rounded-xl border-2 border-red-500 bg-red-500/10 px-4 py-1.5 text-lg font-black text-red-500 shadow-lg backdrop-blur-sm">
          SKIP
        </motion.div>
        <motion.div style={{ opacity: opacityRight }} className="pointer-events-none absolute right-6 top-6 z-20 rotate-[12deg] rounded-xl border-2 border-emerald-500 bg-emerald-500/10 px-4 py-1.5 text-lg font-black text-emerald-500 shadow-lg backdrop-blur-sm">
          PURSUE
        </motion.div>
      </div>
    </motion.div>
  );
}