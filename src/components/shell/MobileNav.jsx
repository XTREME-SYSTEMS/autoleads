import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutGrid, Inbox, FileText, Calculator, ListChecks } from "lucide-react";

const ITEMS = [
  { to: "/dashboard", label: "Center", icon: LayoutGrid },
  { to: "/daily-autopilot", label: "Autopilot", icon: ListChecks },
  { to: "/bid-inbox", label: "Bids", icon: Inbox },
  { to: "/takeoff", label: "Takeoff", icon: Calculator },
  { to: "/proposals", label: "Proposals", icon: FileText },
];

export default function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-black/10 grid grid-cols-5">
      {ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] min-h-[56px] ${isActive ? "text-black" : "text-black/45"}`
          }
        >
          {({ isActive }) => (
            <>
              <Icon className={`w-5 h-5 ${isActive ? "text-[#f2df0d]" : ""}`} />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}