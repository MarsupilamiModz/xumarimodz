"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { ownerProcessEmailQueue } from "@/actions/admin/email-monitor";
import type { getOwnerEmailMonitor } from "@/actions/admin/email-monitor";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime, formatNumber } from "@/lib/format-locale";

type MonitorData = Extract<
  Awaited<ReturnType<typeof getOwnerEmailMonitor>>,
  { success: true }
>["data"];

export function EmailMonitorPanel({ data, locale }: { data: MonitorData; locale: string }) {
  const t = useTranslations("admin.ui.emailMonitor");
  const te = useTranslations("admin.ownerEmail");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge tone="info" label={t("ownerOnlyBadge")} />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            aria-busy={pending}
            onClick={() =>
              startTransition(async () => {
                await ownerProcessEmailQueue();
                router.refresh();
              })
            }
          >
            {t("processQueue")}
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${locale}/admin/email`}>{t("emailSettingsLink")}</Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/${locale}/admin/owner/health`}>{t("systemHealthLink")}</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("sentToday")} value={formatNumber(data.metrics.sentToday, locale)} />
        <KpiTile
          label={t("failedToday")}
          value={formatNumber(data.metrics.failedToday, locale)}
          tone={data.metrics.failedToday > 0 ? "danger" : undefined}
        />
        <KpiTile label={t("queuePending")} value={formatNumber(data.metrics.pendingQueue, locale)} />
        <KpiTile
          label={t("smtpStatus")}
          value={data.metrics.smtpConfigured ? t("smtpConfigured") : t("smtpFallbackOnly")}
          hint={data.metrics.providers.join(" → ") || t("noProviders")}
          tone={data.metrics.smtpConfigured ? "success" : "warning"}
        />
      </div>

      <section aria-labelledby="email-logs-heading">
        <h2 id="email-logs-heading" className="section-title mb-3">{t("recentLogsTitle")}</h2>
        <DataTable
          caption={t("recentLogsTitle")}
          rows={data.recentLogs}
          rowKey={(log) => log.id}
          empty={<EmptyState icon={Mail} title={t("noEmailLogs")} description={te("emptyText")} />}
          columns={[
            { key: "to", header: t("colTo"), cell: (log) => <span className="block truncate">{log.to}</span> },
            { key: "subject", header: t("colSubject"), width: "minmax(0,2fr)", hideOnMobile: true, cell: (log) => <span className="block truncate">{log.subject}</span> },
            {
              key: "status",
              header: t("colStatus"),
              width: "130px",
              cell: (log) => (
                <StatusBadge
                  tone={log.status === "SENT" ? "success" : log.status === "FAILED" ? "danger" : "pending"}
                  label={te(`status.${log.status}`)}
                />
              ),
            },
            { key: "attempts", header: t("colAttempts"), width: "90px", align: "right", hideOnMobile: true, cell: (log) => log.attempts },
            {
              key: "time",
              header: t("colTime"),
              width: "150px",
              cell: (log) => <span className="whitespace-nowrap tabular-nums text-ink-muted">{formatDateTime(log.sentAt ?? log.createdAt, locale)}</span>,
            },
          ]}
        />
      </section>

      {data.authErrors.length > 0 && (
        <SectionCard title={t("authErrorsTitle")}>
          <ul className="space-y-2 text-sm">
            {data.authErrors.map((entry) => (
              <li key={entry.id} className="rounded-md border border-line p-3">
                <span className="meta tabular-nums">{formatDateTime(entry.createdAt, locale)}</span>
                <p className="mono-id mt-1 text-ink-muted">{entry.context}</p>
                <p className="mt-1 text-danger">{entry.message}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <p className="meta">{t("lastChecked", { time: formatDateTime(data.checkedAt, locale) })}</p>
    </div>
  );
}
