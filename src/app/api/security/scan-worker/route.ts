import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { processScanQueue, scheduleRescanStaleFiles } from "@/lib/security/scan-worker";

export const dynamic = "force-dynamic";

function authorized(req: Request): boolean {
  const secret = process.env.SCAN_WORKER_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Cron-Endpunkt für die Virenscan-Warteschlange.
 * Nur aktiv, wenn SCAN_WORKER_SECRET gesetzt ist (Header: Authorization: Bearer <secret>).
 * Uploads stoßen den Scan zusätzlich direkt an; dieser Endpunkt räumt Rückstände ab.
 */
export async function POST(req: Request) {
  if (!process.env.SCAN_WORKER_SECRET) {
    return NextResponse.json({ error: "Scan worker endpoint disabled" }, { status: 503 });
  }
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const results = await processScanQueue(5);
  const rescheduled = await scheduleRescanStaleFiles().catch(() => null);
  return NextResponse.json({ processed: results, rescheduled });
}
