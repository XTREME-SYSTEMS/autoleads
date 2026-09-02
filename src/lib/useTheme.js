import { useEffect, useState, useCallback } from "react";

const STORAGE_KEY = "autoleads_theme";

function getSystemPref() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "system";
  } catch {
    return "system";
  }
}

function applyTheme(preference) {
  const resolved = preference === "system" ? getSystemPref() : preference;
  const root = document.documentElement;
  if (resolved === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0B0B0B" : "#f2df0d");
}

export function useTheme() {
  const [preference, setPreference] = useState(getStored);

  useEffect(() => {
    applyTheme(preference);
    try { localStorage.setItem(STORAGE_KEY, preference); } catch {}
  }, [preference]);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const toggle = useCallback(() => {
    const current = preference === "system" ? getSystemPref() : preference;
    setPreference(current === "dark" ? "light" : "dark");
  }, [preference]);

  const resolved = preference === "system" ? getSystemPref() : preference;
  return { preference, resolved, toggle, setPreference };
}