"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Activity, FileSearch, ScrollText } from "lucide-react";
import {
  clearAdminSystemLogs,
  exportAdminSystemLogs,
  runAdminPlatformAudit,
} from "@/actions/admin/system";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDateTime, formatNumber } from "@/lib/format-locale";
import type { PlatformErrorEntry } from "@/lib/platform-log";
import type { TranslationAuditResult } from "@/lib/i18n-audit";
import type { PlatformAuditIssue } from "@/lib/platform-audit";

type HealthCheck = { name: string; ok: boolean; detail?: string };

type Tab = "health" | "metrics" | "errors" | "audit" | "translations";

export type PlatformMetrics = {
  cpu: { usagePercent: number | null; detail: string };
  memory: { heapUsedMb: number; rssMb: number };
  database: { mods: number; sounds: number };
  storage: { bytes: number; detail: string };
  queues: { scan: number; upload: number; email: number };
  ads: { impressions: number; clicks: number; ctr: number; rpm: number | null };
  activeUsers: number;
  virusTotal: { envEnabled: boolean; apiKeyConfigured: boolean };
};

const SEVERITY_TONE: Record<string, StatusTone> = { error: "danger", warning: "warning", info: "info" };

export function SystemHealthPanel({
  locale,
  logs,
  health,
  metrics = null,
  translationAudit = { referenceLocale: "en", totalReferenceKeys: 0, locales: [], summary: "" },
  platformAudit,
  lazyAudit: _lazyAudit = false,
}: {
  locale: string;
  logs: PlatformErrorEntry[];
  health: HealthCheck[];
  metrics?: PlatformMetrics | null;
  translationAudit?: TranslationAuditResult;
  platformAudit?: { issues: PlatformAuditIssue[]; scannedAt: string } | null;
  lazyAudit?: boolean;
}) {
  const t = useTranslations("admin.system");
  const tp = useTranslations("admin.panelSystemHealth");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("health");
  const [search, setSearch] = useState("");
  const [auditResult, setAuditResult] = useState(platformAudit);
  const [confirmClear, setConfirmClear] = useState(false);

  const filteredLogs = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(
      (l) => l.context.toLowerCase().includes(q) || l.message.toLowerCase().includes(q)
    );
  }, [logs, search]);

  const tabs: { value: Tab; label: string }[] = [
    { value: "health", label: t("healthTab") },
    { value: "metrics", label: t("metricsTab") },
    { value: "errors", label: t("errorsTab") },
    { value: "audit", label: t("auditTab") },
    { value: "translations", label: t("translationsTab") },
  ];

  const n = (value: number) => formatNumber(value, locale);
  // In Cloudflare Workers gibt es keine Host-Kennzahlen (Polyfills liefern 0) – dann Hinweis statt „0 MB“.
  const memoryAvailable = !!metrics && (metrics.memory.heapUsedMb > 0 || metrics.memory.rssMb > 0);
  const cpuAvailable = metrics?.cpu.usagePercent != null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChipTabs
          label={tp("tabsLabel")}
          options={tabs}
          value={tab}
          onChange={(v) => setTab(v as Tab)}
        />
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => router.refresh()}>
          {t("retryHealth")}
        </Button>
      </div>

      {tab === "health" &&
        (health.length === 0 ? (
          <EmptyState icon={Activity} title={tp("healthEmpty")} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label={t("healthTab")}>
            {health.map((check) => (
              <li key={check.name} className="rounded-lg border border-line bg-raised p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{check.name}</span>
                  <StatusBadge tone={check.ok ? "success" : "danger"} label={check.ok ? t("statusOk") : t("statusIssue")} />
                </div>
                {check.detail && <p className="meta mt-1">{check.detail}</p>}
              </li>
            ))}
          </ul>
        ))}

      {tab === "metrics" &&
        (metrics ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label={tp("cpu")}
              value={cpuAvailable ? `${n(metrics.cpu.usagePercent!)} %` : "—"}
              hint={cpuAvailable ? undefined : tp("hostUnavailable")}
            />
            <KpiTile
              label={t("memoryUsage")}
              value={memoryAvailable ? tp("memoryValue", { heap: n(metrics.memory.heapUsedMb), rss: n(metrics.memory.rssMb) }) : "—"}
              hint={memoryAvailable ? undefined : tp("hostUnavailable")}
            />
            <KpiTile
              label={t("storageUsage")}
              value={metrics.storage.bytes ? tp("storageValue", { mb: n(Math.round(metrics.storage.bytes / 1024 / 1024)) }) : "—"}
              hint={metrics.storage.bytes ? tp("storageHint") : tp("storageNoData")}
            />
            <KpiTile label={t("scanQueue")} value={n(metrics.queues.scan)} hint={tp("pendingHint")} tone={metrics.queues.scan > 0 ? "warning" : undefined} />
            <KpiTile label={t("uploadQueue")} value={n(metrics.queues.upload)} hint={tp("inProgressHint")} />
            <KpiTile label={t("emailQueue")} value={n(metrics.queues.email)} hint={tp("pendingHint")} />
            <KpiTile label={t("activeUsers")} value={n(metrics.activeUsers)} hint={tp("downloadsLastHour")} />
            <KpiTile
              label={t("adRevenue")}
              value={n(metrics.ads.impressions)}
              hint={tp("adsHint", { ctr: formatNumber(Math.round(metrics.ads.ctr * 100) / 100, locale) })}
            />
            <KpiTile
              label={tp("catalog")}
              value={n(metrics.database.mods)}
              hint={tp("catalogHint", { sounds: n(metrics.database.sounds) })}
            />
            <div className="rounded-lg border border-line bg-raised p-4">
              <p className="label-text">{tp("virusTotal")}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <StatusBadge
                  tone={metrics.virusTotal.envEnabled ? "success" : "neutral"}
                  label={metrics.virusTotal.envEnabled ? tp("enabled") : tp("disabled")}
                />
                <StatusBadge
                  tone={metrics.virusTotal.apiKeyConfigured ? "success" : "warning"}
                  label={metrics.virusTotal.apiKeyConfigured ? tp("apiKeySet") : tp("noEnvKey")}
                />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={Activity} title={tp("metricsEmpty")} description={tp("metricsEmptyText")} />
        ))}

      {tab === "errors" && (
        <SectionCard
          title={t("errorsTab")}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const r = await exportAdminSystemLogs();
                    if (r.success && r.data) {
                      const blob = new Blob([r.data], { type: "application/json" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `platform-errors-${Date.now()}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } else if (!r.success) {
                      appToast.error(r.error);
                    }
                  })
                }
              >
                {t("exportLogs")}
              </Button>
              <Button variant="outline" size="sm" disabled={pending || logs.length === 0} onClick={() => setConfirmClear(true)}>
                {t("clearLogs")}
              </Button>
            </div>
          }
        >
          <SearchField
            label={t("searchErrors")}
            name="log-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-4 max-w-xs"
          />

          {filteredLogs.length === 0 ? (
            <EmptyState icon={ScrollText} title={t("noErrors")} />
          ) : (
            <ul className="max-h-[520px] divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {filteredLogs.map((log) => (
                <li key={log.id} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="mono-id text-ink-muted">{log.context}</span>
                    <span className="meta tabular-nums">{formatDateTime(log.createdAt, locale)}</span>
                  </div>
                  <p className="mono-id mt-2 break-words text-ink">{log.message}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === "audit" && (
        <SectionCard
          title={t("auditTab")}
          description={auditResult?.scannedAt ? t("lastScan", { time: formatDateTime(auditResult.scannedAt, locale) }) : undefined}
          action={
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const r = await runAdminPlatformAudit();
                  if (r.success) {
                    setAuditResult(r.data);
                    appToast.saved();
                  } else appToast.error(r.error);
                })
              }
            >
              {pending ? t("auditRunning") : t("runAudit")}
            </Button>
          }
        >
          {!auditResult ? (
            <EmptyState icon={FileSearch} title={tp("auditEmpty")} description={tp("auditEmptyText")} />
          ) : auditResult.issues.length === 0 ? (
            <EmptyState icon={FileSearch} title={tp("auditNoIssues")} />
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {auditResult.issues.map((issue, i) => (
                <li key={`${issue.category}-${i}`} className="p-3 text-sm">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <StatusBadge
                      tone={SEVERITY_TONE[issue.severity] ?? "info"}
                      label={
                        issue.severity === "error"
                          ? t("severityError")
                          : issue.severity === "warning"
                            ? t("severityWarning")
                            : t("severityInfo")
                      }
                    />
                    <span className="meta">{issue.category}</span>
                  </div>
                  <p className="text-ink">{issue.message}</p>
                  {issue.detail && <p className="mono-id mt-1 text-ink-muted">{issue.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {tab === "translations" && (
        <SectionCard
          title={t("translationsTab")}
          description={t("translationSummary", {
            locale: translationAudit.referenceLocale,
            count: translationAudit.totalReferenceKeys,
          })}
        >
          {translationAudit.summary && <p className="mb-4 text-sm text-ink">{translationAudit.summary}</p>}
          <ul className="divide-y divide-line rounded-lg border border-line">
            {translationAudit.locales.map((loc) => (
              <li key={loc.locale} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                <span className="font-medium uppercase text-ink">{loc.locale}</span>
                {loc.missing.length === 0 ? (
                  <StatusBadge tone="success" label={t("noMissingKeys")} />
                ) : (
                  <StatusBadge tone="danger" label={t("missingKeys", { count: loc.missing.length, locale: loc.locale })} />
                )}
                {loc.missing.length > 0 && (
                  <p className="mono-id line-clamp-2 w-full text-ink-muted">
                    {loc.missing.slice(0, 20).join(", ")}
                    {loc.missing.length > 20 ? "…" : ""}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <ConfirmDialog
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={tp("clearConfirmTitle")}
        description={tp("clearConfirmText")}
        confirmLabel={t("clearLogs")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await clearAdminSystemLogs();
            if (r.success) {
              setConfirmClear(false);
              appToast.saved();
              router.refresh();
            } else appToast.error(r.error);
          })
        }
      />
    </div>
  );
}
