import React from "react";
import { FileText, CheckSquare, CreditCard, ShieldAlert, Scale, Gavel } from "lucide-react";
import AppHeader from "@/components/autoleads/AppHeader";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[#f2df0d]"><FileText size={24} className="text-black" /></span>
          <div>
            <h1 className="text-3xl font-black tracking-[-.03em]">Terms of Service</h1>
            <p className="text-sm text-muted-foreground">Last updated: August 4, 2026</p>
          </div>
        </div>

        <div className="mt-8 space-y-8 text-sm leading-7 text-foreground/80">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><CheckSquare size={18} className="text-[#b0a209]" /> 1. Acceptance of Terms</h2>
            <p className="mt-2">By creating an account or using AUTOLEADS, you agree to these Terms of Service. If you do not agree, you may not use the platform. AUTOLEADS is an autonomous preconstruction operating system that helps construction businesses discover project opportunities, manage bids, generate proposals, and automate outreach.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground">2. Your Account</h2>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc">
              <li>You must provide accurate business information when registering.</li>
              <li>You are responsible for maintaining the security of your account and password.</li>
              <li>You are responsible for all activity conducted under your account.</li>
              <li>One account per business. You may invite team members with appropriate roles.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><CreditCard size={18} className="text-[#b0a209]" /> 3. Subscriptions & Billing</h2>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc">
              <li>AUTOLEADS offers subscription plans with varying features and limits.</li>
              <li>Subscriptions are billed in advance on a recurring basis (monthly or annually).</li>
              <li>You may upgrade, downgrade, or cancel your subscription at any time. Changes take effect at the next billing cycle.</li>
              <li>Refunds are issued at our discretion for billing errors or service interruptions.</li>
              <li>Overage charges may apply if you exceed plan limits (API calls, AI generations, scrape runs).</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Scale size={18} className="text-[#b0a209]" /> 4. Acceptable Use</h2>
            <p className="mt-2">You agree not to:</p>
            <ul className="mt-2 space-y-1.5 pl-5 list-disc">
              <li>Use AUTOLEADS to send unsolicited spam emails or violate CAN-SPAM regulations.</li>
              <li>Scrape or redistribute data from AUTOLEADS to third-party platforms.</li>
              <li>Use AI-generated contracts or proposals without appropriate legal review before execution.</li>
              <li>Misrepresent your company's capabilities, license status, or bonding capacity in proposals.</li>
              <li>Attempt to access other users' data or reverse-engineer the platform.</li>
              <li>Use the platform for any illegal construction activities or unlicensed work.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><ShieldAlert size={18} className="text-[#b0a209]" /> 5. AI-Generated Content Disclaimer</h2>
            <p className="mt-2">AUTOLEADS uses AI to generate proposals, contracts, estimates, and email responses. All AI-generated content is provided as a starting point and <strong>must be reviewed by a qualified professional before use</strong>. We are not responsible for errors, omissions, or legal issues arising from unreviewed AI-generated content. Construction contracts should be reviewed by legal counsel. Estimates should be verified against actual takeoffs and material costs.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground">6. Lead Data Accuracy</h2>
            <p className="mt-2">Project leads are scraped from public sources and may contain outdated, incomplete, or inaccurate information. We do not guarantee that any lead will result in a bid opportunity. You are responsible for verifying project details, bid due dates, and requirements before submitting proposals.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground">7. Third-Party Integrations</h2>
            <p className="mt-2">AUTOLEADS integrates with Google (Gmail, Calendar, Drive) and payment processors via OAuth. You grant us access to these services with your explicit consent. We are not responsible for downtime, data loss, or policy changes by third-party providers. You may revoke access at any time.</p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-foreground"><Gavel size={18} className="text-[#b0a209]" /> 8. Limitation of Liability</h2>
            <p className="mt-2">AUTOLEADS is provided "as is" without warranties of any kind. We are not liable for lost bids, missed deadlines, inaccurate estimates, or any business decisions made based on platform data. Our total liability shall not exceed the amount you paid in the preceding 12 months.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground">9. Termination</h2>
            <p className="mt-2">We may suspend or terminate your account for violation of these terms. You may cancel your account at any time. Upon termination, your data will be retained for 30 days then permanently deleted, unless required by law.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground">10. Changes to Terms</h2>
            <p className="mt-2">We may update these terms at any time. Continued use of AUTOLEADS after changes constitutes acceptance. Material changes will be communicated via email or in-app notification.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground">11. Governing Law</h2>
            <p className="mt-2">These terms are governed by the laws of the United States. Disputes will be resolved through binding arbitration.</p>
          </section>
        </div>

        <div className="mt-10 rounded-xl border border-border bg-muted/50 p-4 text-xs text-muted-foreground">
          These terms are provided for informational purposes and should be reviewed by legal counsel before production use.
        </div>
      </div>
    </div>
  );
}