import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Search, Check } from "lucide-react";

export default function MultiSelectDropdown({
  label,
  options, // [{ value, label }]
  selected, // [value]
  onChange, // (next: [value]) => void
  placeholder = "Select…",
  searchable = false,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const toggle = (value) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  };

  const filtered = searchable
    ? options.filter((o) => !query || o.label.toLowerCase().includes(query.toLowerCase()))
    : options;
  const allSelected = filtered.length > 0 && filtered.every((o) => selected.includes(o.value));

  return (
    <div className="relative" ref={ref}>
      {label && (
        <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-[#666] dark:text-white/50">{label}</span>
      )}
      {selected.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selected.map((v) => {
            const opt = options.find((o) => o.value === v);
            return (
              <span key={v} className="inline-flex items-center gap-1 rounded-full bg-[#FFF8E1] px-2.5 py-1 text-[11px] font-bold text-black dark:bg-[#f2df0d]/15 dark:text-[#f2df0d]">
                {opt ? opt.label : v}
                <button onClick={() => toggle(v)} className="grid h-4 w-4 place-items-center rounded-full hover:bg-black/10">
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-3 text-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white disabled:opacity-50"
      >
        <span className={selected.length ? "text-black dark:text-white" : "text-[#999]"}>
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <ChevronDown size={16} className={`text-[#999] transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white p-2 shadow-lg dark:border-white/10 dark:bg-[#1a1a1a]">
          {searchable && (
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#999]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="h-9 w-full rounded-md border border-[#E0E0E0] bg-white pl-8 pr-2 text-xs outline-none focus:border-[#FFC107] dark:border-white/10 dark:bg-[#0B0B0B] dark:text-white"
              />
            </div>
          )}
          {filtered.length > 0 && (
            <button
              onClick={() => onChange(allSelected ? [] : filtered.map((o) => o.value))}
              className="mb-1 flex w-full items-center gap-2 rounded-md bg-[#FFF8E1] px-2 py-1.5 text-left text-xs font-bold text-black"
            >
              <span className="grid h-4 w-4 shrink-0 place-items-center rounded border border-[#FFC107] bg-[#FFC107]">
                {allSelected && <Check size={11} className="text-black" />}
              </span>
              {allSelected ? "Clear all" : "Select all"}
            </button>
          )}
          <div className="max-h-52 space-y-0.5 overflow-y-auto">
            {filtered.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-[#999]">No options</p>
            )}
            {filtered.map((o) => {
              const on = selected.includes(o.value);
              return (
                <button
                  key={o.value}
                  onClick={() => toggle(o.value)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-bold transition ${
                    on ? "bg-[#FFF8E1] text-black dark:bg-[#f2df0d]/15 dark:text-[#f2df0d]" : "text-[#444] hover:bg-[#F5F5F5] dark:text-white/70 dark:hover:bg-white/5"
                  }`}
                >
                  <span className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-[#FFC107] bg-[#FFC107]" : "border-[#E0E0E0] dark:border-white/20"}`}>
                    {on && <Check size={11} className="text-black" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}