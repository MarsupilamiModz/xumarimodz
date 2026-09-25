import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyUnsubscribeToken } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

function page(title: string, text: string, status = 200) {
  return new NextResponse(
    `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:system-ui;padding:40px;max-width:560px;margin:auto"><h1>${title}</h1><p>${text}</p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } }
  );
}

/** Abmelde-Link aus jeder Rundmail (signiert, ohne Anmeldung nutzbar). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const userId = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  if (!userId || !token || !verifyUnsubscribeToken(userId, token)) {
    return page("Link ungültig", "Dieser Abmelde-Link ist ungültig. Du kannst den Newsletter auch in deinen Kontoeinstellungen abbestellen.", 400);
  }
  await prisma.user.updateMany({ where: { id: userId }, data: { newsletterConsent: false, newsletterConsentAt: null } });
  return page("Abgemeldet", "Du erhältst keine Rundmails mehr. / You have been unsubscribed.");
}
