import type { Locale } from "@/i18n/config";

/**
 * Rohinhalt einer Nachrichtendatei (src/messages/<locale>/<mod>.json) ohne Fallback und Overrides.
 * Per Import statt fs: die Dateien werden mitgebündelt, das funktioniert auch in Cloudflare Workers.
 * Kopie, damit Aufrufer das gecachte Modul nicht verändern. Fehlt die Datei, kommt {} zurück.
 */
export async function readMessageFile(locale: Locale, mod: string): Promise<Record<string, unknown>> {
  try {
    const loaded = (await import(`./${locale}/${mod}.json`)) as { default: Record<string, unknown> };
    return structuredClone(loaded.default);
  } catch {
    return {};
  }
}
