import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Page, PrimaryButton, inputClass, Card } from "@/components/autoleads/UiPrimitives";
import MobileSelect from "@/components/autoleads/MobileSelect";
import { UserPlus, Users, Loader2, Mail } from "lucide-react";

export default function AutoTeams() {
  const [users, setUsers] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.User.list();
      setUsers(list || []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const invite = async (e) => {
    e.preventDefault();
    if (!email) return;
    setInviting(true); setMsg(null);
    try {
      await base44.users.inviteUser(email, role);
      setMsg(`Invitation sent to ${email}`);
      setEmail("");
      load();
    } catch (err) {
      setMsg("Invite failed: " + (err?.message || "try again"));
    } finally { setInviting(false); }
  };

  return (
    <Page backTo="/dashboard" eyebrow="Auto Teams" title="Team & Roles" description="Invite team members, assign roles, and manage who has access to your AUTOLEADS workspace.">
      <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-black"><UserPlus size={18} className="text-[#b0a209]" />Invite a teammate</h2>
          <p className="mt-1 text-sm text-black/50">They'll get an email invitation to join your workspace.</p>
          <form onSubmit={invite} className="mt-4 space-y-3">
            <label>
              <span className="mb-1 block text-xs font-black">Email</span>
              <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="teammate@company.com" required />
            </label>
            <label>
              <span className="mb-1 block text-xs font-black">Role</span>
              <MobileSelect className={inputClass} value={role} onChange={v => setRole(v)}>
                <option value="user">User — can use the system</option>
                <option value="admin">Admin — full access & settings</option>
              </MobileSelect>
            </label>
            <PrimaryButton type="submit" disabled={inviting} className="w-full">{inviting ? <><Loader2 size={16} className="animate-spin" />Sending…</> : <><Mail size={16} />Send Invitation</>}</PrimaryButton>
            {msg && <p className="text-sm font-bold text-[#b0a209]">{msg}</p>}
          </form>
        </Card>
        <Card>
          <div className="flex items-center gap-2 border-b border-black/10 px-5 py-4 font-black"><Users size={18} />Team Members</div>
          {loading ? <div className="p-8 text-center text-sm text-black/40">Loading…</div> :
            users.length === 0 ? <div className="p-8 text-center text-sm text-black/40">No team members yet. Invite your first teammate!</div> :
            <div className="divide-y divide-black/5">
              {users.map(u => (
                <div key={u.id} className="flex items-center gap-3 p-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#fcf9cf] text-[#b0a209] font-black">{(u.full_name || u.email || "?").charAt(0).toUpperCase()}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{u.full_name || "Unnamed"}</p>
                    <p className="truncate text-xs text-black/50">{u.email}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${u.role === "admin" ? "bg-[#f2df0d] text-black" : "bg-black/5 text-black/50"}`}>{u.role || "user"}</span>
                </div>
              ))}
            </div>}
        </Card>
      </div>
    </Page>
  );
}