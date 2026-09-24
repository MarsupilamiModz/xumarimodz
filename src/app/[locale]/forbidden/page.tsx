import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/error/error-screen";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = { robots: { index: false } };

/** Ziel der Berechtigungsprüfungen in lib/auth (403). */
export default async function ForbiddenPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("common");

  return (
    <ErrorScreen
      icon={ShieldOff}
      label={t("errorCode", { code: 403 })}
      title={t("forbiddenTitle")}
      description={t("forbiddenHint")}
      actions={
        <>
          <Button asChild>
            <Link href={`/${locale}/dashboard`}>{t("toAccount")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/dashboard/support/new`}>{t("contactSupport")}</Link>
          </Button>
        </>
      }
    />
  );
}
