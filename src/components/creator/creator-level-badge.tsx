"use client";

import { EntityIcon } from "@/components/ui/entity-icon";
import { useTranslations } from "next-intl";
import type { PublisherLevel } from "@prisma/client";
import { CREATOR_LEVELS } from "@/lib/creator-levels";
import { cn } from "@/lib/utils";

export function CreatorLevelBadge({
  level,
  size = "sm",
  className,
}: {
  level: PublisherLevel;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const t = useTranslations("ecosystem");
  const config = CREATOR_LEVELS[level];
  if (!config || level === "UNVERIFIED") return null;

  const sizeClass =
    size === "xs" ? "text-[10px] px-1.5 py-0.5" : size === "md" ? "text-sm px-3 py-1" : "text-xs px-2 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-semibold uppercase tracking-wide",
        "border bg-elevated",
        config.borderClass,
        config.glowClass,
        sizeClass,
        level === "VERIFIED" && "text-success",
        level === "TRUSTED" && "text-warning",
        level === "ELITE" && "text-violet-bright",
        level === "OFFICIAL_PARTNER" && "text-ink-muted",
        className
      )}
    >
      <EntityIcon value={config.icon} className="h-3.5 w-3.5" />
      {t(config.badgeKey)}
    </span>
  );
}

export function CreatorCardFrame({
  level,
  children,
  className,
}: {
  level: PublisherLevel;
  children: React.ReactNode;
  className?: string;
}) {
  const config = CREATOR_LEVELS[level];
  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-base",
        config?.borderClass,
        config?.cardClass,
        config?.glowClass,
        className
      )}
    >
      {children}
    </div>
  );
}
