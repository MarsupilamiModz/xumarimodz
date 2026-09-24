import { NextResponse } from "next/server";
import { getSoundStreamInfo } from "@/actions/sounds";

/**
 * Audio-Vorschau: leitet auf eine kurz gültige, signierte Speicher-URL weiter.
 * Freigabe- und Malware-Prüfung erfolgen in getSoundStreamInfo; der Speicher
 * beantwortet Range-Anfragen (Spulen) selbst.
 */
export async function GET(_req: Request, { params }: { params: { modId: string } }) {
  const info = await getSoundStreamInfo(params.modId);
  if (!info.success) return NextResponse.json({ error: info.error }, { status: 404 });

  const res = NextResponse.redirect(info.data.streamUrl, 302);
  res.headers.set("Cache-Control", "private, max-age=300");
  return res;
}
