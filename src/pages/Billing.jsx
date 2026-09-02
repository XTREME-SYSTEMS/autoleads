import React, { useState, useEffect } from "react";
import { CheckCircle2, CreditCard, Loader2, Settings, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Page, Card, PrimaryButton, SecondaryButton, EmptyState } from "@/components/autoleads/UiPrimitives";

export default function Billing() {
  const nav = useNavigate();
  const { user } = useAuth();
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalErr, setPortalErr] = useState("");
  const [checkoutResult, setCheckoutResult] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') === 'success') setCheckoutResult('success');
    if (params.get('checkout') === 'cancelled') setCheckoutResult('cancelled');
    if (params.get('checkout')) {
      window.history.replaceState({}, '', '/settings/billing');
      const t = setTimeout(() => setCheckoutResult(null), 6000);
      return () => clearTimeout(t);
    }
  }, []);

  const openPortal = async () => {
    if (window.self !== window.top) { setPortalErr("Billing portal works only from the published app. Open in a new tab."); return; }
    setPortalLoading(true); setPortalErr("");
    try {
      const res = await base44.functions.invoke('createPortalSession', { origin: window.location.origin });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      if (data?.portal_url) window.location.href = data.portal_url;
    } catch (e) {
      setPortalErr(e?.message || 'Could not open billing portal');
    } finally { setPortalLoading(false); }
  };

  return (
    <Page title="Billing" description="Manage your subscription, payment method, and billing history.">
      {checkoutResult === 'success' && (
        <Card className="mb-4 border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={22} />
            <div>
              <p className="font-black text-emerald-900">Subscription activated!</p>
              <p className="text-sm text-emerald-700">Your plan is now active. A confirmation email is on its way.</p>
            </div>
          </div>
        </Card>
      )}
      {checkoutResult === 'cancelled' && (
        <Card className="mb-4 border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-800">Checkout was cancelled. You can subscribe anytime.</p>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#fcf9cf] text-[#b0a209]"><CreditCard size={26} /></span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-black">Subscription Management</h3>
            <p className="mt-1 text-sm text-muted-foreground">Manage your plan, update payment methods, view invoices, and cancel your subscription through the secure Stripe billing portal.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton onClick={openPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                Manage Billing
              </PrimaryButton>
              <SecondaryButton onClick={() => nav('/pricing')}><Sparkles size={16} />View Plans</SecondaryButton>
            </div>
            {portalErr && <p className="mt-3 text-sm font-bold text-red-600">{portalErr}</p>}
          </div>
        </div>
      </Card>

      <Card className="mt-4 p-6">
        <h3 className="font-black">Current Account</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Email</span><span className="font-bold">{user?.email || 'Not signed in'}</span></div>
          <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Status</span><span className="font-bold">{user ? 'Active account' : 'Sign in to manage billing'}</span></div>
        </div>
        {!user && (
          <div className="mt-4">
            <EmptyState icon={CreditCard} title="Sign in required" description="Sign in to manage your subscription and billing." action={<Link to="/login"><PrimaryButton>Sign In</PrimaryButton></Link>} minHeight="120px" />
          </div>
        )}
      </Card>

      <Card className="mt-4 p-5">
        <p className="text-xs text-muted-foreground">
          Payments are processed securely by Stripe. AUTOLEADS never stores your card details.
          For billing questions, contact Base44 support.
        </p>
      </Card>
    </Page>
  );
}