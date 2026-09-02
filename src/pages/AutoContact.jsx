import React from "react";
import { Page } from "@/components/autoleads/UiPrimitives";
import WhatsAppConnect from "@/components/autoleads/WhatsAppConnect";
import EmailTemplatesPanel from "@/components/autoleads/EmailTemplatesPanel";
import MessageCreator from "@/components/autoleads/MessageCreator";
import GmailConnect from "@/components/autoleads/GmailConnect";
import HubspotConnect from "@/components/autoleads/HubspotConnect";

export default function AutoContact() {
  return (
    <Page backTo="/dashboard" eyebrow="Auto Contact" title="Contact & Communication Hub" description="Connect WhatsApp, Gmail, and HubSpot — manage email templates, sync leads to your CRM, and create messages all in one place.">
      <div className="grid gap-5 lg:grid-cols-2">
        <WhatsAppConnect />
        <GmailConnect />
      </div>
      <div className="mt-5">
        <HubspotConnect />
      </div>
      <div className="mt-5">
        <EmailTemplatesPanel />
      </div>
      <div className="mt-5">
        <MessageCreator />
      </div>
    </Page>
  );
}