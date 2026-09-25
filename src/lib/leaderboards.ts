import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";
import type { CreatorRankTier, LeaderboardMetric, LeaderboardPeriod, PublisherLevel } from "@prisma/client";
import { RANK_WEIGHT_DEFAULTS, computeCreatorRankScore, scoreToRankTier, type RankWeights } from "@/lib/creator-ranking";
import { METRIC_LABELS, PERIOD_LABELS, PUBLIC_LEADERBOARD_METRICS, type LeaderboardEntry } from "@/lib/leaderboard-labels";

export { METRIC_LABELS, PERIOD_LABELS, PUBLIC_LEADERBOARD_METRICS, type LeaderboardEntry };

export type LeaderboardWeights = RankWeights;
export const DEFAULT_LEADERBOARD_WEIGHTS = RANK_WEIGHT_DEFAULTS;

export type LeaderboardFilters = {
  metric: LeaderboardMetric;
  period: LeaderboardPeriod;
  gameSlug?: string;
  categorySlug?: string;
  level?: PublisherLevel;
  locale?: string;
  search?: string;
  limit?: number;
};


function periodStart(period: LeaderboardPeriod): Date | null {
  const now = Date.now();
  switch (period) {
    case "DAILY":
      return new Date(now - 24 * 60 * 60 * 1000);
    case "WEEKLY":
      return new Date(now - 7 * 24 * 60 * 60 * 1000);
    case "MONTHLY":
      return new Date(now - 30 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
}

export async function getLeaderboardWeights() {
  return getSiteSetting("leaderboard_weights", DEFAULT_LEADERBOARD_WEIGHTS);
}

export async function saveLeaderboardWeights(weights: LeaderboardWeights) {
  await setSiteSetting("leaderboard_weights", weights);
}

/** Im ACP ausgeblendete Creator (Profil-IDs); sie erscheinen in keiner öffentlichen Rangliste. */
export async function getHiddenLeaderboardCreators(): Promise<string[]> {
  const value = await getSiteSetting<{ ids: string[] }>("leaderboard_hidden", { ids: [] });
  return Array.isArray(value.ids) ? value.ids : [];
}

export async function setHiddenLeaderboardCreators(ids: string[]) {
  await setSiteSetting("leaderboard_hidden", { ids: Array.from(new Set(ids)) });
}

async function fetchLeaderboard(filters: LeaderboardFilters): Promise<LeaderboardEntry[]> {
  const limit = filters.limit ?? 50;
  const since = periodStart(filters.period);

  const game = filters.gameSlug
    ? await prisma.game.findUnique({ where: { slug: filters.gameSlug }, select: { id: true } })
    : null;

  // Downloads im Zeitraum je Autor: eine gruppierte Abfrage statt bis zu 50 000 Zeilen in den Speicher zu laden.
  const periodDownloadsByAuthor: Record<string, number> = {};
  if (since) {
    const rows = await prisma.$queryRaw<{ author: string; n: number }[]>`
      SELECT m."authorId" AS author, COUNT(*)::int AS n
      FROM "Download" d
      JOIN "Mod" m ON m.id = d."modId"
      WHERE d."createdAt" >= ${since}
      GROUP BY m."authorId"
    `;
    for (const r of rows) periodDownloadsByAuthor[r.author] = r.n;
  }
  const [hidden, weights] = await Promise.all([getHiddenLeaderboardCreators(), getLeaderboardWeights()]);

  const creators = await prisma.creatorProfile.findMany({
    where: {
      isPublic: true,
      isSuspended: false,
      ...(hidden.length ? { id: { notIn: hidden } } : {}),
      ...(filters.level && { level: filters.level }),
      ...(filters.search && {
        OR: [
          { slug: { contains: filters.search, mode: "insensitive" } },
          { user: { username: { contains: filters.search, mode: "insensitive" } } },
          { user: { displayName: { contains: filters.search, mode: "insensitive" } } },
        ],
      }),
      ...(filters.locale && { user: { locale: filters.locale } }),
      ...(game && {
        user: { mods: { some: { gameId: game.id, status: "PUBLISHED" } } },
      }),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          mods: {
            where: { status: "PUBLISHED" },
            select: {
              favoriteCount: true,
              reviewCount: true,
              averageRating: true,
              category: { select: { slug: true } },
            },
          },
        },
      },
    },
    take: 200,
  });

  const entries: Omit<LeaderboardEntry, "rank">[] = creators.map((c) => {
    let mods = c.user.mods;
    if (filters.categorySlug) {
      mods = mods.filter((m) => m.category?.slug === filters.categorySlug);
    }

    const periodDownloads = since ? (periodDownloadsByAuthor[c.userId] ?? 0) : c.totalDownloads;
    const totalLikes = mods.reduce((s, m) => s + m.favoriteCount, 0);
    const totalReviews = mods.reduce((s, m) => s + m.reviewCount, 0);
    const avgRating =
      mods.length > 0 ? mods.reduce((s, m) => s + m.averageRating, 0) / mods.length : 0;

    let score = 0;
    switch (filters.metric) {
      case "DOWNLOADS":
        score = periodDownloads;
        break;
      case "REVENUE":
        score = c.totalRevenueCents;
        break;
      case "LIKES":
        score = totalLikes;
        break;
      case "GROWTH":
        score = periodDownloads;
        break;
      case "ACTIVE":
        score = mods.length * 100 + periodDownloads;
        break;
      case "REVIEWED":
        score = totalReviews;
        break;
      case "TRENDING":
        score = (c.isTrending ? 1000 : 0) + periodDownloads * 2;
        break;
      case "RATED":
        score = avgRating * 100 + totalReviews;
        break;
      default:
        score = periodDownloads;
    }

    const rankScore = computeCreatorRankScore({
      totalDownloads: c.totalDownloads,
      totalRevenueCents: c.totalRevenueCents,
      followerCount: c.followerCount,
      reviewCount: totalReviews,
      averageRating: avgRating,
      modCount: mods.length,
    }, weights);

    return {
      creatorId: c.id,
      slug: c.slug,
      name: c.user.displayName ?? c.user.username,
      avatarUrl: c.user.avatarUrl,
      rankTier: c.rankTier ?? scoreToRankTier(rankScore),
      level: c.level,
      score,
      totalDownloads: c.totalDownloads,
      totalRevenueCents: c.totalRevenueCents,
      followerCount: c.followerCount,
      isPinned: c.leaderboardPinned && (!c.pinnedUntil || c.pinnedUntil > new Date()),
      isFeatured: c.isFeatured,
      tagline: c.tagline,
    };
  });

  entries.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return b.score - a.score;
  });

  return entries.slice(0, limit).map((e, i) => ({ ...e, rank: i + 1 }));
}

export function getLeaderboard(filters: LeaderboardFilters) {
  const key = JSON.stringify(filters);
  return unstable_cache(() => fetchLeaderboard(filters), [`leaderboard-${key}`], {
    revalidate: 120,
    tags: ["leaderboards"],
  })();
}

export async function syncCreatorRanksIfStale(maxAgeMs = 60 * 60 * 1000) {
  const key = "creator_ranks_last_sync";
  const { syncedAt } = await getSiteSetting<{ syncedAt?: string }>(key, {});
  if (syncedAt) {
    const elapsed = Date.now() - new Date(syncedAt).getTime();
    if (elapsed >= 0 && elapsed < maxAgeMs) return;
  }

  await syncCreatorRanks();
  await setSiteSetting(key, { syncedAt: new Date().toISOString() });
}

export async function syncCreatorRanks() {
  const weights = await getLeaderboardWeights();
  const creators = await prisma.creatorProfile.findMany({
    include: {
      user: {
        select: {
          mods: {
            where: { status: "PUBLISHED" },
            select: { reviewCount: true, averageRating: true },
          },
        },
      },
    },
  });

  for (const c of creators) {
    const reviewCount = c.user.mods.reduce((s, m) => s + m.reviewCount, 0);
    const avgRating =
      c.user.mods.length > 0
        ? c.user.mods.reduce((s, m) => s + m.averageRating, 0) / c.user.mods.length
        : 0;
    const rankScore = computeCreatorRankScore({
      totalDownloads: c.totalDownloads,
      totalRevenueCents: c.totalRevenueCents,
      followerCount: c.followerCount,
      reviewCount,
      averageRating: avgRating,
      modCount: c.user.mods.length,
    }, weights);
    const rankTier = scoreToRankTier(rankScore);
    await prisma.creatorProfile.update({
      where: { id: c.id },
      data: { rankScore, rankTier },
    });
  }
}



