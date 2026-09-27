import { prisma } from "@/lib/db";

export type CreatorModStats = { downloads: number; mods: number };

/**
 * Echte Kennzahlen aus veröffentlichten, öffentlichen Mods (Summe der Downloads, Anzahl).
 * `CreatorProfile.totalDownloads` wird nirgends fortgeschrieben und ist deshalb nicht verlässlich.
 */
export async function getCreatorModStats(userIds: string[]): Promise<Map<string, CreatorModStats>> {
  const result = new Map<string, CreatorModStats>();
  if (userIds.length === 0) return result;
  const rows = await prisma.mod.groupBy({
    by: ["authorId"],
    where: { authorId: { in: userIds }, status: "PUBLISHED", visibility: "PUBLIC" },
    _sum: { downloadCount: true },
    _count: { _all: true },
  });
  for (const r of rows) {
    result.set(r.authorId, { downloads: r._sum.downloadCount ?? 0, mods: r._count._all });
  }
  return result;
}
