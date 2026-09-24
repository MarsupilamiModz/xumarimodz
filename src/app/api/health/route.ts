import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Öffentlicher Health-Check für Monitoring/Load-Balancer. Verrät keine Details. */
export async function GET() {
  let database = true;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    database = false;
  }
  return NextResponse.json(
    { status: database ? "ok" : "degraded", time: new Date().toISOString() },
    { status: database ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
