import { useTranslations } from "next-intl";
import { RANK_CONFIG } from "@/lib/creator-ranking";
import type { CreatorRankTier } from "@prisma/client";
import { cn } from "@/lib/utils";

// Rangname übersetzt (sharedUi.rankBadge), Farbe nur über Token-Klassen aus RANK_CONFIG.
export function CreatorRankBadge({
  tier,
  size = "md",
  className,
}: {
  tier: CreatorRankTier;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("sharedUi.rankBadge");
  const config = RANK_CONFIG[tier];
  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0.5" : size === "lg" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border bg-raised font-semibold uppercase tracking-wide",
        config.className,
        sizeClass,
        className
      )}
    >
      {t(tier)}
    </span>
  );
}
