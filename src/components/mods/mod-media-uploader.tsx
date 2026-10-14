"use client";

import {
  addModYouTubeVideo,
  deleteModMedia,
  reorderModMedia,
  setFeaturedModMedia,
} from "@/actions/mod-media";
import Image from "next/image";
import { SafeImage } from "@/components/ui/safe-image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  GripVertical,
  ImagePlus,
  Loader2,
  Play,
  Star,
  Trash2,
  Upload,
  Youtube,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { uploadViaApi } from "@/lib/upload-client";
import { formatUploadErrorMessage } from "@/lib/upload-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { compressImage, validateImageFile } from "@/lib/image-compress";
import { getMediaDisplayUrl, type ModMediaItem } from "@/lib/mod-media";
import { getMediaUrl } from "@/lib/media-url";
import { cn } from "@/lib/utils";
import type { MediaSettings } from "@/lib/media-settings";

type ModMediaUploaderProps = {
  modId: string;
  media: ModMediaItem[];
  settings: MediaSettings;
};

type PendingFile = {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

export function ModMediaUploader({ modId, media: initialMedia, settings }: ModMediaUploaderProps) {
  const router = useRouter();
  const appToast = useAppToast();
  const t = useTranslations("media");
  const ts = useTranslations("sharedTools.modMedia");
  const tc = useTranslations("common");
  const [pending, startTransition] = useTransition();
  const [media, setMedia] = useState(initialMedia);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    setMedia(initialMedia);
  }, [initialMedia]);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; mediaType: ModMediaItem["mediaType"] } | null>(null);

  const imageCount = media.filter((m) => m.mediaType === "IMAGE").length;
  const canAddMore = imageCount + pendingFiles.length < settings.maxScreenshots;
  const allowedTypeList = settings.allowedTypes.map((type) => type.split("/")[1]).join(", ");

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (arr.length === 0) return;

      const remaining = settings.maxScreenshots - imageCount - pendingFiles.length;
      const toProcess = arr.slice(0, remaining);

      const newPending: PendingFile[] = [];
      for (const file of toProcess) {
        const err = validateImageFile(file, settings.allowedTypes, settings.maxFileSizeMb);
        if (err) {
          // Prüfung bleibt in validateImageFile; hier nur die übersetzte Meldung.
          appToast.error(
            settings.allowedTypes.includes(file.type)
              ? ts("tooLarge", { name: file.name, size: settings.maxFileSizeMb })
              : ts("invalidType", { name: file.name, types: allowedTypeList })
          );
          continue;
        }
        try {
          const compressed = await compressImage(file, settings.imageQuality);
          newPending.push({
            id: `pending-${Date.now()}-${Math.random()}`,
            file: compressed,
            preview: URL.createObjectURL(compressed),
            progress: 0,
            status: "pending",
          });
        } catch {
          appToast.error(ts("processFailed", { name: file.name }));
        }
      }
      if (newPending.length) setPendingFiles((p) => [...p, ...newPending]);
    },
    [appToast, imageCount, pendingFiles.length, settings, ts, allowedTypeList]
  );

  const uploadPending = async () => {
    const toUpload = pendingFiles.filter((p) => p.status === "pending" || p.status === "error");
    if (toUpload.length === 0) return;

    for (const item of toUpload) {
      setPendingFiles((prev) =>
        prev.map((p) => (p.id === item.id ? { ...p, status: "uploading", progress: 0 } : p))
      );

      try {
        const result = await uploadViaApi({
          file: item.file,
          purpose: "mod-screenshot",
          modId,
          onProgress: (progress) => {
            setPendingFiles((prev) =>
              prev.map((p) => (p.id === item.id ? { ...p, progress } : p))
            );
          },
        });

        if (result.mediaId && result.url) {
          const imageUrl = getMediaUrl(result.url) ?? result.url;
          setMedia((prev) => {
            const hasFeatured = prev.some((m) => m.isFeatured && m.mediaType === "IMAGE");
            return [
              ...prev,
              {
                id: result.mediaId!,
                mediaType: "IMAGE" as const,
                imageUrl,
                videoUrl: null,
                youtubeVideoId: null,
                orderIndex: prev.length,
                isFeatured: !hasFeatured,
              },
            ];
          });
        }

        URL.revokeObjectURL(item.preview);
        setPendingFiles((prev) => prev.filter((p) => p.id !== item.id));
      } catch (err) {
        const message = formatUploadErrorMessage(err);
        setPendingFiles((prev) =>
          prev.map((p) =>
            p.id === item.id ? { ...p, status: "error", error: message, progress: 0 } : p
          )
        );
        appToast.error(message);
        return;
      }
    }

    appToast.uploaded();
    router.refresh();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files);
  };

  const handleReorder = (fromId: string, toId: string) => {
    const imageMedia = media.filter((m) => m.mediaType === "IMAGE");
    const fromIdx = imageMedia.findIndex((m) => m.id === fromId);
    const toIdx = imageMedia.findIndex((m) => m.id === toId);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;

    const reordered = [...imageMedia];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);

    const otherMedia = media.filter((m) => m.mediaType !== "IMAGE");
    const newOrder = [...reordered, ...otherMedia].map((m, i) => ({ ...m, orderIndex: i }));
    setMedia(newOrder);

    startTransition(async () => {
      const r = await reorderModMedia(
        modId,
        newOrder.map((m) => m.id)
      );
      if (r.success) router.refresh();
      else appToast.error(r.error);
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { id, mediaType } = deleteTarget;
    startTransition(async () => {
      const r = await deleteModMedia(id);
      if (r.success) {
        if (mediaType === "IMAGE") setMedia((m) => m.filter((x) => x.id !== id));
        setDeleteTarget(null);
        router.refresh();
      } else appToast.error(r.error);
    });
  };

  const imageMedia = media.filter((m) => m.mediaType === "IMAGE");
  const videoMedia = media.filter((m) => m.mediaType === "YOUTUBE");

  return (
    <div className="space-y-6">
      <SectionCard
        title={t("screenshots")}
        action={
          <span className="meta tabular-nums">
            {t("screenshotCount", { count: imageCount, max: settings.maxScreenshots })}
          </span>
        }
      >
        <div className="space-y-4">
          <div
            role="button"
            tabIndex={canAddMore ? 0 : -1}
            aria-disabled={!canAddMore}
            aria-label={t("dragDrop")}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => canAddMore && fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && canAddMore) {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className={cn(
              "relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors duration-fast",
              dragOver ? "border-violet-bright bg-violet-soft" : "border-line hover:border-line-control hover:bg-hover",
              !canAddMore && "pointer-events-none opacity-50"
            )}
          >
            <Upload className="mx-auto h-8 w-8 text-ink-muted" aria-hidden />
            <p className="mt-2 text-sm font-medium text-ink">{t("dragDrop")}</p>
            <p className="meta mt-1">{t("dragDropHint", { types: allowedTypeList, size: settings.maxFileSizeMb })}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept={settings.allowedTypes.join(",")}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) processFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {pendingFiles.length > 0 && (
            <div className="space-y-3">
              <p className="label-text">{t("previewBeforeUpload")}</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {pendingFiles.map((p) => (
                  <div key={p.id} className="relative aspect-video overflow-hidden rounded-lg border border-line bg-elevated">
                    <Image src={p.preview} alt="" fill className="object-cover" sizes="120px" unoptimized />
                    {p.status === "uploading" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-canvas/70" role="status">
                        <Loader2 className="h-5 w-5 animate-spin text-ink" aria-hidden />
                        <span className="sr-only">{t("uploading", { progress: p.progress })}</span>
                      </div>
                    )}
                    {p.status === "error" && (
                      <div className="absolute inset-0 flex items-center justify-center bg-danger-soft p-1">
                        <p className="text-[11px] text-danger">{p.error}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label={ts("removePending", { name: p.file.name })}
                      className="absolute right-1 top-1 rounded-md bg-canvas/80 p-1 text-ink-muted transition-colors duration-fast hover:text-danger"
                      onClick={() => {
                        URL.revokeObjectURL(p.preview);
                        setPendingFiles((prev) => prev.filter((x) => x.id !== p.id));
                      }}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                    </button>
                  </div>
                ))}
              </div>
              <Button
                size="sm"
                onClick={() => startTransition(() => void uploadPending())}
                disabled={pending || pendingFiles.every((p) => p.status === "uploading")}
              >
                {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
                {t("uploadScreenshots", { count: pendingFiles.length })}
              </Button>
            </div>
          )}

          {imageMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {imageMedia.map((item) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => setDragId(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => dragId && handleReorder(dragId, item.id)}
                  onDragEnd={() => setDragId(null)}
                  className={cn(
                    "group relative aspect-video cursor-grab overflow-hidden rounded-lg border border-line bg-elevated",
                    "transition-colors duration-fast hover:border-line-control active:cursor-grabbing",
                    item.isFeatured && "ring-2 ring-violet-bright"
                  )}
                >
                  <SafeImage src={item.imageUrl} alt="" fill className="object-cover" sizes="150px" />
                  <div className="absolute inset-0 flex items-start justify-between p-1.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                    <span className="rounded-md bg-canvas/80 p-1 text-ink-muted" title={ts("dragToReorder")}>
                      <GripVertical className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="flex gap-1">
                      {!item.isFeatured && (
                        <button
                          type="button"
                          title={t("setFeatured")}
                          aria-label={t("setFeatured")}
                          className="rounded-md bg-canvas/80 p-1 text-ink-muted transition-colors duration-fast hover:text-violet-bright"
                          onClick={() =>
                            startTransition(async () => {
                              const r = await setFeaturedModMedia(item.id);
                              if (r.success) {
                                appToast.saved(ts("featuredSet"));
                                router.refresh();
                              } else appToast.error(r.error);
                            })
                          }
                        >
                          <Star className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      )}
                      <button
                        type="button"
                        title={ts("deleteImage")}
                        aria-label={ts("deleteImage")}
                        className="rounded-md bg-canvas/80 p-1 text-ink-muted transition-colors duration-fast hover:text-danger"
                        onClick={() => setDeleteTarget({ id: item.id, mediaType: "IMAGE" })}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  {item.isFeatured && (
                    <StatusBadge
                      tone="neutral"
                      icon={Star}
                      label={t("featured")}
                      className="absolute bottom-1.5 left-1.5 bg-canvas/90 text-ink"
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title={t("youtubeVideo")}>
        <div className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const r = await addModYouTubeVideo(modId, new FormData(e.currentTarget));
                if (r.success) {
                  appToast.uploaded();
                  (e.target as HTMLFormElement).reset();
                  router.refresh();
                } else appToast.error(r.error);
              });
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor={`${modId}-youtube-url`} className="sr-only">
              {ts("youtubeUrlLabel")}
            </label>
            <Input
              id={`${modId}-youtube-url`}
              name="url"
              placeholder={t("youtubePlaceholder")}
              required
              className="flex-1"
            />
            <Button type="submit" variant="outline" disabled={pending}>
              <Youtube className="h-4 w-4" aria-hidden />
              {t("addVideo")}
            </Button>
          </form>

          {videoMedia.length > 0 && (
            <ul className="space-y-2">
              {videoMedia.map((v) => {
                const thumb = getMediaDisplayUrl(v);
                return (
                  <li key={v.id} className="flex items-center gap-3 rounded-lg border border-line p-2">
                    {thumb && (
                      <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-elevated">
                        <SafeImage src={thumb} alt="" fill className="object-cover" sizes="80px" />
                        <Play className="absolute inset-0 m-auto h-4 w-4 text-ink" aria-hidden />
                      </div>
                    )}
                    <p className="flex-1 truncate text-xs text-ink-muted">{v.videoUrl}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={ts("deleteVideo")}
                      className="hover:text-danger"
                      onClick={() => setDeleteTarget({ id: v.id, mediaType: "YOUTUBE" })}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </SectionCard>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={deleteTarget?.mediaType === "YOUTUBE" ? ts("deleteVideoTitle") : ts("deleteImageTitle")}
        description={ts("deleteText")}
        confirmLabel={tc("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
