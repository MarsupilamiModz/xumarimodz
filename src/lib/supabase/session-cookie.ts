/**
 * „Angemeldet bleiben“ aus: Das Login setzt diesen Marker (selbst ein Sitzungs-Cookie).
 * Solange er existiert, werden die Supabase-Auth-Cookies ohne Max-Age/Expires geschrieben
 * und verschwinden beim Schließen des Browsers.
 */
export const SESSION_ONLY_COOKIE = "xm_session_only";

type Options = { maxAge?: number; expires?: Date } & Record<string, unknown>;

export function applySessionOnly<T extends Options | undefined>(options: T, sessionOnly: boolean): T {
  if (!sessionOnly || !options) return options;
  // Löschvorgänge (maxAge 0) unverändert lassen.
  if (typeof options.maxAge === "number" && options.maxAge <= 0) return options;
  const { maxAge: _maxAge, expires: _expires, ...rest } = options;
  return rest as T;
}
