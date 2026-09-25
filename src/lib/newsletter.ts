import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/send";
import { getAppUrl } from "@/lib/app-url";

export const NEWSLETTER_AUDIENCES = ["all", "premium", "free", "creators", "partners"] as const;
export type NewsletterAudience = (typeof NEWSLETTER_AUDIENCES)[number];

/** Empfänger: nur mit Newsletter-Einwilligung, nicht gesperrt, nicht gelöscht. */
export function newsletterWhere(audience: NewsletterAudience): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { newsletterConsent: true, isBanned: false, deletedAt: null };
  const premium: Prisma.UserWhereInput = {
    OR: [
      { role: "PREMIUM" },
      { userMembership: { is: { status: "ACTIVE", membershipType: { not: "FREE" } } } },
    ],
  };
  switch (audience) {
    case "premium":
      return { ...base, ...premium };
    case "free":
      return { ...base, NOT: premium };
    case "creators":
      return { ...base, role: "CREATOR" };
    case "partners":
      return { ...base, role: "PARTNER" };
    default:
      return base;
  }
}

export async function countNewsletterRecipients(audience: NewsletterAudience) {
  return prisma.user.count({ where: newsletterWhere(audience) });
}

function secret() {
  return process.env.NEWSLETTER_SECRET ?? process.env.DOWNLOAD_SIGNING_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "xumari-newsletter";
}

export function unsubscribeToken(userId: string) {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("hex").slice(0, 32);
}

export function verifyUnsubscribeToken(userId: string, token: string) {
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string) {
  return `${getAppUrl()}/api/newsletter/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`;
}

const MAX_ATTEMPTS = 5;

/**
 * Arbeitet die Rundmail-Queue ab (EmailLog mit campaignId, Status PENDING oder FAILED).
 * Wird nach dem Anlegen einer Kampagne und per Cron (/api/cron/email) aufgerufen.
 */
export async function processCampaignQueue(limit = 50) {
  const jobs = await prisma.emailLog.findMany({
    where: { campaignId: { not: null }, status: { in: ["PENDING", "FAILED"] }, attempts: { lt: MAX_ATTEMPTS } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, to: true, subject: true, html: true, userId: true },
  });
  let sent = 0;
  for (const job of jobs) {
    if (!job.html) continue;
    // Einwilligung kurz vor dem Versand erneut prüfen (Abmeldung zwischenzeitlich).
    if (job.userId) {
      const user = await prisma.user.findUnique({ where: { id: job.userId }, select: { newsletterConsent: true } });
      if (!user?.newsletterConsent) {
        await prisma.emailLog.update({ where: { id: job.id }, data: { status: "FAILED", error: "Newsletter abbestellt", attempts: MAX_ATTEMPTS } });
        continue;
      }
    }
    const ok = await sendEmail({ to: job.to, subject: job.subject, html: job.html, templateKey: "newsletter", userId: job.userId ?? undefined, existingLogId: job.id });
    if (ok) sent++;
  }
  return { processed: jobs.length, sent };
}
