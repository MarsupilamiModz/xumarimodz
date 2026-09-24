import "server-only";
import { unstable_cache } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getVisitorMetrics } from "@/lib/platform-analytics";

export const ANALYTICS_RANGES = [7, 30, 90] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export type AnalyticsOverview = {
  days: { day: string; downloads: number }[];
  totals: { downloads: number; pageViews: number; visitors: number; newUsers: number; revenueCents: number };
  topMods: { id: string; title: string; slug: string; downloads: number }[];
  byGame: { name: string; downloads: number }[];
  origin: { browser: number; other: number };
};

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Alle Analytics-Werte für einen Zeitraum in einer gebündelten, 60 s gecachten Abfrage. */
export function getAnalyticsOverview(range: AnalyticsRange): Promise<AnalyticsOverview> {
  return unstable_cache(
    async (): Promise<AnalyticsOverview> => {
      const since = new Date();
      since.setUTCHours(0, 0, 0, 0);
      since.setUTCDate(since.getUTCDate() - (range - 1));

      const [daily, visitors, newUsers, modRev, planRev, orderRev, top, byGame, origin] = await Promise.all([
        prisma.$queryRaw<{ day: Date; count: bigint }[]>(Prisma.sql`
          SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
          FROM "Download" WHERE "createdAt" >= ${since}
          GROUP BY 1 ORDER BY 1`),
        getVisitorMetrics(since),
        prisma.user.count({ where: { createdAt: { gte: since }, deletedAt: null } }),
        prisma.modPurchase.aggregate({ _sum: { amountCents: true }, where: { createdAt: { gte: since } } }),
        prisma.membershipPurchase.aggregate({ _sum: { amountCents: true }, where: { createdAt: { gte: since } } }),
        prisma.customOrder.aggregate({ _sum: { finalAmountCents: true }, where: { paymentStatus: "PAID", createdAt: { gte: since } } }),
        prisma.download.groupBy({
          by: ["modId"],
          where: { createdAt: { gte: since } },
          _count: { _all: true },
          orderBy: { _count: { modId: "desc" } },
          take: 10,
        }),
        prisma.$queryRaw<{ name: string; count: bigint }[]>(Prisma.sql`
          SELECT g."name" AS name, COUNT(*)::bigint AS count
          FROM "Download" d JOIN "Mod" m ON m."id" = d."modId" JOIN "Game" g ON g."id" = m."gameId"
          WHERE d."createdAt" >= ${since}
          GROUP BY g."name" ORDER BY 2 DESC LIMIT 8`),
        prisma.$queryRaw<{ browser: bigint; other: bigint }[]>(Prisma.sql`
          SELECT COUNT(*) FILTER (WHERE "userAgent" ILIKE '%mozilla%')::bigint AS browser,
                 COUNT(*) FILTER (WHERE "userAgent" IS NULL OR "userAgent" NOT ILIKE '%mozilla%')::bigint AS other
          FROM "Download" WHERE "createdAt" >= ${since}`),
      ]);

      const mods = await prisma.mod.findMany({
        where: { id: { in: top.map((r) => r.modId) } },
        select: { id: true, title: true, slug: true },
      });
      const modById = new Map(mods.map((m) => [m.id, m]));

      // Lückenlose Tagesreihe (Tage ohne Downloads = 0).
      const counts = new Map(daily.map((r) => [dayKey(new Date(r.day)), Number(r.count)]));
      const days = Array.from({ length: range }, (_, i) => {
        const d = new Date(since);
        d.setUTCDate(since.getUTCDate() + i);
        const key = dayKey(d);
        return { day: key, downloads: counts.get(key) ?? 0 };
      });

      return {
        days,
        totals: {
          downloads: days.reduce((s, d) => s + d.downloads, 0),
          pageViews: visitors.pageViews,
          visitors: visitors.uniqueVisitors,
          newUsers,
          revenueCents: (modRev._sum.amountCents ?? 0) + (planRev._sum.amountCents ?? 0) + (orderRev._sum.finalAmountCents ?? 0),
        },
        topMods: top
          .map((r) => ({ ...modById.get(r.modId)!, downloads: r._count._all }))
          .filter((m) => m.id),
        byGame: byGame.map((r) => ({ name: r.name, downloads: Number(r.count) })),
        origin: { browser: Number(origin[0]?.browser ?? 0), other: Number(origin[0]?.other ?? 0) },
      };
    },
    ["admin-analytics", String(range)],
    { revalidate: 60, tags: ["admin-analytics"] }
  )();
}
