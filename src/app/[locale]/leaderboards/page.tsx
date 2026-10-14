import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getLeaderboard, PUBLIC_LEADERBOARD_METRICS, syncCreatorRanks } from "@/lib/leaderboards";
import { getAllGames } from "@/lib/data";
import { LeaderboardClient } from "@/components/leaderboards/leaderboard-client";
import type { LeaderboardMetric, LeaderboardPeriod } from "@prisma/client";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { runAfterResponse } from "@/lib/after-response";
import { Skeleton } from "@/components/ui/skeleton";

export const revalidate = 120;

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "publicPages.leaderboards" });
  return { title: t("title"), description: t("metaDescription") };
}

export default async function LeaderboardsPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{
      metric?: string;
      period?: string;
      game?: string;
      q?: string;
    }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);

  runAfterResponse(syncCreatorRanks());

  const metric = (searchParams.metric?.toUpperCase() ?? "DOWNLOADS") as LeaderboardMetric;
  const period = (searchParams.period?.toUpperCase() ?? "ALL_TIME") as LeaderboardPeriod;
  const validMetric = PUBLIC_LEADERBOARD_METRICS.includes(metric) ? metric : "DOWNLOADS";

  const [entries, games] = await Promise.all([
    getLeaderboard({
      metric: validMetric,
      period,
      gameSlug: searchParams.game,
      search: searchParams.q,
      limit: 50,
    }),
    getAllGames(),
  ]);

  return (
    <div className="page-section">
      <Suspense fallback={<Skeleton className="h-96 rounded-lg" />}>
        <LeaderboardClient
          locale={locale}
          entries={entries}
          games={games}
          initialMetric={validMetric}
          initialPeriod={period}
          initialGame={searchParams.game}
          initialSearch={searchParams.q}
        />
      </Suspense>
    </div>
  );
}
