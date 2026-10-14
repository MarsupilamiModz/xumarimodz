"use client";

import { useTranslations } from "next-intl";
import { SafeImage } from "@/components/ui/safe-image";
import { EmptyState } from "@/components/ui/empty-state";
import { ImageOff, Play } from "lucide-react";
import { ModGallery } from "@/components/mods/mod-gallery";
import { YouTubeEmbed } from "@/components/mods/youtube-embed";
import type { ModMediaItem } from "@/lib/mod-media";
import { getGalleryImages, getYouTubeVideos } from "@/lib/mod-media";

type ModDetailMediaProps = {
  title: string;
  media: ModMediaItem[];
  featuredUrl: string | null;
  featuredIsVideo: boolean;
  featuredVideoId: string | null;
  excludeVideoId?: string | null;
};

export function ModDetailMedia({
  title,
  media,
  featuredUrl,
  featuredIsVideo,
  featuredVideoId,
  excludeVideoId,
}: ModDetailMediaProps) {
  const t = useTranslations("sharedUi.media");
  const galleryImages = getGalleryImages(media);
  const videos = getYouTubeVideos(media).filter(
    (v) => v.youtubeVideoId && v.youtubeVideoId !== excludeVideoId
  );

  return (
    <div className="space-y-8">
      <div className="relative aspect-video overflow-hidden rounded-lg border border-line bg-elevated">
        {featuredIsVideo && featuredVideoId ? (
          <YouTubeEmbed videoId={featuredVideoId} title={title} priority />
        ) : featuredUrl ? (
          <SafeImage
            src={featuredUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 66vw"
            priority
          />
        ) : (
          <EmptyState
            icon={ImageOff}
            title={t("noMediaTitle")}
            description={t("noMediaText")}
            className="h-full rounded-none border-0"
          />
        )}
        {featuredIsVideo && featuredUrl && !featuredVideoId && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="h-12 w-12 text-ink/80" aria-hidden />
          </div>
        )}
      </div>

      {galleryImages.length > 0 && <ModGallery images={galleryImages} title={title} />}

      {videos.length > 0 && (
        <section className="space-y-4">
          <h2 className="section-title">{t("videos")}</h2>
          <div className="space-y-4">
            {videos.map((v) =>
              v.youtubeVideoId ? (
                <YouTubeEmbed key={v.id} videoId={v.youtubeVideoId} title={title} />
              ) : null
            )}
          </div>
        </section>
      )}
    </div>
  );
}
