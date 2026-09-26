"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ownerProcessEmailQueue } from "@/actions/admin/email-monitor";
import type { getOwnerEmailMonitor } from "@/actions/admin/email-monitor";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format-locale";

type MonitorData = Extract<
  Awaited<ReturnType<typeof getOwnerEmailMonitor>>,
  { success: true }
>["data"];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </Card>
  );
}

export function EmailMonitorPanel({ data, locale }: { data: MonitorData; locale: string }) {
  const t = useTranslations("admin.ui.emailMonitor");
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div>
        <Badge className="mb-2 bg-violet-soft text-violet-bright border-violet-bright/40">{t("ownerOnlyBadge")}</Badge>
        <h1 className="h1-acp">{t("title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("sentToday")} value={data.metrics.sentToday} />
        <StatCard label={t("failedToday")} value={data.metrics.failedToday} />
        <StatCard label={t("queuePending")} value={data.metrics.pendingQueue} />
        <StatCard
          label={t("smtpStatus")}
          value={data.metrics.smtpConfigured ? t("smtpConfigured") : t("smtpFallbackOnly")}
          sub={data.metrics.providers.join(" → ") || t("noProviders")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await ownerProcessEmailQueue();
              router.refresh();
            })
          }
        >
          {t("processQueue")}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/admin/email`}>{t("emailSettingsLink")}</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${locale}/admin/owner/health`}>{t("systemHealthLink")}</Link>
        </Button>
      </div>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">{t("recentLogsTitle")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border/40">
                <th className="pb-2 pr-3">{t("colTo")}</th>
                <th className="pb-2 pr-3">{t("colSubject")}</th>
                <th className="pb-2 pr-3">{t("colStatus")}</th>
                <th className="pb-2 pr-3">{t("colAttempts")}</th>
                <th className="pb-2">{t("colTime")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentLogs.map((log) => (
                <tr key={log.id} className="border-b border-border/20">
                  <td className="py-2 pr-3 max-w-[140px] truncate">{log.to}</td>
                  <td className="py-2 pr-3 max-w-[200px] truncate">{log.subject}</td>
                  <td className="py-2 pr-3">
                    <Badge
                      variant={
                        log.status === "SENT" ? "premium" : log.status === "FAILED" ? "destructive" : "outline"
                      }
                    >
                      {log.status}
                    </Badge>
                  </td>
                  <td className="py-2 pr-3 tabular-nums">{log.attempts}</td>
                  <td className="py-2 text-muted-foreground whitespace-nowrap">
                    {formatDateTime(log.sentAt ?? log.createdAt, locale)}
                  </td>
                </tr>
              ))}
              {data.recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    {t("noEmailLogs")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {data.authErrors.length > 0 && (
        <Card className="p-4">
          <h2 className="font-semibold mb-3">{t("authErrorsTitle")}</h2>
          <ul className="space-y-2 text-sm">
            {data.authErrors.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border/40 p-2">
                <span className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt, locale)}</span>
                <p className="font-mono text-xs mt-1">{entry.context}</p>
                <p className="text-destructive mt-1">{entry.message}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">{t("lastChecked", { time: formatDateTime(data.checkedAt, locale) })}</p>
    </div>
  );
}
