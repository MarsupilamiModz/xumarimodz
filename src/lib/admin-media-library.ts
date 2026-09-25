import "server-only";
import type { MediaEntityType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const MEDIA_KINDS = ["image", "audio", "video", "other"] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

function kindWhere(kind?: MediaKind): Prisma.MediaFileWhereInput {
  if (!kind) return {};
  if (kind === "other") return { NOT: [{ mimeType: { startsWith: "image/" } }, { mimeType: { startsWith: "audio/" } }, { mimeType: { startsWith: "video/" } }] };
  return { mimeType: { startsWith: `${kind}/` } };
}

export async function getMediaLibrary(params: { kind?: MediaKind; q?: string; page: number; limit?: number }) {
  const limit = params.limit ?? 40;
  const where: Prisma.MediaFileWhereInput = {
    ...kindWhere(params.kind),
    ...(params.q ? { OR: [{ originalName: { contains: params.q, mode: "insensitive" } }, { fileName: { contains: params.q, mode: "insensitive" } }] } : {}),
  };
  const [items, total, usage] = await Promise.all([
    prisma.mediaFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (params.page - 1) * limit,
      take: limit,
      select: { id: true, originalName: true, mimeType: true, fileSize: true, publicUrl: true, createdAt: true },
    }),
    prisma.mediaFile.count({ where }),
    // Speicher je Typ (Summe der Dateigrößen) – eine gruppierte Abfrage statt vieler.
    prisma.$queryRaw<{ kind: string; bytes: bigint; files: bigint }[]>`
      SELECT CASE
               WHEN "mimeType" LIKE 'image/%' THEN 'image'
               WHEN "mimeType" LIKE 'audio/%' THEN 'audio'
               WHEN "mimeType" LIKE 'video/%' THEN 'video'
               ELSE 'other'
             END AS kind,
             COALESCE(SUM("fileSize"), 0)::bigint AS bytes,
             COUNT(*)::bigint AS files
      FROM media_files
      GROUP BY 1
    `,
  ]);
  return {
    items: items.map((i) => ({ ...i, fileSize: Number(i.fileSize) })),
    total,
    page: params.page,
    pages: Math.max(1, Math.ceil(total / limit)),
    usage: usage.map((u) => ({ kind: u.kind as MediaKind, bytes: Number(u.bytes), files: Number(u.files) })),
  };
}

export type MediaUsage = { label: string; href: string | null } | null;

/** Wo wird die Datei verwendet? Löst entityType/entityId auf einen lesbaren Namen und ACP-Link auf. */
export async function resolveMediaUsage(locale: string, entityType: MediaEntityType, entityId: string | null): Promise<MediaUsage> {
  if (!entityId) return null;
  const acp = `/${locale}/admin`;
  switch (entityType) {
    case "MOD_SCREENSHOT":
    case "MOD_MEDIA":
    case "SOUND_PREVIEW":
    case "SOUND_COVER": {
      const mod = await prisma.mod.findUnique({ where: { id: entityId }, select: { id: true, title: true } });
      return mod ? { label: mod.title, href: `${acp}/mods/${mod.id}` } : null;
    }
    case "USER_AVATAR": {
      const user = await prisma.user.findUnique({ where: { id: entityId }, select: { id: true, username: true } });
      return user ? { label: `@${user.username}`, href: `${acp}/users/${user.id}` } : null;
    }
    case "CREATOR_BANNER": {
      const c = await prisma.creatorProfile.findFirst({ where: { OR: [{ id: entityId }, { userId: entityId }] }, select: { id: true, slug: true } });
      return c ? { label: c.slug, href: `${acp}/creators/${c.id}` } : null;
    }
    case "PARTNER_LOGO": {
      const p = await prisma.partnerProfile.findFirst({ where: { OR: [{ id: entityId }, { userId: entityId }] }, select: { id: true, slug: true } });
      return p ? { label: p.slug, href: `${acp}/partners/${p.id}` } : null;
    }
    case "GAME_ASSET": {
      const g = await prisma.game.findUnique({ where: { id: entityId }, select: { id: true, name: true } });
      return g ? { label: g.name, href: `${acp}/games/${g.id}` } : null;
    }
    case "COLLECTION_COVER": {
      const c = await prisma.modCollection.findUnique({ where: { id: entityId }, select: { id: true, title: true } });
      return c ? { label: c.title, href: `${acp}/collections` } : null;
    }
    default:
      return null;
  }
}

export async function getMediaDetail(locale: string, id: string) {
  const file = await prisma.mediaFile.findUnique({
    where: { id },
    select: {
      id: true,
      originalName: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      publicUrl: true,
      entityType: true,
      entityId: true,
      createdAt: true,
      uploadedBy: { select: { id: true, username: true } },
    },
  });
  if (!file) return null;
  const usage = await resolveMediaUsage(locale, file.entityType, file.entityId);
  return { ...file, fileSize: Number(file.fileSize), usage };
}
