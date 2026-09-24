import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { recordHostingClick } from "@/lib/hosting/resolve";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  partnerId: z.string().min(1).max(64),
  modId: z.string().max(64).optional().nullable(),
  collectionId: z.string().max(64).optional().nullable(),
  gameId: z.string().max(64).optional().nullable(),
  context: z.enum(["MOD", "COLLECTION", "BANNER", "SIDEBAR", "CTA"]),
});

/** Klick auf einen Hosting-Partner zählen (Affiliate-Auswertung). */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`hosting-click:${ip}`, 30, 60_000).success) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const user = await getCurrentUser().catch(() => null);
  try {
    await recordHostingClick({
      ...parsed.data,
      userId: user?.id ?? null,
      countryCode: req.headers.get("cf-ipcountry"),
      referrer: req.headers.get("referer"),
    });
  } catch {
    // Unbekannter Partner o. Ä. – Klick nicht zählen, Nutzer nicht stören.
  }
  return NextResponse.json({ ok: true });
}
