import React from "react";
import { CheckCircle2, Clock3, Mail, Plus, Send, ShieldCheck } from "lucide-react";
import { Card, EmptyState, Page, PrimaryButton, SecondaryButton } from "@/components/autoleads/UiPrimitives";

const STATS = [
  { icon: Mail, label: "Bid invitations", value: "0" },
  { icon: Clock3, label: "Follow-ups due", value: "0" },
  { icon: CheckCircle2, label: "Approved drafts", value: "0" },
  { icon: Send, label: "Sent with receipt", value: "0" },
];

export default function EmailAutomation() {
  return (
    <Page
      backTo="/dashboard"
      eyebrow="Communication"
      title="Email Workflow"
      description="Capture bid invitations, create approved drafts, schedule follow-ups, and preserve delivery and response receipts."
      actions={
        <>
          <SecondaryButton>Inbox Connections</SecondaryButton>
          <PrimaryButton><Plus size={16} />New Draft</PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STATS.map(({ icon: Icon, label, value }) => (
          <Card key={label} className="p-5">
            <Icon className="text-[#b9ab0a]" />
            <p className="mt-4 text-sm font-bold text-black/55">{label}</p>
            <p className="mt-2 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <div className="border-b border-black/10 px-5 py-4 font-black">Approval Queue</div>
          <EmptyState
            icon={Mail}
            title="No email drafts awaiting approval"
            description="AI-generated messages remain drafts until an authorized user approves delivery."
            action={<PrimaryButton>Create Draft</PrimaryButton>}
            minHeight="360px"
          />
        </Card>

        <Card>
          <div className="border-b border-black/10 px-5 py-4 font-black">Safety Controls</div>
          <div className="space-y-4 p-5 text-sm">
            <div className="flex gap-3">
              <ShieldCheck className="shrink-0 text-emerald-600" />
              <div>
                <p className="font-black">Live delivery disabled by default</p>
                <p className="mt-1 leading-6 text-black/50">
                  Outbound communication requires explicit authorization, suppression checks, recipient validation, and a delivery receipt.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <strong>Draft mode active.</strong>
              <br />
              No real email, SMS, or WhatsApp message is sent by this package.
            </div>
          </div>
        </Card>
      </div>
    </Page>
  );
}