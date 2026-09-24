import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorScreen } from "@/components/error/error-screen";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = { robots: { index: false } };

/** Ziel, wenn die Anmeldung klappt, der Abgleich mit der Datenbank aber scheitert. */
export default async function AuthSyncErrorPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("common");
  return (
    <ErrorScreen
      icon={UserX}
      label={t("error")}
      title={t("syncErrorTitle")}
      description={t("syncErrorText")}
      actions={
        <>
          <Button asChild>
            <Link href={`/${locale}/login`}>{t("signInAgain")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}/dashboard/support/new`}>{t("contactSupport")}</Link>
          </Button>
        </>
      }
    />
  );
}
