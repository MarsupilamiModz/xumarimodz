"use client";

import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, RotateCw, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SafeImage } from "@/components/ui/safe-image";
import { getCroppedImageBlob } from "@/lib/crop-image";
import { cn } from "@/lib/utils";

// Beschriftung kommt aus sharedTools.categoryCrop.preset.<Schlüssel>.
const ASPECT_PRESETS = {
  square: { aspect: 1, output: { width: 640, height: 640 } },
  portrait: { aspect: 3 / 4, output: { width: 480, height: 640 } },
  landscape: { aspect: 16 / 9, output: { width: 640, height: 360 } },
} as const;

type AspectPreset = keyof typeof ASPECT_PRESETS;

type CategoryImageCropUploadProps = {
  label: string;
  categoryName?: string;
  modCount?: number;
  onCropped: (file: File) => Promise<void>;
  className?: string;
  disabled?: boolean;
};

export function CategoryImageCropUpload({
  label,
  categoryName,
  modCount = 0,
  onCropped,
  className,
  disabled,
}: CategoryImageCropUploadProps) {
  const t = useTranslations("sharedTools.categoryCrop");
  const tc = useTranslations("common");
  const [open, setOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [preset, setPreset] = useState<AspectPreset>("square");

  const aspectConfig = ASPECT_PRESETS[preset];

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedArea(pixels);
  }, []);

  const updatePreview = useCallback(
    async (src: string, area: Area, currentPreset: AspectPreset, rot: number) => {
      try {
        const blob = await getCroppedImageBlob(
          src,
          area,
          ASPECT_PRESETS[currentPreset].output,
          "image/webp",
          rot
        );
        const url = URL.createObjectURL(blob);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } catch {
        setPreviewUrl(null);
      }
    },
    []
  );

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setRotation(0);
      setPreset("square");
      setPreviewUrl(null);
      setOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (!imageSrc || !croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedImageBlob(
        imageSrc,
        croppedArea,
        aspectConfig.output,
        "image/webp",
        rotation
      );
      const file = new File([blob], "category.webp", { type: "image/webp" });
      await onCropped(file);
      setOpen(false);
      setImageSrc(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    } finally {
      setSaving(false);
    }
  };

  const previewCard = useMemo(
    () => (
      <div className="space-y-2 rounded-lg border border-line bg-canvas p-3">
        <p className="label-text">{t("cardPreview")}</p>
        <div className="flex flex-col items-center gap-2 rounded-lg border border-line bg-raised p-3">
          <div className="relative h-32 w-32 overflow-hidden rounded-lg border border-line bg-elevated">
            {previewUrl ? (
              <SafeImage src={previewUrl} alt="" fill className="object-cover" sizes="128px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
                {t("preview")}
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-ink">{categoryName ?? t("categoryFallback")}</p>
            <p className="meta tabular-nums">{t("modCount", { count: modCount })}</p>
          </div>
        </div>
      </div>
    ),
    [categoryName, modCount, previewUrl, t]
  );

  return (
    <>
      <label className={cn("inline-block", className)}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled || saving}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" disabled={disabled || saving} asChild>
          <span>{label}</span>
        </Button>
      </label>

      <Dialog open={open} onOpenChange={(v) => !saving && setOpen(v)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-[1fr_220px]">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("aspect")}>
                {(Object.keys(ASPECT_PRESETS) as AspectPreset[]).map((key) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={preset === key ? "default" : "outline"}
                    aria-pressed={preset === key}
                    onClick={() => setPreset(key)}
                  >
                    {t(`preset.${key}`)}
                  </Button>
                ))}
              </div>
              <div className="relative h-72 w-full overflow-hidden rounded-lg border border-line bg-canvas">
                {imageSrc && (
                  <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={aspectConfig.aspect}
                    cropShape="rect"
                    showGrid
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={(a, pixels) => {
                      onCropComplete(a, pixels);
                      void updatePreview(imageSrc, pixels, preset, rotation);
                    }}
                  />
                )}
              </div>
              <div className="flex items-center gap-3 px-1">
                <ZoomIn className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  aria-label={t("zoom")}
                  className="w-full accent-violet"
                />
              </div>
              <div className="flex items-center gap-3 px-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                >
                  <RotateCw className="h-4 w-4" aria-hidden />
                  {t("rotate")}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  aria-label={t("rotation")}
                  className="w-full accent-violet"
                />
              </div>
            </div>
            {previewCard}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              {tc("cancel")}
            </Button>
            <Button onClick={() => void save()} disabled={saving || !croppedArea}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
