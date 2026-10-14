import type { SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient> | null = null;
const readyCallbacks: ((client: SupabaseClient) => void)[] = [];

/**
 * Supabase-Browser-Client erst bei Bedarf laden (eigener Chunk, ~56 KB gzip).
 * Header und Auth-Abgleich brauchen ihn nicht für das erste Rendern – so bleibt er aus dem Start-JS.
 */
export function getBrowserSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import("@/lib/supabase/client").then((m) => m.createClient() as unknown as SupabaseClient);
    void clientPromise.then((client) => readyCallbacks.splice(0).forEach((cb) => cb(client)));
  }
  return clientPromise;
}

/** Ruft `cb` auf, sobald jemand den Client lädt – ohne ihn selbst zu laden (z. B. Login-Formular). */
export function onBrowserSupabaseReady(cb: (client: SupabaseClient) => void) {
  if (clientPromise) void clientPromise.then(cb);
  else readyCallbacks.push(cb);
}
