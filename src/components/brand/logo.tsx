import {
  Crown,
  Flame,
  Gamepad2,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/safe-image";
import type { BrandingAssetSettings } from "@/lib/branding-cms";

const LIBRARY_ICONS = {
  sparkles: Sparkles,
  crown: Crown,
  gamepad: Gamepad2,
  zap: Zap,
  star: Star,
  flame: Flame,
  shield: Shield,
  rocket: Rocket,
} as const;

export type LogoBranding = Pick<
  BrandingAssetSettings,
  | "siteTitle"
  | "siteShortName"
  | "logoUrl"
  | "siteSymbolMode"
  | "siteSymbolLetter"
  | "siteSymbolUrl"
  | "siteSymbolLibrary"
  | "siteSymbolColor"
  | "logoObjectPosition"
>;

/** Alte Standardfarbe aus dem Branding-CMS; wird durch den Akzent-Token ersetzt. */
const LEGACY_SYMBOL_COLOR = "#a855f7";

export function Logo({
  className,
  showText = true,
  size = "md",
  branding,
}: {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  branding?: LogoBranding | null;
}) {
  const sizes = {
    sm: { box: "h-8 w-8 text-base", text: "text-[17px]" },
    md: { box: "h-9 w-9 text-lg", text: "text-lg" },
    lg: { box: "h-12 w-12 text-2xl", text: "text-2xl" },
  };
  const title = branding?.siteTitle ?? "Xumari Modz";
  // Flache Fläche, keine Verläufe. Eine im ACP gesetzte eigene Farbe bleibt erhalten.
  const customColor =
    branding?.siteSymbolColor && branding.siteSymbolColor.toLowerCase() !== LEGACY_SYMBOL_COLOR
      ? branding.siteSymbolColor
      : null;
  const symbolClass = cn(
    "flex shrink-0 items-center justify-center rounded-md font-extrabold text-violet-on",
    !customColor && "bg-violet",
    sizes[size].box
  );
  const symbolStyle = customColor ? { backgroundColor: customColor } : undefined;

  const symbolContent = () => {
    if (branding?.logoUrl) {
      return (
        <span className={cn("relative block shrink-0 overflow-hidden rounded-md", sizes[size].box)}>
          <SafeImage
            src={branding.logoUrl}
            alt=""
            fill
            className="object-contain"
            style={{ objectPosition: branding.logoObjectPosition ?? "center" }}
            sizes="48px"
          />
        </span>
      );
    }

    if (branding?.siteSymbolMode === "image" && branding.siteSymbolUrl) {
      return (
        <span className={cn("relative block shrink-0 overflow-hidden rounded-md", sizes[size].box)}>
          <SafeImage src={branding.siteSymbolUrl} alt="" fill className="object-contain" sizes="48px" />
        </span>
      );
    }

    if (branding?.siteSymbolMode === "library" && branding.siteSymbolLibrary) {
      const Icon = LIBRARY_ICONS[branding.siteSymbolLibrary as keyof typeof LIBRARY_ICONS] ?? Sparkles;
      return (
        <span className={symbolClass} style={symbolStyle} aria-hidden>
          <Icon className="h-[55%] w-[55%]" aria-hidden />
        </span>
      );
    }

    const letter = branding?.siteSymbolLetter?.slice(0, 1) ?? "X";
    return (
      <span className={symbolClass} style={symbolStyle} aria-hidden>
        {letter}
      </span>
    );
  };

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {symbolContent()}
      {showText && (
        <span className={cn("font-bold tracking-tight text-ink", sizes[size].text)}>{title}</span>
      )}
    </span>
  );
}
