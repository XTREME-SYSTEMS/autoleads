import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, Loader2, LogOut, Mail, MapPin, Settings, Shield, User, Users } from "lucide-react";
import AutoLeadsLogo from "@/components/brand/AutoLeadsLogo";

export default function EmployeePortal() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [memberships, setMemberships] = useState([]);
  const [orgs, setOrgs] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { nav('/login?returnTo=/employee-portal'); return; }
    loadMemberships();
  }, [user]);

  const loadMemberships = async () => {
    try {
      const list = await base44.entities.OrganizationMembership.filter({ user_id: user.id });
      setMemberships(list);
      // Load org details
      const orgIds = [...new Set(list.map(m => m.organization_id))];
      const orgMap = {};
      for (const oid of orgIds) {
        try {
          const org = await base44.entities.Organization.get(oid);
          orgMap[oid] = org;
        } catch { /* ignore */ }
      }
      setOrgs(orgMap);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  if (!user) return null;

  const roleBadge = (role) => {
    const colors = {
      owner: "bg-[#f2df0d] text-black",
      admin: "bg-emerald-100 text-emerald-700",
      member: "bg-blue-100 text-blue-700",
    };
    return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${colors[role] || colors.member}`}>{role}</span>;
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="sticky top-0 z-50 border-b border-black/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-5">
          <Link to="/dashboard"><AutoLeadsLogo height={32} /></Link>
          <span className="ml-3 rounded-full bg-[#f2df0d] px-3 py-1 text-[10px] font-black uppercase">Employee Portal</span>
          <button onClick={() => logout('/login')} className="ml-auto flex items-center gap-1.5 text-sm font-bold text-black/60 hover:text-black">
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">
        {/* Welcome */}
        <div className="rounded-2xl border border-black/10 bg-white p-6">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#f2df0d] text-2xl font-black text-black">
              {(user.full_name || user.email || 'U')[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-black">{user.full_name || 'Team Member'}</h1>
              <p className="text-sm text-black/50">{user.email}</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="animate-spin text-black/30" size={32} /></div>
        ) : memberships.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-black/10 bg-white p-8 text-center">
            <Users size={40} className="mx-auto text-black/20" />
            <h2 className="mt-4 text-lg font-black">No organization memberships</h2>
            <p className="mt-2 text-sm text-black/50">You haven't been invited to any organization yet. Ask your company admin to invite you.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <h2 className="text-sm font-black uppercase tracking-wide text-black/40">Your Organizations</h2>
            {memberships.map((m) => {
              const org = orgs[m.organization_id];
              const isActive = m.status === 'active';
              return (
                <div key={m.id} className="rounded-2xl border border-black/10 bg-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#fcf9cf] text-[#b0a209]"><Building2 size={20} /></span>
                      <div>
                        <p className="font-black">{m.organization_name || org?.name || 'Organization'}</p>
                        <p className="text-xs text-black/40">{org?.trade || 'Construction'} · {org?.city || ''}{org?.state ? `, ${org.state}` : ''}</p>
                        <div className="mt-2 flex items-center gap-2">
                          {roleBadge(m.role)}
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{m.status}</span>
                        </div>
                      </div>
                    </div>
                    {isActive && (
                      <button onClick={() => nav('/dashboard')} className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#f2df0d] px-4 py-2.5 text-xs font-black hover:bg-[#f4e431]">
                        Open Dashboard <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                  {m.status === 'invited' && (
                    <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
                      <Mail size={14} className="mr-1 inline" /> You've been invited. Check your email and accept the invitation to get started.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick links */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {[
            { to: '/leads', icon: BriefcaseBusiness, label: 'View Leads' },
            { to: '/projects', icon: Building2, label: 'Projects' },
            { to: '/settings', icon: Settings, label: 'Settings' },
          ].map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="flex items-center gap-3 rounded-xl border border-black/10 bg-white p-4 text-sm font-bold hover:border-[#f2df0d] hover:bg-[#fdfbe1]">
              <Icon size={18} className="text-black/40" /> {label}
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}