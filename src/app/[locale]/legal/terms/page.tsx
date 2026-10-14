import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SITE } from "@/lib/site";
import { LegalPage } from "@/components/legal/legal-page";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "publicPages.legal.terms" });
  return { title: t("title") };
}

// TODO(content): AGB sind nur ein kurzer Platzhalter – vollständigen Text liefern.
export default async function TermsPage(props: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("publicPages.legal.terms");
  return (
    <LegalPage title={t("title")}>
      <p>{t("p1", { site: SITE.name })}</p>
      <p>{t("p2")}</p>
    </LegalPage>
  );
}
