import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, Settings, Smartphone, DollarSign, Package, Users, Mail, CircleHelp, ShieldCheck, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const ADMIN_EMAIL = "jeremy@nationalconcretepolishing.net";

const MORE_LINKS = [
  ["/onboarding", "Setup", Settings],
  ["/auto-app-setup", "App", Smartphone],
  ["/auto-pricing-setup", "Pricing", DollarSign],
  ["/material-pricing", "Materials", Package],
  ["/auto-teams", "Teams", Users],
  ["/auto-contact", "Contact", Mail],
  ["/system-qa", "System QA", ShieldCheck],
  ["/test-runner", "Test Runner", ShieldCheck],
  ["/help", "Help", CircleHelp],
];

export default function MoreNav() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { user } = useAuth();
  const ref = useRef(null);
  const isAdmin = user?.email === ADMIN_EMAIL;
  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  const activeInMore = MORE_LINKS.some(([to]) => pathname === to || pathname.startsWith(to + "/"));
  return (
    <div className="relative h-full" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className={`relative flex h-full items-center gap-1.5 px-6 text-sm font-bold ${activeInMore || open ? "text-black" : "text-black/60 hover:text-black"}`}>
        More <ChevronDown size={16} className={`transition ${open ? "rotate-180" : ""}`} />
        {activeInMore && <span className="absolute inset-x-5 bottom-0 h-[3px] bg-[#f2df0d]" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 w-56 border-x border-b border-black/10 bg-white py-2 shadow-lg">
          {MORE_LINKS.map(([to, label, Icon]) => (
            <Link key={to} to={to} onClick={() => setOpen(false)} className={`flex items-center gap-3 px-4 py-2.5 text-sm font-bold ${pathname === to || pathname.startsWith(to + "/") ? "bg-[#fdfbe1] text-black" : "text-black/70 hover:bg-black/5"}`}>
              <Icon size={16} /> {label}
            </Link>
          ))}
          {isAdmin && (
            <Link to="/admin" onClick={() => setOpen(false)} className={`flex items-center gap-3 border-t border-black/10 px-4 py-2.5 text-sm font-bold ${pathname === "/admin" ? "bg-[#fdfbe1] text-black" : "text-black/70 hover:bg-black/5"}`}>
              <ShieldAlert size={16} /> Admin
            </Link>
          )}
        </div>
      )}
    </div>
  );
}