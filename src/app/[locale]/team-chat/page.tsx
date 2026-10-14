import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { TeamChatPage } from "@/components/chat/team-chat-page";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "partnerPages.teamChat" });
  return { title: t("title"), robots: { index: false } };
}

export default async function TeamChatRoute(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ channel?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("partnerPages.teamChat");
  return (
    <div className="page-container py-8">
      {/* Der Chat füllt die Höhe des Fensters; die H1 bleibt daher nur für Screenreader sichtbar. */}
      <h1 className="sr-only">{t("title")}</h1>
      <TeamChatPage locale={locale} channelId={searchParams.channel} />
    </div>
  );
}
