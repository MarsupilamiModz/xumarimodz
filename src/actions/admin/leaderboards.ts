"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import {
  getHiddenLeaderboardCreators,
  getLeaderboardWeights,
  saveLeaderboardWeights,
  setHiddenLeaderboardCreators,
  syncCreatorRanks,
  type LeaderboardWeights,
} from "@/lib/leaderboards";

function refreshLeaderboards() {
  revalidateTag("leaderboards");
  revalidatePath("/leaderboards");
  revalidatePath("/admin/leaderboards");
}

export async function getAdminLeaderboardConfig() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const weights = await getLeaderboardWeights();
  const pinned = await prisma.creatorProfile.findMany({
    where: { leaderboardPinned: true },
    include: { user: { select: { username: true, displayName: true } } },
    orderBy: { sortOrder: "asc" },
  });
  return ok({ weights, pinned });
}

export async function saveAdminLeaderboardWeights(weights: LeaderboardWeights) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const clean = Object.fromEntries(
    Object.entries(weights).map(([k, v]) => [k, Math.min(1000, Math.max(0, Number(v) || 0))])
  ) as LeaderboardWeights;
  await saveLeaderboardWeights(clean);
  await createAuditLog({ actorId: user.id, action: "leaderboard.weights", entityType: "SiteSetting", entityId: "leaderboard_weights", metadata: clean });
  refreshLeaderboards();
  return ok(undefined);
}

export async function hideCreatorOnLeaderboard(creatorProfileId: string, hidden: boolean) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const current = await getHiddenLeaderboardCreators();
  await setHiddenLeaderboardCreators(hidden ? [...current, creatorProfileId] : current.filter((id) => id !== creatorProfileId));
  await createAuditLog({ actorId: user.id, action: hidden ? "leaderboard.hide" : "leaderboard.unhide", entityType: "CreatorProfile", entityId: creatorProfileId });
  refreshLeaderboards();
  return ok(undefined);
}

export async function pinCreatorOnLeaderboard(creatorProfileId: string, pinned: boolean, days = 7) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  if (!Number.isInteger(days) || days < 1 || days > 365) return fail("Invalid number of days");

  await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: {
      leaderboardPinned: pinned,
      pinnedUntil: pinned ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : null,
    },
  });
  await createAuditLog({ actorId: user.id, action: pinned ? "leaderboard.pin" : "leaderboard.unpin", entityType: "CreatorProfile", entityId: creatorProfileId, metadata: pinned ? { days } : undefined });
  refreshLeaderboards();
  return ok(undefined);
}

export async function resetCreatorRankings() {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  await syncCreatorRanks();
  await createAuditLog({ actorId: user.id, action: "leaderboard.recalculate", entityType: "SiteSetting", entityId: "creator_ranks" });
  revalidateTag("leaderboards");
  revalidatePath("/leaderboards");
  return ok(undefined);
}

export async function featureCreatorOnLeaderboard(creatorProfileId: string, featured: boolean) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;
  await prisma.creatorProfile.update({
    where: { id: creatorProfileId },
    data: { isFeatured: featured },
  });
  await createAuditLog({ actorId: user.id, action: featured ? "leaderboard.feature" : "leaderboard.unfeature", entityType: "CreatorProfile", entityId: creatorProfileId });
  revalidateTag("leaderboards");
  revalidatePath("/leaderboards");
  return ok(undefined);
}

export async function searchCreatorsForLeaderboard(query: string) {
  const { error } = await requireActionPermission("users.read");
  if (error) return error;

  const creators = await prisma.creatorProfile.findMany({
    where: {
      OR: [
        { slug: { contains: query, mode: "insensitive" } },
        { user: { username: { contains: query, mode: "insensitive" } } },
      ],
    },
    take: 20,
    include: { user: { select: { username: true, displayName: true } } },
  });
  return ok(creators);
}
