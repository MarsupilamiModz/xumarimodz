import { cn } from "@/lib/utils";

type GameTone = "gta" | "fivem" | "minecraft" | "ets2" | "ls25";

const toneClass: Record<GameTone, string> = {
  gta: "bg-game-gta",
  fivem: "bg-game-fivem",
  minecraft: "bg-game-minecraft",
  ets2: "bg-game-ets2",
  ls25: "bg-game-ls25",
};

/** Ordnet Spiel-Slugs aus der Datenbank einer Spielfarbe zu. Reihenfolge ist wichtig: "gta-v-fivem" → GTA V. */
export function gameToneFromSlug(slug?: string | null): GameTone | null {
  const s = (slug ?? "").toLowerCase();
  if (!s) return null;
  if (s.includes("gta")) return "gta";
  if (s.includes("fivem")) return "fivem";
  if (s.includes("minecraft")) return "minecraft";
  if (s.includes("ets2") || s.includes("euro-truck")) return "ets2";
  if (s.includes("ls25") || s.includes("landwirtschaft") || s.includes("farming")) return "ls25";
  return null;
}

export function initialsFrom(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

/**
 * Flache Fläche statt fehlendem Bild.
 * variant="cover": Spielfarbe mit Name · variant="thumb": Initialen.
 */
export function CoverPlaceholder({
  name,
  gameSlug,
  variant = "cover",
  className,
}: {
  name: string;
  gameSlug?: string | null;
  variant?: "cover" | "thumb";
  className?: string;
}) {
  const tone = gameToneFromSlug(gameSlug);
  return (
    <div
      role="img"
      aria-label={name}
      className={cn(
        "flex h-full w-full select-none items-center justify-center overflow-hidden text-ink",
        tone ? toneClass[tone] : "bg-elevated",
        variant === "cover" ? "p-4" : "p-1",
        className
      )}
    >
      {variant === "cover" ? (
        <span className="line-clamp-2 text-center text-base font-bold leading-tight">{name}</span>
      ) : (
        <span className="text-xs font-bold">{initialsFrom(name)}</span>
      )}
    </div>
  );
}
