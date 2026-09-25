"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setNewsletterConsent } from "@/actions/newsletter";
import { Switch } from "@/components/ui/switch";
import { useAppToast } from "@/hooks/use-app-toast";

/** Newsletter-Einwilligung im Konto (jederzeit widerrufbar). */
export function NewsletterToggle({ initial }: { initial: boolean }) {
  const t = useTranslations("dashboard");
  const appToast = useAppToast();
  const [on, setOn] = useState(initial);
  const [pending, startTransition] = useTransition();
  return (
    <section className="flex items-start justify-between gap-4 rounded-lg border border-line bg-raised p-4" aria-labelledby="newsletter-label">
      <div>
        <label id="newsletter-label" htmlFor="newsletter-switch" className="text-[13px] font-semibold text-ink">{t("newsletterTitle")}</label>
        <p className="mt-0.5 text-sm text-ink-muted">{t("newsletterText")}</p>
      </div>
      <Switch
        id="newsletter-switch"
        checked={on}
        disabled={pending}
        onCheckedChange={(v) => {
          setOn(v);
          startTransition(async () => {
            const r = await setNewsletterConsent(v);
            if (!r.success) {
              setOn(!v);
              appToast.error(r.error);
              return;
            }
            appToast.saved(v ? t("newsletterOn") : t("newsletterOff"));
          });
        }}
      />
    </section>
  );
}
