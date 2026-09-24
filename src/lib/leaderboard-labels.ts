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

export const METRIC_LABELS: Record<LeaderboardMetric, string> = {
  DOWNLOADS: "Top Downloads",
  REVENUE: "Highest Revenue",
  LIKES: "Most Likes",
  GROWTH: "Fastest Growth",
  ACTIVE: "Most Active",
  REVIEWED: "Most Reviewed",
  TRENDING: "Trending Creators",
  RATED: "Highest Rated",
};

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  ALL_TIME: "All Time",
};
