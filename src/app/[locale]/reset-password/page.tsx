"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard, AuthError, authLabelClass, useAuthErrorMessage } from "@/components/auth/auth-card";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = params.locale as string;
  const toMessage = useAuthErrorMessage();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <AuthCard locale={locale} title={t("resetTitle")}>
      {done ? (
        <div className="space-y-5">
          <div role="status" className="flex gap-3 rounded-md bg-success-soft p-4 text-sm text-success">
            <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
            {t("resetDone")}
          </div>
          <Button className="w-full" size="lg" asChild>
            <Link href={`/${locale}/login`}>{t("login")}</Link>
          </Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError("");
            startTransition(async () => {
              const supabase = createClient();
              const { error: err } = await supabase.auth.updateUser({ password });
              if (err) {
                setError(toMessage(err.message));
                return;
              }
              setDone(true);
            });
          }}
        >
          <div>
            <label htmlFor="reset-password" className={authLabelClass}>{t("newPassword")}</label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              aria-describedby="reset-password-hint"
            />
            <p id="reset-password-hint" className="meta mt-1">{t("passwordHint")}</p>
          </div>
          <AuthError message={error} />
          <Button type="submit" size="lg" className="w-full" disabled={pending} aria-busy={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("resetSubmit")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
