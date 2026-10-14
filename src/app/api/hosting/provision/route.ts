import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveHostingPartner, recordHostingClick } from "@/lib/hosting/resolve";
import { provisionHostingServer } from "@/lib/hosting/provision";
import { rateLimit } from "@/lib/rate-limit";
import { runAfterResponse } from "@/lib/after-response";

const schema = z
  .object({ modId: z.string().max(64).optional(), collectionId: z.string().max(64).optional() })
  .refine((v) => v.modId || v.collectionId, "modId or collectionId required");

/** „Server für dieses Modpack starten“: Partner ermitteln, Bereitstellung starten, Ziel-URL liefern. */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`hosting-provision:${ip}`, 10, 60_000).success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { modId, collectionId } = parsed.data;

  const [mod, collection] = await Promise.all([
    modId
      ? prisma.mod.findFirst({
          where: { id: modId, status: "PUBLISHED" },
          select: {
            id: true,
            title: true,
            gameId: true,
            authorId: true,
            serverPartnerEnabled: true,
            serverPartnerId: true,
            serverPartnerLink: true,
            serverPartnerBanner: true,
            game: { select: { slug: true } },
          },
        })
      : null,
    collectionId
      ? prisma.modCollection.findFirst({
          where: { id: collectionId },
          select: {
            id: true,
            title: true,
            ownerId: true,
            creatorId: true,
            serverPartnerEnabled: true,
            serverPartnerId: true,
            serverPartnerLink: true,
            serverPartnerBanner: true,
          },
        })
      : null,
  ]);
  if (!mod && !collection) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const partner = await resolveHostingPartner({ mod, collection, gameId: mod?.gameId ?? null });
  if (!partner) return NextResponse.json({ error: "No hosting partner configured" }, { status: 404 });

  const result = await provisionHostingServer({
    partner,
    modId: mod?.id,
    collectionId: collection?.id,
    gameId: mod?.gameId,
    gameSlug: mod?.game.slug,
    modpackTitle: collection?.title ?? mod?.title,
  });

  const user = await getCurrentUser().catch(() => null);
  runAfterResponse(recordHostingClick({
    partnerId: partner.partnerId,
    userId: user?.id ?? null,
    modId: mod?.id ?? null,
    collectionId: collection?.id ?? null,
    gameId: mod?.gameId ?? null,
    context: "CTA",
    referrer: req.headers.get("referer"),
  }).catch(() => null));

  return NextResponse.json({ redirectUrl: result.ok ? result.redirectUrl : result.fallbackUrl });
}
