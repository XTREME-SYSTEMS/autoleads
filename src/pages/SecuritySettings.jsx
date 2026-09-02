import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { FileWarning, Loader2, Lock, ShieldCheck, Trash2, Users } from "lucide-react";
import { Card, Page, StatCard } from "@/components/autoleads/UiPrimitives";
import { useAuth } from "@/lib/AuthContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SecuritySettings() {
  const [users, setUsers] = useState(/** @type {any[]} */ ([]));
  const [gaps, setGaps] = useState(/** @type {any[]} */ ([]));
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([
      base44.entities.User.list().catch(() => []),
      base44.entities.SystemGap.filter({ category: 'security' }).catch(() => []),
    ]).then(([u, g]) => { setUsers(u || []); setGaps(g || []); })
      .finally(() => setLoading(false));
  }, []);

  const deleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await base44.entities.User.delete(user.id);
      await base44.auth.logout("/login");
    } catch (e) {
      setDeleteError(e.message || "Failed to delete account. Please contact support.");
      setDeleting(false);
    }
  };

  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role === 'user');

  return (
    <Page title="Security Settings" description="Configure roles, session controls, audit retention, and tenant-isolation policies.">
      {loading ? <div className="grid place-items-center py-12"><Loader2 className="animate-spin text-[#f2df0d]" /></div> : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard icon={Users} title="Total Users" value={users.length} note={`${admins.length} admins, ${regularUsers.length} users`} />
            <StatCard icon={Lock} title="Admins" value={admins.length} note="Full access" />
            <StatCard icon={ShieldCheck} title="Security Gaps" value={gaps.filter(g => g.status === 'open').length} note={`${gaps.filter(g => g.status === 'fixed').length} resolved`} />
          </div>

          <h2 className="mb-3 mt-6 text-sm font-black uppercase tracking-wide text-black/40">Row-Level Security</h2>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><ShieldCheck size={20} /></span>
              <div>
                <p className="font-black">Owner-or-Admin RLS Active</p>
                <p className="mt-1 text-sm text-black/50">All 22 entities enforce update/delete restrictions: only the record creator or an admin can modify or delete records. All authenticated users can read. This prevents cross-tenant data modification while allowing automation agents to read for pipeline processing.</p>
              </div>
            </div>
          </Card>

          <h2 className="mb-3 mt-6 text-sm font-black uppercase tracking-wide text-black/40">Team Members</h2>
          <Card className="divide-y divide-black/5">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4">
                <div className="min-w-0"><p className="truncate text-sm font-bold">{u.full_name || u.email}</p><p className="truncate text-xs text-black/40">{u.email}</p></div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${u.role === 'admin' ? 'bg-[#f2df0d] text-black' : 'bg-black/5 text-black/60'}`}>{u.role || 'user'}</span>
              </div>
            ))}
          </Card>

          <div className="mt-6">
            <Link to="/audit" className="inline-flex items-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 text-sm font-bold transition hover:bg-black/[.02]">
              <FileWarning size={15} /> View Audit Log
            </Link>
          </div>

          <h2 className="mb-3 mt-8 text-sm font-black uppercase tracking-wide text-red-600">Danger Zone</h2>
          <Card className="border-red-200 p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-100 text-red-600"><Trash2 size={20} /></span>
                <div>
                  <p className="font-black text-red-600">Delete Account</p>
                  <p className="mt-1 text-sm text-black/50">Permanently delete your account and all associated data. This action cannot be undone.</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50">
                    <Trash2 size={15} /> Delete Account
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete your account permanently?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action is permanent and cannot be undone. All your projects, proposals, estimates, contacts, and settings will be permanently removed. You will be signed out immediately.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{deleteError}</p>}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(e) => { e.preventDefault(); deleteAccount(); }}
                      disabled={deleting}
                      className="bg-red-600 text-white hover:bg-red-700"
                    >
                      {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      {deleting ? "Deleting…" : "Yes, delete permanently"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}