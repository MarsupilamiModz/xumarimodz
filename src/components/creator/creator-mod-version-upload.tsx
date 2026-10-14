"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { finalizeModVersionUpload } from "@/actions/mods";
import {
  useR2MultipartUpload,
  formatUploadSpeed,
  formatEta,
} from "@/hooks/use-r2-multipart-upload";
import { formatUploadErrorMessage } from "@/lib/upload-errors";
import { Button } from "@/components/ui/button";
import { Input, controlClassName } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { MAX_UPLOAD_BYTES, MOD_VERSION_FILE_ACCEPT, uploadLimitLabel, logUploadDiagnostic } from "@/lib/upload-limits";

export function CreatorModVersionUpload({ modId }: { modId: string }) {
  const t = useTranslations("common.cx.modVersionUpload");
  const ts = useTranslations("sharedTools.modVersionUpload");
  const uid = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [diagnostics, setDiagnostics] = useState<string | null>(null);
  const { upload, abort, pause, resume, retry, progress, uploading, paused, error, speedBps, etaSeconds, chunkStatus } =
    useR2MultipartUpload();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const busy = pending || uploading;

  return (
    <SectionCard title={t("title")} description={t("uploadHint", { limit: uploadLimitLabel() })}>
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const file = selectedFile ?? (fd.get("file") as File | null);
          const version = String(fd.get("version") ?? "").trim();
          if (!file || !version) {
            toast({ title: "toast.fileVersionRequired", variant: "destructive" });
            return;
          }
          if (file.size > MAX_UPLOAD_BYTES) {
            toast({ title: t("maxSizeExceeded", { limit: uploadLimitLabel() }), variant: "destructive" });
            return;
          }

          startTransition(async () => {
            try {
              logUploadDiagnostic("upload_start", { modId, fileName: file.name, fileSize: file.size });
              const uploadResult = await upload({
                file,
                purpose: "mod-version",
                modId,
              });
              const sid =
                uploadResult && typeof uploadResult === "object" && "sessionId" in uploadResult
                  ? String(uploadResult.sessionId)
                  : null;
              if (!sid) throw new Error(ts("sessionMissing"));
              setSessionId(sid);

              const r = await finalizeModVersionUpload(sid, {
                version,
                changelog: String(fd.get("changelog") ?? "") || undefined,
                gameVersion: String(fd.get("gameVersion") ?? "") || undefined,
                channel: String(fd.get("channel") ?? "STABLE"),
              });

              if (r.success) {
                logUploadDiagnostic("upload_finalize_ok", { modId, sessionId: sid, version });
                const msg =
                  r.data && "message" in r.data && r.data.message
                    ? String(r.data.message)
                    : t("versionUploadedDefault");
                toast({ title: msg });
                formRef.current?.reset();
                setSelectedFile(null);
                setSessionId(null);
                router.refresh();
              } else {
                toast({ title: "toast.error", description: r.error, variant: "destructive" });
              }
            } catch (err) {
              logUploadDiagnostic("upload_failed", {
                modId,
                error: err instanceof Error ? err.message : String(err),
              });
              toast({
                title: "toast.uploadFailed",
                description: formatUploadErrorMessage(err),
                variant: "destructive",
              });
            }
          });
        }}
        className="space-y-3"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-version`} className="label-text">{ts("versionLabel")}</label>
            <Input id={`${uid}-version`} name="version" placeholder="1.0.0" required />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-game`} className="label-text">{ts("gameVersionLabel")}</label>
            <Input id={`${uid}-game`} name="gameVersion" placeholder={t("gameVersionPlaceholder")} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-channel`} className="label-text">{ts("channelLabel")}</label>
          <select id={`${uid}-channel`} name="channel" className={cn(controlClassName, "h-9")}>
            <option value="STABLE">{t("channelStable")}</option>
            <option value="BETA">{t("channelBeta")}</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-changelog`} className="label-text">{ts("changelogLabel")}</label>
          <Textarea id={`${uid}-changelog`} name="changelog" placeholder={t("changelogPlaceholder")} rows={3} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-file`} className="label-text">{ts("fileLabel")}</label>
          <Input
            id={`${uid}-file`}
            name="file"
            type="file"
            required
            accept={MOD_VERSION_FILE_ACCEPT}
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
        </div>
        {(uploading || progress > 0) && (
          <div className="space-y-1">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label={ts("progressLabel")}
              className="h-2 overflow-hidden rounded-full bg-elevated"
            >
              <div
                className="h-full bg-violet transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="meta flex justify-between gap-3 tabular-nums">
              <span>
                {t("progressLine", {
                  progress,
                  speed: formatUploadSpeed(speedBps),
                  completed: chunkStatus.completed,
                  total: chunkStatus.total || "—",
                })}
              </span>
              <span>{t("etaLabel", { eta: formatEta(etaSeconds) })}</span>
            </div>
          </div>
        )}
        {error && (
          <div className="space-y-2">
            <p className="text-sm text-danger" role="alert">{error}</p>
            {!uploading && (
              <Button type="button" variant="outline" size="sm" onClick={() => void retry()}>
                {t("retryUpload")}
              </Button>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            try {
              const raw = sessionStorage.getItem("xumari-upload-diagnostics");
              setDiagnostics(raw ? JSON.stringify(JSON.parse(raw), null, 2) : t("noUploadLogs"));
            } catch {
              setDiagnostics(t("couldNotReadLogs"));
            }
          }}
        >
          {t("showDiagnostics")}
        </Button>
        {diagnostics && (
          <pre className="mono-id max-h-40 overflow-auto rounded-md border border-line bg-canvas p-2 text-[11px] text-ink-muted">
            {diagnostics}
          </pre>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {uploading ? (paused ? t("statusPaused") : t("statusUploading")) : pending ? t("statusProcessing") : t("uploadVersionButton")}
          </Button>
          {uploading && !paused && (
            <Button type="button" variant="outline" onClick={() => pause()}>
              {t("pause")}
            </Button>
          )}
          {uploading && paused && (
            <Button type="button" variant="outline" onClick={() => resume()}>
              {t("resume")}
            </Button>
          )}
          {(uploading || sessionId) && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void abort(sessionId ?? undefined)}
            >
              {t("cancel")}
            </Button>
          )}
        </div>
      </form>
    </SectionCard>
  );
}
