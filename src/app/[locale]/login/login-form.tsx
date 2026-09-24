"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard, AuthError, authLabelClass, useAuthErrorMessage } from "@/components/auth/auth-card";
import { safeRedirectPath } from "@/lib/safe-redirect";

export function LoginForm() {
  const t = useTranslations("auth");
  const params = useParams();
  const locale = params.locale as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  const toMessage = useAuthErrorMessage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Nur interne Ziele (Schutz vor Open Redirect).
  const target = safeRedirectPath(searchParams.get("redirect"), `/${locale}/dashboard`);

  const authError = searchParams.get("error");
  const authErrorMessage =
    authError === "db_sync"
      ? t("errors.dbSync")
      : authError === "auth_exchange"
        ? t("errors.authExchange")
        : authError
          ? t("errors.generic")
          : "";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      setLoading(false);
      setError(toMessage(err.message));
      return;
    }
    router.push(target);
    router.refresh();
  }

  async function loginWithDiscord() {
    setLoading(true);
    setError("");
    const supabase = createClient();
    const callbackUrl = new URL("/api/auth/callback", window.location.origin);
    callbackUrl.searchParams.set("next", target);
    callbackUrl.searchParams.set("locale", locale);

    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: callbackUrl.toString() },
    });
    if (err) {
      setError(toMessage(err.message));
      setLoading(false);
    }
  }

  return (
    <AuthCard locale={locale} mode="login" title={t("login")} subtitle={t("loginSubtitle")}>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="login-email" className={authLabelClass}>{t("email")}</label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor="login-password" className="text-sm font-semibold text-ink">{t("password")}</label>
            <Link href={`/${locale}/forgot-password`} className="link text-[13px]">
              {t("forgot")}
            </Link>
          </div>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <AuthError message={error || authErrorMessage} />
        <Button className="w-full" size="lg" type="submit" disabled={loading} aria-busy={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {loading ? t("loggingIn") : t("login")}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ink-faint" aria-hidden>
        <span className="h-px flex-1 bg-line" />
        {t("or")}
        <span className="h-px flex-1 bg-line" />
      </div>

      <Button variant="outline" className="w-full" onClick={loginWithDiscord} disabled={loading}>
        {t("discord")}
      </Button>
    </AuthCard>
  );
}
