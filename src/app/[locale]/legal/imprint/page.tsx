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
  return { title: t("imprint") };
}

// TODO(content): Impressum fehlt (Pflichtangaben nach § 5 DDG) – Text liefern und Platzhalter ersetzen.
export default async function ImprintPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("imprint")}>
      <LegalPlaceholder title={t("placeholderTitle")} text={t("placeholderText")} />
    </LegalPage>
  );
}
