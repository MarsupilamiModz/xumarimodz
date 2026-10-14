import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import {
  bannerImageStyle,
  resolveBannerHeight,
  type GameBannerConfig,
} from "@/lib/game-banner";

type GameHeroBannerProps = {
  name: string;
  description?: string | null;
  shortDescription?: string | null;
  iconUrl?: string | null;
  bannerUrl?: string | null;
  coverUrl?: string | null;
  isFeatured?: boolean;
  modCount: number;
  creatorCount: number;
  featuredLabel: string;
  modsLabel: string;
  creatorsLabel: string;
  banner: GameBannerConfig;
  gradientStyle?: React.CSSProperties;
};

export function GameHeroBanner({
  name,
  description,
  shortDescription,
  iconUrl,
  bannerUrl,
  coverUrl,
  isFeatured,
  modCount: _modCount,
  creatorCount: _creatorCount,
  featuredLabel,
  modsLabel,
  creatorsLabel,
  banner,
  gradientStyle,
}: GameHeroBannerProps) {
  const height = resolveBannerHeight(banner);
  const imageSrc = bannerUrl ?? coverUrl;
  const blurb = shortDescription ?? description;
  const imgStyle = bannerImageStyle(banner);

  return (
    <section
      className="relative overflow-hidden border-b border-line"
      style={{ minHeight: height, ...gradientStyle }}
    >
      {imageSrc && (
        <div className="absolute inset-0 overflow-hidden">
          <SafeImage
            src={imageSrc}
            alt=""
            fill
            className="object-cover opacity-30 sm:opacity-40"
            style={imgStyle}
            priority
            sizes="100vw"
          />
        </div>
      )}
      <div className="page-container relative py-10 sm:py-16">
        <div className="flex flex-wrap items-end gap-4 sm:gap-6">
          {iconUrl ? (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line sm:h-24 sm:w-24">
              <SafeImage src={iconUrl} alt="" fill className="object-cover" sizes="96px" priority />
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            {isFeatured && (
              <Badge variant="premium" className="mb-2">
                {featuredLabel}
              </Badge>
            )}
            <h1 className="h1-display">{name}</h1>
            {blurb && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted sm:text-base">
                {blurb}
              </p>
            )}
            <div className="meta mt-4 flex flex-wrap gap-4 text-sm tabular-nums">
              <span>{modsLabel}</span>
              <span>{creatorsLabel}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
