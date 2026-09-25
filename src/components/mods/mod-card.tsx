import Link from "next/link";
import { memo } from "react";
import { useTranslations } from "next-intl";
import { Download, Music, PlayCircle, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { getFeaturedMediaUrl, type ModMediaItem } from "@/lib/mod-media";
import { formatCompactNumber } from "@/lib/format-locale";
import { formatModRating, hasModRatings } from "@/lib/rating-display";
import { formatDisplayName } from "@/lib/display-name";
import { SecurityBadge } from "@/components/security/security-badge";
import { isSecurityVerified } from "@/lib/security/status";
import type { FileScanStatus } from "@prisma/client";
import { ModCardLikeButton } from "@/components/mods/mod-card-like-button";
import { cn } from "@/lib/utils";

type ModCardProps = {
  locale: string;
  mod: {
    id?: string;
    slug: string;
    title: string;
    shortDescription?: string | null;
    pricing: string;
    downloadCount: number;
    averageRating: number;
    reviewCount?: number;
    favoriteCount?: number;
    game?: { name: string; slug: string };
    category?: { name: string } | null;
    author?: { username: string; displayName?: string | null } | null;
    media?: ModMediaItem[];
    screenshots?: { url: string }[];
    productType?: "MOD" | "SOUND";
    soundProfile?: {
      artist?: string | null;
      playCount?: number;
    } | null;
    versions?: Array<{
      scanStatus?: FileScanStatus;
      trustedFile?: { id: string } | null;
      fileSize?: bigint | number;
      version?: string;
      gameVersion?: string | null;
    }>;
  };
  pricingLabel?: string;
  isFavorited?: boolean;
  showLike?: boolean;
  /** "list": Bild links, Text rechts mit Kurzbeschreibung (Katalog-Listenansicht). */
  layout?: "grid" | "list";
};

/**
 * Mod-Karte: Bild (oder flache Spielfarbe mit Name), Name, Premium-Badge,
 * „Spiel · Kategorie · Autor“, Downloads. Der Titel-Link deckt die ganze Karte ab,
 * der Like-Button liegt darüber und ist ein eigenes, fokussierbares Element.
 */
export const ModCard = memo(function ModCard({ locale, mod, pricingLabel, isFavorited, showLike = true, layout = "grid" }: ModCardProps) {
  const t = useTranslations("mods");
  const media = mod.media ?? [];
  const cover = getFeaturedMediaUrl(
    media,
    mod.screenshots?.map((s, i) => ({ url: s.url, sortOrder: i }))
  );
  const hasVideo = media.some((m) => m.mediaType === "YOUTUBE" && m.youtubeVideoId);
  const isPaid = mod.pricing !== "FREE";
  const primaryVersion = mod.versions?.[0];
  const scanStatus = primaryVersion?.scanStatus;
  const showSecurityBadge = scanStatus && isSecurityVerified(scanStatus, !!primaryVersion?.trustedFile);
  const reviewCount = mod.reviewCount ?? 0;
  const list = layout === "list";
  const meta = [
    mod.game?.name,
    mod.category?.name,
    mod.author ? formatDisplayName(mod.author) : mod.soundProfile?.artist,
  ].filter(Boolean);

  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-lg border border-line bg-raised transition-colors duration-fast hover:border-line-control focus-within:border-line-control",
        list ? "flex-row" : "h-full flex-col"
      )}
    >
      <div className={cn("relative overflow-hidden bg-elevated", list ? "aspect-[16/10] w-32 shrink-0 sm:w-48" : "aspect-[16/10]")}>
        {cover ? (
          <SafeImage
            src={cover}
            alt=""
            fill
            className="object-cover"
            sizes={list ? "(max-width: 640px) 128px, 192px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"}
            loading="lazy"
          />
        ) : (
          <CoverPlaceholder name={mod.title} gameSlug={mod.game?.slug} />
        )}
        <div className={cn("absolute flex flex-wrap gap-1.5", list ? "left-2 top-2" : "left-3 top-3")}>
          {isPaid && <Badge variant="premium">{pricingLabel ?? mod.pricing}</Badge>}
          {mod.productType === "SOUND" && (
            <Badge variant="secondary">
              <Music className="h-3 w-3" aria-hidden />
              {t("sound")}
            </Badge>
          )}
          {hasVideo && (
            <Badge variant="secondary">
              <PlayCircle className="h-3 w-3" aria-hidden />
              {t("video")}
            </Badge>
          )}
        </div>
        {showLike && mod.id && !list && (
          <div className="absolute bottom-3 right-3 z-10">
            <ModCardLikeButton modId={mod.id} initialFavorited={isFavorited} />
          </div>
        )}
      </div>

      <div className={cn("flex min-w-0 flex-1 flex-col gap-1.5", list ? "p-3 sm:p-4" : "p-4")}>
        <h3 className="text-[15px] font-semibold leading-snug text-ink">
          <Link
            href={`/${locale}/mods/${mod.slug}`}
            className="line-clamp-1 outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-violet-bright"
          >
            {mod.title}
          </Link>
        </h3>
        {meta.length > 0 && <p className="meta truncate">{meta.join(" · ")}</p>}
        {list && mod.shortDescription && <p className="hidden text-[13px] text-ink-muted sm:line-clamp-2">{mod.shortDescription}</p>}
        {showSecurityBadge && scanStatus && (
          <SecurityBadge scanStatus={scanStatus} isTrusted={!!primaryVersion?.trustedFile} compact />
        )}
        <div className="mt-auto flex items-center gap-4 pt-2 text-[13px] text-ink-muted tabular-nums">
          <span className="flex items-center gap-1.5" aria-label={t("downloadsLabel", { count: mod.downloadCount })}>
            <Download className="h-3.5 w-3.5" aria-hidden />
            {formatCompactNumber(mod.downloadCount, locale)}
          </span>
          {hasModRatings(reviewCount) && (
            <span
              className="flex items-center gap-1.5"
              aria-label={t("ratingLabel", { rating: formatModRating(mod.averageRating, reviewCount) })}
            >
              <Star className="h-3.5 w-3.5" aria-hidden />
              {formatModRating(mod.averageRating, reviewCount)}
              <span className="text-ink-faint">({formatCompactNumber(reviewCount, locale)})</span>
            </span>
          )}
          {list && showLike && mod.id && (
            <span className="relative z-10 ml-auto">
              <ModCardLikeButton modId={mod.id} initialFavorited={isFavorited} />
            </span>
          )}
        </div>
      </div>
    </article>
  );
});
