import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Ban } from "lucide-react";
import { ErrorScreen } from "@/components/error/error-screen";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = { robots: { index: false } };

/** Ziel für gesperrte Konten. */
export default async function BannedPage(props: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await props.params;
  setRequestLocale(locale);
  const t = await getTranslations("publicPages.banned");

  return <ErrorScreen icon={Ban} label={t("label")} title={t("title")} description={t("text")} />;
}
