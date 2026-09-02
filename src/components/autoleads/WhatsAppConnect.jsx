import React, { useState } from "react";
import { Card } from "@/components/autoleads/UiPrimitives";
import { MessageCircle, ExternalLink } from "lucide-react";

export default function WhatsAppConnect() {
  const [phone, setPhone] = useState("");
  const digits = phone.replace(/\D/g, "");
  const url = digits ? `https://wa.me/${digits}` : "";
  const qr = url ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}` : "";

  return (
    <Card className="p-5">
      <h2 className="flex items-center gap-2 font-black"><MessageCircle size={18} className="text-[#b0a209]" />WhatsApp Connect</h2>
      <p className="mt-1 text-sm text-black/50">Enter your WhatsApp phone number to generate a click-to-chat link and QR code. Anyone who scans it opens a chat with you instantly.</p>
      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-black">Phone Number (with country code)</span>
        <input className="h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-sm outline-none focus:border-[#f2df0d] focus:ring-2 focus:ring-[#f2df0d]/20" value={phone} onChange={e => setPhone(e.target.value)} placeholder="1 555 123 4567" />
      </label>
      {url && (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-lg border border-black/10 bg-black/[.02] p-4">
          <img src={qr} alt="WhatsApp QR code" className="h-44 w-44 rounded-lg bg-white p-2" />
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2.5 text-sm font-black text-white hover:opacity-90"><ExternalLink size={14} />Open WhatsApp Chat</a>
          <p className="break-all text-xs text-black/40">{url}</p>
        </div>
      )}
    </Card>
  );
}