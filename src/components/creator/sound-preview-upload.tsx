"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Loader2 } from "lucide-react";
import { useR2MultipartUpload } from "@/hooks/use-r2-multipart-upload";
import { attachSoundPreviewFromSession, attachSoundCoverFromSession } from "@/actions/sounds";
import { generateWaveformPeaks, isAudioFileName, formatDuration } from "@/lib/sound";

type Props = {
  modId: string;
  hasPreview?: boolean;
  hasCover?: boolean;
};

function readAudioDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.src = url;
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      const d = audio.duration;
      resolve(Number.isFinite(d) && d > 0 ? Math.floor(d) : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
  });
}

export function SoundPreviewUpload({ modId, hasPreview, hasCover }: Props) {
  const t = useTranslations("common.cx.soundPreview");
  const ts = useTranslations("sharedTools.soundPreview");
  const uid = useId();
  const previewRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const { upload, progress, uploading, error: uploadError } = useR2MultipartUpload();

  async function handlePreview(file: File) {
    setLocalError(null);
    try {
      if (!isAudioFileName(file.name)) {
        toast({ title: "toast.invalidAudio", description: "toast.audioFormats", variant: "destructive" });
        return;
      }

      const [durationSeconds, arrayBuffer] = await Promise.all([
        readAudioDuration(file),
        file.arrayBuffer(),
      ]);

      let waveformPeaks: number[] | undefined;
      try {
        waveformPeaks = await generateWaveformPeaks(arrayBuffer);
      } catch {
        waveformPeaks = undefined;
      }

      const result = await upload({ purpose: "sound-preview", file, modId });
      if (!result.sessionId) throw new Error(ts("sessionMissing"));

      startTransition(async () => {
        const r = await attachSoundPreviewFromSession(modId, result.sessionId, {
          ...(durationSeconds != null ? { durationSeconds } : {}),
          waveformPeaks,
        });
        if (r.success) {
          toast({
            title: t("previewUploaded"),
            description: durationSeconds ? formatDuration(durationSeconds) : undefined,
          });
          router.refresh();
        } else {
          setLocalError(r.error);
          toast({ title: r.error, variant: "destructive" });
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("previewUploadFailed");
      setLocalError(message);
      toast({ title: message, variant: "destructive" });
    }
  }

  async function handleCover(file: File) {
    setLocalError(null);
    try {
      const result = await upload({ purpose: "sound-cover", file, modId });
      if (!result.sessionId) throw new Error(ts("sessionMissing"));

      startTransition(async () => {
        const r = await attachSoundCoverFromSession(modId, result.sessionId);
        if (r.success) {
          toast({ title: "toast.coverUploaded" });
          router.refresh();
        } else {
          setLocalError(r.error);
          toast({ title: r.error, variant: "destructive" });
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("coverUploadFailed");
      setLocalError(message);
      toast({ title: message, variant: "destructive" });
    }
  }

  const busy = uploading || pending;

  return (
    <SectionCard title={t("title")}>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-preview`} className="label-text">{t("previewAudioLabel")}</label>
          <Input
            id={`${uid}-preview`}
            ref={previewRef}
            type="file"
            accept=".mp3,.wav,.ogg,.flac,.m4a,audio/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handlePreview(f);
              e.target.value = "";
            }}
          />
          {hasPreview && <StatusBadge tone="success" label={t("previewConfigured")} />}
        </div>

        <div className="space-y-1.5">
          <label htmlFor={`${uid}-cover`} className="label-text">{t("coverImageLabel")}</label>
          <Input
            id={`${uid}-cover`}
            ref={coverRef}
            type="file"
            accept="image/*"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleCover(f);
              e.target.value = "";
            }}
          />
          {hasCover && <StatusBadge tone="success" label={t("coverConfigured")} />}
        </div>

        {busy && (
          <div className="meta flex items-center gap-2 tabular-nums" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            {t("uploadingProgress", { progress })}
          </div>
        )}

        {(localError || uploadError) && (
          <p className="text-sm text-danger" role="alert">{localError ?? uploadError}</p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => previewRef.current?.click()}>
            {t("uploadPreviewButton")}
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => coverRef.current?.click()}>
            {t("uploadCoverButton")}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
