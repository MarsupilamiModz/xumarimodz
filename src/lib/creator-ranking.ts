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

/**
 * Punkte je Einheit (im ACP unter Bestenlisten → Einstellungen änderbar).
 * downloads: je Download · revenue: je Cent Umsatz · likes: je Follower · reviews: je Bewertung ·
 * rating: je Stern Durchschnitt · growth: je veröffentlichtem Mod.
 */
export type RankWeights = { downloads: number; revenue: number; likes: number; growth: number; reviews: number; rating: number };
export const RANK_WEIGHT_DEFAULTS: RankWeights = { downloads: 1, revenue: 0.01, likes: 5, growth: 25, reviews: 10, rating: 50 };

export function computeCreatorRankScore(
  stats: {
    totalDownloads: number;
    totalRevenueCents: number;
    followerCount: number;
    reviewCount?: number;
    averageRating?: number;
    modCount?: number;
  },
  weights: RankWeights = RANK_WEIGHT_DEFAULTS
) {
  return (
    stats.totalDownloads * weights.downloads +
    stats.totalRevenueCents * weights.revenue +
    stats.followerCount * weights.likes +
    (stats.reviewCount ?? 0) * weights.reviews +
    (stats.averageRating ?? 0) * weights.rating +
    (stats.modCount ?? 0) * weights.growth
  );
}
