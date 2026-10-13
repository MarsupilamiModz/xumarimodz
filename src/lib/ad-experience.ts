import { cache } from "react";
import { getAdSettings } from "@/lib/ads";
import { getUserMembershipTier } from "@/lib/membership";

import type { AdExperienceLevel } from "@/lib/ad-experience-shared";

export * from "@/lib/ad-experience-shared";

/**
 * Pro Anfrage nur einmal berechnen (React cache) – vorher lief die Mitgliedschaftsabfrage
 * für jede Werbefläche auf der Seite erneut.
 */
export const getUserAdExperience = cache(async function getUserAdExperience(
  userId: string | null,
  role: string | null
): Promise<AdExperienceLevel> {
  const settings = await getAdSettings();
  const levels = settings.roleAdLevels ?? {};

  if (!userId) return levels.GUEST ?? "full";

  // Zuerst die Mitgliedschaft: Premium-Mitglieder sind werbefrei, auch wenn sie z. B. Creator sind.
  const tier = await getUserMembershipTier(userId);
  if (settings.premiumAdFree !== false && tier) return "none";
  if (tier?.perks.adFree === true) return "none";
  if (tier?.slug && levels[tier.slug]) return levels[tier.slug];

  const roleKey = role ?? "USER";
  if (levels[roleKey]) return levels[roleKey];

  if (settings.rolesWithoutAds?.includes(roleKey)) return "none";
  if (settings.rolesWithAds?.length && !settings.rolesWithAds.includes(roleKey)) return "none";
  if (settings.membershipSlugsWithoutAds?.length && tier?.slug) {
    if (settings.membershipSlugsWithoutAds.includes(tier.slug)) return "none";
  }

  return "full";
});
