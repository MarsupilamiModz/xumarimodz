import { createHash, randomBytes } from "crypto";
import type { SocialPlatform } from "@prisma/client";

export function generateAffiliateCode(prefix = "MM") {
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}${suffix}`;
}

export function visitorHash(ip: string, userAgent?: string) {
  return createHash("sha256")
    .update(`${ip}:${userAgent ?? "unknown"}`)
    .digest("hex")
    .slice(0, 24);
}

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
