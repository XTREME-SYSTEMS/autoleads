import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Plus, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { Image } from "@/components/ui/image";

const LOGO = "https://media.base44.com/images/public/user_69b98b0a75d69ef410a89852/c8f9c6753_AUTOLEADS_APPROVED_LOGO.png";

const PRODUCTS = [
  { label: "AUTO LEADS", to: "/dashboard", match: ["/dashboard", "/leads", "/projects", "/contractors", "/bid-inbox", "/opportunity-graph", "/bidability", "/daily-autopilot"] },
  { label: "AUTO BIDS", to: "/takeoff", match: ["/takeoff", "/estimates", "/proposals", "/pricing-memory", "/follow-ups", "/outcome-learning"] },
];

export default function TopNav() {
  const { pathname } = useLocation();
  return (
    <header className="h-[66px] bg-white text-[#080808] border-b border-black/10 flex items-center gap-6 px-4 md:px-6 shrink-0">
      <Link to="/dashboard" className="shrink-0">
        <Image src={LOGO} fittingType="fit" alt="AUTO LEADS Construction Intelligence" className="h-8 w-[150px]" />
      </Link>
      <nav className="hidden md:flex items-center gap-2 h-full">
        {PRODUCTS.map((p) => {
          const active = p.match.some((m) => pathname.startsWith(m));
          return (
            <Link
              key={p.label}
              to={p.to}
              className={`h-full flex items-center px-4 text-[13px] font-semibold tracking-wide border-b-[3px] transition-colors ${
                active ? "border-[#f2df0d] text-[#080808]" : "border-transparent text-black/55 hover:text-[#080808]"
              }`}
            >
              {p.label}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2 md:gap-3">
        <button className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-[#f2df0d] text-black text-[13px] font-semibold px-3 py-1.5 hover:brightness-95 transition">
          <Plus className="w-4 h-4" /> New
        </button>
        <button className="p-2 text-black/60 hover:text-[#080808] transition" aria-label="Notifications"><Bell className="w-5 h-5" /></button>
        <button className="p-2 text-black/60 hover:text-[#080808] transition" aria-label="Help"><HelpCircle className="w-5 h-5" /></button>
        <div className="flex items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-black/10 grid place-items-center text-[11px] font-semibold">AK</div>
          <ChevronDown className="w-4 h-4 text-black/40" />
        </div>
      </div>
    </header>
  );
}