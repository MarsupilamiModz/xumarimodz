import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const userSearch = (q?: string): Prisma.UserWhereInput | undefined =>
  q
    ? {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      }
    : undefined;

const USER_SELECT = { id: true, username: true, displayName: true, email: true } as const;

/** Laufende, zeitlich begrenzte Mitgliedschaften (Stripe-Abos und manuell vergebene). */
export async function getAdminSubscriptionsPage({ q, page, limit = 25 }: { q?: string; page: number; limit?: number }) {
  const where: Prisma.UserMembershipWhereInput = {
    membershipType: { not: "FREE" },
    isLifetime: false,
    status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
    ...(q ? { user: userSearch(q) } : {}),
  };
  const [rows, total, cancelling] = await Promise.all([
    prisma.userMembership.findMany({
      where,
      orderBy: [{ renewalDate: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        userId: true,
        membershipType: true,
        status: true,
        renewalDate: true,
        cancelDate: true,
        stripeSubscriptionId: true,
        createdAt: true,
        plan: { select: { name: true } },
        user: { select: USER_SELECT },
      },
    }),
    prisma.userMembership.count({ where }),
    prisma.userMembership.count({ where: { ...where, cancelDate: { not: null } } }),
  ]);
  return { rows, total, cancelling, page, pages: Math.max(1, Math.ceil(total / limit)) };
}

export type PurchaseRow = {
  id: string;
  kind: "membership" | "mod";
  product: string;
  amountCents: number;
  stripePaymentId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  user: { id: string; username: string; displayName: string | null; email: string };
  refunded: boolean;
};

/**
 * Einzelkäufe aus Mitgliedschafts- und Mod-Käufen, neueste zuerst.
 * Beide Tabellen werden bis zur aktuellen Seite geladen und zusammengeführt (Admin-Listen bleiben kurz).
 */
export async function getAdminPurchasesPage({ q, page, limit = 25 }: { q?: string; page: number; limit?: number }) {
  const take = page * limit;
  const userWhere = q ? { user: userSearch(q) } : {};
  const [memberships, mods, membershipCount, modCount, membershipSum, modSum] = await Promise.all([
    prisma.membershipPurchase.findMany({
      where: userWhere,
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, amountCents: true, stripePaymentId: true, createdAt: true, expiresAt: true, plan: { select: { name: true } }, user: { select: USER_SELECT } },
    }),
    prisma.modPurchase.findMany({
      where: userWhere,
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, amountCents: true, stripePaymentId: true, createdAt: true, mod: { select: { title: true } }, user: { select: USER_SELECT } },
    }),
    prisma.membershipPurchase.count({ where: userWhere }),
    prisma.modPurchase.count({ where: userWhere }),
    prisma.membershipPurchase.aggregate({ _sum: { amountCents: true } }),
    prisma.modPurchase.aggregate({ _sum: { amountCents: true } }),
  ]);

  const merged = [
    ...memberships.map((p) => ({ id: p.id, kind: "membership" as const, product: p.plan.name, amountCents: p.amountCents, stripePaymentId: p.stripePaymentId, createdAt: p.createdAt, expiresAt: p.expiresAt, user: p.user })),
    ...mods.map((p) => ({ id: p.id, kind: "mod" as const, product: p.mod.title, amountCents: p.amountCents, stripePaymentId: p.stripePaymentId, createdAt: p.createdAt, expiresAt: null, user: p.user })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice((page - 1) * limit, page * limit);

  const refunds = merged.length
    ? await prisma.auditLog.findMany({
        where: { action: "purchase.refund", entityId: { in: merged.map((m) => m.id) } },
        select: { entityId: true },
      })
    : [];
  const refunded = new Set(refunds.map((r) => r.entityId));

  const total = membershipCount + modCount;
  return {
    rows: merged.map((m): PurchaseRow => ({ ...m, refunded: refunded.has(m.id) })),
    total,
    revenueCents: (membershipSum._sum.amountCents ?? 0) + (modSum._sum.amountCents ?? 0),
    page,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}
