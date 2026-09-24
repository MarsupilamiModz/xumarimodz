"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendRegistrationWelcomeEmail } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard, AuthError, authLabelClass, useAuthErrorMessage } from "@/components/auth/auth-card";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const toMessage = useAuthErrorMessage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkInbox, setCheckInbox] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/${locale}/dashboard` },
    });
    setLoading(false);
    if (err) {
      setError(toMessage(err.message));
      return;
    }
    void sendRegistrationWelcomeEmail(email);
    // Mit E-Mail-Bestätigung gibt es noch keine Sitzung – Hinweis statt Weiterleitung.
    if (!data.session) {
      setCheckInbox(true);
      return;
    }
    router.push(`/${locale}/dashboard`);
    router.refresh();
  }

  return (
    <AuthCard locale={locale} mode="register" title={t("register")} subtitle={t("registerSubtitle")}>
      {checkInbox ? (
        <div role="status" className="flex gap-3 rounded-md bg-success-soft p-4 text-sm text-success">
          <MailCheck className="h-5 w-5 shrink-0" aria-hidden />
          {t("checkInbox")}
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label htmlFor="register-email" className={authLabelClass}>{t("email")}</label>
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label htmlFor="register-password" className={authLabelClass}>{t("password")}</label>
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              aria-describedby="register-password-hint"
            />
            <p id="register-password-hint" className="meta mt-1">{t("passwordHint")}</p>
          </div>
          <AuthError message={error} />
          <Button className="w-full" size="lg" type="submit" disabled={loading} aria-busy={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {loading ? t("registering") : t("register")}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}
