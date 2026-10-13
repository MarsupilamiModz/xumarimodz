import { NextResponse } from "next/server";
import { getActiveAnnouncements } from "@/actions/admin/announcements";

export const dynamic = "force-dynamic";

/** Ankündigungen für den angemeldeten Betrachter (Zielgruppen); Seiten rendern nur die Gäste-Liste. */
export async function GET() {
  const items = await getActiveAnnouncements().catch(() => []);
  return NextResponse.json(
    items.map((a) => ({ id: a.id, title: a.title, content: a.content, link: a.link, kind: a.kind })),
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
