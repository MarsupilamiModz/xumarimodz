// Text-Helfer ohne Abhängigkeiten (auch im Browser nutzbar – kein zod).

/** Safely trim unknown form/JSON values — never throws on null. */
export function safeTrim(value: unknown): string {
  if (value == null) return "";
  if (typeof value !== "string") return String(value).trim();
  return value.trim();
}

export function optionalTrim(value: unknown): string | undefined {
  const trimmed = safeTrim(value);
  return trimmed || undefined;
}

export function nullableTrim(value: unknown): string | null {
  const trimmed = safeTrim(value);
  return trimmed || null;
}

export function safeFormString(formData: FormData, key: string): string {
  return safeTrim(formData.get(key));
}

export function safeFormOptional(formData: FormData, key: string): string | undefined {
  return optionalTrim(formData.get(key));
}

export function parseTags(value: unknown): string[] {
  const raw = safeTrim(value);
  if (!raw) return [];
  return Array.from(new Set(raw.split(",").map((t) => t.trim()).filter(Boolean)));
}

export function parseLines(value: unknown): string[] {
  const raw = safeTrim(value);
  if (!raw) return [];
  return raw.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** Stripe Price IDs: empty/null → null, never trim null. */
export function safeStripePriceId(value: unknown): string | null {
  const trimmed = safeTrim(value);
  if (!trimmed) return null;
  return trimmed;
}

/** Normalize text into a URL-safe slug. Never throws. */
export function slugify(text: string | null | undefined): string {
  const value = safeTrim(text);
  if (!value) return "";
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}
