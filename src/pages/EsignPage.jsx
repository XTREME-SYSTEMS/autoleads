import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Check, FileSignature, Loader2, AlertCircle, PenTool } from "lucide-react";

export default function EsignPage() {
  const { documentId } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [signing, setSigning] = useState(false);
  const [signed, setSigned] = useState(false);

  const loadDoc = async () => {
    try {
      const res = await base44.functions.invoke('esignFlow', { action: 'get', document_id: documentId });
      setDoc(res.document);
      // Pre-fill signer email if only one signer
      if (res.document?.signers?.length === 1) {
        setSignerEmail(res.document.signers[0].email || "");
        setSignerName(res.document.signers[0].name || "");
      }
      // Check if current signer already signed
      if (res.document?.status === 'signed') setSigned(true);
    } catch {
      setError("Document not found or no longer available.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDoc(); }, [documentId]);

  const handleSign = async () => {
    if (!signerName.trim() || !signerEmail.trim()) {
      setError("Please enter your name and email to sign.");
      return;
    }
    setSigning(true);
    setError("");
    try {
      const res = await base44.functions.invoke('esignFlow', {
        action: 'sign',
        document_id: documentId,
        signer_name: signerName,
        signer_email: signerEmail,
        signature_data: 'typed'
      });
      if (res.success) {
        setSigned(true);
        setDoc(res.document);
      } else {
        setError(res.error || "Signing failed.");
      }
    } catch (e) {
      setError("Signing failed: " + (e?.message || "try again"));
    } finally {
      setSigning(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center bg-gray-50"><Loader2 className="animate-spin text-[#f2df0d]" size={32} /></div>;
  }

  if (error && !doc) {
    return <div className="grid min-h-screen place-items-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <AlertCircle size={48} className="mx-auto text-red-500" />
        <h1 className="mt-4 text-2xl font-black">{error}</h1>
        <p className="mt-2 text-sm text-black/50">This document may have expired or been removed.</p>
      </div>
    </div>;
  }

  const allSigned = doc?.status === 'signed';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f2df0d]"><FileSignature size={18} className="text-black" /></span>
            <span className="font-black">AUTOLEADS E-Sign</span>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${allSigned ? 'bg-emerald-100 text-emerald-700' : doc?.status === 'sent' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
            {allSigned ? 'Fully Signed' : doc?.status === 'viewed' ? 'Partially Signed' : 'Awaiting Signature'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* Document */}
        <div className="rounded-xl border border-black/10 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-black">{doc?.title}</h1>
          <div className="mt-1 text-xs text-black/40">
            Document ID: {documentId} · {doc?.document_type || 'contract'}
          </div>

          {doc?.signers?.length > 0 && (
            <div className="mt-4 rounded-lg border border-black/10 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-black/40">Signers</p>
              <div className="space-y-1">
                {doc.signers.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{s.name || s.email} <span className="text-black/40">({s.role || 'signer'})</span></span>
                    {s.signed_date
                      ? <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><Check size={14} /> Signed {new Date(s.signed_date).toLocaleDateString()}</span>
                      : <span className="text-xs font-bold text-amber-600">Pending</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-black/10 pt-6">
            <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-7 text-black/70">
              {doc?.content}
            </div>
          </div>
        </div>

        {/* Sign section */}
        {!signed && !allSigned ? (
          <div className="mt-6 rounded-xl border-2 border-[#f2df0d] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <PenTool size={20} className="text-[#b0a209]" />
              <h2 className="text-lg font-black">Sign This Document</h2>
            </div>
            <p className="mt-1 text-sm text-black/50">Enter your name and email to sign electronically. By signing, you agree to the terms above.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                className="h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20"
                placeholder="Full legal name"
                value={signerName}
                onChange={e => setSignerName(e.target.value)}
              />
              <input
                className="h-11 rounded-lg border border-black/15 px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20"
                placeholder="Email address"
                type="email"
                value={signerEmail}
                onChange={e => setSignerEmail(e.target.value)}
              />
            </div>
            {error && <p className="mt-3 text-xs font-bold text-red-600">{error}</p>}
            <button
              onClick={handleSign}
              disabled={signing || !signerName.trim() || !signerEmail.trim()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2df0d] px-5 py-3 text-sm font-black text-black hover:bg-[#f4e431] disabled:opacity-40"
            >
              {signing ? <><Loader2 size={16} className="animate-spin" /> Signing…</> : <><PenTool size={16} /> Sign Document Electronically</>}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-500"><Check size={28} className="text-white" /></span>
            <h2 className="mt-4 text-xl font-black text-emerald-800">{allSigned ? 'Document Fully Executed!' : 'Signature Recorded!'}</h2>
            <p className="mt-2 text-sm text-emerald-700">
              {allSigned
                ? 'All parties have signed. This document is now legally executed.'
                : 'Your signature has been recorded. We are waiting for other signers to complete.'}
            </p>
            {doc?.signers?.filter(s => s.signed_date).length > 0 && (
              <div className="mx-auto mt-4 max-w-sm space-y-1 text-left">
                {doc.signers.filter(s => s.signed_date).map((s, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-bold text-emerald-700">
                    <Check size={14} /> {s.name || s.email} — Signed {new Date(s.signed_date).toLocaleDateString()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}