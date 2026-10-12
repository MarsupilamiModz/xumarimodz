import { requirePagePermission } from "@/lib/auth";
import { setRequestLocale } from "next-intl/server";
import { TeamChatPage } from "@/components/chat/team-chat-page";
import type { Locale } from "@/i18n/config";

export default async function AdminChatRoute(
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

  await requirePagePermission("team.chat");
  setRequestLocale(locale);
  return <TeamChatPage locale={locale} channelId={searchParams.channel} />;
}
