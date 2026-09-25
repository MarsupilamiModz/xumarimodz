"use server";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import { getCurrentUser } from "@/lib/auth";
import {
  ANNOUNCEMENT_CHANNELS,
  ANNOUNCEMENT_KINDS,
  announcementChannels,
  announcementKind,
  announcementVisibleTo,
  audienceTargets,
  buildVisibilityTargets,
} from "@/lib/announcement-targeting";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  title: z.string().min(2).max(120),
  content: z.string().min(2).max(5000),
  link: z.string().url().optional().or(z.literal("")),
  isActive: z.boolean(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  visibilityTargets: z.array(z.string()).optional(),
  kind: z.enum(ANNOUNCEMENT_KINDS).optional(),
  channels: z.array(z.enum(ANNOUNCEMENT_CHANNELS)).optional(),
});

function parseDate(value: string | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function buildViewerContext() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [creator, partner, subscription] = await Promise.all([
    prisma.creatorProfile.findUnique({
      where: { userId: user.id },
      select: { isVerified: true },
    }),
    prisma.partnerProfile.findUnique({
      where: { userId: user.id },
      select: { id: true },
    }),
    prisma.subscription.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      include: { plan: { select: { slug: true } } },
    }),
  ]);

  const planSlug = subscription?.plan?.slug ?? "";
  return {
    role: user.role,
    isCreator: !!creator || user.role === "CREATOR",
    isVerifiedCreator: !!creator?.isVerified,
    isPartner: !!partner || user.role === "PARTNER",
    hasPremium: planSlug.includes("premium"),
    hasPremiumLite: planSlug.includes("lite"),
    hasPremiumMax: planSlug.includes("max"),
    permissionGroupId: user.permissionGroupId,
  };
}

/** Aktive Ankündigungen – 60 s gecacht; Zeitraum und Zielgruppe werden pro Anfrage geprüft. */
const getCachedActiveAnnouncements = unstable_cache(
  async () =>
    prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ["active-announcements"],
  { revalidate: 60, tags: [CACHE_TAGS.announcements] }
);

export async function getActiveAnnouncements() {
  const now = new Date();
  const viewer = await buildViewerContext();

  // Datumswerte kommen aus dem Cache als Text zurück.
  const items = (await getCachedActiveAnnouncements())
    .map((item) => ({
      ...item,
      startsAt: new Date(item.startsAt),
      endsAt: item.endsAt ? new Date(item.endsAt) : null,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
    }))
    .filter((item) => item.startsAt <= now && (!item.endsAt || item.endsAt > now))
    .filter((item) => announcementChannels(item.visibilityTargets).includes("website"))
    .map((item) => ({ ...item, kind: announcementKind(item.visibilityTargets) }))
    .slice(0, 10);

  return items.filter((item) =>
    announcementVisibleTo(item.visibilityTargets, viewer)
  ).slice(0, 3);
}

export async function listAnnouncements() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const items = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" } });
  return ok(items);
}

export async function createAnnouncement(input: z.infer<typeof schema>) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const parsed = schema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const targets = buildVisibilityTargets(
    parsed.data.visibilityTargets ?? ["everyone"],
    parsed.data.kind ?? "news",
    parsed.data.channels?.length ? parsed.data.channels : ["website"]
  );
  const startsAt = parseDate(parsed.data.startsAt);
  const endsAt = parseDate(parsed.data.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) return fail("End must be after start");

  const item = await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      link: parsed.data.link || null,
      isActive: parsed.data.isActive,
      ...(startsAt ? { startsAt } : {}),
      endsAt,
      visibilityTargets: targets,
    },
  });
  await createAuditLog({ actorId: user.id, action: "announcement.create", entityType: "Announcement", entityId: item.id, metadata: { title: item.title } });
  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/");

  void import("@/lib/translation-worker").then(({ scheduleEntityTranslation }) =>
    scheduleEntityTranslation({
      entityType: "Announcement",
      entityId: item.id,
      fields: { title: item.title, content: item.content },
    })
  );

  return ok(item);
}

export async function updateAnnouncement(
  id: string,
  input: Partial<z.infer<typeof schema>>
) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const parsed = schema.partial().safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);
  const data = parsed.data;

  const current = await prisma.announcement.findUnique({ where: { id }, select: { visibilityTargets: true } });
  if (!current) return fail("Announcement not found");
  const targets =
    data.visibilityTargets || data.kind || data.channels
      ? buildVisibilityTargets(
          data.visibilityTargets ?? audienceTargets(current.visibilityTargets),
          data.kind ?? announcementKind(current.visibilityTargets),
          data.channels?.length ? data.channels : announcementChannels(current.visibilityTargets)
        )
      : undefined;

  await prisma.announcement.update({
    where: { id },
    data: {
      ...(data.title && { title: data.title }),
      ...(data.content && { content: data.content }),
      ...(data.link !== undefined && { link: data.link || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      ...(data.startsAt !== undefined && { startsAt: parseDate(data.startsAt) ?? new Date() }),
      ...(data.endsAt !== undefined && { endsAt: parseDate(data.endsAt) }),
      ...(targets && { visibilityTargets: targets }),
    },
  });
  await createAuditLog({ actorId: user.id, action: "announcement.update", entityType: "Announcement", entityId: id, metadata: { fields: Object.keys(data) } });
  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/");
  return ok(undefined);
}

export async function toggleAnnouncement(id: string, isActive: boolean) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  await prisma.announcement.update({ where: { id }, data: { isActive } });
  await createAuditLog({ actorId: user.id, action: isActive ? "announcement.activate" : "announcement.deactivate", entityType: "Announcement", entityId: id });
  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/");
  return ok(undefined);
}

export async function deleteAnnouncement(id: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  await prisma.announcement.delete({ where: { id } });
  await createAuditLog({ actorId: user.id, action: "announcement.delete", entityType: "Announcement", entityId: id });
  revalidateTag(CACHE_TAGS.announcements);
  revalidatePath("/");
  return ok(undefined);
}
