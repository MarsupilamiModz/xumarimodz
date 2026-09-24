import Link from "next/link";
import { Gamepad2 } from "lucide-react";
import { Card } from "@/components/ui/card";
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
  const modCount = game._count?.mods;
  const blurb = game.shortDescription ?? game.description;
  const bannerSrc = game.bannerUrl ?? game.coverUrl;
  const iconSrc = game.iconUrl ?? game.coverUrl;

  if (variant === "hero" && bannerSrc) {
    return (
      <Link href={`/${locale}/games/${game.slug}`}>
        <Card className="group relative overflow-hidden aspect-[21/9] border-border/50 hover:border-line-control transition">
          <SafeImage
            src={bannerSrc}
            alt={game.name}
            fill
            className="object-cover opacity-60 group-hover:opacity-80 transition"
            sizes="100vw"
            priority
          />
          <div className="absolute inset-0" />
          <div className="absolute bottom-0 left-0 p-6">
            {game.isFeatured && <Badge variant="premium" className="mb-2">Featured</Badge>}
            <h3 className="text-2xl font-bold">{game.name}</h3>
            {blurb && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2 max-w-xl">{blurb}</p>
            )}
            {modCount !== undefined && (
              <p className="mt-2 text-xs text-ink-muted">{modCount} mods</p>
            )}
          </div>
        </Card>
      </Link>
    );
  }

  return (
    <Link href={`/${locale}/games/${game.slug}`}>
      <Card className="p-6 h-full transition hover:border-line-control group">
        <div className="flex items-start gap-4">
          {iconSrc ? (
            <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden border border-border/50">
              <SafeImage src={iconSrc} alt="" fill className="object-cover" sizes="56px" />
            </div>
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-violet-bright/20">
              <Gamepad2 className="h-7 w-7 text-ink-muted" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{game.name}</h3>
              {game.isFeatured && <Badge variant="premium" className="text-[10px]">Featured</Badge>}
            </div>
            {blurb && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{blurb}</p>
            )}
            {modCount !== undefined && (
              <p className="mt-3 text-xs text-violet-bright">{modCount} mods available</p>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
