"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { useNavUser } from "@/lib/nav-user-client";

function AuthLoadingAvatar() {
  return (
    <div className="flex items-center gap-2 px-2" aria-hidden>
      <span className="block h-8 w-8 animate-pulse rounded-full bg-elevated" />
    </div>
  );
}

// Konto-Menü (Radix-Dropdown) nur für angemeldete Nutzer laden – Gäste laden es nie.
const UserNav = dynamic(() => import("@/components/layout/user-nav").then((m) => m.UserNav), {
  loading: () => <AuthLoadingAvatar />,
});

/** Nutzer kommt aus dem Browser (useNavUser), damit die Seiten selbst gecacht werden können. */
export function AuthButtons({ locale }: { locale: string }) {
  const t = useTranslations("nav");
  const { status, user } = useNavUser();

  if (status === "loading") return <AuthLoadingAvatar />;
  if (status === "user") return <UserNav locale={locale} user={user} />;

  // Registrieren ist über die Anmeldeseite (umschaltbar) und das Mobil-Menü erreichbar.
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/${locale}/login`}>{t("login")}</Link>
    </Button>
  );
}
