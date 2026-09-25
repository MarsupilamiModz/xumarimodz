"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import type { CommissionSource, CommissionType, PayoutStatus, UserRole } from "@prisma/client";

const ruleSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(["FIXED", "PERCENT", "RECURRING"]),
  value: z.number().int().min(0),
  source: z.enum(["SUBSCRIPTION", "MOD_SALE", "CUSTOM_ORDER", "COUPON", "REFERRAL", "BONUS"]),
  targetRole: z.enum(["CREATOR", "PARTNER", "DESIGNER"]).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export async function listCommissionRules() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;

  const rules = await prisma.commissionRule.findMany({ orderBy: { createdAt: "desc" } });
  return ok(rules);
}

export async function createCommissionRule(input: z.infer<typeof ruleSchema>) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.message);

  const rule = await prisma.commissionRule.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type as CommissionType,
      value: parsed.data.value,
      source: parsed.data.source as CommissionSource,
      targetRole: parsed.data.targetRole as UserRole | undefined,
      description: parsed.data.description,
      isActive: parsed.data.isActive ?? true,
    },
  });

  await createAuditLog({
    actorId: user.id,
    action: "commission_rule.create",
    entityType: "CommissionRule",
    entityId: rule.id,
  });

  revalidatePath("/admin/commissions");
  return ok(rule);
}

export async function toggleCommissionRule(id: string, isActive: boolean) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  await prisma.commissionRule.update({ where: { id }, data: { isActive } });
  await createAuditLog({ actorId: user.id, action: isActive ? "commission.rule_on" : "commission.rule_off", entityType: "CommissionRule", entityId: id });
  revalidatePath("/admin/commissions");
  return ok(undefined);
}

export async function listPayouts(params?: { userId?: string; status?: PayoutStatus }) {
  const { error } = await requireActionPermission("analytics.read");
  if (error) return error;

  const payouts = await prisma.payout.findMany({
    where: {
      ...(params?.userId && { userId: params.userId }),
      ...(params?.status && { status: params.status }),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { username: true, displayName: true } } },
  });

  return ok(payouts);
}

export async function createPayout(userId: string, amountCents: number, method?: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  const pending = await prisma.commissionEntry.aggregate({
    where: { userId, status: "PENDING" },
    _sum: { amountCents: true },
  });

  const available = pending._sum.amountCents ?? 0;
  if (amountCents > available) return fail("Amount exceeds pending balance");

  const payout = await prisma.$transaction(async (tx) => {
    const p = await tx.payout.create({
      data: { userId, amountCents, method, status: "PROCESSING" },
    });

    const entries = await tx.commissionEntry.findMany({
      where: { userId, status: "PENDING" },
      orderBy: { createdAt: "asc" },
    });

    let remaining = amountCents;
    for (const entry of entries) {
      if (remaining <= 0) break;
      if (entry.amountCents <= remaining) {
        await tx.commissionEntry.update({
          where: { id: entry.id },
          data: { status: "PAID", payoutId: p.id },
        });
        remaining -= entry.amountCents;
      }
    }

    return p;
  });

  await createAuditLog({
    actorId: user.id,
    action: "payout.create",
    entityType: "Payout",
    entityId: payout.id,
    metadata: { userId, amountCents },
  });

  revalidatePath("/admin/commissions");
  return ok(payout);
}

export async function markPayoutPaid(id: string, reference?: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;

  await prisma.$transaction([
    prisma.payout.update({
      where: { id },
      data: { status: "PAID", paidAt: new Date(), reference },
    }),
    // Zugehörige Provisionen gelten erst mit der Auszahlung als bezahlt.
    prisma.commissionEntry.updateMany({ where: { payoutId: id }, data: { status: "PAID" } }),
  ]);

  await createAuditLog({
    actorId: user.id,
    action: "payout.paid",
    entityType: "Payout",
    entityId: id,
  });

  revalidatePath("/admin/commissions");
  return ok(undefined);
}

/**
 * „Auswahl freigeben“: offene Provisionen nach Empfänger bündeln und je Empfänger eine Auszahlung anlegen.
 * Berücksichtigt Rückbehalt (nur ältere Einträge) und Mindestbetrag (kleinere Summen bleiben offen).
 */
export async function approveCommissionEntries(entryIds: string[]) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const ids = Array.from(new Set(entryIds)).slice(0, 1000);
  if (ids.length === 0) return fail("Nothing selected");

  const { getPayoutRules, holdbackCutoff } = await import("@/lib/payout-rules");
  const rules = await getPayoutRules();
  const cutoff = holdbackCutoff(rules);

  const entries = await prisma.commissionEntry.findMany({
    where: { id: { in: ids }, status: "PENDING", payoutId: null },
    select: { id: true, userId: true, amountCents: true, createdAt: true },
  });
  const eligible = entries.filter((e) => e.createdAt <= cutoff);
  const byUser = new Map<string, { ids: string[]; total: number }>();
  for (const e of eligible) {
    const g = byUser.get(e.userId) ?? { ids: [], total: 0 };
    g.ids.push(e.id);
    g.total += e.amountCents;
    byUser.set(e.userId, g);
  }

  let payouts = 0;
  let belowMinimum = 0;
  for (const [userId, g] of Array.from(byUser.entries())) {
    if (g.total < rules.minPayoutCents) {
      belowMinimum++;
      continue;
    }
    const payout = await prisma.$transaction(async (tx) => {
      const p = await tx.payout.create({ data: { userId, amountCents: g.total, status: "PROCESSING" } });
      await tx.commissionEntry.updateMany({ where: { id: { in: g.ids }, status: "PENDING" }, data: { status: "PROCESSING", payoutId: p.id } });
      return p;
    });
    await createAuditLog({ actorId: user.id, action: "payout.create", entityType: "Payout", entityId: payout.id, metadata: { userId, amountCents: g.total, entries: g.ids.length } });
    payouts++;
  }

  revalidatePath("/admin/commissions");
  return ok({ payouts, held: entries.length - eligible.length, belowMinimum, skipped: ids.length - entries.length });
}

export async function saveAdminPayoutRules(input: { minPayoutCents: number; payoutDay: number; holdbackDays: number }) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  const rules = {
    minPayoutCents: Math.min(1_000_000, Math.max(0, Math.round(Number(input.minPayoutCents) || 0))),
    payoutDay: Math.min(28, Math.max(1, Math.round(Number(input.payoutDay) || 1))),
    holdbackDays: Math.min(180, Math.max(0, Math.round(Number(input.holdbackDays) || 0))),
  };
  const { savePayoutRules } = await import("@/lib/payout-rules");
  await savePayoutRules(rules);
  await createAuditLog({ actorId: user.id, action: "commission.payout_rules", entityType: "SiteSetting", entityId: "payout_rules", metadata: rules });
  revalidatePath("/admin/commissions");
  return ok(undefined);
}
