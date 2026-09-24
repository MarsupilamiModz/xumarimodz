"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, MailCheck } from "lucide-react";
import { requestPasswordReset } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard, AuthError, authLabelClass } from "@/components/auth/auth-card";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = params.locale as string;
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <AuthCard locale={locale} title={t("forgotTitle")} subtitle={sent ? undefined : t("forgotSubtitle")}>
      {sent ? (
        <div role="status" className="flex gap-3 rounded-md bg-success-soft p-4 text-sm text-success">
          <MailCheck className="h-5 w-5 shrink-0" aria-hidden />
          {t("forgotSent", { email })}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            startTransition(async () => {
              const r = await requestPasswordReset(email, locale);
              if (r.success) setSent(true);
              else setError(t("errors.generic"));
            });
          }}
        >
          <div>
            <label htmlFor="forgot-email" className={authLabelClass}>{t("email")}</label>
            <Input id="forgot-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <AuthError message={error} />
          <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("forgotSubmit")}
          </Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href={`/${locale}/login`} className="link font-semibold">
          {t("backToLogin")}
        </Link>
      </p>
    </AuthCard>
  );
}
