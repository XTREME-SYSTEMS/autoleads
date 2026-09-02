import React from "react";
import { Mail, Phone, Send } from "lucide-react";
import { BackLink, CommercialPage, IndustrialTitle, Surface, IconSquare, PrimaryAction } from "@/components/CommercialMobileUI";

export default function OutreachCenter() {
  return <CommercialPage><BackLink to="/dashboard" label="Back to Home"/>
    <IndustrialTitle compact>Outreach Center</IndustrialTitle>

    <Surface className="mb-3 p-4">
      <div className="flex items-start gap-3">
        <IconSquare icon={Mail}/>
        <div>
          <p className="font-bold">Governed Outreach</p>
          <p className="mt-1 text-sm text-black/50">Create governed drafts, approvals, suppression checks, delivery receipts, and follow-up tasks. Live delivery remains approval-gated.</p>
        </div>
      </div>
    </Surface>

    <Surface className="divide-y divide-black/[.07]">
      <div className="flex items-center gap-3 px-4 py-4">
        <IconSquare icon={Send}/>
        <div className="flex-1">
          <p className="font-semibold">Draft Campaign</p>
          <p className="text-xs text-black/50">AI-generated outreach drafts awaiting your review</p>
        </div>
        <PrimaryAction className="max-w-[140px]" onClick={() => window.location.href = '/email-templates'}>Compose</PrimaryAction>
      </div>
      <div className="flex items-center gap-3 px-4 py-4">
        <IconSquare icon={Phone}/>
        <div className="flex-1">
          <p className="font-semibold">Follow-Up Queue</p>
          <p className="text-xs text-black/50">Scheduled follow-ups and reminders for active opportunities</p>
        </div>
        <PrimaryAction className="max-w-[140px]" onClick={() => window.location.href = '/tasks'}>View Tasks</PrimaryAction>
      </div>
    </Surface>
  </CommercialPage>;
}