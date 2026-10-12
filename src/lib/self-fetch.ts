import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Anfrage an die eigene App. In Cloudflare Workers erreicht ein Worker seine eigene Domain nicht per
 * fetch – dort über das Service-Binding WORKER_SELF_REFERENCE (wrangler.jsonc). In Node normales fetch.
 */
export function selfFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  try {
    const env = getCloudflareContext().env as { WORKER_SELF_REFERENCE?: { fetch: typeof fetch } };
    if (env.WORKER_SELF_REFERENCE) return env.WORKER_SELF_REFERENCE.fetch(new Request(url, init));
  } catch {
    /* kein Cloudflare-Kontext (next dev / next start) */
  }
  return fetch(url, init);
}
