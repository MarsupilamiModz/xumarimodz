import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Wrench } from "lucide-react";
import { ErrorScreen } from "@/components/error/error-screen";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = { robots: { index: false } };

// TODO(backend): Wartungsmodus fehlt. Benötigt eine Einstellung im ACP (SiteSetting "maintenance_mode")
// und eine Weiterleitung in src/middleware.ts auf diese Seite – Admins und /api/stripe/webhook ausgenommen.
export default async function MaintenancePage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <ErrorScreen
      icon={Wrench}
      label={t("maintenanceLabel")}
      title={t("maintenanceTitle")}
      description={t("maintenanceHint")}
    />
  );
}
