import { setRequestLocale } from "next-intl/server";
import { TeamChatPage } from "@/components/chat/team-chat-page";
import type { Locale } from "@/i18n/config";

export default async function AdminChatRoute({
  params: { locale },
  searchParams,
}: {
  params: { locale: Locale };
  searchParams: { channel?: string };
}) {
  setRequestLocale(locale);
  return <TeamChatPage locale={locale} channelId={searchParams.channel} />;
}
