import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ to, label = "Back", className = "", fallback = "/dashboard" }) {
  const nav = useNavigate();
  const handleClick = () => {
    if (to) { nav(to); return; }
    // If there's real browser history, go back; otherwise fall back to a safe route.
    const hasHistory = window.history.state && typeof window.history.state.idx === "number" && window.history.state.idx > 0;
    if (hasHistory) nav(-1);
    else nav(fallback);
  };
  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground transition hover:border-foreground/20 hover:bg-muted ${className}`}
    >
      <ArrowLeft size={14} /> {label}
    </button>
  );
}