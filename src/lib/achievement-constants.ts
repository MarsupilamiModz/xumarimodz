import type { AchievementRarity } from "@prisma/client";
import { colors } from "@/styles/tokens";

// Browser-taugliche Konstanten (ohne Datenbank-Import).
export const SHOWCASE_MAX = 3;

export const RARITY_STYLES: Record<
  AchievementRarity,
  { color: string; glow: string; label: string }
> = {
  COMMON: { color: colors.inkMuted, glow: "", label: "Common" },
  UNCOMMON: { color: colors.success, glow: "", label: "Uncommon" },
  RARE: { color: colors.violetBright, glow: "", label: "Rare" },
  EPIC: { color: colors.violetBright, glow: "", label: "Epic" },
  LEGENDARY: { color: colors.warning, glow: "", label: "Legendary" },
};
