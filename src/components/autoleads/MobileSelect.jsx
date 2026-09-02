import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

export default function MobileSelect({ value, onChange, children, className = "", placeholder = "Select…", label = "Select an option", disabled = false }) {
  const [open, setOpen] = useState(false);

  const flatChildren = React.Children.toArray(children).flat(Infinity);
  const options = flatChildren
    .filter((c) => React.isValidElement(c) && c.type === "option")
    .map((c) => {
      const option = /** @type {any} */ (c);
      return { value: option.props.value, label: option.props.children };
    });

  const selected = options.find((o) => String(o.value) === String(value));

  return (
    <>
      <select
        className={`${className} hidden md:block`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {children}
      </select>
      <button
        type="button"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`${className} md:hidden flex items-center justify-between ${disabled ? "opacity-50" : ""}`}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={16} className="shrink-0 opacity-50" />
      </button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="max-h-[60vh]">
          <DrawerHeader>
            <DrawerTitle>{label}</DrawerTitle>
          </DrawerHeader>
          <div className="safe-area-bottom overflow-y-auto p-2">
            {options.map((o) => (
              <button
                key={String(o.value)}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-bold transition ${
                  String(o.value) === String(value)
                    ? "bg-[#fdfbe1] text-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>{o.label}</span>
                {String(o.value) === String(value) && <Check size={16} />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}