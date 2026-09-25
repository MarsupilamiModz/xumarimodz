"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string };

/** Vollbild-Ansicht der Galerie; wird erst beim ersten Öffnen nachgeladen (Radix Dialog). */
export function ModGalleryLightbox({
  images,
  title,
  index,
  onIndexChange,
  open,
  onOpenChange,
}: {
  images: GalleryImage[];
  title: string;
  index: number;
  onIndexChange: (i: number) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("mods");
  const [zoomed, setZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const go = useCallback(
    (dir: -1 | 1) => {
      onIndexChange((index + dir + images.length) % images.length);
      setZoomed(false);
    },
    [index, images.length, onIndexChange]
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const active = images[index];
  if (!active) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-line bg-raised p-0">
        <DialogTitle className="sr-only">{t("screenshotAlt", { title, n: index + 1 })}</DialogTitle>
        <div className="relative">
          <div className="absolute right-3 top-3 z-20 flex gap-2">
            <Button size="icon" variant="ghost" className="h-9 w-9 bg-canvas/70" aria-pressed={zoomed} aria-label={t("zoom")} onClick={() => setZoomed((z) => !z)}>
              <Expand className="h-4 w-4" aria-hidden />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9 bg-canvas/70" aria-label={t("closeGallery")} onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </div>

          <div
            className="relative flex min-h-[50vh] items-center justify-center overflow-hidden bg-canvas p-4"
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStart === null) return;
              const diff = e.changedTouches[0].clientX - touchStart;
              if (Math.abs(diff) > 50) go(diff > 0 ? -1 : 1);
              setTouchStart(null);
            }}
          >
            <Button size="icon" variant="ghost" className="absolute left-2 z-10 h-10 w-10 bg-canvas/70" aria-label={t("prevImage")} onClick={() => go(-1)}>
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </Button>

            <button
              type="button"
              aria-label={t("zoom")}
              className={cn("relative max-h-[75vh] w-full max-w-4xl transition-transform duration-base", zoomed ? "scale-125 cursor-zoom-out" : "cursor-zoom-in")}
              onClick={() => setZoomed((z) => !z)}
            >
              <span className="relative block aspect-video w-full">
                <SafeImage src={active.url} alt={t("screenshotAlt", { title, n: index + 1 })} fill className="object-contain" sizes="90vw" priority />
              </span>
            </button>

            <Button size="icon" variant="ghost" className="absolute right-2 z-10 h-10 w-10 bg-canvas/70" aria-label={t("nextImage")} onClick={() => go(1)}>
              <ChevronRight className="h-5 w-5" aria-hidden />
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto border-t border-line bg-raised p-3">
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                aria-label={t("screenshotAlt", { title, n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
                onClick={() => {
                  onIndexChange(i);
                  setZoomed(false);
                }}
                className={cn(
                  "relative h-14 w-20 shrink-0 overflow-hidden rounded-md border transition-colors",
                  i === index ? "border-violet-bright" : "border-line opacity-70 hover:opacity-100"
                )}
              >
                <SafeImage src={img.url} alt="" fill className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>

          <p className="px-4 py-2 text-center text-xs tabular-nums text-ink-muted">
            {index + 1} / {images.length} · {t("lightboxHint")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
