// Browser-tauglich: nur Konstanten und Formatierer. Serverfunktionen mit crypto
// liegen in lib/affiliate-server.ts (sonst landet crypto-browserify, ~100 KB, im Client).
import type { SocialPlatform } from "@prisma/client";

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  "YOUTUBE",
  "TWITCH",
  "TIKTOK",
  "INSTAGRAM",
  "TWITTER",
  "DISCORD",
  "WEBSITE",
];

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  YOUTUBE: "YouTube",
  TWITCH: "Twitch",
  TIKTOK: "TikTok",
  INSTAGRAM: "Instagram",
  TWITTER: "X",
  DISCORD: "Discord",
  WEBSITE: "Website",
};

export const SOCIAL_COLORS: Record<SocialPlatform, string> = {
  YOUTUBE: "hover:border-line-control hover:text-violet-bright",
  TWITCH: "hover:border-line-control hover:text-violet-bright",
  TIKTOK: "hover:border-line-control hover:text-violet-bright",
  INSTAGRAM: "hover:border-line-control hover:text-violet-bright",
  TWITTER: "hover:border-line-control hover:text-violet-bright",
  DISCORD: "hover:border-line-control hover:text-violet-bright",
  WEBSITE: "hover:border-line-control hover:text-violet-bright",
};

import { formatCreditsFromCents } from "@/lib/credits";

export function formatCents(cents: number, locale = "en") {
  return formatCreditsFromCents(cents, locale);
}

export function formatPercent(bps: number) {
  return `${(bps / 100).toFixed(1)}%`;
}
