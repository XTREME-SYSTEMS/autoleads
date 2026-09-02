import React from "react";
import { Shield, Lock, Database, Mail, Calendar, CreditCard, Users, FileText } from "lucide-react";
import AppHeader from "@/components/autoleads/AppHeader";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#f2df0d]"><Shield size={24} className="text-black" /></span>
          <div>
            <h1 className="text-3xl font-black tracking-[-.03em]">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground">Last updated: August 4, 2026</p>
          </div>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground/80">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Database size={18} className="text-[#b0a209]" /> 1. Information We Collect</h2>
            <p className="mt-2">AUTOLEADS is an autonomous preconstruction operating system. We collect the following types of information to provide our services:</p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc">
              <li><strong>Account Information:</strong> Your name, email address, company name, trade, service area, and role when you register.</li>
              <li><strong>Company Profile Data:</strong> Business details including license number, bonding capacity, employee count, equipment, and pricing preferences you enter.</li>
              <li><strong>Project & Lead Data:</strong> Construction project opportunities discovered from public sources, bid invitations, and documents you upload or that are scraped from government portals.</li>
              <li><strong>Integration Data:</strong> When you connect your Google account, we access your Gmail messages and Google Calendar events solely to send bids, track replies, and schedule tasks on your behalf.</li>
              <li><strong>Payment Information:</strong> Deposit preferences, invoice details, and payment method types (we do not store full credit card numbers — payment processing is handled by our payment provider).</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Mail size={18} className="text-[#b0a209]" /> 2. How We Use Your Information</h2>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc">
              <li>To discover, verify, and track construction project leads matching your trade and service area.</li>
              <li>To generate AI-enhanced proposals, contracts, and estimates based on your company profile and pricing.</li>
              <li>To send bid emails and automated follow-ups through your connected Gmail account.</li>
              <li>To sync tasks and deadlines to your Google Calendar.</li>
              <li>To scan your Google Drive for bid documents and plans.</li>
              <li>To generate invoices, track payments, and manage e-signature documents.</li>
              <li>To improve our AI models, scraping accuracy, and lead quality over time.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Lock size={18} className="text-[#b0a209]" /> 3. Data Sharing & Third-Party Services</h2>
            <p className="mt-2">We do not sell your data. We share data only with the following service providers to operate the platform:</p>
            <ul className="mt-3 space-y-1.5 pl-5 list-disc">
              <li><strong>Google APIs:</strong> Gmail, Google Calendar, and Google Drive — accessed via OAuth with your explicit consent. We only request the minimum scopes needed (send, read, calendar, drive read-only).</li>
              <li><strong>AI Providers:</strong> Language models used to generate proposals, contracts, and email responses. Your project data is sent to these providers for processing.</li>
              <li><strong>Payment Processor:</strong> Handles credit card, debit, and ACH transactions. Card numbers are tokenized and never stored on our servers.</li>
              <li><strong>Public Data Sources:</strong> Government portals (SAM.gov, USAspending, Grants.gov), city agendas, and permit databases — we retrieve publicly available project data from these sources.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Users size={18} className="text-[#b0a209]" /> 4. Data Isolation</h2>
            <p className="mt-2">Your data is isolated to your organization. Other users cannot see your projects, proposals, contacts, invoices, or integration data. Each user's Gmail and Calendar connections are individual — we never share OAuth tokens between accounts.</p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Calendar size={18} className="text-[#b0a209]" /> 5. Data Retention</h2>
            <p className="mt-2">We retain your data for as long as your account is active. You may request deletion of your account and all associated data at any time. Scraped lead data from public sources may be retained in aggregate to improve discovery accuracy.</p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><CreditCard size={18} className="text-[#b0a209]" /> 6. Your Rights</h2>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc">
              <li>Access, export, or delete your personal data at any time.</li>
              <li>Disconnect your Google integrations at any time — we immediately stop accessing your Gmail, Calendar, and Drive.</li>
              <li>Opt out of automated email follow-ups and AI-generated responses.</li>
              <li>Request a copy of all data associated with your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><FileText size={18} className="text-[#b0a209]" /> 7. Security</h2>
            <p className="mt-2">We use industry-standard encryption (TLS/SSL) for all data in transit and at rest. OAuth tokens are stored securely and never exposed to third parties. Access to your data is controlled via row-level security policies enforced at the database level.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground">8. Contact</h2>
            <p className="mt-2">For privacy questions or data requests, contact us through the Help & Support page within the app.</p>
          </section>
        </div>

        <div className="mt-10 rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
          This privacy policy is provided for informational purposes and should be reviewed by legal counsel before production use.
        </div>
      </div>
    </div>
  );
}