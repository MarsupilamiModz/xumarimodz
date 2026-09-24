"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

/** Übersetzt typische Supabase-Fehlermeldungen; unbekannte werden zur allgemeinen Meldung. */
export function useAuthErrorMessage() {
  const t = useTranslations("auth.errors");
  return (message?: string | null) => {
    const m = (message ?? "").toLowerCase();
    if (!m) return t("generic");
    if (m.includes("invalid login") || m.includes("invalid credentials")) return t("invalidCredentials");
    if (m.includes("not confirmed")) return t("emailNotConfirmed");
    if (m.includes("already registered") || m.includes("already exists")) return t("userExists");
    if (m.includes("password should") || m.includes("weak")) return t("weakPassword");
    if (m.includes("rate limit") || m.includes("too many")) return t("rateLimited");
    if (m.includes("expired") || m.includes("invalid token")) return t("linkExpired");
    return t("generic");
  };
}

/**
 * Karte für Anmelden, Registrieren, Passwort vergessen/zurücksetzen.
 * `mode` zeigt den Umschalter Anmelden/Registrieren (ein Konto für Webseite und App).
 */
export function AuthCard({
  locale,
  mode,
  title,
  subtitle,
  children,
}: {
  locale: string;
  mode?: "login" | "register";
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("auth");
  const tab = (active: boolean) =>
    cn(
      "flex h-9 flex-1 items-center justify-center rounded-md text-sm font-semibold transition-colors duration-fast",
      active ? "bg-elevated text-ink" : "text-ink-muted hover:text-ink"
    );

  return (
    <div className="page-container flex justify-center py-12 md:py-20">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-xl border border-line bg-raised p-6 sm:p-8">
          {mode && (
            <nav aria-label={t("modeLabel")} className="mb-6 flex gap-1 rounded-lg border border-line bg-canvas p-1">
              <Link href={`/${locale}/login`} aria-current={mode === "login" ? "page" : undefined} className={tab(mode === "login")}>
                {t("login")}
              </Link>
              <Link href={`/${locale}/register`} aria-current={mode === "register" ? "page" : undefined} className={tab(mode === "register")}>
                {t("register")}
              </Link>
            </nav>
          )}
          <h1 className="h1-display">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-ink-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {mode && <p className="meta mt-4 text-center">{t("accountNote")}</p>}
      </div>
    </div>
  );
}

export const authLabelClass = "mb-1.5 block text-sm font-semibold text-ink";

export function AuthError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  );
}
