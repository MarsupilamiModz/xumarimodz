import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage, LegalPlaceholder } from "@/components/legal/legal-page";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("withdrawal") };
}

// TODO(content): Widerrufsbelehrung für digitale Inhalte und Abos fehlt – Text liefern und Platzhalter ersetzen.
export default async function WithdrawalPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("withdrawal")}>
      <LegalPlaceholder title={t("placeholderTitle")} text={t("placeholderText")} />
    </LegalPage>
  );
}
