"use client";

import { memo, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Sparkles, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { useGameModePickerOptional } from "@/components/games/game-mode-picker-context";
import type { GameDiscoveryCardData } from "@/lib/game-discovery";
import { formatCompactNumber } from "@/lib/format-locale";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { prefetchGameModeAssets } from "@/lib/image-prefetch";

type Props = {
  locale: string;
  game: GameDiscoveryCardData;
  priority?: boolean;
};

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isRecentlyUpdated(value: Date | string | null | undefined): boolean {
  const date = parseDate(value);
  if (!date) return false;
  return Date.now() - date.getTime() < 14 * 86_400_000;
}

export const GameDiscoveryCard = memo(function GameDiscoveryCard({
  locale,
  game,
  priority = false,
}: Props) {
  const t = useTranslations("games");
  const router = useRouter();
  const picker = useGameModePickerOptional();

  const coverSrc = game.coverUrl;
  const showPopular = game.downloadCount >= 500 || game.modCount >= 40;
  const showNew = isRecentlyUpdated(game.lastUpdated);

  const imageSizes = useMemo(
    () => "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw",
    []
  );

  const navigate = useCallback(
    (path: string) => {
      router.push(path);
    },
    [router]
  );

  const warmAssets = useCallback(() => {
    if (game.modeBundle?.modes.length) {
      prefetchGameModeAssets(game.modeBundle.modes);
      picker?.warm(game.modeBundle.modes);
    }
  }, [game.modeBundle, picker]);

  const handleClick = useCallback(() => {
    if (game.soleModeSlug) {
      navigate(`/${locale}/games/${game.slug}/${game.soleModeSlug}`);
      return;
    }
    if (game.modeCount > 1 && game.modeBundle) {
      picker?.open({
        locale,
        gameSlug: game.slug,
        gameName: game.name,
        modes: game.modeBundle.modes,
        picker: game.modeBundle.picker,
      });
      return;
    }
    navigate(`/${locale}/games/${game.slug}`);
  }, [game, locale, navigate, picker]);

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={warmAssets}
      onFocus={warmAssets}
      className="group flex h-full w-full flex-col overflow-hidden rounded-lg border border-line bg-raised text-left transition-colors duration-fast hover:border-line-control"
    >
      <span className="relative block aspect-[3/4] w-full shrink-0 overflow-hidden bg-elevated">
        {coverSrc ? (
          <SafeImage
            src={coverSrc}
            alt=""
            fill
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            className="object-cover"
            sizes={imageSizes}
          />
        ) : (
          <CoverPlaceholder name={game.name} gameSlug={game.slug} />
        )}
        <span className="absolute inset-x-0 top-0 flex flex-wrap gap-1.5 p-3">
          {game.isFeatured && <Badge variant="premium">{t("featured")}</Badge>}
          {showNew && (
            <Badge variant="secondary">
              <Sparkles className="h-3 w-3" aria-hidden />
              {t("new")}
            </Badge>
          )}
          {showPopular && !game.isFeatured && (
            <Badge variant="secondary">
              <TrendingUp className="h-3 w-3" aria-hidden />
              {t("popular")}
            </Badge>
          )}
        </span>
      </span>

      <span className="flex flex-1 flex-col gap-3 p-4">
        <span className="block">
          <span className="line-clamp-2 text-base font-bold leading-snug text-ink">{game.name}</span>
          {game.modeCount > 1 && (
            <span className="meta mt-1 block">{t("modesAvailable", { count: game.modeCount })}</span>
          )}
        </span>

        <span className="mt-auto grid grid-cols-3 gap-2 border-t border-line pt-3 text-[13px] tabular-nums">
          <span className="flex flex-col" aria-label={t("modsCountShort", { count: game.modCount })}>
            <span className="font-semibold text-ink">{formatCompactNumber(game.modCount, locale)}</span>
            <span className="text-xs text-ink-muted">{t("statMods")}</span>
          </span>
          <span className="flex flex-col" aria-label={t("downloadsCount", { count: game.downloadCount })}>
            <span className="font-semibold text-ink">{formatCompactNumber(game.downloadCount, locale)}</span>
            <span className="text-xs text-ink-muted">{t("statDownloads")}</span>
          </span>
          <span className="flex flex-col" aria-label={t("creatorsCountShort", { count: game.creatorCount })}>
            <span className="font-semibold text-ink">{formatCompactNumber(game.creatorCount, locale)}</span>
            <span className="text-xs text-ink-muted">{t("statCreators")}</span>
          </span>
        </span>
      </span>
    </button>
  );
});
