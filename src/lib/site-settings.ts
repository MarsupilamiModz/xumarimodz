import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { prismaErrorMessage } from "@/lib/errors";

const SITE_SETTINGS_TAG = "site-settings";

const readSiteSettingRow = unstable_cache(
  async (key: string) => {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  },
  ["site-setting"],
  { revalidate: 300, tags: [SITE_SETTINGS_TAG] }
);

export async function getSiteSetting<T>(key: string, fallback: T): Promise<T> {
  try {
    const value = await readSiteSettingRow(key);
    if (!value) return fallback;
    return { ...fallback, ...(value as object) } as T;
  } catch {
    return fallback;
  }
}

export async function setSiteSetting(key: string, value: unknown) {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
  revalidateTag(SITE_SETTINGS_TAG);
}

export async function setSiteSettingSafe(
  key: string,
  value: unknown
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await setSiteSetting(key, value);
    return { ok: true };
  } catch (err) {
    const { logPlatformError } = await import("@/lib/platform-log");
    void logPlatformError(`site-setting:${key}`, err);
    return { ok: false, error: prismaErrorMessage(err) };
  }
}
