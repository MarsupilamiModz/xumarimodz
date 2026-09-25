import { NextResponse } from "next/server";
import { recordServiceChecks, runServiceChecks } from "@/lib/system-monitor";

export const dynamic = "force-dynamic";

/**
 * Für einen externen Cron (z. B. alle 5 Minuten): prüft alle Dienste und speichert die Verfügbarkeit.
 * Aufruf mit Header „Authorization: Bearer $CRON_SECRET“.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const checks = await runServiceChecks();
  await recordServiceChecks(checks, true);
  const down = checks.filter((c) => c.state === "down").map((c) => c.key);
  return NextResponse.json({ ok: down.length === 0, down }, { headers: { "Cache-Control": "no-store" } });
}
