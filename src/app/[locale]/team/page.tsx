import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getPublicTeamPageData } from "@/lib/team-profiles";
import { TeamPageClient } from "@/components/team/team-page-client";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const { members, departments } = await getPublicTeamPageData();
  return (
    <TeamPageClient
      members={members}
      departments={departments}
      contactTicketHref={`/${locale}/dashboard/support/new`}
    />
  );
}
