"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { safeToLocaleDateString } from "@/lib/i18n/safe-locale";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  updateMalwareSettingsAdmin,
  approveScannedVersion,
  rejectScannedVersion,
  markVersionTrusted,
  requestVersionReview,
  reprocessVersionScan,
  removeVersionScan,
  bulkApproveVersions,
  bulkRejectVersions,
  exportSecurityReport,
  triggerScanWorker,
  approveSound,
  rejectSound,
  requestSoundChanges,
  requestSoundReview,
  rescanSoundPreview,
} from "@/actions/admin/security";
import type { MalwareScannerSettings } from "@/lib/malware-settings";
import { SecurityBadge } from "@/components/security/security-badge";
import type { FileScanStatus } from "@prisma/client";
import { formatDateTime } from "@/lib/format-locale";

type ScanLog = {
  id: string;
  fileName: string;
  status: string;
  detections: number;
  totalEngines: number;
  blocked: boolean;
  createdAt: Date;
  modVersion?: { id: string; version: string; mod: { slug: string; title: string } } | null;
};

type PendingApproval = {
  id: string;
  version: string;
  fileName: string;
  scanStatus: FileScanStatus;
  createdAt: Date;
  mod: { id: string; slug: string; title: string };
  trustedFile: { id: string } | null;
};

type AuditLog = {
  id: string;
  action: string;
  createdAt: Date;
  modVersionId: string | null;
  modId: string | null;
  user?: { username: string; displayName: string | null } | null;
};

type PendingSound = {
  id: string;
  slug: string;
  title: string;
  createdAt: Date;
  author: { username: string; displayName: string | null };
  soundProfile: {
    previewDurationSeconds: number | null;
    durationSeconds: number | null;
    previewScanStatus: string;
    approvalStatus: string;
    waveformPeaks: unknown;
    previewFileKey: string | null;
  } | null;
};

type Props = {
  settings: MalwareScannerSettings & { hasKey: boolean };
  stats: {
    total: number;
    clean: number;
    suspicious: number;
    malware: number;
    blocked: number;
    pendingReviews: number;
    approved: number;
    rejected: number;
    failedScans: number;
    scannedToday: number;
    quota: {
      requestsUsed: number;
      uploadsUsed: number;
      requestsLimit: number;
      uploadsLimit: number;
      requestsRemaining: number;
      uploadsRemaining: number;
    };
    recent: ScanLog[];
    pendingApprovals: PendingApproval[];
    pendingSounds: PendingSound[];
    auditRecent: AuditLog[];
  };
};

export function SecurityCenterPanel({ settings, stats }: Props) {
  const t = useTranslations("admin.ui.securityCenter");
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<"approvals" | "sounds" | "history" | "audit" | "settings">("approvals");
  const [form, setForm] = useState({
    virusTotalApiKey: settings.virusTotalApiKey,
    scanThreshold: settings.scanThreshold,
    autoApproveClean: settings.autoApproveClean,
    requireManualReviewSuspicious: settings.requireManualReviewSuspicious,
    enabled: settings.enabled,
  });

  function saveSettings() {
    startTransition(async () => {
      const r = await updateMalwareSettingsAdmin(form);
      if (r.success) toast({ title: "toast.securitySaved" });
      else toast({ title: r.error, variant: "destructive" });
    });
  }

  function runWorker() {
    startTransition(async () => {
      const r = await triggerScanWorker();
      if (r.success) toast({ title: t("scanJobsProcessedMsg", { count: r.data.processed }) });
      else toast({ title: r.error, variant: "destructive" });
    });
  }

  function exportReport() {
    startTransition(async () => {
      const r = await exportSecurityReport();
      if (!r.success) {
        toast({ title: r.error, variant: "destructive" });
        return;
      }
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `security-report-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  function review(
    versionId: string,
    action: "approve" | "reject" | "trust" | "review" | "rescan" | "remove"
  ) {
    startTransition(async () => {
      let r;
      switch (action) {
        case "approve":
          r = await approveScannedVersion(versionId);
          break;
        case "reject":
          r = await rejectScannedVersion(versionId);
          break;
        case "trust":
          r = await markVersionTrusted(versionId);
          break;
        case "review":
          r = await requestVersionReview(versionId);
          break;
        case "rescan":
          r = await reprocessVersionScan(versionId);
          break;
        case "remove":
          r = await removeVersionScan(versionId);
          break;
      }
      if (r?.success) toast({ title: "toast.actionCompleted" });
      else if (r) toast({ title: r.error, variant: "destructive" });
    });
  }

  function bulk(action: "approve" | "reject") {
    if (selected.length === 0) return;
    startTransition(async () => {
      const r =
        action === "approve"
          ? await bulkApproveVersions(selected)
          : await bulkRejectVersions(selected);
      if (r.success) {
        toast({
          title:
            action === "approve"
              ? t("filesApprovedMsg", { count: r.data.count })
              : t("filesRejectedMsg", { count: r.data.count }),
        });
        setSelected([]);
      } else toast({ title: r.error, variant: "destructive" });
    });
  }

  function soundReview(
    modId: string,
    action: "approve" | "reject" | "changes" | "review" | "rescan"
  ) {
    startTransition(async () => {
      let r;
      switch (action) {
        case "approve":
          r = await approveSound(modId);
          break;
        case "reject":
          r = await rejectSound(modId, "Rejected in Security Center");
          break;
        case "changes":
          r = await requestSoundChanges(modId, "Changes requested by security review");
          break;
        case "review":
          r = await requestSoundReview(modId);
          break;
        case "rescan":
          r = await rescanSoundPreview(modId);
          break;
      }
      if (r?.success) toast({ title: "toast.soundReviewUpdated" });
      else if (r) toast({ title: r.error, variant: "destructive" });
    });
  }

  function soundStatusLabel(status: string) {
    switch (status) {
      case "VIRUS_TOTAL_VERIFIED":
        return t("statusVirusTotalVerified");
      case "MANUALLY_APPROVED":
        return t("statusManuallyApproved");
      case "REVIEW_REQUIRED":
        return t("statusReviewRequired");
      case "REJECTED":
        return t("statusRejected");
      case "CHANGES_REQUESTED":
        return t("statusChangesRequested");
      default:
        return t("statusPendingReview");
    }
  }

  function toggleSelect(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          { label: t("statScannedToday"), value: stats.scannedToday },
          { label: t("statPendingReviews"), value: stats.pendingReviews },
          { label: t("statApproved"), value: stats.approved },
          { label: t("statRejected"), value: stats.rejected },
          { label: t("statSuspicious"), value: stats.suspicious },
          { label: t("statMalware"), value: stats.malware },
          { label: t("statFailedScans"), value: stats.failedScans },
          {
            label: t("statVtQuota"),
            value: `${stats.quota.requestsUsed}/${stats.quota.requestsLimit}`,
          },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" disabled={pending} onClick={runWorker}>
          {t("processScanQueueButton")}
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={exportReport}>
          {t("exportReportsButton")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={pending || selected.length === 0}
          onClick={() => bulk("approve")}
        >
          {t("bulkApproveButton", { count: selected.length })}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={pending || selected.length === 0}
          onClick={() => bulk("reject")}
        >
          {t("bulkRejectButton")}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/40 pb-2">
        {(
          [
            ["approvals", t("tabFileApprovals")],
            ["sounds", t("tabSoundReviews", { count: stats.pendingSounds?.length ?? 0 })],
            ["history", t("tabScanHistory")],
            ["audit", t("tabAuditLogs")],
            ["settings", t("tabSettings")],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? "default" : "ghost"}
            onClick={() => setTab(key)}
          >
            {label}
          </Button>
        ))}
      </div>

      {tab === "approvals" && (
        <Card>
            <CardHeader>
              <CardTitle>{t("pendingFileApprovalsHeading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.pendingApprovals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noFilesAwaitingReview")}</p>
              ) : (
                stats.pendingApprovals.map((v) => (
                  <div
                    key={v.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3 last:border-0"
                  >
                    <div className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(v.id)}
                        onChange={() => toggleSelect(v.id)}
                        className="mt-1"
                      />
                      <div>
                        <p className="font-medium text-sm">{v.mod.title} v{v.version}</p>
                        <p className="text-xs text-muted-foreground">{v.fileName}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <SecurityBadge scanStatus={v.scanStatus} isTrusted={!!v.trustedFile} />
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => review(v.id, "approve")}>
                        {t("approveButton")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => review(v.id, "trust")}>
                        {t("markTrustedButton")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => review(v.id, "rescan")}>
                        {t("rescanButton")}
                      </Button>
                      <Button size="sm" variant="destructive" disabled={pending} onClick={() => review(v.id, "reject")}>
                        {t("rejectButton")}
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
      )}

      {tab === "sounds" && (
        <Card>
          <CardHeader>
            <CardTitle>{t("pendingSoundReviewsHeading")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(stats.pendingSounds ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noSoundsAwaitingReview")}</p>
            ) : (
              stats.pendingSounds.map((sound) => {
                const profile = sound.soundProfile;
                const duration =
                  profile?.previewDurationSeconds ?? profile?.durationSeconds ?? null;
                const peaks = (profile?.waveformPeaks as number[] | null) ?? [];
                return (
                  <div
                    key={sound.id}
                    className="flex flex-wrap items-start justify-between gap-3 border-b border-border/30 pb-4 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm">{sound.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("byAuthor", { author: sound.author.displayName ?? sound.author.username })} ·{" "}
                        {safeToLocaleDateString(new Date(sound.createdAt))}
                        {duration != null && ` · ${t("durationSeconds", { seconds: duration })}`}
                      </p>
                      {peaks.length > 0 && (
                        <div className="mt-2 flex h-8 items-end gap-px max-w-xs">
                          {peaks.slice(0, 48).map((p, i) => (
                            <div
                              key={i}
                              className="flex-1 bg-violet-soft rounded-sm min-w-[2px]"
                              style={{ height: `${Math.max(4, p * 100)}%` }}
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-xs mt-1">
                        {soundStatusLabel(profile?.approvalStatus ?? "PENDING_REVIEW")}
                        {profile?.previewScanStatus && (
                          <span className="text-muted-foreground ml-2">
                            {t("scanLabel", { status: profile.previewScanStatus })}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => soundReview(sound.id, "approve")}>
                        {t("approveButton")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => soundReview(sound.id, "reject")}>
                        {t("rejectButton")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => soundReview(sound.id, "changes")}>
                        {t("requestChangesButton")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => soundReview(sound.id, "review")}>
                        {t("manualReviewButton")}
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => soundReview(sound.id, "rescan")}>
                        {t("rescanButton")}
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {tab === "history" && (
        <Card>
            <CardHeader>
              <CardTitle>{t("scanHistoryHeading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.recent.map((log) => (
                <div
                  key={log.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{log.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.modVersion
                        ? `${log.modVersion.mod.title} v${log.modVersion.version}`
                        : t("blockedUpload")}
                      {" · "}
                      {formatDateTime(log.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={log.status === "CLEAN" || log.status === "APPROVED" ? "default" : "destructive"}>
                      {log.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.detections}/{log.totalEngines}
                    </span>
                    {log.modVersion && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => review(log.modVersion!.id, "approve")}>
                          {t("approveButton")}
                        </Button>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => review(log.modVersion!.id, "rescan")}>
                          {t("rescanButton")}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
      )}

      {tab === "audit" && (
        <Card>
            <CardHeader>
              <CardTitle>{t("securityAuditLogsHeading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stats.auditRecent.map((log) => (
                <div key={log.id} className="flex justify-between gap-2 text-sm border-b border-border/20 pb-2">
                  <span className="font-mono text-xs">{log.action}</span>
                  <span className="text-muted-foreground text-xs">
                    {log.user?.displayName ?? log.user?.username ?? t("systemActor")} ·{" "}
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
      )}

      {tab === "settings" && (
        <Card>
            <CardHeader>
              <CardTitle>{t("malwareScannerSettingsHeading")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t("scannerEnabledLabel")}</label>
                <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
              </div>
              <div>
                <label className="text-sm font-medium">{t("virusTotalApiKeyLabel")}</label>
                <Input
                  type="password"
                  placeholder={settings.hasKey ? t("keyConfiguredPlaceholder") : t("pasteApiKeyPlaceholder")}
                  value={form.virusTotalApiKey}
                  onChange={(e) => setForm((f) => ({ ...f, virusTotalApiKey: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium">{t("scanThresholdLabel")}</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={form.scanThreshold}
                  onChange={(e) => setForm((f) => ({ ...f, scanThreshold: Number(e.target.value) || 2 }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t("autoApproveCleanLabel")}</label>
                <Switch
                  checked={form.autoApproveClean}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, autoApproveClean: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">{t("requireManualReviewLabel")}</label>
                <Switch
                  checked={form.requireManualReviewSuspicious}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, requireManualReviewSuspicious: v }))}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {t("vtUploadsQuotaLine", {
                  uploadsUsed: stats.quota.uploadsUsed,
                  uploadsLimit: stats.quota.uploadsLimit,
                  requestsRemaining: stats.quota.requestsRemaining,
                })}
              </p>
              <Button onClick={saveSettings} disabled={pending}>
                {t("saveSettingsButton")}
              </Button>
            </CardContent>
          </Card>
      )}
    </div>
  );
}
