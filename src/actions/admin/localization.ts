"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { locales, type Locale } from "@/i18n/config";
import { createAuditLog } from "@/lib/audit";
import { flattenMessageTree, importMessageOverrides, setMessageOverride } from "@/lib/message-overrides";
import { englishSource, placeholdersOf } from "@/lib/localization-table";
import { fail, ok, requireActionPermission } from "@/lib/action-utils";
import {
  approveTranslation,
  getPendingTranslations,
  processTranslationJob,
  translateModContent,
} from "@/lib/localization";

export async function getAdminTranslations() {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  return ok(await getPendingTranslations());
}

export async function runTranslationJob(jobId: string) {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const result = await processTranslationJob(jobId);
  if (!result) return fail("Translation failed");
  revalidatePath("/admin/localization");
  return ok(result);
}

export async function approveTranslationJob(jobId: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  await approveTranslation(jobId, user.id);
  revalidatePath("/admin/localization");
  return ok(undefined);
}

export async function queueModTranslations(modId: string, sourceLocale = "en") {
  const { error } = await requireActionPermission("settings.write");
  if (error) return error;
  const jobs = await translateModContent(modId, sourceLocale);
  revalidatePath("/admin/localization");
  return ok({ queued: jobs.length });
}

function isUiLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

function refreshMessages() {
  revalidateTag("message-overrides");
  revalidateTag("i18n-messages");
  revalidatePath("/admin/localization");
}

/** Speichert eine Übersetzung als ACP-Änderung (überschreibt den Dateitext, ohne Deploy). */
export async function saveUiTranslation(locale: string, key: string, value: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  if (!isUiLocale(locale)) return fail("Unknown language");
  const source = await englishSource(key);
  if (source === undefined) return fail("Unknown key");
  const text = value.trim();
  if (text.length > 5000) return fail("Text too long");
  // Platzhalter wie {count} müssen erhalten bleiben, sonst bricht die Anzeige.
  const missing = placeholdersOf(source).filter((p) => !placeholdersOf(text).includes(p));
  if (text && missing.length) return fail(`Missing placeholder: ${missing.map((p) => `{${p}}`).join(", ")}`);

  await setMessageOverride(locale, key, text);
  await createAuditLog({ actorId: user.id, action: "localization.update", entityType: "SiteSetting", entityId: `message:${locale}:${key}` });
  refreshMessages();
  return ok(undefined);
}

/** JSON-Import (verschachtelt oder flach „a.b.c“). Unbekannte Schlüssel und Nicht-Texte werden übersprungen. */
export async function importUiTranslations(locale: string, json: string) {
  const { user, error } = await requireActionPermission("settings.write");
  if (error) return error;
  if (!isUiLocale(locale)) return fail("Unknown language");
  if (json.length > 2_000_000) return fail("File too large");

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return fail("Invalid JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return fail("Invalid JSON");

  const flat = flattenMessageTree(parsed as Record<string, unknown>);
  const tree: Record<string, unknown> = {};
  let imported = 0;
  let skipped = 0;
  for (const [key, value] of Object.entries(flat)) {
    const source = await englishSource(key);
    const bad = source === undefined || value.length > 5000 || placeholdersOf(source).some((p) => !placeholdersOf(value).includes(p));
    if (bad) {
      skipped++;
      continue;
    }
    let cursor = tree;
    const parts = key.split(".");
    parts.slice(0, -1).forEach((part) => {
      cursor[part] = (cursor[part] as Record<string, unknown>) ?? {};
      cursor = cursor[part] as Record<string, unknown>;
    });
    cursor[parts[parts.length - 1]!] = value;
    imported++;
  }
  if (imported > 0) await importMessageOverrides(locale, tree, "merge");
  await createAuditLog({ actorId: user.id, action: "localization.import", entityType: "SiteSetting", entityId: `messages:${locale}`, metadata: { imported, skipped } });
  refreshMessages();
  return ok({ imported, skipped });
}
