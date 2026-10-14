import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getPublicTeamPageData } from "@/lib/team-profiles";
import { TeamPageClient } from "@/components/team/team-page-client";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "publicPages.team" });
  return { title: t("title") };
}

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
