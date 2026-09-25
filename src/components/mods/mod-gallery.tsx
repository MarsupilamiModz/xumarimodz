"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { ZoomIn } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string };

// Vollbild-Ansicht (Radix Dialog) erst beim ersten Klick laden.
const ModGalleryLightbox = dynamic(() => import("@/components/mods/mod-gallery-lightbox").then((m) => m.ModGalleryLightbox), { ssr: false });

export function ModGallery({ images, title, className }: { images: GalleryImage[]; title: string; className?: string }) {
  const t = useTranslations("mods");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (images.length === 0) return null;

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("gallery")}</h2>
        <span className="meta tabular-nums">{t("screenshots", { count: images.length })}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            aria-label={t("openScreenshot", { n: i + 1 })}
            onClick={() => {
              setActiveIndex(i);
              setLoaded(true);
              setOpen(true);
            }}
            className="group relative aspect-video overflow-hidden rounded-lg border border-line transition-colors duration-base hover:border-line-control"
          >
            <SafeImage src={img.url} alt={t("screenshotAlt", { title, n: i + 1 })} fill className="object-cover" sizes="(max-width: 640px) 50vw, 25vw" loading="lazy" />
            <span className="absolute inset-0 flex items-center justify-center bg-canvas/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden>
              <ZoomIn className="h-5 w-5 text-ink" />
            </span>
          </button>
        ))}
      </div>

      {loaded && <ModGalleryLightbox images={images} title={title} index={activeIndex} onIndexChange={setActiveIndex} open={open} onOpenChange={setOpen} />}
    </section>
  );
}
