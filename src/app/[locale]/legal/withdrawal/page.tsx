import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage, LegalPlaceholder } from "@/components/legal/legal-page";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("withdrawal") };
}

// TODO(content): Widerrufsbelehrung für digitale Inhalte und Abos fehlt – Text liefern und Platzhalter ersetzen.
export default async function WithdrawalPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("withdrawal")}>
      <LegalPlaceholder title={t("placeholderTitle")} text={t("placeholderText")} />
    </LegalPage>
  );
}
