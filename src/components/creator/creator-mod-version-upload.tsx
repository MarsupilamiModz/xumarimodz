"use client";

import { useRef, useState, useTransition } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { MAX_UPLOAD_BYTES, MOD_VERSION_FILE_ACCEPT, uploadLimitLabel, logUploadDiagnostic } from "@/lib/upload-limits";

export function CreatorModVersionUpload({ modId }: { modId: string }) {
  const t = useTranslations("common.cx.modVersionUpload");
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
    <Card className="space-y-4 p-6">
      <h3 className="font-medium">{t("title")}</h3>
      <p className="text-xs text-muted-foreground">
        {t("uploadHint", { limit: uploadLimitLabel() })}
      </p>
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
              if (!sid) throw new Error("Upload session missing");
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
        <Input name="version" placeholder="1.0.0" required />
        <Input name="gameVersion" placeholder={t("gameVersionPlaceholder")} />
        <select
          name="channel"
          className="h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
        >
          <option value="STABLE">{t("channelStable")}</option>
          <option value="BETA">{t("channelBeta")}</option>
        </select>
        <Textarea name="changelog" placeholder={t("changelogPlaceholder")} rows={3} />
        <Input
          name="file"
          type="file"
          required
          accept={MOD_VERSION_FILE_ACCEPT}
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
        />
        {(uploading || progress > 0) && (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-violet transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
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
            <p className="text-xs text-destructive">{error}</p>
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
          className="text-xs"
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
          <pre className="text-[10px] max-h-40 overflow-auto rounded border border-border/40 p-2 bg-background/50">
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
              variant="destructive"
              onClick={() => void abort(sessionId ?? undefined)}
            >
              {t("cancel")}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
