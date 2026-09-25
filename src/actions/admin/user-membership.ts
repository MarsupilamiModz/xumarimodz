"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import {
  cancelStripeSubscription,
  changeStripeSubscriptionPlan,
  extendStripeSubscription,
  refundStripePayment,
  resumeStripeSubscription,
} from "@/lib/stripe";
import { createAuditLog } from "@/lib/audit";
import {
  getUserMembershipState,
  planSlugToTier,
  syncUserRoleFromMembership,
  upsertUserMembership,
} from "@/lib/user-membership";
import { grantMembershipPurchase } from "@/lib/membership";
import type { MembershipTier, UserMembershipStatus } from "@prisma/client";

function audit(actorId: string, action: string, userId: string, metadata?: Record<string, unknown>) {
  return createAuditLog({ actorId, action, entityType: "UserMembership", entityId: userId, metadata });
}

function revalidateBilling(userId: string) {
  revalidatePath(`/admin/users/${userId}`);
  revalidatePath("/admin/subscriptions");
  revalidatePath("/admin/memberships");
}

export async function getAdminUserMembership(userId: string) {
  const { error } = await requireActionPermission("users.read");
  if (error) return error;

  const [state, purchases, subscriptions, invoices] = await Promise.all([
    getUserMembershipState(userId),
    prisma.membershipPurchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { name: true, slug: true } } },
    }),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { plan: { select: { name: true, slug: true } } },
    }),
    prisma.membershipPurchase.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amountCents: true,
        createdAt: true,
        stripePaymentId: true,
        plan: { select: { name: true } },
      },
    }),
  ]);

  return ok({ state, purchases, subscriptions, billingHistory: invoices });
}

export async function adminAssignMembership(
  userId: string,
  planId: string,
  options?: { lifetime?: boolean; extendDays?: number }
) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan) return fail("Plan not found");

  if (options?.lifetime || plan.billingType === "ONE_TIME") {
    await grantMembershipPurchase({
      userId,
      planId,
      stripePaymentId: `admin_${user!.id}_${Date.now()}`,
    });
  } else {
    const renewal = new Date();
    renewal.setDate(renewal.getDate() + (options?.extendDays ?? 30));
    await upsertUserMembership({
      userId,
      membershipType: planSlugToTier(plan.slug),
      status: "ACTIVE",
      planId: plan.id,
      renewalDate: renewal,
      isLifetime: false,
    });
    await syncUserRoleFromMembership(userId);
  }

  await audit(user.id, "membership.grant", userId, { planId, lifetime: !!options?.lifetime, days: options?.extendDays });
  revalidateBilling(userId);
  return ok(undefined);
}

/**
 * Kündigen: Stripe-Abos laufen bis zum Ende des bezahlten Zeitraums weiter (cancel_at_period_end),
 * manuell vergebene Mitgliedschaften enden sofort.
 */
export async function adminCancelMembership(userId: string) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;

  const state = await getUserMembershipState(userId);
  if (state.membershipType === "FREE") return fail("No active membership");

  const atPeriodEnd = !!state.stripeSubscriptionId && !state.isLifetime;
  if (atPeriodEnd && state.stripeSubscriptionId) {
    try {
      await cancelStripeSubscription(state.stripeSubscriptionId);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Stripe cancellation failed");
    }
    await upsertUserMembership({
      userId,
      membershipType: state.membershipType,
      status: "ACTIVE",
      planId: state.planId,
      renewalDate: state.renewalDate,
      cancelDate: state.renewalDate ?? new Date(),
      stripeSubscriptionId: state.stripeSubscriptionId,
      isLifetime: false,
    });
  } else {
    await upsertUserMembership({
      userId,
      membershipType: "FREE",
      status: "CANCELED",
      cancelDate: new Date(),
    });
  }

  await syncUserRoleFromMembership(userId);
  await audit(user.id, "membership.cancel", userId, { tier: state.membershipType, atPeriodEnd });
  revalidateBilling(userId);
  return ok(undefined);
}

export async function adminExtendMembership(userId: string, days: number) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;
  if (!Number.isInteger(days) || days < 1 || days > 3650) return fail("Invalid number of days");

  const state = await getUserMembershipState(userId);
  if (state.membershipType === "FREE") return fail("No active membership");
  if (state.isLifetime) return fail("Lifetime memberships cannot be extended");

  const base = state.renewalDate && state.renewalDate > new Date() ? state.renewalDate : new Date();
  const renewal = new Date(base);
  renewal.setDate(renewal.getDate() + days);

  if (state.stripeSubscriptionId) {
    try {
      await extendStripeSubscription(state.stripeSubscriptionId, renewal);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Stripe extension failed");
    }
  }

  await upsertUserMembership({
    userId,
    membershipType: state.membershipType,
    status: "ACTIVE",
    planId: state.planId,
    renewalDate: renewal,
    // Eine vorgemerkte Kündigung verschiebt sich mit dem neuen Laufzeitende.
    cancelDate: state.cancelDate ? renewal : null,
    stripeSubscriptionId: state.stripeSubscriptionId,
    isLifetime: false,
  });
  await syncUserRoleFromMembership(userId);

  await audit(user.id, "membership.extend", userId, { days, until: renewal.toISOString() });
  revalidateBilling(userId);
  return ok(undefined);
}

export async function adminSetMembershipTier(
  userId: string,
  tier: MembershipTier,
  status: UserMembershipStatus = "ACTIVE"
) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;

  const slug =
    tier === "PREMIUM_LITE" ? "premium-lite" : tier === "PREMIUM_MAX" ? "premium-max" : tier === "PREMIUM" ? "premium" : null;
  const plan = slug
    ? await prisma.membershipPlan.findFirst({ where: { slug } })
    : null;

  await upsertUserMembership({
    userId,
    membershipType: tier,
    status,
    planId: plan?.id ?? null,
    isLifetime: tier !== "FREE",
  });
  await syncUserRoleFromMembership(userId);
  await audit(user.id, "membership.set_tier", userId, { tier, status });
  revalidateBilling(userId);
  return ok(undefined);
}

export async function adminChangeMembershipPlan(userId: string, newPlanId: string) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;

  const plan = await prisma.membershipPlan.findUnique({ where: { id: newPlanId } });
  if (!plan) return fail("Plan not found");

  const state = await getUserMembershipState(userId);
  if (state.stripeSubscriptionId && plan.stripePriceId) {
    try {
      await changeStripeSubscriptionPlan(state.stripeSubscriptionId, plan.stripePriceId);
    } catch (err) {
      return fail(err instanceof Error ? err.message : "Stripe plan change failed");
    }
  }

  await upsertUserMembership({
    userId,
    membershipType: planSlugToTier(plan.slug),
    status: "ACTIVE",
    planId: plan.id,
    stripeSubscriptionId: state.stripeSubscriptionId,
    renewalDate: state.renewalDate,
    isLifetime: false,
  });
  await syncUserRoleFromMembership(userId);
  await audit(user.id, "membership.change_plan", userId, { planId: plan.id });
  revalidateBilling(userId);
  return ok(undefined);
}

export async function adminResumeMembership(userId: string) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;

  const state = await getUserMembershipState(userId);
  if (state.stripeSubscriptionId) {
    await resumeStripeSubscription(state.stripeSubscriptionId);
  }

  await upsertUserMembership({
    userId,
    membershipType: state.membershipType,
    status: "ACTIVE",
    planId: state.planId,
    cancelDate: null,
    stripeSubscriptionId: state.stripeSubscriptionId,
    renewalDate: state.renewalDate,
    isLifetime: state.isLifetime,
  });
  await syncUserRoleFromMembership(userId);
  await audit(user.id, "membership.resume", userId);
  revalidateBilling(userId);
  return ok(undefined);
}

/**
 * Erstattet einen Einzelkauf vollständig über Stripe.
 * Mitgliedschaftskäufe enden sofort (expiresAt = jetzt). Bei Mod-Käufen bleibt der Datensatz bestehen,
 * weil das Schema noch kein Feld für erstattete Käufe hat (siehe docs/REDESIGN.md).
 */
export async function adminRefundPurchase(kind: "membership" | "mod", purchaseId: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const purchase =
    kind === "membership"
      ? await prisma.membershipPurchase.findUnique({
          where: { id: purchaseId },
          select: { id: true, userId: true, planId: true, stripePaymentId: true, amountCents: true },
        })
      : await prisma.modPurchase.findUnique({
          where: { id: purchaseId },
          select: { id: true, userId: true, modId: true, stripePaymentId: true, amountCents: true },
        });
  if (!purchase) return fail("Purchase not found");
  if (!purchase.stripePaymentId?.startsWith("pi_")) return fail("This purchase has no Stripe payment to refund");

  const already = await prisma.auditLog.findFirst({
    where: { action: "purchase.refund", entityId: purchase.id },
    select: { id: true },
  });
  if (already) return fail("This purchase has already been refunded");

  try {
    await refundStripePayment(purchase.stripePaymentId, `refund_${kind}_${purchase.id}`);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Stripe refund failed");
  }

  if (kind === "membership" && "planId" in purchase) {
    await prisma.membershipPurchase.update({ where: { id: purchase.id }, data: { expiresAt: new Date() } });
    const state = await getUserMembershipState(purchase.userId);
    if (state.planId === purchase.planId && state.isLifetime) {
      await upsertUserMembership({ userId: purchase.userId, membershipType: "FREE", status: "CANCELED", cancelDate: new Date() });
    }
    await syncUserRoleFromMembership(purchase.userId);
  }

  await createAuditLog({
    actorId: user.id,
    action: "purchase.refund",
    entityType: kind === "membership" ? "MembershipPurchase" : "Purchase",
    entityId: purchase.id,
    metadata: { userId: purchase.userId, amountCents: purchase.amountCents, paymentIntent: purchase.stripePaymentId },
  });
  revalidateBilling(purchase.userId);
  return ok(undefined);
}

/** „Mitgliedschaft vergeben“ aus dem ACP: Nutzer per Benutzername, Plan und Dauer in Tagen (leer = unbegrenzt). */
export async function adminGrantMembershipByUsername(username: string, planId: string, days: number | null) {
  const { error } = await requireActionPermission("users.write");
  if (error) return error;

  const name = username.trim().replace(/^@/, "");
  if (!name) return fail("Username required");
  const target = await prisma.user.findFirst({
    where: { username: { equals: name, mode: "insensitive" }, deletedAt: null },
    select: { id: true },
  });
  if (!target) return fail("User not found");
  if (days !== null && (!Number.isInteger(days) || days < 1 || days > 3650)) return fail("Invalid number of days");

  return adminAssignMembership(target.id, planId, days === null ? { lifetime: true } : { extendDays: days });
}

/** Entzieht manuell vergebene Mitgliedschaften sofort; bezahlte Stripe-Käufe bleiben unberührt. */
export async function adminRevokeManualMembership(userId: string) {
  const { user, error } = await requireActionPermission("users.write");
  if (error) return error;

  const now = new Date();
  const expired = await prisma.membershipPurchase.updateMany({
    where: { userId, stripePaymentId: { startsWith: "admin_" }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    data: { expiresAt: now },
  });

  const state = await getUserMembershipState(userId);
  const paidPurchase = await prisma.membershipPurchase.findFirst({
    where: { userId, stripePaymentId: { startsWith: "pi_" }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { id: true },
  });
  if (!state.stripeSubscriptionId && !paidPurchase && state.membershipType !== "FREE") {
    await upsertUserMembership({ userId, membershipType: "FREE", status: "CANCELED", cancelDate: now });
  }
  await syncUserRoleFromMembership(userId);

  await audit(user.id, "membership.revoke", userId, { expiredGrants: expired.count });
  revalidateBilling(userId);
  return ok(undefined);
}
