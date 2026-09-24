import { getSiteSetting } from "@/lib/site-settings";

export type LauncherChangelogEntry = {
  version: string;
  date: string;
  notes: string[];
};

export type LauncherRelease = {
  version: string;
  fileUrl: string;
  fileSizeBytes: number;
  sha256: string;
  releasedAt: string;
  changelog: LauncherChangelogEntry[];
};

const SHA256_RE = /^[a-f0-9]{64}$/i;

function isRelease(value: Partial<LauncherRelease>): value is LauncherRelease {
  return (
    typeof value.version === "string" &&
    value.version.length > 0 &&
    typeof value.fileUrl === "string" &&
    value.fileUrl.startsWith("https://") &&
    typeof value.fileSizeBytes === "number" &&
    value.fileSizeBytes > 0 &&
    typeof value.sha256 === "string" &&
    SHA256_RE.test(value.sha256)
  );
}

/**
 * Aktuelle Installer-Version für die Download-Seite.
 * TODO(backend): Es gibt noch keine Quelle für Release-Daten. Die Seite liest die Einstellung
 * "launcher_release" (SiteSetting) – dafür fehlen ein Formular im ACP und die leere Route
 * /api/launcher/v1/updates/manifest, die der Launcher für Updates erwartet.
 * Ohne vollständige Daten liefert die Funktion null und die Seite zeigt einen leeren Zustand.
 */
export async function getLauncherRelease(): Promise<LauncherRelease | null> {
  const stored = await getSiteSetting<Partial<LauncherRelease>>("launcher_release", {});
  if (!isRelease(stored)) return null;
  return {
    ...stored,
    releasedAt: stored.releasedAt ?? "",
    changelog: Array.isArray(stored.changelog) ? stored.changelog : [],
  };
}
