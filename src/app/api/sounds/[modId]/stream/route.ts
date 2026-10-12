import { NextResponse } from "next/server";
import { recordSoundPlay } from "@/actions/sounds";
import { hashClientIp } from "@/actions/security";
import { rateLimit } from "@/lib/rate-limit";

/** Zählt eine Wiedergabe (einmal pro IP und Sound je Minute). */
export async function POST(req: Request, props: { params: Promise<{ modId: string }> }) {
  const params = await props.params;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limit = rateLimit(`sound-play:${params.modId}:${ip}`, 1, 60_000);
  if (!limit.success) return NextResponse.json({ ok: true, counted: false });

  const ipHash = await hashClientIp(ip);
  await recordSoundPlay(params.modId, ipHash).catch(() => null);
  return NextResponse.json({ ok: true, counted: true });
}
