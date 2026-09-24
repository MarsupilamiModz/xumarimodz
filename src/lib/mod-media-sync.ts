import "server-only";
import type { ModMediaType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { extractYouTubeId, youTubeThumbnailUrl } from "@/lib/youtube";
import { normalizeStoredMediaUrl } from "@/lib/media-files";

export async function ensureModMediaSynced(modId: string) {
  try {
    const existing = await prisma.modMedia.count({ where: { modId } });
    if (existing > 0) return;
  } catch {
    return;
  }

  try {
    const mod = await prisma.mod.findUnique({
      where: { id: modId },
      include: {
        screenshots: { orderBy: { sortOrder: "asc" } },
        videos: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!mod) return;

    const items: {
      modId: string;
      mediaType: ModMediaType;
      imageUrl?: string;
      videoUrl?: string;
      youtubeVideoId?: string;
      orderIndex: number;
      isFeatured: boolean;
    }[] = [];

    mod.screenshots.forEach((s, i) => {
      const url = normalizeStoredMediaUrl(s.url) ?? s.url;
      items.push({
        modId,
        mediaType: "IMAGE",
        imageUrl: url,
        orderIndex: i,
        isFeatured: i === 0,
      });
    });

    mod.videos.forEach((v, i) => {
      const youtubeVideoId = extractYouTubeId(v.url);
      items.push({
        modId,
        mediaType: "YOUTUBE",
        videoUrl: v.url,
        youtubeVideoId: youtubeVideoId ?? undefined,
        orderIndex: mod.screenshots.length + i,
        isFeatured: false,
      });
    });

    if (items.length > 0) {
      await prisma.modMedia.createMany({ data: items });
    }
  } catch {
    // mod_media table may not exist yet — run prisma db push
  }
}
