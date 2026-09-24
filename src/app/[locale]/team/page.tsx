import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { getPublicTeamPageData } from "@/lib/team-profiles";
import { TeamPageClient } from "@/components/team/team-page-client";
import type { Locale } from "@/i18n/config";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage({ params: { locale } }: { params: { locale: Locale } }) {
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
