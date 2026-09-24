import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { LegalPage } from "@/components/legal/legal-page";

// TODO(content): AGB sind nur ein kurzer englischer Platzhalter – vollständigen Text liefern.
export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        By using {SITE.name} you agree to these terms. Mod creators retain intellectual property rights to
        their content. Premium subscriptions renew automatically unless canceled before the renewal date.
      </p>
      <p>
        You may not redistribute premium downloads outside the platform. Violations may result in account
        suspension.
      </p>
    </LegalPage>
  );
}
