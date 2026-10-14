import { after } from "next/server";

/**
 * Für bewusst nicht abgewartete Arbeit (E-Mails, Logs, Benachrichtigungen). Startet sofort wie bisher
 * `void task`, hält den Request aber offen, bis sie fertig ist: In Cloudflare Workers würde sie nach
 * der Antwort sonst abgebrochen (after → waitUntil). Fehler werden geloggt statt unbehandelt.
 */
export function runAfterResponse(task: Promise<unknown>): void {
  const safe = task.catch((err) => console.error("[after-response]", err));
  try {
    after(safe);
  } catch {
    /* außerhalb eines Requests (z. B. in unstable_cache) – läuft einfach weiter */
  }
}
