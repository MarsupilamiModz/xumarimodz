import Link from "next/link";
import type { PublisherLevel } from "@prisma/client";
import { SafeImage } from "@/components/ui/safe-image";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import { formatDisplayName } from "@/lib/display-name";

export type CreatorCardItem = {
  id: string;
  slug: string;
  tagline: string | null;
  level: PublisherLevel;
  isFeatured: boolean;
  user: { username: string; displayName: string | null; avatarUrl: string | null };
};

/**
 * Creator-Karte für die Übersicht: Avatar, Name, Stufe, Kurzbeschreibung und echte Kennzahlen
 * (aus veröffentlichten Mods berechnet, `meta` wird fertig formatiert übergeben).
 */
export function CreatorDiscoveryCard({
  locale,
  creator,
  meta,
  featuredLabel,
}: {
  locale: string;
  creator: CreatorCardItem;
  meta: string;
  featuredLabel: string;
}) {
  const name = formatDisplayName(creator.user);
  return (
    <Link
      href={`/${locale}/creators/${creator.slug}`}
      className="group flex h-full flex-col rounded-lg border border-line bg-raised p-4 transition-colors duration-fast hover:border-line-control"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-elevated text-sm font-bold text-ink-muted">
          {creator.user.avatarUrl ? (
            <SafeImage src={creator.user.avatarUrl} alt="" fill className="object-cover" sizes="48px" fallbackLabel="" />
          ) : (
            <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink group-hover:text-violet-bright">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <CreatorLevelBadge level={creator.level} size="xs" />
            {creator.isFeatured && <span className="text-[11px] font-semibold text-violet-bright">{featuredLabel}</span>}
          </div>
        </div>
      </div>
      {creator.tagline && <p className="mt-3 line-clamp-2 text-sm text-ink-muted">{creator.tagline}</p>}
      <p className="meta mt-auto pt-3 tabular-nums">{meta}</p>
    </Link>
  );
}
