import React, { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Bell, BriefcaseBusiness, Building2, CalendarDays, CircleHelp, Cog, DollarSign, LayoutDashboard, Mail, Menu, Package, Palette, Radar, Settings, ShieldCheck, Users, Workflow, X, Zap } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";
import AccountMenu from "@/components/autoleads/AccountMenu";
import AutonomyToggle from "@/components/autoleads/AutonomyToggle";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";

const ADMIN_EMAIL = "jeremy@nationalconcretepolishing.net";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/onboarding", label: "Setup", icon: Settings },
  { to: "/auto-pipeline", label: "Pipeline", icon: Workflow },
  { to: "/leads", label: "Leads", icon: Radar },
  { to: "/bids", label: "Bids", icon: BriefcaseBusiness },
  { to: "/auto-app-setup", label: "Brand", icon: Palette },
  { to: "/auto-pricing-setup", label: "Pricing", icon: DollarSign },
  { to: "/material-pricing", label: "Materials", icon: Package },
  { to: "/auto-system-setup", label: "Automate", icon: Zap },
  { to: "/settings", label: "Settings", icon: Cog },
  { to: "/auto-teams", label: "Teams", icon: Users },
  { to: "/auto-contact", label: "Contact", icon: Mail },
  { to: "/company-database", label: "Company DB", icon: Building2 },
];

const MOBILE_NAV = [
  { to: "/dashboard", label: "Home", Icon: LayoutDashboard },
  { to: "/leads", label: "Leads", Icon: Radar },
  { to: "/money", label: "Money", Icon: DollarSign },
  { to: "/calendar", label: "Calendar", Icon: CalendarDays },
];

const getInitials = (name, email) => {
  const base = (name || email || "").trim();
  if (!base) return "U";
  if (base.includes(" ")) return base.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return base.slice(0, 2).toUpperCase();
};

export default function AppHeader({ height = 66 }) {
  const { pathname } = useLocation();
  const [mobile, setMobile] = useState(false);
  const { user } = useAuth();
  const active = (to) => pathname === to || pathname.startsWith(to + "/");
  const isAdmin = user?.email === ADMIN_EMAIL;
  const displayName = user?.full_name || user?.email || "Account";
  const initials = getInitials(user?.full_name, user?.email);

  return (
    <header className="safe-area-top sticky top-0 z-50 border-b border-border bg-background text-foreground shadow-sm" style={{ height }}>
      <div className="flex h-full items-center px-3 sm:px-5 lg:px-6">
        <Link to="/dashboard" className="mr-5 shrink-0"><AutoLeadsLogo height={38} /></Link>
        <div className="hidden h-7 w-px bg-border lg:block" />
        <nav className="hidden h-full items-center lg:flex">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={`relative flex h-full items-center gap-2 px-5 text-sm font-bold ${active(to) ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon size={18} />{label}
              {active(to) && <span className="absolute inset-x-4 bottom-0 h-[3px] bg-[#f2df0d]" />}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1.5">
          <AutonomyToggle className="hidden lg:inline-flex" />
          <div className="hidden lg:block"><AccountMenu /></div>
          <Link to="/notifications" className="hidden h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:grid"><Bell size={18} /></Link>
          <Link to="/help" className="hidden h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted lg:grid"><CircleHelp size={18} /></Link>
          <button onClick={() => setMobile(!mobile)} className="grid h-9 w-9 place-items-center rounded-lg lg:hidden">{mobile ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
      </div>
      {mobile && (
        <div className="absolute inset-x-0 top-[66px] max-h-[calc(100vh-66px)] overflow-y-auto border-t border-border bg-background p-3 lg:hidden">
          {NAV_LINKS.map(({ to, label, icon: Icon }) => (
            <Link onClick={() => setMobile(false)} key={to} to={to} className="flex items-center justify-end gap-3 rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-muted"><Icon size={18}/>{label}</Link>
          ))}
          <div className="my-2 border-t border-border"/>
          <Link onClick={() => setMobile(false)} to="/notifications" className="flex items-center justify-end gap-3 rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-muted"><Bell size={18}/>Notifications</Link>
          <Link onClick={() => setMobile(false)} to="/help" className="flex items-center justify-end gap-3 rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-muted"><CircleHelp size={18}/>Help & Support</Link>
          <Link onClick={() => setMobile(false)} to="/settings" className="flex items-center justify-end gap-3 rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-muted"><Settings size={18}/>All Settings</Link>
          {isAdmin && <Link onClick={() => setMobile(false)} to="/admin" className="flex items-center justify-end gap-3 rounded-lg px-4 py-3 text-sm font-bold text-muted-foreground hover:bg-muted"><ShieldCheck size={18}/>Admin</Link>}
          <div className="my-2 border-t border-border"/>
          <div className="flex items-center justify-end gap-3 px-4 py-2"><span className="grid h-9 w-9 place-items-center rounded-full bg-muted text-xs font-black">{initials}</span><div className="min-w-0"><p className="truncate text-sm font-black">{displayName}</p><p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p></div></div>
          <button onClick={async () => { setMobile(false); await base44.auth.logout("/login"); }} className="flex w-full items-center justify-end gap-3 rounded-lg px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"><X size={18}/>Sign out</button>
        </div>
      )}
    </header>
  );
}

const MORE_PAGES = [
  { to: "/auto-pipeline", label: "Auto Pipeline", icon: Workflow },
  { to: "/onboarding", label: "Setup", icon: Settings },
  { to: "/auto-app-setup", label: "Brand", icon: Palette },
  { to: "/auto-pricing-setup", label: "Pricing", icon: DollarSign },
  { to: "/material-pricing", label: "Materials", icon: Package },
  { to: "/auto-system-setup", label: "Automate", icon: Zap },
  { to: "/auto-teams", label: "Teams", icon: Users },
  { to: "/auto-contact", label: "Contact", icon: Mail },
  { to: "/company-database", label: "Company DB", icon: Building2 },
  { to: "/settings", label: "Settings", icon: Cog },
];

export function MobileBottomNav() {
  const { pathname } = useLocation();
  const moreActive = MORE_PAGES.some(p => p.to === pathname);
  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-border bg-background lg:hidden">
      {MOBILE_NAV.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold ${isActive ? "text-[#FFC400]" : "text-muted-foreground"}`}>
          <Icon size={20} />{label}
        </NavLink>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-bold outline-none ${moreActive ? "text-[#d8c70b]" : "text-muted-foreground"}`}>
            <Menu size={20} />More
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="mb-2 w-56">
          {MORE_PAGES.map(({ to, label, icon: Icon }) => (
            <DropdownMenuItem key={to} asChild>
              <Link to={to} className="flex items-center gap-2.5 text-sm font-bold">
                <Icon size={16} className="text-muted-foreground" />{label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}