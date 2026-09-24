// Reine Pfad-Helfer für Speicher-Keys (browser-tauglich, ohne Datenbank).
import { STORAGE, storageKey } from "@/lib/storage";

export function normalizeStoragePath(value: string): string {
  const trimmed = value.trim().replace(/^\/+/, "");
  if (trimmed.startsWith(`${STORAGE.prefix}/`)) return trimmed;
  if (trimmed.startsWith("uploads/")) return storageKey(trimmed);
  return storageKey(trimmed);
}

export function isLikelyStorageKey(value: string): boolean {
  const v = value.trim();
  if (v.startsWith("http://") || v.startsWith("https://")) return false;
  if (v.startsWith("/api/assets/")) return false;
  return true;
}

export function extractStoragePathFromUrl(url: string): string | null {
  try {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/api/assets/")) {
        return decodeURIComponent(parsed.pathname.replace(/^\/api\/assets\//, ""));
      }
      const path = parsed.pathname.replace(/^\//, "");
      if (path.startsWith(`${STORAGE.prefix}/`)) return path;
      if (
        path.startsWith("creator-avatars/") ||
        path.startsWith("creator-banners/") ||
        path.startsWith("avatars/") ||
        path.startsWith("mod-images/") ||
        path.startsWith("screenshots/")
      ) {
        return storageKey(path);
      }
      return null;
    }
    if (url.startsWith("/api/assets/")) {
      return decodeURIComponent(url.replace(/^\/api\/assets\//, ""));
    }
    return normalizeStoragePath(url);
  } catch {
    return null;
  }
}
