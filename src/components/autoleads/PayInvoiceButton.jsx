import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Loader2, CreditCard, X } from "lucide-react";

function CheckoutForm({ onPaid, onClose }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const pay = async () => {
    if (!stripe || !elements) return;
    setBusy(true);
    setErr("");
    const { error } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      setErr(error.message || "Payment failed");
      setBusy(false);
    } else {
      onPaid();
    }
  };

  return (
    <div>
      <PaymentElement />
      {err && <p className="mt-2 text-xs font-bold text-red-600">{err}</p>}
      <div className="mt-4 flex gap-2">
        <button onClick={onClose} className="flex-1 rounded-lg border border-black/10 py-3 text-sm font-bold">Cancel</button>
        <button onClick={pay} disabled={busy || !stripe} className="flex-1 rounded-lg bg-[#FFC107] py-3 text-sm font-black text-black disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : "Pay"}
        </button>
      </div>
    </div>
  );
}

export default function PayInvoiceButton({ invoiceId, projectId, amount, onPaid }) {
  const [open, setOpen] = useState(false);
  const [stripe, setStripe] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const start = async () => {
    if (window.self !== window.top) {
      setErr("Checkout works only from the published app. Open in a new tab to pay.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      const [cfgRes, piRes] = await Promise.all([
        base44.functions.invoke("getStripeConfig", {}),
        base44.functions.invoke("createPaymentIntent", { project_id: projectId, invoice_id: invoiceId }),
      ]);
      const cfg = cfgRes?.data ?? cfgRes;
      const pi = piRes?.data ?? piRes;
      if (cfg?.error) throw new Error(cfg.error);
      if (pi?.error) throw new Error(pi.error);
      const pk = cfg?.publishable_key;
      if (!pk) throw new Error("Stripe publishable key not configured");
      if (!pi?.client_secret) throw new Error("No client secret returned");
      setStripe(await loadStripe(pk));
      setClientSecret(pi.client_secret);
      setOpen(true);
    } catch (e) {
      setErr(e?.message || "Could not start payment");
    } finally {
      setLoading(false);
    }
  };

  if (err) return <p className="text-xs font-bold text-red-600">{err}</p>;

  return (
    <>
      <button
        onClick={start}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFC107] px-3 py-2 text-xs font-black text-black disabled:opacity-50"
      >
        {loading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
        Pay Now
      </button>
      {open && stripe && clientSecret && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black">Pay {amount ? `$${Number(amount).toLocaleString()}` : ""}</h3>
              <button onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <Elements stripe={stripe} options={{ clientSecret }}>
              <CheckoutForm onPaid={() => { setOpen(false); onPaid?.(); }} onClose={() => setOpen(false)} />
            </Elements>
          </div>
        </div>
      )}
    </>
  );
}