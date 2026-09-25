import type { SupabaseClient } from "@supabase/supabase-js";

let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Supabase-Browser-Client erst bei Bedarf laden (eigener Chunk, ~56 KB gzip).
 * Header und Auth-Abgleich brauchen ihn nicht für das erste Rendern – so bleibt er aus dem Start-JS.
 */
export function getBrowserSupabase(): Promise<SupabaseClient> {
  clientPromise ??= import("@/lib/supabase/client").then((m) => m.createClient() as unknown as SupabaseClient);
  return clientPromise;
}
