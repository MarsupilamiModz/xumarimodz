import Link from "next/link";
import { useTranslations } from "next-intl";
import { Gamepad2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";

type GameCardProps = {
  locale: string;
  game: {
    slug: string;
    name: string;
    description?: string | null;
    shortDescription?: string | null;
    iconUrl?: string | null;
    bannerUrl?: string | null;
    coverUrl?: string | null;
    isFeatured?: boolean;
    _count?: { mods: number };
  };
  variant?: "default" | "hero";
};

export function GameCard({ locale, game, variant = "default" }: GameCardProps) {
  const t = useTranslations("games");
  const modCount = game._count?.mods;
  const blurb = game.shortDescription ?? game.description;
  const bannerSrc = game.bannerUrl ?? game.coverUrl;
  const iconSrc = game.iconUrl ?? game.coverUrl;

  if (variant === "hero" && bannerSrc) {
    return (
      <Link
        href={`/${locale}/games/${game.slug}`}
        className="group relative block aspect-[21/9] overflow-hidden rounded-lg border border-line bg-raised transition-colors duration-fast hover:border-line-control"
      >
        <SafeImage
          src={bannerSrc}
          alt=""
          fill
          className="object-cover opacity-60 transition-opacity duration-fast group-hover:opacity-80"
          sizes="100vw"
          priority
        />
        <div className="absolute bottom-0 left-0 p-6">
          {game.isFeatured && <Badge variant="premium" className="mb-2">{t("featured")}</Badge>}
          <h3 className="text-2xl font-bold text-ink">{game.name}</h3>
          {blurb && <p className="mt-1 line-clamp-2 max-w-xl text-sm text-ink-muted">{blurb}</p>}
          {modCount !== undefined && <p className="meta mt-2 tabular-nums">{t("modsCount", { count: modCount })}</p>}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/games/${game.slug}`}
      className="block h-full rounded-lg border border-line bg-raised p-5 transition-colors duration-fast hover:border-line-control"
    >
      <div className="flex items-start gap-4">
        {iconSrc ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-line">
            <SafeImage src={iconSrc} alt="" fill className="object-cover" sizes="56px" />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-elevated text-ink-muted">
            <Gamepad2 className="h-7 w-7" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="section-title truncate">{game.name}</h2>
            {game.isFeatured && <Badge variant="premium">{t("featured")}</Badge>}
          </div>
          {blurb && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{blurb}</p>}
          {modCount !== undefined && <p className="meta mt-3 tabular-nums">{t("modsCount", { count: modCount })}</p>}
        </div>
      </div>
    </Link>
  );
}
