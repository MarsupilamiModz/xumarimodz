"use client";

import { memo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Layers } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import type { GameModeCardData } from "@/lib/game-modes";

type Props = {
  locale: string;
  gameSlug: string;
  mode: GameModeCardData;
  glowEnabled?: boolean;
  onHover?: () => void;
  onSelect?: () => void;
  className?: string;
};

export const GameModeSelectionCard = memo(function GameModeSelectionCard({
  locale,
  gameSlug,
  mode,
  glowEnabled = true,
  onHover,
  onSelect,
  className,
}: Props) {
  const t = useTranslations("games");
  const banner = mode.backgroundUrl ?? mode.bannerUrl ?? mode.thumbnailUrl;
  const href = `/${locale}/games/${gameSlug}/${mode.slug}`;
  // Akzentfarbe des Bereichs (aus dem ACP) nur als Rahmen; ohne Wert der normale Token-Rahmen.
  const accent = mode.accentColor;

  return (
    <Link
      href={href}
      onClick={onSelect}
      onMouseEnter={onHover}
      onFocus={onHover}
      className={cn("group block", className)}
    >
      <Card
        className={cn(
          "relative overflow-hidden rounded-lg border-line bg-raised",
          "transition-colors duration-fast",
          "hover:border-line-control"
        )}
        style={accent ? { borderColor: accent } : undefined}
      >
        <div className="relative aspect-[16/9] overflow-hidden">
          {banner ? (
            <SafeImage
              src={banner}
              alt={mode.name}
              fill
              className="object-cover transition-transform duration-150"
              sizes="(max-width: 640px) 100vw, 400px"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-elevated">
              <Layers className="h-8 w-8 text-ink-faint" aria-hidden />
            </div>
          )}
          {(mode.logoUrl || mode.iconUrl) && (
            <div className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg border border-line-control bg-canvas/80 p-1">
              <SafeImage
                src={mode.logoUrl ?? mode.iconUrl!}
                alt=""
                fill
                className="object-contain p-0.5"
                sizes="40px"
              />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg font-bold text-ink transition-colors duration-fast group-hover:text-violet-bright">
            {mode.name}
          </h3>
          {mode.description && (
            <p className="mt-1 line-clamp-2 text-xs text-ink-muted">{mode.description}</p>
          )}
          <p className="meta mt-2">
            {t("modsCount", { count: mode.modCount })}
          </p>
        </div>
      </Card>
    </Link>
  );
});

export const GameModeSelectionCardSkeleton = memo(function GameModeSelectionCardSkeleton() {
  return (
    <Card className="animate-pulse overflow-hidden" aria-hidden>
      <div className="aspect-[16/9] bg-elevated" />
      <div className="space-y-2 p-4">
        <div className="h-5 w-2/3 rounded bg-elevated" />
        <div className="h-3 w-full rounded bg-elevated" />
      </div>
    </Card>
  );
});

export const GameModeEmptyIcon = memo(function GameModeEmptyIcon() {
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-elevated">
      <Layers className="h-6 w-6 text-ink-faint" aria-hidden />
    </div>
  );
});
