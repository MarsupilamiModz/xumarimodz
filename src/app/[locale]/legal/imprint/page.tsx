import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage, LegalPlaceholder } from "@/components/legal/legal-page";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("imprint") };
}

// TODO(content): Impressum fehlt (Pflichtangaben nach § 5 DDG) – Text liefern und Platzhalter ersetzen.
export default async function ImprintPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("imprint")}>
      <LegalPlaceholder title={t("placeholderTitle")} text={t("placeholderText")} />
    </LegalPage>
  );
}
