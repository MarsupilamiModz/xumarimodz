/**
 * Einstieg für Cloudflare Workers: der von OpenNext erzeugte Next.js-Handler plus Cron Triggers.
 * Die Cron-Zeitpläne stehen in wrangler.jsonc (triggers.crons); jeder ruft die vorhandene
 * /api/cron/*-Route mit `Authorization: Bearer $CRON_SECRET` auf – ohne externen Cron-Dienst.
 */
// @ts-ignore `.open-next/worker.js` entsteht erst beim Build (opennextjs-cloudflare build)
import { default as handler } from "../.open-next/worker.js";

type Env = { CRON_SECRET?: string; NEXT_PUBLIC_APP_URL?: string };

/** Zeitplan (wie in wrangler.jsonc) → aufzurufende Routen. */
const CRON_ROUTES: Record<string, string[]> = {
  "*/5 * * * *": ["/api/cron/email"],
  "*/15 * * * *": ["/api/cron/health"],
};

export default {
  fetch: handler.fetch,

  async scheduled(event: { cron: string }, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }) {
    const paths = CRON_ROUTES[event.cron] ?? [];
    if (!env.CRON_SECRET) {
      console.error("[cron] CRON_SECRET fehlt – Cron-Routen antworten sonst mit 403");
      return;
    }
    const origin = env.NEXT_PUBLIC_APP_URL || "https://localhost";
    for (const path of paths) {
      const request = new Request(new URL(path, origin), {
        headers: { authorization: `Bearer ${env.CRON_SECRET}` },
      });
      // Direkt an den eigenen Handler, kein Umweg über das Netz.
      ctx.waitUntil(
        Promise.resolve(handler.fetch(request, env, ctx)).then(
          async (res: Response) => console.log(`[cron] ${path} → ${res.status} ${(await res.text()).slice(0, 200)}`),
          (err: unknown) => console.error(`[cron] ${path} fehlgeschlagen`, err)
        )
      );
    }
  },
};

// Durable Objects für Revalidierungs-Queue und Tag-Cache (open-next.config.ts)
// @ts-ignore `.open-next/worker.js` entsteht erst beim Build
export { DOQueueHandler, DOShardedTagCache } from "../.open-next/worker.js";
