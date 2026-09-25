"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import { rateLimit } from "@/lib/rate-limit";
import { NEWSLETTER_AUDIENCES, countNewsletterRecipients, newsletterWhere, processCampaignQueue, unsubscribeUrl, type NewsletterAudience } from "@/lib/newsletter";
import { renderTemplate } from "@/lib/email/render";
import { sendEmail } from "@/lib/email/send";

const campaignSchema = z.object({
  audience: z.enum(NEWSLETTER_AUDIENCES),
  subject: z.string().trim().min(3).max(200),
  html: z.string().trim().min(10).max(100_000),
});

function footer(url: string) {
  return `<p style="margin-top:24px;font-size:12px">Du erhältst diese E-Mail, weil du den Newsletter abonniert hast. <a href="${url}">Abmelden</a> · You receive this email because you subscribed. <a href="${url}">Unsubscribe</a></p>`;
}

export async function countNewsletterRecipientsAdmin(audience: NewsletterAudience) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  if (!NEWSLETTER_AUDIENCES.includes(audience)) return fail("Invalid audience");
  return ok(await countNewsletterRecipients(audience));
}

/** „Test an mich senden“: geht nur an das eigene Konto, nicht in die Kampagnen-Statistik. */
export async function sendNewsletterTest(input: { subject: string; html: string }) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  if (!rateLimit(`newsletter-test:${user.id}`, 10, 3600_000).success) return fail("Too many test emails. Try again later.");
  const parsed = campaignSchema.omit({ audience: true }).safeParse(input);
  if (!parsed.success) return fail("Subject or text too short");
  const rendered = renderTemplate({ subject: `[Test] ${parsed.data.subject}`, html: parsed.data.html + footer(unsubscribeUrl(user.id)) }, { username: user.username });
  const sent = await sendEmail({ to: user.email, subject: rendered.subject, html: rendered.html, templateKey: "newsletter_test", userId: user.id });
  return sent ? ok(undefined) : fail("Email could not be sent – check the email settings");
}

/** Rundmail anlegen: je Empfänger ein Queue-Eintrag (EmailLog), Versand im Hintergrund und per Cron. */
export async function createNewsletterCampaign(input: z.infer<typeof campaignSchema>) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  if (!rateLimit(`newsletter-send:${user.id}`, 3, 3600_000).success) return fail("Too many campaigns. Try again later.");
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return fail("Please check audience, subject and text");

  const recipients = await prisma.user.findMany({
    where: newsletterWhere(parsed.data.audience),
    select: { id: true, email: true, username: true },
    take: 50_000,
  });
  if (recipients.length === 0) return fail("No recipients with newsletter consent in this group");

  const campaign = await prisma.emailCampaign.create({
    data: { subject: parsed.data.subject, html: parsed.data.html, audience: parsed.data.audience, recipientCount: recipients.length, createdById: user.id },
  });

  for (let i = 0; i < recipients.length; i += 500) {
    const batch = recipients.slice(i, i + 500);
    await prisma.emailLog.createMany({
      data: batch.map((r) => {
        const rendered = renderTemplate({ subject: parsed.data.subject, html: parsed.data.html + footer(unsubscribeUrl(r.id)) }, { username: r.username });
        return { to: r.email, subject: rendered.subject, html: rendered.html, templateKey: "newsletter", status: "PENDING" as const, userId: r.id, campaignId: campaign.id };
      }),
    });
  }

  await createAuditLog({
    actorId: user.id,
    action: "email.campaign_create",
    entityType: "SiteSetting",
    entityId: `campaign:${campaign.id}`,
    metadata: { audience: parsed.data.audience, recipients: recipients.length, subject: parsed.data.subject },
  });

  // Ersten Schub sofort anstoßen; den Rest erledigt der Cron (/api/cron/email).
  void processCampaignQueue(25).catch((err) => console.error("[newsletter]", err));
  revalidatePath("/admin/email");
  return ok({ id: campaign.id, recipients: recipients.length });
}

/** Queue manuell weiterarbeiten (falls kein Cron läuft). */
export async function processNewsletterQueueAdmin() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const result = await processCampaignQueue(50);
  revalidatePath("/admin/email");
  return ok(result);
}

export async function listNewsletterCampaigns() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const campaigns = await prisma.emailCampaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 30,
    select: { id: true, subject: true, audience: true, recipientCount: true, createdAt: true, createdBy: { select: { username: true } } },
  });
  const stats = campaigns.length
    ? await prisma.emailLog.groupBy({ by: ["campaignId", "status"], where: { campaignId: { in: campaigns.map((c) => c.id) } }, _count: { _all: true } })
    : [];
  return ok(
    campaigns.map((c) => {
      const s = stats.filter((x) => x.campaignId === c.id);
      const n = (status: string) => s.find((x) => x.status === status)?._count._all ?? 0;
      return { ...c, sent: n("SENT"), failed: n("FAILED"), pending: n("PENDING") };
    })
  );
}
