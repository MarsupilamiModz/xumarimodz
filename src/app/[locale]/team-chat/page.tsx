import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { TeamChatPage } from "@/components/chat/team-chat-page";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = { title: "Team-Chat", robots: { index: false } };

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
  return (
    <div className="page-container py-8">
      <TeamChatPage locale={locale} channelId={searchParams.channel} />
    </div>
  );
}
