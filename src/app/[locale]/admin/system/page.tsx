import { getTranslations, setRequestLocale } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import { requirePagePermission } from "@/lib/auth";
import { getAdminSystemHealth, getAdminSystemLogs, getAdminTranslationAudit, runAdminPlatformAudit } from "@/actions/admin/system";
import { SERVICE_KEYS, getMonitorState, recordServiceChecks, runServiceChecks, serverMetrics, type ServiceKey } from "@/lib/system-monitor";
import { formatDateTime } from "@/lib/format-locale";
import { safeIntlDateTimeFormat } from "@/lib/i18n/safe-locale";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { SystemHealthPanel } from "@/components/admin/system-health-panel";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/config";
import packageJson from "../../../../../package.json";

export const dynamic = "force-dynamic";

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`;
}

export default async function AdminSystemPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ tab?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin.st");
  const tab = searchParams.tab === "logs" ? "logs" : "status";
  const base = `/${locale}/admin/system`;
  const tabs = (
    <ChipTabs
      label={t("tabs")}
      value={tab}
      options={[
        { value: "status", label: t("tabStatus") },
        { value: "logs", label: t("tabLogs") },
      ]}
      hrefFor={(v) => (v === "status" ? base : `${base}?tab=${v}`)}
    />
  );

  if (tab === "logs") {
    const [logsResult, healthResult, translationResult, auditResult] = await Promise.all([
      getAdminSystemLogs(),
      getAdminSystemHealth(),
      getAdminTranslationAudit(),
      runAdminPlatformAudit(),
    ]);
    return (
      <div>
        <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
        <SystemHealthPanel
          locale={locale}
          logs={logsResult.success ? logsResult.data : []}
          health={healthResult.success ? healthResult.data : []}
          translationAudit={translationResult.success ? translationResult.data : { referenceLocale: "en" as const, totalReferenceKeys: 0, locales: [], summary: "" }}
          platformAudit={auditResult.success ? auditResult.data : null}
        />
      </div>
    );
  }

  const checks = await runServiceChecks();
  let monitor = await getMonitorState();
  try {
    monitor = await recordServiceChecks(checks);
  } catch (err) {
    console.error("[admin/system] record checks", err);
  }
  const metrics = serverMetrics();

  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getTime() - (29 - i) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });
  const dayFormat = safeIntlDateTimeFormat(locale, { day: "2-digit", month: "2-digit", timeZone: "UTC" });

  const availability = (key: ServiceKey) => {
    let ok = 0;
    let total = 0;
    let latency = 0;
    for (const d of days) {
      const b = monitor.days[d]?.[key];
      if (!b) continue;
      ok += b.ok;
      total += b.total;
      latency += b.latencySum;
    }
    return { pct: total ? (ok / total) * 100 : null, avgLatency: total ? Math.round(latency / total) : null };
  };

  const down = checks.filter((c) => c.state === "down");
  const openIncidents = monitor.incidents.filter((i) => !i.endedAt);

  return (
    <div className="space-y-6">
      <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />

      {down.length > 0 ? (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-danger/40 bg-danger-soft p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
          <div className="text-sm">
            <p className="font-semibold text-ink">{t("incident", { services: down.map((c) => t(`svc.${c.key}`)).join(", ") })}</p>
            {openIncidents[0] && <p className="mt-0.5 text-ink-muted">{t("incidentSince", { time: formatDateTime(openIncidents[0].startedAt, locale) })}</p>}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">{t("allUp")}</p>
      )}

      <section className="rounded-lg border border-line bg-raised" aria-labelledby="svc-heading">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <h2 id="svc-heading" className="section-title">{t("uptime30")}</h2>
          {monitor.lastRunAt && <span className="meta text-ink-faint">{t("lastCheck", { time: formatDateTime(monitor.lastRunAt, locale) })}</span>}
        </div>
        <ul className="divide-y divide-line">
          {SERVICE_KEYS.map((key) => {
            const check = checks.find((c) => c.key === key)!;
            const avail = availability(key);
            return (
              <li key={key} className="grid gap-3 px-4 py-3 lg:grid-cols-[220px_minmax(0,1fr)_170px] lg:items-center">
                <div className="flex items-center justify-between gap-2 lg:block">
                  <p className="text-[13px] font-semibold text-ink">{t(`svc.${key}`)}</p>
                  <div className="lg:mt-1">
                    <StatusBadge
                      tone={check.state === "up" ? "success" : check.state === "down" ? "danger" : "neutral"}
                      label={t(check.state)}
                    />
                  </div>
                </div>
                <ol className="flex gap-[3px]" aria-label={t("uptime30")}>
                  {days.map((d) => {
                    const b = monitor.days[d]?.[key];
                    const pct = b && b.total ? b.ok / b.total : null;
                    const label = pct === null
                      ? t("dayNoData", { date: dayFormat.format(new Date(d)) })
                      : t("dayTip", { date: dayFormat.format(new Date(d)), pct: `${Math.round(pct * 1000) / 10} %`, ok: b!.ok, total: b!.total });
                    return (
                      <li
                        key={d}
                        title={label}
                        aria-label={label}
                        className={cn(
                          "h-6 min-w-0 flex-1 rounded-[3px]",
                          pct === null ? "bg-elevated" : pct >= 0.999 ? "bg-success" : pct >= 0.95 ? "bg-warning" : "bg-danger"
                        )}
                      />
                    );
                  })}
                </ol>
                <dl className="flex justify-between gap-4 text-xs lg:block lg:text-right">
                  <div>
                    <dt className="sr-only">{t("uptime30")}</dt>
                    <dd className="tabular-nums text-ink">{avail.pct === null ? t("noData") : `${avail.pct.toFixed(2)} %`}</dd>
                  </div>
                  <div>
                    <dt className="inline text-ink-faint">{t("responseTime")}: </dt>
                    <dd className="inline tabular-nums text-ink-muted">
                      {check.latencyMs !== null ? `${check.latencyMs} ms` : avail.avgLatency !== null ? `Ø ${avail.avgLatency} ms` : "—"}
                    </dd>
                  </div>
                </dl>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line px-4 py-3 text-xs text-ink-faint">
          {t("legend")} {t("cronHint")}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="server-heading">
          <h2 id="server-heading" className="section-title mb-3">{t("server")}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <KpiTile
              label={t("cpu")}
              value={metrics.platformNote ? "—" : `${metrics.cpuLoadPct} %`}
              hint={metrics.platformNote ? t("loadUnavailable") : undefined}
              tone={metrics.cpuLoadPct > 85 ? "danger" : metrics.cpuLoadPct > 65 ? "warning" : undefined}
            />
            <KpiTile label={t("memory")} value={`${metrics.memoryUsedPct} %`} tone={metrics.memoryUsedPct > 90 ? "danger" : metrics.memoryUsedPct > 75 ? "warning" : undefined} />
            <KpiTile label={t("process")} value={`${metrics.processMemoryMb} MB`} />
            <KpiTile label={t("processUptime")} value={formatUptime(metrics.uptimeSeconds)} />
          </div>
        </section>

        <section aria-labelledby="versions-heading">
          <h2 id="versions-heading" className="section-title mb-3">{t("versions")}</h2>
          <dl className="divide-y divide-line rounded-lg border border-line bg-raised text-[13px]">
            {[
              [t("app"), packageJson.version],
              ["Next.js", packageJson.dependencies.next],
              ["Node.js", process.version],
              [t("commit"), process.env.GIT_COMMIT_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? "—"],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 px-4 py-2.5">
                <dt className="text-ink-muted">{k}</dt>
                <dd className="mono-id text-ink">{String(v).slice(0, 12)}</dd>
              </div>
            ))}
          </dl>

          <h2 className="section-title mb-3 mt-6">{t("recentIncidents")}</h2>
          {monitor.incidents.length === 0 ? (
            <p className="text-sm text-ink-muted">{t("noIncidents")}</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line bg-raised text-[13px]">
              {monitor.incidents.slice(0, 8).map((i) => (
                <li key={`${i.service}-${i.startedAt}`} className="flex flex-wrap justify-between gap-2 px-4 py-2.5">
                  <span className="text-ink">{t(`svc.${i.service}`)}</span>
                  <span className="tabular-nums text-ink-muted">
                    {formatDateTime(i.startedAt, locale)} – {i.endedAt ? formatDateTime(i.endedAt, locale) : t("ongoing")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
