import { NextResponse } from "next/server";
import { getSecurityPolicy, ipBanListToken } from "@/lib/security-policy";

export const dynamic = "force-dynamic";

/** Interne Sperrliste (nur Hashes) für die Middleware; geschützt über einen abgeleiteten Token. */
export async function GET(req: Request) {
  if (req.headers.get("x-internal-token") !== ipBanListToken()) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const policy = await getSecurityPolicy();
  return NextResponse.json(
    { hashes: policy.ipBans.map((b) => b.hash) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
