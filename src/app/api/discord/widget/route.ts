import { NextResponse } from "next/server";
import { normalizeDiscordServerId } from "@/lib/discord-validation";
import { rateLimit } from "@/lib/rate-limit";

/** Proxy für das öffentliche Discord-Widget (vermeidet CORS, 5 Minuten gecacht). */
export async function GET(req: Request) {
  const serverId = normalizeDiscordServerId(new URL(req.url).searchParams.get("serverId"));
  if (!serverId) return NextResponse.json({ error: "Invalid Discord server ID" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`discord-widget:${ip}`, 30, 60_000).success) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  try {
    const res = await fetch(`https://discord.com/api/guilds/${serverId}/widget.json`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: res.status === 403 ? "Discord widget is disabled for this server." : "Discord widget is not reachable." },
        { status: 502 }
      );
    }
    const data = await res.json();
    return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=300, s-maxage=300" } });
  } catch {
    return NextResponse.json({ error: "Could not reach Discord." }, { status: 502 });
  }
}
