import type { SiteBannerType } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";

export const SITE_BANNERS_CACHE_TAG = "site-banners";

/** Aktive Banner – 60 s gecacht (vorher eine Datenbankabfrage pro Seitenaufruf). */
const getCachedActiveBanners = unstable_cache(
  async () =>
    prisma.siteBanner.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    }),
  ["active-site-banners"],
  { revalidate: 60, tags: [SITE_BANNERS_CACHE_TAG] }
);

export type BannerContext = {
  type?: SiteBannerType;
  gameId?: string;
  gameCategoryId?: string;
  modId?: string;
  partnerProfileId?: string;
};

function isWithinSchedule(startsAt: Date, endsAt: Date | null) {
  const now = new Date();
  if (startsAt > now) return false;
  if (endsAt && endsAt < now) return false;
  return true;
}

export async function getActiveSiteBanners(context: BannerContext = {}) {
  try {
    // Datumswerte aus dem Cache kommen als Text zurück.
    const banners = (await getCachedActiveBanners()).map((b) => ({
      ...b,
      startsAt: new Date(b.startsAt),
      endsAt: b.endsAt ? new Date(b.endsAt) : null,
      createdAt: new Date(b.createdAt),
      updatedAt: new Date(b.updatedAt),
    }));

    return banners.filter((banner) => {
      if (!isWithinSchedule(banner.startsAt, banner.endsAt)) return false;

      switch (banner.type) {
        case "GLOBAL":
          return true;
        case "GAME":
          return context.gameId != null && banner.gameId === context.gameId;
        case "CATEGORY":
          return (
            context.gameCategoryId != null && banner.gameCategoryId === context.gameCategoryId
          );
        case "MOD":
          return context.modId != null && banner.modId === context.modId;
        case "PARTNER":
          return (
            context.partnerProfileId != null &&
            banner.partnerProfileId === context.partnerProfileId
          );
        default:
          return false;
      }
    });
  } catch {
    return [];
  }
}
