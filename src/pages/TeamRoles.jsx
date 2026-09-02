import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Page, PrimaryButton, Card, EmptyState, StatusPanel, inputClass } from "@/components/autoleads/UiPrimitives";
import MobileSelect from "@/components/autoleads/MobileSelect";
import { UserPlus, Users, Trash2, Shield, Loader2, AlertCircle, Crown, Mail } from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin", desc: "Full access — manage users, settings, and all data" },
  { value: "user", label: "Member", desc: "Standard access to leads, bids, and workflows" },
];

export default function TeamRoles() {
  const { user } = useAuth();
  const [users, setUsers] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [inviteMsg, setInviteMsg] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await base44.entities.User.list();
      setUsers(list);
    } catch (e) {
      setError(e.status === 403 ? "Only admins can manage the team." : "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteMsg(null);
    try {
      await base44.users.inviteUser(inviteEmail.trim(), inviteRole);
      setInviteMsg({ type: "success", text: `Invitation sent to ${inviteEmail.trim()}.` });
      setInviteEmail("");
      await loadUsers();
    } catch (e) {
      setInviteMsg({ type: "error", text: e?.message || "Failed to send invitation." });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    const prevUsers = users;
    setUpdatingId(userId);
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      await base44.entities.User.update(userId, { role: newRole });
    } catch {
      setUsers(prevUsers);
      setError("Failed to update role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (userId, email) => {
    if (!confirm(`Remove ${email} from the team?`)) return;
    const prevUsers = users;
    setUpdatingId(userId);
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      await base44.entities.User.delete(userId);
    } catch {
      setUsers(prevUsers);
      setError("Failed to remove user.");
    } finally {
      setUpdatingId(null);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <Page
      backTo="/settings"
      title="Team & Roles"
      eyebrow="User Management"
      description="Invite team members, assign roles, and manage access. Admins can invite and remove users; members get standard access to leads, bids, and workflows."
    >
      {!isAdmin ? (
        <Card className="p-8">
          <EmptyState icon={Shield} title="Admins only" description="You need admin access to manage team members and roles. Ask an admin to invite you or upgrade your role." />
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          {/* Invite panel */}
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <UserPlus size={20} className="text-[#b0a209]" />
              <h2 className="font-black">Invite a team member</h2>
            </div>
            <p className="mt-2 text-sm leading-6 text-black/50">They'll receive an email to join your AUTOLEADS workspace.</p>
            <form onSubmit={handleInvite} className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-black">Email address</span>
                <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@company.com" className={inputClass} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-black">Role</span>
                <MobileSelect value={inviteRole} onChange={setInviteRole} className={inputClass}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </MobileSelect>
              </label>
              <p className="text-xs leading-5 text-black/45">{ROLES.find((r) => r.value === inviteRole)?.desc}</p>
              {inviteMsg && (
                <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${inviteMsg.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {inviteMsg.type === "success" ? <Mail size={16} className="mt-0.5" /> : <AlertCircle size={16} className="mt-0.5" />}
                  <span>{inviteMsg.text}</span>
                </div>
              )}
              <PrimaryButton type="submit" disabled={inviting} className="w-full">
                {inviting ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><UserPlus size={16} /> Send invitation</>}
              </PrimaryButton>
            </form>
          </Card>

          {/* Team list */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <Users size={20} className="text-[#b0a209]" />
                <h2 className="font-black">Team members</h2>
              </div>
              <span className="text-sm font-bold text-black/45">{users?.length || 0} {users?.length === 1 ? "member" : "members"}</span>
            </div>
            <StatusPanel state={loading ? "loading" : error ? "error" : "default"}>
              {error && <div className="p-5 text-sm text-red-600">{error}</div>}
              {users && users.length === 0 && (
                <EmptyState icon={Users} title="No team members yet" description="Invite your first team member to get started." />
              )}
              {users && users.length > 0 && (
                <div className="divide-y divide-black/5">
                  {users.map((u) => {
                    const isSelf = u.id === user?.id;
                    return (
                      <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-black text-sm font-black text-white">
                          {(u.full_name || u.email || "?").charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-black">{u.full_name || "Unnamed"}</p>
                            {isSelf && <span className="rounded-full bg-[#fcf9cf] px-2 py-0.5 text-[10px] font-black text-[#b0a209]">YOU</span>}
                            {u.role === "admin" && <Crown size={14} className="text-[#b0a209]" />}
                          </div>
                          <p className="truncate text-sm text-black/50">{u.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <MobileSelect
                            value={u.role || "user"}
                            disabled={isSelf || updatingId === u.id}
                            onChange={(v) => handleRoleChange(u.id, v)}
                            className="h-9 rounded-lg border border-black/15 bg-white px-2 text-sm font-bold disabled:opacity-50"
                          >
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </MobileSelect>
                          {!isSelf && (
                            <button
                              onClick={() => handleRemove(u.id, u.email)}
                              disabled={updatingId === u.id}
                              className="grid h-9 w-9 place-items-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                              title="Remove user"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </StatusPanel>
          </Card>
        </div>
      )}
    </Page>
  );
}