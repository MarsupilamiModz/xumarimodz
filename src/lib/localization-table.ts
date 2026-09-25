import "server-only";
import { readFileSync } from "fs";
import { join } from "path";
import { locales, type Locale } from "@/i18n/config";
import { deepMergeMessages } from "@/lib/i18n-utils";
import { MESSAGE_MODULES } from "@/lib/translation-missing-keys";
import { flattenMessageTree, getAllMessageOverrides } from "@/lib/message-overrides";

/** Übersetzungen einer Sprache aus den Dateien (ohne englischen Fallback), flach als „a.b.c“ → Text. */
function loadFileMessages(locale: Locale): Record<string, string> {
  let merged: Record<string, unknown> = {};
  for (const mod of MESSAGE_MODULES) {
    try {
      const raw = readFileSync(join(process.cwd(), "src", "messages", locale, `${mod}.json`), "utf8");
      merged = deepMergeMessages(merged, JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* Modul fehlt für diese Sprache – fällt auf Englisch zurück */
    }
  }
  return flattenMessageTree(merged);
}

export type LocaleProgress = { locale: Locale; translated: number; total: number; overrides: number };
export type LocalizationRow = { key: string; source: string; value: string; origin: "override" | "file" | "missing" };

async function loadAll() {
  const overrides = await getAllMessageOverrides();
  const english = { ...loadFileMessages("en"), ...flattenMessageTree((overrides.en ?? {}) as Record<string, unknown>) };
  return { overrides, english };
}

export async function getLocalizationOverview(): Promise<LocaleProgress[]> {
  const { overrides, english } = await loadAll();
  const keys = Object.keys(english);
  return locales.map((locale) => {
    if (locale === "en") return { locale, translated: keys.length, total: keys.length, overrides: Object.keys(flattenMessageTree((overrides.en ?? {}) as Record<string, unknown>)).length };
    const file = loadFileMessages(locale);
    const over = flattenMessageTree((overrides[locale] ?? {}) as Record<string, unknown>);
    const translated = keys.filter((k) => (over[k] ?? file[k] ?? "").trim() !== "").length;
    return { locale, translated, total: keys.length, overrides: Object.keys(over).length };
  });
}

export async function getLocalizationRows(params: { locale: Locale; q?: string; missingOnly?: boolean; page: number; limit?: number }) {
  const { overrides, english } = await loadAll();
  const file = loadFileMessages(params.locale);
  const over = flattenMessageTree((overrides[params.locale] ?? {}) as Record<string, unknown>);
  const q = params.q?.toLowerCase();
  const limit = params.limit ?? 50;

  const all: LocalizationRow[] = Object.keys(english)
    .sort()
    .map((key) => {
      const value = over[key] ?? file[key] ?? "";
      return { key, source: english[key]!, value, origin: over[key] !== undefined ? "override" : value.trim() ? "file" : "missing" };
    });
  const filtered = all.filter(
    (r) =>
      (!params.missingOnly || r.origin === "missing") &&
      (!q || r.key.toLowerCase().includes(q) || r.source.toLowerCase().includes(q) || r.value.toLowerCase().includes(q))
  );
  const pages = Math.max(1, Math.ceil(filtered.length / limit));
  const page = Math.min(params.page, pages);
  return { rows: filtered.slice((page - 1) * limit, page * limit), total: filtered.length, page, pages };
}

/** Alle Texte einer Sprache (Datei + ACP-Änderungen) als verschachteltes JSON für den Export. */
export async function exportLocaleMessages(locale: Locale): Promise<Record<string, unknown>> {
  const overrides = await getAllMessageOverrides();
  let merged: Record<string, unknown> = {};
  for (const mod of MESSAGE_MODULES) {
    try {
      const raw = readFileSync(join(process.cwd(), "src", "messages", locale, `${mod}.json`), "utf8");
      merged = deepMergeMessages(merged, JSON.parse(raw) as Record<string, unknown>);
    } catch {
      /* ignorieren */
    }
  }
  return deepMergeMessages(merged, (overrides[locale] ?? {}) as Record<string, unknown>);
}

export async function englishSource(key: string): Promise<string | undefined> {
  const { english } = await loadAll();
  return english[key];
}

/** ICU-Platzhalter wie {count} oder {name}, die in der Übersetzung erhalten bleiben müssen. */
export function placeholdersOf(text: string): string[] {
  return Array.from(new Set(Array.from(text.matchAll(/\{(\w+)[,}]/g), (m) => m[1]!))).sort();
}
