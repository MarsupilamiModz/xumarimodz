/**
 * Erlaubt nur interne Pfade als Weiterleitungsziel (Schutz vor Open Redirect).
 * Abgelehnt: absolute URLs, protokollrelative "//host", "/\host", Steuerzeichen.
 * Browser- und serverseitig nutzbar (keine Abhängigkeiten).
 */
export function isSafeInternalPath(path: string | null | undefined): path is string {
  if (!path) return false;
  const value = path.trim();
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//") || value.startsWith("/\\")) return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  return true;
}

export function safeRedirectPath(path: string | null | undefined, fallback: string): string {
  return isSafeInternalPath(path) ? path.trim() : fallback;
}
