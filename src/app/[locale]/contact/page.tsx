"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { SITE } from "@/lib/site";
import { sendContactMessage } from "@/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader, SectionCard } from "@/components/ui/page-header";

export default function ContactPage() {
  const t = useTranslations("publicPages.contact");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="page-section">
      <div className="max-w-lg">
        <PageHeader title={t("title", { site: SITE.name })} description={t("subtitle")} />
        <SectionCard>
          {sent ? (
            <div className="flex gap-3" role="status">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
              <div>
                <p className="font-semibold text-ink">{t("sentTitle")}</p>
                <p className="mt-1 text-sm text-ink-muted">{t("sentText")}</p>
              </div>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  const result = await sendContactMessage({
                    name: fd.get("name") as string,
                    email: fd.get("email") as string,
                    message: fd.get("message") as string,
                  });
                  if (result.success) setSent(true);
                  else setError(result.error);
                });
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label htmlFor="contact-name" className="label-text">{t("name")}</label>
                <Input id="contact-name" name="name" required autoComplete="name" disabled={pending} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contact-email" className="label-text">{t("email")}</label>
                <Input id="contact-email" name="email" type="email" required autoComplete="email" disabled={pending} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contact-message" className="label-text">{t("message")}</label>
                <Textarea id="contact-message" name="message" rows={5} required disabled={pending} />
              </div>
              {error && (
                <p role="alert" className="text-sm text-danger">
                  {t("error")}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? t("sending") : t("submit")}
              </Button>
            </form>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
