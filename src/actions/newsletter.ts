"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { ok, requireActionUser } from "@/lib/action-utils";

/** Newsletter-Einwilligung im Konto an- oder abschalten (mit Zeitpunkt als Nachweis). */
export async function setNewsletterConsent(consent: boolean) {
  const { user, error } = await requireActionUser();
  if (error) return error;
  await prisma.user.update({
    where: { id: user.id },
    data: { newsletterConsent: consent, newsletterConsentAt: consent ? new Date() : null },
  });
  revalidatePath("/dashboard/settings");
  return ok(undefined);
}
