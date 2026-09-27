import Link from "next/link";
import type { PublisherLevel } from "@prisma/client";
import { SafeImage } from "@/components/ui/safe-image";
import { Badge } from "@/components/ui/badge";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import { formatDisplayName } from "@/lib/display-name";

export type PartnerCardItem = {
  id: string;
  slug: string;
  tagline: string | null;
  level: PublisherLevel;
  isVerified: boolean;
  isFeatured: boolean;
  bannerUrl: string | null;
  user: { username: string; displayName: string | null; avatarUrl: string | null };
};

/** Partner-Karte: Banner (falls vorhanden), Avatar, Name, Stufe, Kurzbeschreibung, Kennzahl. */
export function PartnerHubCard({
  locale,
  partner,
  meta,
  labels,
}: {
  locale: string;
  partner: PartnerCardItem;
  meta: string;
  labels: { verified: string; featured: string };
}) {
  const name = formatDisplayName(partner.user);
  return (
    <Link
      href={`/${locale}/partners/${partner.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-line bg-raised transition-colors duration-fast hover:border-line-control"
    >
      {/* Banner nur, wenn eines hinterlegt ist – sonst keine leere Fläche. */}
      {partner.bannerUrl && (
        <span className="relative block aspect-[3/1] bg-elevated">
          <SafeImage src={partner.bannerUrl} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" fallbackLabel="" />
        </span>
      )}
      <span className="flex flex-1 flex-col p-4">
        <span className={partner.bannerUrl ? "-mt-10 flex items-end gap-3" : "flex items-end gap-3"}>
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line-control bg-elevated text-base font-bold text-ink-muted">
            {partner.user.avatarUrl ? (
              <SafeImage src={partner.user.avatarUrl} alt="" fill className="object-cover" sizes="56px" fallbackLabel="" />
            ) : (
              <span aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
            )}
          </span>
        </span>
        <span className="mt-3 flex flex-wrap items-center gap-2">
          <span className="truncate text-[15px] font-semibold text-ink group-hover:text-violet-bright">{name}</span>
          {/* Die Stufe zeigt „Verifiziert“ bereits; Extra-Badge nur ohne Stufe. */}
          {partner.isVerified && partner.level === "UNVERIFIED" && <Badge variant="premium">{labels.verified}</Badge>}
          {partner.isFeatured && <Badge variant="outline">{labels.featured}</Badge>}
        </span>
        <span className="mt-1.5 block">
          <CreatorLevelBadge level={partner.level} size="xs" />
        </span>
        {partner.tagline && <span className="mt-3 line-clamp-2 block text-sm text-ink-muted">{partner.tagline}</span>}
        <span className="meta mt-auto block pt-3 tabular-nums">{meta}</span>
      </span>
    </Link>
  );
}
