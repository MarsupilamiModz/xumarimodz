"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import type { CollectionModerationStatus, CollectionVisibility, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import { CACHE_TAGS } from "@/lib/cache";
import { resolveSlug, ensureUniqueSlug } from "@/lib/slug";
import { createAuditLog } from "@/lib/audit";

function invalidateCollections() {
  revalidateTag(CACHE_TAGS.collections);
  revalidatePath("/collections");
  revalidatePath("/admin/collections");
}

export async function listCollectionsAdmin(params?: {
  page?: number;
  status?: CollectionModerationStatus;
  search?: string;
}) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;

  const page = params?.page ?? 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const where = {
    ...(params?.status && { moderationStatus: params.status }),
    ...(params?.search && {
      OR: [
        { title: { contains: params.search, mode: "insensitive" as const } },
        { slug: { contains: params.search, mode: "insensitive" as const } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.modCollection.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      include: {
        owner: { select: { username: true, displayName: true } },
        _count: { select: { items: true, followers: true } },
      },
    }),
    prisma.modCollection.count({ where }),
  ]);

  return ok({ items, total, pages: Math.ceil(total / limit), page });
}

export async function updateCollectionAdmin(
  id: string,
  input: Partial<{
    title: string;
    description: string;
    coverUrl: string;
    bannerUrl: string;
    visibility: CollectionVisibility;
    moderationStatus: CollectionModerationStatus;
    isFeatured: boolean;
    sortOrder: number;
    adminNotes: string;
  }>
) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const existing = await prisma.modCollection.findUnique({ where: { id } });
  if (!existing) return fail("Not found");

  const updated = await prisma.modCollection.update({
    where: { id },
    data: {
      ...input,
      ...(input.isFeatured !== undefined && {
        visibility: input.isFeatured
          ? "FEATURED"
          : input.visibility ??
            (existing.visibility === "FEATURED" ? "PUBLIC" : existing.visibility),
      }),
    },
  });

  await createAuditLog({ actorId: user.id, action: "collection.update", entityType: "Collection", entityId: id, metadata: { fields: Object.keys(input) } });
  invalidateCollections();
  return ok(updated);
}

export async function deleteCollectionAdmin(id: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const existing = await prisma.modCollection.findUnique({ where: { id }, select: { title: true } });
  if (!existing) return fail("Not found");
  await prisma.modCollection.delete({ where: { id } });
  await createAuditLog({ actorId: user.id, action: "collection.delete", entityType: "Collection", entityId: id, metadata: { title: existing.title } });
  invalidateCollections();
  return ok(undefined);
}

export async function createCollectionAdmin(input: {
  title: string;
  ownerId: string;
  ownerUsername?: string;
  description?: string;
  coverUrl?: string;
  bannerUrl?: string;
  visibility?: CollectionVisibility;
}) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  let ownerId = input.ownerId;
  if (input.ownerUsername?.trim()) {
    const owner = await prisma.user.findFirst({
      where: { username: input.ownerUsername.trim() },
      select: { id: true },
    });
    if (!owner) return fail("Owner user not found");
    ownerId = owner.id;
  }

  const resolved = resolveSlug({ title: input.title, fallbackPrefix: "collection" });
  const slug = await ensureUniqueSlug(resolved.slug, async (s) =>
    Boolean(await prisma.modCollection.findUnique({ where: { slug: s } }))
  );

  const collection = await prisma.modCollection.create({
    data: {
      slug,
      title: input.title,
      description: input.description,
      coverUrl: input.coverUrl,
      bannerUrl: input.bannerUrl,
      visibility: input.visibility ?? "PUBLIC",
      ownerId,
      moderationStatus: "APPROVED",
    },
  });

  await createAuditLog({ actorId: user.id, action: "collection.create", entityType: "Collection", entityId: collection.id, metadata: { title: collection.title } });
  invalidateCollections();
  return ok(collection);
}

export async function reorderCollectionsAdmin(ids: string[]) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.modCollection.update({
        where: { id },
        data: { sortOrder: index },
      })
    )
  );

  invalidateCollections();
  return ok(undefined);
}

export async function getCollectionAnalyticsAdmin(id: string) {
  const { error } = await requireActionPermission("analytics.read");
  if (error) return error;

  const collection = await prisma.modCollection.findUnique({
    where: { id },
    select: {
      title: true,
      viewCount: true,
      downloadCount: true,
      followerCount: true,
      items: { select: { modId: true } },
    },
  });
  if (!collection) return fail("Not found");

  const conversionRate =
    collection.viewCount > 0
      ? ((collection.downloadCount / collection.viewCount) * 100).toFixed(1)
      : "0";

  return ok({
    ...collection,
    modCount: collection.items.length,
    conversionRate,
  });
}

const ITEM_MOD_SELECT = {
  id: true,
  title: true,
  slug: true,
  game: { select: { name: true } },
  media: { where: { mediaType: "IMAGE" }, orderBy: [{ isFeatured: "desc" }, { orderIndex: "asc" }], take: 1, select: { imageUrl: true } },
} satisfies Prisma.ModSelect;

export async function getCollectionItemsAdmin(id: string) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const items = await prisma.modCollectionItem.findMany({
    where: { collectionId: id },
    orderBy: { sortOrder: "asc" },
    select: { mod: { select: ITEM_MOD_SELECT } },
  });
  return ok(items.map((i) => ({ id: i.mod.id, title: i.mod.title, game: i.mod.game.name, image: i.mod.media[0]?.imageUrl ?? null })));
}

export async function searchModsForCollectionAdmin(q: string) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return ok([]);
  const mods = await prisma.mod.findMany({
    where: { status: "PUBLISHED", OR: [{ title: { contains: term, mode: "insensitive" } }, { slug: { contains: term, mode: "insensitive" } }] },
    orderBy: { downloadCount: "desc" },
    take: 12,
    select: ITEM_MOD_SELECT,
  });
  return ok(mods.map((m) => ({ id: m.id, title: m.title, game: m.game.name, image: m.media[0]?.imageUrl ?? null })));
}

/** Setzt Inhalt und Reihenfolge einer Sammlung in einer Transaktion (Hinzufügen, Entfernen, Sortieren). */
export async function setCollectionItemsAdmin(id: string, modIds: string[]) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const unique = Array.from(new Set(modIds)).slice(0, 500);

  const collection = await prisma.modCollection.findUnique({ where: { id }, select: { id: true } });
  if (!collection) return fail("Not found");
  const existingMods = await prisma.mod.count({ where: { id: { in: unique } } });
  if (existingMods !== unique.length) return fail("Unknown mod in list");

  await prisma.$transaction([
    prisma.modCollectionItem.deleteMany({ where: { collectionId: id, modId: { notIn: unique } } }),
    ...unique.map((modId, index) =>
      prisma.modCollectionItem.upsert({
        where: { collectionId_modId: { collectionId: id, modId } },
        create: { collectionId: id, modId, sortOrder: index },
        update: { sortOrder: index },
      })
    ),
  ]);
  await createAuditLog({ actorId: user.id, action: "collection.items_update", entityType: "Collection", entityId: id, metadata: { count: unique.length } });
  invalidateCollections();
  return ok(undefined);
}
