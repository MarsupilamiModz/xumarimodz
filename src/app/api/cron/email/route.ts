import { NextResponse } from "next/server";
import { processCampaignQueue } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

/** Für einen externen Cron (z. B. jede Minute): arbeitet die Rundmail-Queue ab. Header „Authorization: Bearer $CRON_SECRET“. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const result = await processCampaignQueue(100);
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
