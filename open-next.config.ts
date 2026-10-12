import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
import { withRegionalCache } from "@opennextjs/cloudflare/overrides/incremental-cache/regional-cache";
import doShardedTagCache from "@opennextjs/cloudflare/overrides/tag-cache/do-sharded-tag-cache";
import doQueue from "@opennextjs/cloudflare/overrides/queue/do-queue";

/**
 * Cloudflare-Build (OpenNext). ISR-Seiten und unstable_cache liegen in R2, davor ein regionaler Cache
 * (Cache API) für schnelle Treffer. revalidateTag/revalidatePath laufen über einen Durable-Object-Tag-
 * Cache (braucht keine Datenbank-ID), Hintergrund-Revalidierung über eine Durable-Object-Queue.
 * Bindings: wrangler.jsonc.
 */
export default defineCloudflareConfig({
  incrementalCache: withRegionalCache(r2IncrementalCache, { mode: "long-lived" }),
  tagCache: doShardedTagCache({ baseShardSize: 4 }),
  queue: doQueue,
});
