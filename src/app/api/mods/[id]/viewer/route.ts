import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { checkMissingDependencies } from "@/lib/mod-dependencies";

export const dynamic = "force-dynamic";

export type ModViewerState = {
  signedIn: boolean;
  favorited: boolean;
  owned: boolean;
  /** IDs der Pflicht-Abhängigkeiten, die dem Nutzer fehlen */
  missingDependencyIds: string[];
};

/** Nutzerbezogene Angaben zur Mod-Seite – die Seite selbst rendert für Gäste und bleibt cachebar. */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const user = await getCurrentUser();
  const headers = { "Cache-Control": "private, no-store" };
  if (!user) {
    return NextResponse.json({ signedIn: false, favorited: false, owned: false, missingDependencyIds: [] } satisfies ModViewerState, { headers });
  }

  const [favorite, purchase, deps] = await Promise.all([
    prisma.modFavorite.findUnique({ where: { modId_userId: { modId: id, userId: user.id } }, select: { modId: true } }),
    prisma.modPurchase.findFirst({ where: { modId: id, userId: user.id, refundedAt: null }, select: { id: true } }).catch(() => null),
    checkMissingDependencies(id, user.id).catch(() => null),
  ]);

  return NextResponse.json(
    {
      signedIn: true,
      favorited: !!favorite,
      owned: !!purchase,
      missingDependencyIds: deps?.missing.map((d) => d.dependencyId) ?? [],
    } satisfies ModViewerState,
    { headers }
  );
}
