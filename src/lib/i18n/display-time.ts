// Ohne Pfad-Aliasse, damit die Node-Tests das Modul direkt laden können.

/**
 * Anzeige-Zeitzone für alle Datums-/Zeitausgaben. Fest statt „lokal“, damit Server (UTC) und
 * Browser denselben Text rendern – sonst Hydration-Fehler bei jeder Uhrzeit bzw. um Mitternacht.
 */
export const DISPLAY_TIME_ZONE = "Europe/Berlin";

export function withTimeZone(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions {
  return { timeZone: DISPLAY_TIME_ZONE, ...options };
}

/** DD.MM.YYYY in der Anzeige-Zeitzone. */
export function formatDayMonthYear(date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", withTimeZone({ day: "2-digit", month: "2-digit", year: "numeric" })).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    return `${get("day")}.${get("month")}.${get("year")}`;
  } catch {
    return date.toISOString().slice(0, 10).split("-").reverse().join(".");
  }
}
