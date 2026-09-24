"use client";

import { EntityIcon } from "@/components/ui/entity-icon";
import { cn } from "@/lib/utils";
import { safeToLocaleDateString } from "@/lib/i18n/safe-locale";
import { RARITY_STYLES } from "@/lib/achievement-constants";
import type { AchievementRarity } from "@prisma/client";

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
  const style = RARITY_STYLES[rarity];
  const sizeClass = size === "sm" ? "h-10 w-10" : size === "lg" ? "h-16 w-16" : "h-12 w-12";
  const iconClass = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-8 w-8" : "h-6 w-6";

  return (
    <div
      className={cn("group relative inline-flex flex-col items-center", className)}
      title={`${name}${description ? ` — ${description}` : ""}${unlockedAt ? ` · ${safeToLocaleDateString(unlockedAt)}` : ""}`}
    >
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border-2 bg-elevated",
          sizeClass
        )}
        style={{ borderColor: style.color }}
      >
        <EntityIcon value={icon} className={iconClass} />
      </div>
      <span className="mt-1 max-w-[72px] truncate text-[10px] text-muted-foreground text-center">{name}</span>
      <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="max-w-[200px] rounded-md border bg-raised px-2 py-1 text-xs" style={{ borderColor: `${style.color}60` }}>
          <span style={{ color: style.color }}>{style.label}</span> · {name}
          {description && <p className="text-muted-foreground mt-0.5 line-clamp-2">{description}</p>}
          {unlockedAt && <p className="text-[10px] text-muted-foreground mt-0.5">{safeToLocaleDateString(unlockedAt)}</p>}
        </div>
      </div>
    </div>
  );
}
