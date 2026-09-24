"use server";

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db";
import { requireActionPermission, ok } from "@/lib/action-utils";
import { CACHE_TAGS, REVALIDATE } from "@/lib/cache";

const OPEN_TICKET_STATUSES = ["NEW", "OPEN", "PENDING", "IN_PROGRESS", "WAITING_FOR_STAFF", "ESCALATED"] as const;

/** Premium = Rolle PREMIUM, aktives Abo oder aktive Mitgliedschaft (nicht FREE). */
const PREMIUM_WHERE = {
  OR: [
    { role: "PREMIUM" as const },
    { subscriptions: { some: { status: "ACTIVE" as const } } },
    { userMembership: { is: { status: "ACTIVE" as const, membershipType: { not: "FREE" as const } } } },
  ],
};

/**
 * Gebündelte Dashboard-Daten (ein Endpoint, 60 s gecacht).
 * Umsatz 30 Tage = Mod-Käufe + Mitgliedschaften + bezahlte Custom-Aufträge (in Cent).
 */
async function fetchAdminAnalytics() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    premiumUsers,
    activeSubscriptions,
    bannedUsers,
    openTickets,
    modRevenue,
    membershipRevenue,
    orderRevenue,
    recentTickets,
    recentMods,
    recentModPurchases,
    recentMembershipPurchases,
    latestUsers,
  ] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { deletedAt: null, ...PREMIUM_WHERE } }),
    prisma.userMembership.count({ where: { status: "ACTIVE", isLifetime: false, membershipType: { not: "FREE" } } }),
    prisma.user.count({ where: { isBanned: true, deletedAt: null } }),
    prisma.supportTicket.count({ where: { status: { in: [...OPEN_TICKET_STATUSES] } } }),
    prisma.modPurchase.aggregate({ _sum: { amountCents: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.membershipPurchase.aggregate({ _sum: { amountCents: true }, where: { createdAt: { gte: thirtyDaysAgo } } }),
    prisma.customOrder.aggregate({
      _sum: { finalAmountCents: true },
      where: { paymentStatus: "PAID", createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.supportTicket.findMany({
      take: 5,
      orderBy: { updatedAt: "desc" },
      select: { id: true, subject: true, status: true, updatedAt: true, user: { select: { username: true } } },
    }),
    prisma.mod.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        createdAt: true,
        author: { select: { username: true, displayName: true } },
        game: { select: { name: true } },
      },
    }),
    prisma.modPurchase.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, amountCents: true, createdAt: true, user: { select: { username: true } }, mod: { select: { title: true } } },
    }),
    prisma.membershipPurchase.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, amountCents: true, createdAt: true, user: { select: { username: true } }, plan: { select: { name: true } } },
    }),
    prisma.user.findMany({
      take: 5,
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        createdAt: true,
        userMembership: { select: { status: true, membershipType: true } },
      },
    }),
  ]);

  const recentPurchases = [
    ...recentModPurchases.map((p) => ({ id: `mod-${p.id}`, label: p.mod.title, kind: "mod" as const, amountCents: p.amountCents, username: p.user.username, createdAt: p.createdAt })),
    ...recentMembershipPurchases.map((p) => ({ id: `plan-${p.id}`, label: p.plan.name, kind: "membership" as const, amountCents: p.amountCents, username: p.user.username, createdAt: p.createdAt })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return {
    totalUsers,
    premiumUsers,
    activeSubscriptions,
    bannedUsers,
    openTickets,
    revenue30dCents:
      (modRevenue._sum.amountCents ?? 0) + (membershipRevenue._sum.amountCents ?? 0) + (orderRevenue._sum.finalAmountCents ?? 0),
    recentTickets,
    recentMods,
    recentPurchases,
    latestUsers: latestUsers.map((u) => ({
      ...u,
      isPremium: u.role === "PREMIUM" || (u.userMembership?.status === "ACTIVE" && u.userMembership.membershipType !== "FREE"),
    })),
  };
}

const getCachedAdminAnalytics = unstable_cache(
  fetchAdminAnalytics,
  ["admin-analytics-overview"],
  { revalidate: REVALIDATE.adminStats, tags: [CACHE_TAGS.adminAnalytics] }
);

export async function getAdminAnalytics() {
  const { error } = await requireActionPermission("analytics.read");
  if (error) return error;

  return ok(await getCachedAdminAnalytics());
}
