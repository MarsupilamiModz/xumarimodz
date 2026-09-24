import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { LegalPage } from "@/components/legal/legal-page";

// TODO(content): Datenschutzerklärung ist nur ein kurzer englischer Platzhalter – vollständigen Text liefern.
export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {SITE.name} collects account data, download analytics, and payment information processed securely
        via Stripe. We do not sell personal data to third parties.
      </p>
      <p>
        Discord OAuth is used for login and community role sync. You can request account deletion by
        contacting support.
      </p>
    </LegalPage>
  );
}
