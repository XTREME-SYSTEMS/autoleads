import React from "react";
import { Link } from "react-router-dom";
import { Award, Bell, Bot, BriefcaseBusiness, Building2, CircleHelp, DollarSign, FileText, FlaskConical, Key, LogOut, Mail, Network, Settings, ShieldCheck, Smartphone, Sparkles, User } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

const getInitials = (name, email) => {
  const base = (name || email || "").trim();
  if (!base) return "U";
  if (base.includes(" ")) return base.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
  return base.slice(0, 2).toUpperCase();
};

export default function AccountMenu({ iconSize = 18 }) {
  const { user, logout } = useAuth();
  const displayName = user?.full_name || user?.email || "Account";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="grid h-9 w-9 place-items-center rounded-lg text-black/60 hover:bg-black/5" title="Account & settings">
          <User size={iconSize} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-black">{displayName}</span>
          <span className="text-xs font-normal text-black/50">{user?.email || ""}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/settings" className="flex items-center gap-2"><Settings size={14}/>All settings</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/company" className="flex items-center gap-2"><Building2 size={14}/>Company profile</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/branding" className="flex items-center gap-2"><Sparkles size={14}/>Branding & logo</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/service-areas" className="flex items-center gap-2"><Network size={14}/>Service areas</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/trades" className="flex items-center gap-2"><BriefcaseBusiness size={14}/>Trades</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/pricing" className="flex items-center gap-2"><DollarSign size={14}/>Pricing</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/proposals" className="flex items-center gap-2"><FileText size={14}/>Proposal template</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/settings/notifications" className="flex items-center gap-2"><Bell size={14}/>Notifications</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/outreach" className="flex items-center gap-2"><Mail size={14}/>Outreach</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/ai-autonomy" className="flex items-center gap-2"><Bot size={14}/>AI autonomy</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/team" className="flex items-center gap-2"><User size={14}/>Team & roles</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/integrations" className="flex items-center gap-2"><Smartphone size={14}/>Integrations</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><Link to="/settings/billing" className="flex items-center gap-2"><DollarSign size={14}/>Billing</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/security" className="flex items-center gap-2"><Settings size={14}/>Security</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/admin-portal" className="flex items-center gap-2"><ShieldCheck size={14}/>Admin Portal</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/test-agent-portal" className="flex items-center gap-2"><FlaskConical size={14}/>Test Agent Portal</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/owner-dashboard" className="flex items-center gap-2"><Award size={14}/>Owner Dashboard</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/cost-intelligence" className="flex items-center gap-2"><DollarSign size={14}/>Cost Intelligence</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/api-keys" className="flex items-center gap-2"><Key size={14}/>API Key Management</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/employee-portal" className="flex items-center gap-2"><User size={14}/>Employee Portal</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/audit" className="flex items-center gap-2"><FileText size={14}/>Audit log</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/help" className="flex items-center gap-2"><CircleHelp size={14}/>Help & support</Link></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center gap-2 text-red-600 focus:text-red-600" onClick={() => logout('/login')}><LogOut size={14}/>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}