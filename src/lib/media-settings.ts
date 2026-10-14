import { prisma } from "@/lib/db";
import { DEFAULT_MEDIA_SETTINGS, MEDIA_SETTINGS_KEY, type MediaSettings } from "@/lib/media-settings-shared";

export * from "@/lib/media-settings-shared";

export async function getMediaSettings(): Promise<MediaSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: MEDIA_SETTINGS_KEY } });
  if (!row?.value || typeof row.value !== "object") return DEFAULT_MEDIA_SETTINGS;
  return { ...DEFAULT_MEDIA_SETTINGS, ...(row.value as Partial<MediaSettings>) };
}

export async function updateMediaSettings(settings: MediaSettings) {
  await prisma.siteSetting.upsert({
    where: { key: MEDIA_SETTINGS_KEY },
    create: { key: MEDIA_SETTINGS_KEY, value: settings },
    update: { value: settings },
  });
}
