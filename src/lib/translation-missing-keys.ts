import { locales, type Locale } from "@/i18n/config";
import { getSiteSetting, setSiteSetting } from "@/lib/site-settings";
import { auditTranslationKeys } from "@/lib/i18n-audit";
import { readMessageFile } from "@/messages/files";

const MESSAGE_MODULES = [
  "common",
  "landing",
  "catalog",
  "premium",
  "auth",
  "dashboard",
  "admin",
  "designer",
  "creator",
  "support",
  "licenses",
  "toast",
  "ecosystem",
  "media",
  "shop",
  "security",
  "sounds",
  "email",
  "chat",
  "search",
] as const;

const MISSING_LOG_KEY = "translation_missing_log";

type MissingLog = Record<string, { count: number; lastSeen: string; samples: string[] }>;

/**
 * Schreibt in die Quelldateien – nur in der lokalen Entwicklung sinnvoll (der Build bündelt die Texte;
 * in Cloudflare Workers gibt es kein Projektverzeichnis). Für Live-Änderungen: ACP → Lokalisierung.
 */
async function writeModule(locale: Locale, mod: string, data: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Nachrichtendateien lassen sich nur in der lokalen Entwicklung schreiben (ACP → Lokalisierung nutzen).");
  }
  const { mkdirSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const dir = join(process.cwd(), "src", "messages", locale);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${mod}.json`), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getByPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (!acc || typeof acc !== "object" || Array.isArray(acc)) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

function setByPath(obj: Record<string, unknown>, path: string, value: string) {
  const parts = path.split(".").filter(Boolean);
  let cursor = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i]!;
    const next = cursor[key];
    if (!next || typeof next !== "object" || Array.isArray(next)) {
      cursor[key] = {};
    }
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]!] = value;
}

export async function logMissingTranslationKey(key: string) {
  const store = await getSiteSetting<MissingLog>(MISSING_LOG_KEY, {});
  const row = store[key] ?? { count: 0, lastSeen: "", samples: [] };
  row.count += 1;
  row.lastSeen = new Date().toISOString();
  if (!row.samples.includes(key)) row.samples = [key, ...row.samples].slice(0, 5);
  store[key] = row;
  await setSiteSetting(MISSING_LOG_KEY, store);
}

export async function getMissingTranslationReport() {
  const audit = await auditTranslationKeys("en");
  const runtimeLog = await getSiteSetting<MissingLog>(MISSING_LOG_KEY, {});
  const totalMissing = audit.locales.reduce((n, l) => n + l.missing.length, 0);
  return {
    uiMissingKeys: totalMissing,
    locales: audit.locales.map((l) => ({ locale: l.locale, missing: l.missing.length })),
    runtimeMissing: Object.keys(runtimeLog).length,
    topRuntimeKeys: Object.entries(runtimeLog)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 20)
      .map(([key, meta]) => ({ key, ...meta })),
  };
}

/** Copy missing UI keys from EN into other locale JSON files (English placeholder until translated). */
export async function syncMissingUiKeysFromEnglish() {
  const reference = await auditTranslationKeys("en");
  let added = 0;

  for (const localeResult of reference.locales) {
    const locale = localeResult.locale;
    if (!localeResult.missing.length) continue;

    const byModule: Record<string, string[]> = {};
    for (const key of localeResult.missing) {
      const mod = key.split(".")[0] ?? "common";
      if (!(MESSAGE_MODULES as readonly string[]).includes(mod)) continue;
      byModule[mod] = byModule[mod] ?? [];
      byModule[mod].push(key);
    }

    for (const [mod, keys] of Object.entries(byModule)) {
      const enData = await readMessageFile("en", mod);
      const localeData = await readMessageFile(locale, mod);
      for (const key of keys) {
        const enVal = getByPath(enData, key);
        if (typeof enVal === "string") {
          setByPath(localeData, key, enVal);
          added++;
        }
      }
      await writeModule(locale, mod, localeData);
    }
  }

  return { added, locales: locales.filter((l) => l !== "en") };
}

export { MESSAGE_MODULES };
