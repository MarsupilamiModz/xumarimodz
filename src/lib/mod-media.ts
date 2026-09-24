// Browser-taugliche Medien-Helfer; Datenbank-Abgleich in lib/mod-media-sync.ts.
import type { ModMediaType } from "@prisma/client";
import { extractYouTubeId, youTubeThumbnailUrl } from "@/lib/youtube";
import { getMediaUrl } from "@/lib/media-url";
import { getScreenshotUrl as normalizeStoredMediaUrl } from "@/lib/media-url";
import { storageKey } from "@/lib/storage";

export type ModMediaItem = {
  id: string;
  mediaType: ModMediaType;
  imageUrl: string | null;
  videoUrl: string | null;
  youtubeVideoId: string | null;
  orderIndex: number;
  isFeatured: boolean;
};

export function modImageStoragePath(modSlug: string, filename: string) {
  return storageKey("mod-images", modSlug, filename);
}

export function getMediaDisplayUrl(item: Pick<ModMediaItem, "mediaType" | "imageUrl" | "youtubeVideoId">) {
  if (item.mediaType === "IMAGE" && item.imageUrl) return getMediaUrl(item.imageUrl);
  if (item.mediaType === "YOUTUBE" && item.youtubeVideoId) {
    return youTubeThumbnailUrl(item.youtubeVideoId, "hq");
  }
  return null;
}

export function getFeaturedMediaUrl(
  media: ModMediaItem[],
  legacyScreenshots?: { url: string; sortOrder: number }[]
) {
  const featured = media.find((m) => m.isFeatured && m.mediaType === "IMAGE" && m.imageUrl);
  if (featured?.imageUrl) return getMediaUrl(featured.imageUrl);

  const featuredYt = media.find((m) => m.isFeatured && m.mediaType === "YOUTUBE" && m.youtubeVideoId);
  if (featuredYt?.youtubeVideoId) return youTubeThumbnailUrl(featuredYt.youtubeVideoId, "hq");

  const firstImage = media.find((m) => m.mediaType === "IMAGE" && m.imageUrl);
  if (firstImage?.imageUrl) return getMediaUrl(firstImage.imageUrl);

  const firstYt = media.find((m) => m.mediaType === "YOUTUBE" && m.youtubeVideoId);
  if (firstYt?.youtubeVideoId) return youTubeThumbnailUrl(firstYt.youtubeVideoId, "hq");

  return getMediaUrl(
    legacyScreenshots?.sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null
  );
}

export function getGalleryImages(media: ModMediaItem[]) {
  return media
    .filter((m) => m.mediaType === "IMAGE" && m.imageUrl)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((m) => {
      const url = getMediaUrl(m.imageUrl!);
      return url ? { id: m.id, url } : null;
    })
    .filter((item): item is { id: string; url: string } => item !== null);
}

export function getYouTubeVideos(media: ModMediaItem[]) {
  return media
    .filter((m) => m.mediaType === "YOUTUBE" && m.youtubeVideoId)
    .sort((a, b) => a.orderIndex - b.orderIndex);
}


export function mapModMedia(
  media: Array<{
    id: string;
    mediaType: ModMediaType;
    imageUrl: string | null;
    videoUrl: string | null;
    youtubeVideoId: string | null;
    orderIndex: number;
    isFeatured: boolean;
  }>
): ModMediaItem[] {
  return media.map((m) => ({
    id: m.id,
    mediaType: m.mediaType,
    imageUrl: m.imageUrl ? normalizeStoredMediaUrl(m.imageUrl) ?? m.imageUrl : null,
    videoUrl: m.videoUrl,
    youtubeVideoId: m.youtubeVideoId,
    orderIndex: m.orderIndex,
    isFeatured: m.isFeatured,
  }));
}
