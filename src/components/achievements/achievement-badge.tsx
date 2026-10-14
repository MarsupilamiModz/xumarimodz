"use client";

import { useLocale, useTranslations } from "next-intl";
import { EntityIcon } from "@/components/ui/entity-icon";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format-locale";
import type { AchievementRarity } from "@prisma/client";

// Seltenheit über Token-Klassen (Rahmen bzw. Schrift) statt Inline-Farben.
export const RARITY_CLASS: Record<AchievementRarity, { border: string; text: string }> = {
  COMMON: { border: "border-ink-muted", text: "text-ink-muted" },
  UNCOMMON: { border: "border-success", text: "text-success" },
  RARE: { border: "border-violet-bright", text: "text-violet-bright" },
  EPIC: { border: "border-violet-bright", text: "text-violet-bright" },
  LEGENDARY: { border: "border-warning", text: "text-warning" },
};

type AchievementBadgeProps = {
  name: string;
  description?: string | null;
  icon?: string | null;
  rarity: AchievementRarity;
  animated?: boolean;
  glowEffect?: boolean;
  size?: "sm" | "md" | "lg";
  unlockedAt?: Date;
  className?: string;
};

export function AchievementBadge({
  name,
  description,
  icon,
  rarity,
  animated = false,
  glowEffect = true,
  size = "md",
  unlockedAt,
  className,
}: AchievementBadgeProps) {
  const t = useTranslations("accountPages.achievements.rarity");
  const locale = useLocale();
  const style = RARITY_CLASS[rarity];
  const unlockedLabel = unlockedAt ? formatDate(unlockedAt, locale) : null;
  const sizeClass = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const iconClass = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6";

  return (
    <div
      className={cn("group relative inline-flex flex-col items-center", className)}
      title={`${name}${description ? ` — ${description}` : ""}${unlockedLabel ? ` · ${unlockedLabel}` : ""}`}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border-2 bg-elevated",
          style.border,
          sizeClass
        )}
      >
        <EntityIcon value={icon} className={iconClass} />
      </div>
      <span className="mt-1 max-w-[72px] truncate text-center text-[10px] text-ink-muted">{name}</span>
      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="max-w-[200px] rounded-md border border-line bg-raised px-2 py-1 text-xs text-ink">
          <span className={style.text}>{t(rarity)}</span> · {name}
          {description && <p className="mt-0.5 line-clamp-2 text-ink-muted">{description}</p>}
          {unlockedLabel && <p className="mt-0.5 text-[10px] text-ink-muted">{unlockedLabel}</p>}
        </div>
      </div>
    </div>
  );
}
