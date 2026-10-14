"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FileCheck2, History, Music, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { DataTable, type DataColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";
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
import { formatDate, formatDateTime, formatNumber } from "@/lib/format-locale";

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

type Tab = "approvals" | "sounds" | "history" | "audit" | "settings";

/** Scan-Status (FileScanStatus) → Ton des StatusBadge; Texte unter admin.panelScanStatus. */
const SCAN_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "pending",
  SCANNING: "pending",
  MANUAL_REVIEW: "pending",
  CLEAN: "success",
  APPROVED: "success",
  SUSPICIOUS: "warning",
  FAILED: "warning",
  MALWARE: "danger",
  REJECTED: "danger",
};

/** Freigabe-Status eines Sounds → Ton des StatusBadge. */
const SOUND_STATUS_TONE: Record<string, StatusTone> = {
  VIRUS_TOTAL_VERIFIED: "success",
  MANUALLY_APPROVED: "success",
  REVIEW_REQUIRED: "warning",
  REJECTED: "danger",
  CHANGES_REQUESTED: "warning",
};

export function SecurityCenterPanel({ settings, stats }: Props) {
  const t = useTranslations("admin.ui.securityCenter");
  const tp = useTranslations("admin.panelSecurityCenter");
  const tScan = useTranslations("admin.panelScanStatus");
  const tt = useTranslations("toast");
  const locale = useLocale();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("approvals");
  const [confirmBulkReject, setConfirmBulkReject] = useState(false);
  const [form, setForm] = useState({
    virusTotalApiKey: settings.virusTotalApiKey,
    scanThreshold: settings.scanThreshold,
    autoApproveClean: settings.autoApproveClean,
    requireManualReviewSuspicious: settings.requireManualReviewSuspicious,
    enabled: settings.enabled,
  });

  const n = (value: number) => formatNumber(value, locale);
  const scanLabel = (status: string) => (tScan.has(status) ? tScan(status) : status);

  function saveSettings() {
    startTransition(async () => {
      const r = await updateMalwareSettingsAdmin(form);
      if (r.success) appToast.raw({ title: tt("securitySaved") });
      else appToast.error(r.error);
    });
  }

  function runWorker() {
    startTransition(async () => {
      const r = await triggerScanWorker();
      if (r.success) appToast.raw({ title: t("scanJobsProcessedMsg", { count: r.data.processed }) });
      else appToast.error(r.error);
    });
  }

  function exportReport() {
    startTransition(async () => {
      const r = await exportSecurityReport();
      if (!r.success) {
        appToast.error(r.error);
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
      if (r?.success) appToast.raw({ title: tt("actionCompleted") });
      else if (r) appToast.error(r.error);
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
        appToast.raw({
          title:
            action === "approve"
              ? t("filesApprovedMsg", { count: r.data.count })
              : t("filesRejectedMsg", { count: r.data.count }),
        });
        setSelected([]);
        setConfirmBulkReject(false);
      } else appToast.error(r.error);
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
      if (r?.success) appToast.raw({ title: tt("soundReviewUpdated") });
      else if (r) appToast.error(r.error);
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

  const approvalColumns: DataColumn<PendingApproval>[] = [
    {
      key: "select",
      header: "",
      width: "40px",
      cell: (v) => (
        <input
          type="checkbox"
          aria-label={tp("selectFile", { name: `${v.mod.title} v${v.version}` })}
          checked={selected.includes(v.id)}
          onChange={() => toggleSelect(v.id)}
        />
      ),
    },
    {
      key: "file",
      header: tp("colFile"),
      width: "minmax(0,2fr)",
      cell: (v) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{v.mod.title} v{v.version}</p>
          <p className="mono-id truncate text-ink-muted">{v.fileName}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: tp("colStatus"),
      width: "minmax(0,1.2fr)",
      hideOnMobile: true,
      cell: (v) => <SecurityBadge scanStatus={v.scanStatus} isTrusted={!!v.trustedFile} />,
    },
    {
      key: "actions",
      header: tp("colActions"),
      width: "minmax(0,2.4fr)",
      align: "right",
      cell: (v) => (
        <div className="flex flex-wrap justify-end gap-1">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => review(v.id, "approve")}>
            {t("approveButton")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => review(v.id, "trust")}>
            {t("markTrustedButton")}
          </Button>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => review(v.id, "rescan")}>
            {t("rescanButton")}
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => review(v.id, "reject")}>
            {t("rejectButton")}
          </Button>
        </div>
      ),
    },
  ];

  const historyColumns: DataColumn<ScanLog>[] = [
    {
      key: "file",
      header: tp("colFile"),
      width: "minmax(0,2fr)",
      cell: (log) => (
        <div className="min-w-0">
          <p className="mono-id truncate text-ink">{log.fileName}</p>
          <p className="meta truncate">
            {log.modVersion ? `${log.modVersion.mod.title} v${log.modVersion.version}` : t("blockedUpload")}
            {" · "}
            {formatDateTime(log.createdAt, locale)}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: tp("colStatus"),
      width: "minmax(0,1.4fr)",
      cell: (log) => <StatusBadge tone={SCAN_STATUS_TONE[log.status] ?? "neutral"} label={scanLabel(log.status)} />,
    },
    {
      key: "detections",
      header: tp("colDetections"),
      width: "100px",
      align: "right",
      hideOnMobile: true,
      cell: (log) => `${n(log.detections)}/${n(log.totalEngines)}`,
    },
    {
      key: "actions",
      header: tp("colActions"),
      width: "minmax(0,1.4fr)",
      align: "right",
      cell: (log) =>
        log.modVersion ? (
          <div className="flex flex-wrap justify-end gap-1">
            <Button size="sm" variant="outline" disabled={pending} onClick={() => review(log.modVersion!.id, "approve")}>
              {t("approveButton")}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => review(log.modVersion!.id, "rescan")}>
              {t("rescanButton")}
            </Button>
          </div>
        ) : null,
    },
  ];

  const auditColumns: DataColumn<AuditLog>[] = [
    { key: "action", header: tp("colAction"), width: "minmax(0,2fr)", cell: (log) => <span className="mono-id">{log.action}</span> },
    {
      key: "actor",
      header: tp("colActor"),
      cell: (log) => <span className="text-ink-muted">{log.user?.displayName ?? log.user?.username ?? t("systemActor")}</span>,
    },
    {
      key: "time",
      header: tp("colTime"),
      width: "160px",
      align: "right",
      cell: (log) => <span className="meta">{formatDateTime(log.createdAt, locale)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("statScannedToday")} value={n(stats.scannedToday)} />
        <KpiTile label={t("statPendingReviews")} value={n(stats.pendingReviews)} tone={stats.pendingReviews > 0 ? "warning" : undefined} />
        <KpiTile label={t("statApproved")} value={n(stats.approved)} />
        <KpiTile label={t("statRejected")} value={n(stats.rejected)} />
        <KpiTile label={t("statSuspicious")} value={n(stats.suspicious)} tone={stats.suspicious > 0 ? "warning" : undefined} />
        <KpiTile label={t("statMalware")} value={n(stats.malware)} tone={stats.malware > 0 ? "danger" : undefined} />
        <KpiTile label={t("statFailedScans")} value={n(stats.failedScans)} tone={stats.failedScans > 0 ? "warning" : undefined} />
        <KpiTile label={t("statVtQuota")} value={`${n(stats.quota.requestsUsed)}/${n(stats.quota.requestsLimit)}`} />
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
          onClick={() => setConfirmBulkReject(true)}
        >
          {t("bulkRejectButton")}
        </Button>
      </div>

      <ChipTabs
        label={tp("tabsLabel")}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
        options={[
          { value: "approvals", label: t("tabFileApprovals") },
          { value: "sounds", label: t("tabSoundReviews", { count: stats.pendingSounds?.length ?? 0 }) },
          { value: "history", label: t("tabScanHistory") },
          { value: "audit", label: t("tabAuditLogs") },
          { value: "settings", label: t("tabSettings") },
        ]}
      />

      {tab === "approvals" && (
        <section className="space-y-3">
          <h2 className="section-title">{t("pendingFileApprovalsHeading")}</h2>
          <DataTable
            caption={t("pendingFileApprovalsHeading")}
            columns={approvalColumns}
            rows={stats.pendingApprovals}
            rowKey={(v) => v.id}
            empty={<EmptyState icon={FileCheck2} title={t("noFilesAwaitingReview")} />}
          />
        </section>
      )}

      {tab === "sounds" && (
        <SectionCard title={t("pendingSoundReviewsHeading")}>
          {(stats.pendingSounds ?? []).length === 0 ? (
            <EmptyState icon={Music} title={t("noSoundsAwaitingReview")} />
          ) : (
            <ul className="divide-y divide-line">
              {stats.pendingSounds.map((sound) => {
                const profile = sound.soundProfile;
                const duration =
                  profile?.previewDurationSeconds ?? profile?.durationSeconds ?? null;
                const peaks = (profile?.waveformPeaks as number[] | null) ?? [];
                const approval = profile?.approvalStatus ?? "PENDING_REVIEW";
                return (
                  <li key={sound.id} className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{sound.title}</p>
                      <p className="meta">
                        {t("byAuthor", { author: sound.author.displayName ?? sound.author.username })} ·{" "}
                        {formatDate(sound.createdAt, locale)}
                        {duration != null && ` · ${t("durationSeconds", { seconds: duration })}`}
                      </p>
                      {peaks.length > 0 && (
                        <div className="mt-2 flex h-8 max-w-xs items-end gap-px" aria-hidden>
                          {peaks.slice(0, 48).map((p, i) => (
                            <div
                              key={i}
                              className="min-w-[2px] flex-1 rounded-sm bg-ink-faint"
                              style={{ height: `${Math.max(4, p * 100)}%` }}
                            />
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={SOUND_STATUS_TONE[approval] ?? "pending"} label={soundStatusLabel(approval)} />
                        {profile?.previewScanStatus && (
                          <span className="meta">{t("scanLabel", { status: scanLabel(profile.previewScanStatus) })}</span>
                        )}
                      </div>
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
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === "history" && (
        <section className="space-y-3">
          <h2 className="section-title">{t("scanHistoryHeading")}</h2>
          <DataTable
            caption={t("scanHistoryHeading")}
            columns={historyColumns}
            rows={stats.recent}
            rowKey={(log) => log.id}
            empty={<EmptyState icon={History} title={tp("historyEmpty")} />}
          />
        </section>
      )}

      {tab === "audit" && (
        <section className="space-y-3">
          <h2 className="section-title">{t("securityAuditLogsHeading")}</h2>
          <DataTable
            caption={t("securityAuditLogsHeading")}
            columns={auditColumns}
            rows={stats.auditRecent}
            rowKey={(log) => log.id}
            empty={<EmptyState icon={ScrollText} title={tp("auditEmpty")} />}
          />
        </section>
      )}

      {tab === "settings" && (
        <SectionCard title={t("malwareScannerSettingsHeading")} className="max-w-xl">
          <div className="space-y-4">
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-ink">
              {t("scannerEnabledLabel")}
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm((f) => ({ ...f, enabled: v }))} />
            </label>
            <div className="space-y-1.5">
              <label htmlFor="security-vt-key" className="label-text">{t("virusTotalApiKeyLabel")}</label>
              <Input
                id="security-vt-key"
                type="password"
                placeholder={settings.hasKey ? t("keyConfiguredPlaceholder") : t("pasteApiKeyPlaceholder")}
                value={form.virusTotalApiKey}
                onChange={(e) => setForm((f) => ({ ...f, virusTotalApiKey: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="security-threshold" className="label-text">{t("scanThresholdLabel")}</label>
              <Input
                id="security-threshold"
                type="number"
                min={1}
                max={20}
                className="tabular-nums"
                value={form.scanThreshold}
                onChange={(e) => setForm((f) => ({ ...f, scanThreshold: Number(e.target.value) || 2 }))}
              />
            </div>
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-ink">
              {t("autoApproveCleanLabel")}
              <Switch
                checked={form.autoApproveClean}
                onCheckedChange={(v) => setForm((f) => ({ ...f, autoApproveClean: v }))}
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm font-medium text-ink">
              {t("requireManualReviewLabel")}
              <Switch
                checked={form.requireManualReviewSuspicious}
                onCheckedChange={(v) => setForm((f) => ({ ...f, requireManualReviewSuspicious: v }))}
              />
            </label>
            <p className="meta tabular-nums">
              {t("vtUploadsQuotaLine", {
                uploadsUsed: stats.quota.uploadsUsed,
                uploadsLimit: stats.quota.uploadsLimit,
                requestsRemaining: stats.quota.requestsRemaining,
              })}
            </p>
            <Button onClick={saveSettings} disabled={pending}>
              {t("saveSettingsButton")}
            </Button>
          </div>
        </SectionCard>
      )}

      <ConfirmDialog
        open={confirmBulkReject}
        onOpenChange={setConfirmBulkReject}
        title={tp("bulkRejectTitle", { count: selected.length })}
        description={tp("bulkRejectText")}
        confirmLabel={t("bulkRejectButton")}
        variant="destructive"
        loading={pending}
        onConfirm={() => bulk("reject")}
      />
    </div>
  );
}
