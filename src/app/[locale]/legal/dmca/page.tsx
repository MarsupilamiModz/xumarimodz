import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";
import { DMCAPortalForm } from "@/components/trust/dmca-portal-form";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "legal" });
  return { title: t("dmcaTitle") };
}

export default async function DmcaPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("legal");
  return (
    <LegalPage title={t("dmcaTitle")}>
      <p>{t("dmcaIntro")}</p>
      <DMCAPortalForm />
    </LegalPage>
  );
}
