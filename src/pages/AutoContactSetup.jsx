import React from "react";
import { useNavigate } from "react-router-dom";
import { Page, PrimaryButton } from "@/components/autoleads/UiPrimitives";
import GmailConnect from "@/components/autoleads/GmailConnect";
import CalendarConnect from "@/components/autoleads/CalendarConnect";
import DriveConnect from "@/components/autoleads/DriveConnect";
import HubspotConnect from "@/components/autoleads/HubspotConnect";
import { Mail, Calendar, HardDrive, Building2, ArrowRight } from "lucide-react";

export default function AutoContactSetup() {
  const nav = useNavigate();
  return (
    <Page backTo="/onboarding" eyebrow="Step 2" title="Auto Contact" description="Connect your Gmail and Google Calendar so AUTOLEADS can send bids, sync your inbox, and track bid deadlines automatically.">
      <div className="rounded-xl border border-[#f2df0d] bg-[#fefef6] p-4">
        <p className="text-sm font-bold text-[#b0a209]">Why this matters</p>
        <p className="mt-1 text-sm leading-6 text-black/60">
          AUTOLEADS needs your Gmail to send proposals and outreach emails on your behalf, and your Google Calendar to track bid deadlines and schedule automated scrape runs. Connect both now — each takes under a minute.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-black/70">
            <Mail size={16} className="text-[#b0a209]" /> 1. Connect Gmail
          </div>
          <GmailConnect />
        </div>
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-black text-black/70">
            <Calendar size={16} className="text-[#b0a209]" /> 2. Connect Calendar
          </div>
          <CalendarConnect />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-black/70">
          <HardDrive size={16} className="text-[#b0a209]" /> 3. Connect Google Drive
        </div>
        <DriveConnect />
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-black text-black/70">
          <Building2 size={16} className="text-[#b0a209]" /> 4. Connect HubSpot (Optional)
        </div>
        <HubspotConnect />
      </div>

      <div className="mt-8 flex justify-end">
        <PrimaryButton onClick={() => nav("/auto-leads-setup")}>
          Continue to Auto Leads <ArrowRight size={16} />
        </PrimaryButton>
      </div>
    </Page>
  );
}