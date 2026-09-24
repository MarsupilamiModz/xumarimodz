import { colors } from "@/styles/tokens";
import type { CreatorRankTier } from "@prisma/client";

export const RANK_TIERS: CreatorRankTier[] = [
  "BRONZE",
  "SILVER",
  "GOLD",
  "DIAMOND",
  "ELITE",
  "LEGENDARY",
];

export const RANK_CONFIG: Record<
  CreatorRankTier,
  { minScore: number; color: string; border: string; glow: string; label: string }
> = {
  BRONZE: { minScore: 0, color: colors.inkFaint, border: "border-line-control", glow: "", label: "Bronze" },
  SILVER: { minScore: 100, color: colors.inkMuted, border: "border-line-control", glow: "", label: "Silver" },
  GOLD: { minScore: 500, color: colors.warning, border: "border-warning/50", glow: "", label: "Gold" },
  DIAMOND: { minScore: 2000, color: colors.violetBright, border: "border-violet-bright/50", glow: "", label: "Diamond" },
  ELITE: { minScore: 10000, color: colors.violetBright, border: "border-violet-bright/50", glow: "", label: "Elite" },
  LEGENDARY: { minScore: 50000, color: colors.warning, border: "border-warning/50", glow: "", label: "Legendary" },
};

export function scoreToRankTier(score: number): CreatorRankTier {
  let tier: CreatorRankTier = "BRONZE";
  for (const t of RANK_TIERS) {
    if (score >= RANK_CONFIG[t].minScore) tier = t;
  }
  return tier;
}

export function computeCreatorRankScore(stats: {
  totalDownloads: number;
  totalRevenueCents: number;
  followerCount: number;
  reviewCount?: number;
  averageRating?: number;
  modCount?: number;
}) {
  const downloadScore = stats.totalDownloads * 1;
  const revenueScore = stats.totalRevenueCents / 100;
  const followerScore = stats.followerCount * 5;
  const reviewScore = (stats.reviewCount ?? 0) * 10;
  const ratingBonus = (stats.averageRating ?? 0) * 50;
  const modBonus = (stats.modCount ?? 0) * 25;
  return downloadScore + revenueScore + followerScore + reviewScore + ratingBonus + modBonus;
}
