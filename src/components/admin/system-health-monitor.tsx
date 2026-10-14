"use client";

import { useLocale, useTranslations } from "next-intl";
import { Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { useSystemHealthRealtime } from "@/hooks/use-system-health-realtime";
import { cn } from "@/lib/utils";
import { formatDateTime, formatNumber } from "@/lib/format-locale";
import type { HealthLevel, HealthServiceStatus, SystemHealthSnapshot } from "@/lib/system-health-monitor";

const LEVEL_TONE: Record<HealthLevel, StatusTone> = {
  healthy: "success",
  warning: "warning",
  critical: "danger",
};

function ServiceCard({ service }: { service: HealthServiceStatus }) {
  const t = useTranslations("admin.ownerHealth");
  return (
    <section className="rounded-lg border border-line bg-raised p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{t(`service.${service.id}`)}</h3>
        <StatusBadge tone={LEVEL_TONE[service.level]} label={t(`level.${service.level}`)} />
      </div>
      <p className="mt-2 text-sm text-ink-muted">{service.detail}</p>
      {service.metrics && Object.keys(service.metrics).length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {Object.entries(service.metrics).map(([key, value]) => (
            <li key={key} className="meta rounded-sm bg-elevated px-2 py-0.5">
              <span className="mono-id">{key}</span>: {String(value)}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function SystemHealthMonitor({ initial }: { initial: SystemHealthSnapshot }) {
  const t = useTranslations("admin.ownerHealth");
  const locale = useLocale();
  const { snapshot, refreshing, lastError, refresh } = useSystemHealthRealtime(initial);

  const counts = snapshot.services.reduce(
    (acc, service) => {
      acc[service.level] += 1;
      return acc;
    },
    { healthy: 0, warning: 0, critical: 0 }
  );
  const perf = snapshot.performance;
  // In Cloudflare Workers gibt es keine Host-Kennzahlen (RAM/CPU kommen als 0).
  const hostAvailable = !!perf && perf.serverRamTotalGb > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="info" label={t("ownerOnly")} />
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" disabled={refreshing} aria-busy={refreshing} onClick={() => void refresh()}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden />
            {t("refresh")}
          </Button>
        </div>
      </div>

      <SectionCard title={t("overall")}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <StatusBadge tone={LEVEL_TONE[snapshot.overall]} label={t(`level.${snapshot.overall}`)} className="text-sm" />
          <ul className="flex flex-wrap gap-2" aria-label={t("countsLabel")}>
            <li><StatusBadge tone="success" label={t("countHealthy", { count: counts.healthy })} /></li>
            <li><StatusBadge tone="warning" label={t("countWarning", { count: counts.warning })} /></li>
            <li><StatusBadge tone="danger" label={t("countCritical", { count: counts.critical })} /></li>
          </ul>
        </div>
        <div className="meta mt-4 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Activity className={cn("h-3.5 w-3.5", refreshing && "animate-pulse text-violet-bright")} aria-hidden />
            {t("autoRefresh")}
          </span>
          <span>{t("lastChecked", { time: formatDateTime(snapshot.checkedAt, locale) })}</span>
          {lastError && <span role="alert" className="text-danger">{lastError}</span>}
        </div>
      </SectionCard>

      <section aria-labelledby="health-services-heading">
        <h2 id="health-services-heading" className="section-title mb-3">{t("services")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      </section>

      {perf && (
        <SectionCard title={t("perfTitle")} description={t("perfText")}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile
              label={t("cacheHitRate")}
              value={`${perf.cacheHitRate} %`}
              hint={t("cacheHits", { hits: formatNumber(perf.cacheHits, locale), misses: formatNumber(perf.cacheMisses, locale) })}
            />
            <KpiTile
              label={t("serverRam")}
              value={hostAvailable ? `${perf.serverRamUsedPercent} %` : "—"}
              hint={hostAvailable ? t("ramUsage", { used: perf.serverRamUsedGb, total: perf.serverRamTotalGb }) : t("hostUnavailable")}
              tone={hostAvailable && perf.serverRamUsedPercent > 90 ? "danger" : hostAvailable && perf.serverRamUsedPercent > 75 ? "warning" : undefined}
            />
            <KpiTile
              label={t("dbLatency")}
              value={snapshot.platform ? `${snapshot.platform.dbLatencyMs} ms` : "—"}
              hint={hostAvailable ? t("cpuCores", { count: perf.cpuCount }) : t("hostUnavailable")}
            />
            <KpiTile
              label={t("slowQueries")}
              value={formatNumber(perf.slowQueryCount, locale)}
              hint={t("avgMs", { ms: perf.avgSlowQueryMs })}
            />
          </div>
          {snapshot.slowQueries && snapshot.slowQueries.length > 0 && (
            <div className="mt-4">
              <DataTable
                caption={t("slowQueriesCaption")}
                rows={snapshot.slowQueries.slice(0, 8)}
                rowKey={(row) => row.id}
                columns={[
                  { key: "label", header: t("colLabel"), width: "minmax(0,2fr)", cell: (row) => <span className="mono-id">{row.label}</span> },
                  { key: "kind", header: t("colType"), cell: (row) => t(`kind.${row.kind}`) },
                  { key: "duration", header: t("colDuration"), align: "right", width: "120px", cell: (row) => `${row.durationMs} ms` },
                ]}
              />
            </div>
          )}
        </SectionCard>
      )}
    </div>
  );
}
