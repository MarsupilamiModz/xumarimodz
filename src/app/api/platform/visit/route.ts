import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";

const COOKIE = "xm_visit_day";

/**
 * Tageszähler für Seitenaufrufe und Besucher (Owner-Analytics).
 * Besucher = erster Aufruf des Tages je Browser (Cookie mit Datum, keine personenbezogenen Daten).
 */
export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`platform-visit:${ip}`, 60, 60_000).success) {
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const cookie = req.headers.get("cookie") ?? "";
  const isNewVisitor = !cookie.includes(`${COOKIE}=${today}`);

  try {
    await prisma.platformDailyMetric.upsert({
      where: { day: new Date(today) },
      create: { day: new Date(today), pageViews: 1, uniqueVisitors: isNewVisitor ? 1 : 0 },
      update: {
        pageViews: { increment: 1 },
        ...(isNewVisitor ? { uniqueVisitors: { increment: 1 } } : {}),
      },
    });
  } catch {
    // Analytics dürfen die Seite nie stören.
  }

  const res = NextResponse.json({ ok: true });
  if (isNewVisitor) {
    res.cookies.set(COOKIE, today, { maxAge: 60 * 60 * 24, httpOnly: true, sameSite: "lax", path: "/" });
  }
  return res;
}
