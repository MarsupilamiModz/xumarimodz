import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

export type ProfileStat = { label: string; value: string };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/**
 * Kopf für öffentliche Creator- und Partnerprofile: optionales Banner, Avatar, Badges, Name,
 * Kurzbeschreibung, Aktionen und Kennzahlen. Ohne Banner kein Ersatzverlauf – nur die Fläche.
 */
export function PublicProfileHeader({
  name,
  avatarUrl,
  bannerUrl,
  badges,
  tagline,
  actions,
  stats,
}: {
  name: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  badges?: React.ReactNode;
  tagline?: string | null;
  actions?: React.ReactNode;
  stats: ProfileStat[];
}) {
  return (
    <header>
      {bannerUrl && (
        <div className="relative aspect-[4/1] max-h-[240px] w-full overflow-hidden rounded-lg border border-line bg-elevated sm:aspect-[6/1]">
          <SafeImage src={bannerUrl} alt="" fill className="object-cover" priority sizes="(max-width: 1440px) 100vw, 1440px" fallbackLabel="" />
        </div>
      )}
      <div className={cn("flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between", bannerUrl ? "mt-6" : "")}>
        <div className="flex min-w-0 items-start gap-5">
          <span className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-elevated text-xl font-bold text-ink-muted sm:h-24 sm:w-24">
            {avatarUrl ? (
              <SafeImage src={avatarUrl} alt="" fill className="object-cover" sizes="96px" fallbackLabel="" />
            ) : (
              <span aria-hidden>{initials(name)}</span>
            )}
          </span>
          <div className="min-w-0">
            {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
            <h1 className={cn("h1-display break-words", badges ? "mt-2" : "")}>{name}</h1>
            {tagline && <p className="mt-2 max-w-2xl text-ink-muted">{tagline}</p>}
            {actions && <div className="mt-4 flex flex-wrap items-center gap-3">{actions}</div>}
          </div>
        </div>
        {stats.length > 0 && (
          <dl
            className="grid shrink-0 divide-x divide-line overflow-hidden rounded-lg border border-line bg-raised"
            style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}
          >
            {stats.map((s) => (
              <div key={s.label} className="min-w-[96px] px-4 py-3 sm:min-w-[112px]">
                <dt className="label-text">{s.label}</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </header>
  );
}
