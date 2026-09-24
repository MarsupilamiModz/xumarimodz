import { NextResponse } from "next/server";
import { getOwnerHealthMonitor } from "@/actions/admin/health-monitor";

export const dynamic = "force-dynamic";

/** Systemzustand für das Owner-Dashboard (Polling). Rechteprüfung in der Action (Owner). */
export async function GET() {
  const result = await getOwnerHealthMonitor();
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 403 });
  return NextResponse.json(result.data, { headers: { "Cache-Control": "no-store" } });
}
