"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Pin, TrendingUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { UserAvatar } from "@/components/ui/user-avatar";
import { controlClassName } from "@/components/ui/input";
import { CreatorRankBadge } from "@/components/leaderboards/creator-rank-badge";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import { PUBLIC_LEADERBOARD_METRICS, type LeaderboardEntry } from "@/lib/leaderboard-labels";
import { formatNumber } from "@/lib/format-locale";
import { cn } from "@/lib/utils";
import type { LeaderboardMetric, LeaderboardPeriod } from "@prisma/client";

type Game = { slug: string; name: string };

const PERIODS: LeaderboardPeriod[] = ["DAILY", "WEEKLY", "MONTHLY", "ALL_TIME"];

export function LeaderboardClient({
  locale,
  entries,
  games,
  initialMetric,
  initialPeriod,
  initialGame,
  initialSearch,
}: {
  locale: string;
  entries: LeaderboardEntry[];
  games: Game[];
  initialMetric: LeaderboardMetric;
  initialPeriod: LeaderboardPeriod;
  initialGame?: string;
  initialSearch?: string;
}) {
  const t = useTranslations("publicPages.leaderboards");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const push = useCallback(
    (next: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(next).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      startTransition(() => router.push(`/${locale}/leaderboards?${params.toString()}`));
    },
    [locale, router, searchParams]
  );

  const top = entries[0];

  const columns: DataColumn<LeaderboardEntry>[] = [
    {
      key: "rank",
      header: t("colRank"),
      width: "48px",
      cell: (e) => (
        <span className={cn("font-semibold tabular-nums", e.rank <= 3 ? "text-ink" : "text-ink-muted")}>{e.rank}</span>
      ),
    },
    {
      key: "creator",
      header: t("colCreator"),
      width: "minmax(0,3fr)",
      cell: (e) => (
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar src={e.avatarUrl} name={e.name} className="h-9 w-9" />
          <div className="min-w-0">
            <p className="truncate font-medium text-ink">{e.name}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <CreatorRankBadge tier={e.rankTier} size="sm" />
              {e.isPinned && (
                <Badge variant="secondary">
                  <Pin className="h-3 w-3" aria-hidden />
                  {t("pinned")}
                </Badge>
              )}
              {e.isFeatured && (
                <Badge variant="outline">
                  <TrendingUp className="h-3 w-3" aria-hidden />
                  {t("featured")}
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    { key: "score", header: t("colScore"), align: "right", cell: (e) => <span className="font-semibold">{formatNumber(e.score, locale)}</span> },
    { key: "downloads", header: t("colDownloads"), align: "right", hideOnMobile: true, cell: (e) => formatNumber(e.totalDownloads, locale) },
    { key: "followers", header: t("colFollowers"), align: "right", hideOnMobile: true, cell: (e) => formatNumber(e.followerCount, locale) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader className="mb-0" title={t("title")} description={t("subtitle")} />

      <div className="space-y-3">
        <ChipTabs
          label={t("metricLabel")}
          options={PUBLIC_LEADERBOARD_METRICS.map((m) => ({ value: m, label: t(`metric.${m}`) }))}
          value={initialMetric}
          onChange={(m) => push({ metric: m })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <ChipTabs
            label={t("periodLabel")}
            options={PERIODS.map((p) => ({ value: p, label: t(`period.${p}`) }))}
            value={initialPeriod}
            onChange={(p) => push({ period: p })}
          />
          <label htmlFor="leaderboard-game" className="sr-only">
            {t("gameLabel")}
          </label>
          <select
            id="leaderboard-game"
            defaultValue={initialGame ?? ""}
            onChange={(e) => push({ game: e.target.value || undefined })}
            className={cn(controlClassName, "h-9 w-auto")}
          >
            <option value="">{t("allGames")}</option>
            {games.map((g) => (
              <option key={g.slug} value={g.slug}>{g.name}</option>
            ))}
          </select>
          <SearchField
            name="q"
            label={t("searchLabel")}
            defaultValue={initialSearch}
            className="w-56"
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ q: (e.target as HTMLInputElement).value || undefined });
            }}
          />
        </div>
      </div>

      {top && (
        <section aria-label={t("topLabel")} className="rounded-lg border border-line bg-raised p-5">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-[26px] font-bold leading-8 tabular-nums text-ink" aria-hidden>
              #1
            </span>
            <UserAvatar src={top.avatarUrl} name={top.name} className="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <Link href={`/${locale}/creators/${top.slug}`} className="text-lg font-semibold text-ink hover:text-violet-bright">
                {top.name}
              </Link>
              {top.tagline && <p className="text-sm text-ink-muted">{top.tagline}</p>}
              <div className="mt-2 flex gap-2">
                <CreatorRankBadge tier={top.rankTier} size="sm" />
                <CreatorLevelBadge level={top.level} size="sm" />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[26px] font-bold leading-8 tabular-nums text-ink">{formatNumber(top.score, locale)}</p>
              <p className="label-text">{t("colScore")}</p>
            </div>
          </div>
        </section>
      )}

      <DataTable
        caption={t("tableCaption")}
        columns={columns}
        rows={entries}
        rowKey={(e) => e.creatorId}
        rowHref={(e) => `/${locale}/creators/${e.slug}`}
        empty={<EmptyState icon={Trophy} title={t("emptyTitle")} description={t("emptyText")} />}
      />
    </div>
  );
}
