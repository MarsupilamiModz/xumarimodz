// Browser-taugliche Bestenlisten-Typen und Beschriftungen (ohne Datenbank).
import type { CreatorRankTier, LeaderboardMetric, LeaderboardPeriod, PublisherLevel } from "@prisma/client";

export type LeaderboardEntry = {
  rank: number;
  creatorId: string;
  slug: string;
  name: string;
  avatarUrl: string | null;
  rankTier: CreatorRankTier;
  level: PublisherLevel;
  score: number;
  totalDownloads: number;
  totalRevenueCents: number;
  followerCount: number;
  isPinned: boolean;
  isFeatured: boolean;
  tagline: string | null;
  change?: number;
};

export const PUBLIC_LEADERBOARD_METRICS: LeaderboardMetric[] = [
  "DOWNLOADS",
  "LIKES",
  "GROWTH",
  "ACTIVE",
  "REVIEWED",
  "TRENDING",
  "RATED",
];

// Nachrichtenschlüssel (nicht Text): in der Komponente mit t(METRIC_LABELS[metric]) übersetzen.
export const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  DOWNLOADS: "publicPages.leaderboards.metric.DOWNLOADS",
  REVENUE: "publicPages.leaderboards.metric.REVENUE",
  LIKES: "publicPages.leaderboards.metric.LIKES",
  GROWTH: "publicPages.leaderboards.metric.GROWTH",
  ACTIVE: "publicPages.leaderboards.metric.ACTIVE",
  REVIEWED: "publicPages.leaderboards.metric.REVIEWED",
  TRENDING: "publicPages.leaderboards.metric.TRENDING",
  RATED: "publicPages.leaderboards.metric.RATED",
};

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  DAILY: "publicPages.leaderboards.period.DAILY",
  WEEKLY: "publicPages.leaderboards.period.WEEKLY",
  MONTHLY: "publicPages.leaderboards.period.MONTHLY",
  ALL_TIME: "publicPages.leaderboards.period.ALL_TIME",
};
