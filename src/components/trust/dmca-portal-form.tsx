"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";
import { submitDMCAClaim } from "@/actions/admin/trust";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const labelClass = "text-sm font-medium text-ink";

export function DMCAPortalForm() {
  const t = useTranslations("legal.dmca");
  const [pending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const r = await submitDMCAClaim({
        companyName: fd.get("companyName") as string,
        legalName: fd.get("legalName") as string,
        contactEmail: fd.get("contactEmail") as string,
        contactPhone: (fd.get("contactPhone") as string) || undefined,
        infringingUrl: fd.get("infringingUrl") as string,
        description: fd.get("description") as string,
      });
      if (r.success) setSubmitted(true);
      else setError(t("error"));
    });
  }

  if (submitted) {
    return (
      <Card className="flex gap-4 p-6" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
        <div>
          <p className="font-semibold text-ink">{t("successTitle")}</p>
          <p className="mt-1 text-sm text-ink-muted">{t("successText")}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="dmca-company" className={labelClass}>{t("company")}</label>
            <Input id="dmca-company" name="companyName" required autoComplete="organization" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dmca-name" className={labelClass}>{t("legalName")}</label>
            <Input id="dmca-name" name="legalName" required autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dmca-email" className={labelClass}>{t("email")}</label>
            <Input id="dmca-email" name="contactEmail" type="email" required autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="dmca-phone" className={labelClass}>{t("phone")}</label>
            <Input id="dmca-phone" name="contactPhone" type="tel" autoComplete="tel" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dmca-url" className={labelClass}>{t("url")}</label>
          <Input id="dmca-url" name="infringingUrl" type="url" required placeholder="https://" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="dmca-description" className={labelClass}>{t("description")}</label>
          <Textarea
            id="dmca-description"
            name="description"
            required
            rows={6}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? t("sending") : t("submit")}
        </Button>
      </form>
    </Card>
  );
}
