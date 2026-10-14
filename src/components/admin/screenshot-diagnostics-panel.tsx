"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { HelpCircle, ImageOff, RefreshCw, Wrench } from "lucide-react";
import { getScreenshotDiagnostics, repairScreenshotLinks } from "@/actions/admin/screenshot-diagnostics";
import type { ScreenshotDiagnosticRow } from "@/lib/media-diagnostics";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatNumber } from "@/lib/format-locale";

type Props = {
  locale: string;
  initial: {
    rows: ScreenshotDiagnosticRow[];
    summary: {
      total: number;
      missingUrl: number;
      broken: number;
      ok: number;
      storageProvider: string;
      storageConfigured: boolean;
      cdnUrl: string | null;
    };
  };
};

export function ScreenshotDiagnosticsPanel({ locale, initial }: Props) {
  const t = useTranslations("admin.screenshotDiag");
  const appToast = useAppToast();
  const [data, setData] = useState(initial);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const r = await getScreenshotDiagnostics(100);
      if (r.success) setData(r.data);
      else appToast.error(r.error);
    });
  }

  function repair() {
    startTransition(async () => {
      const r = await repairScreenshotLinks();
      if (r.success) {
        appToast.saved(t("repaired", { count: r.data.repaired }));
        refresh();
      } else appToast.error(r.error);
    });
  }

  const { summary, rows } = data;
  const failed = summary.broken + summary.missingUrl;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("scanned")} value={formatNumber(summary.total, locale)} />
        <KpiTile label={t("reachable")} value={formatNumber(summary.ok, locale)} tone="success" />
        <KpiTile label={t("brokenOrMissing")} value={formatNumber(failed, locale)} tone={failed > 0 ? "danger" : undefined} />
        <KpiTile label={t("storage")} value={<span className="text-base">{summary.storageProvider}</span>} hint={<span className="block truncate">{summary.cdnUrl ?? t("appProxy")}</span>} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={repair}>
          <Wrench className="h-4 w-4" aria-hidden /> {t("repair")}
        </Button>
        <Button variant="outline" size="sm" disabled={pending} onClick={refresh}>
          <RefreshCw className="h-4 w-4" aria-hidden /> {t("refresh")}
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/${locale}/admin/settings/media`}>{t("mediaSettings")}</Link>
        </Button>
      </div>

      <DataTable
        caption={t("tableCaption")}
        rows={rows}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={ImageOff} title={t("emptyTitle")} description={t("emptyText")} />}
        columns={[
          {
            key: "mod",
            header: t("colMod"),
            width: "minmax(0,1.6fr)",
            cell: (row) => (
              <span className="block min-w-0">
                <Link href={`/${locale}/mods/${row.modSlug}`} className="line-clamp-1 font-medium text-ink hover:text-violet-bright">
                  {row.modTitle}
                </Link>
                <span className="mono-id block">{row.id.slice(0, 8)}…</span>
              </span>
            ),
          },
          {
            key: "db",
            header: t("colDb"),
            width: "130px",
            cell: (row) =>
              row.dbStatus === "ok" ? (
                <StatusBadge tone="success" label={t("dbOk")} />
              ) : (
                <StatusBadge tone="danger" label={t("dbMissingUrl")} />
              ),
          },
          {
            key: "url",
            header: t("colUrl"),
            width: "minmax(0,1.4fr)",
            hideOnMobile: true,
            cell: (row) => (
              <span className="mono-id block truncate" title={row.resolvedUrl ?? undefined}>
                {row.resolvedUrl ?? "—"}
              </span>
            ),
          },
          {
            key: "path",
            header: t("colPath"),
            width: "minmax(0,1.2fr)",
            hideOnMobile: true,
            cell: (row) => (
              <span className="mono-id block truncate" title={row.storagePath ?? undefined}>
                {row.storagePath ?? "—"}
              </span>
            ),
          },
          {
            key: "reachable",
            header: t("colReachable"),
            width: "130px",
            cell: (row) =>
              row.reachable === true ? (
                <StatusBadge tone="success" label={t("reachableYes")} />
              ) : row.reachable === false ? (
                <StatusBadge tone="danger" label={t("reachableNo")} />
              ) : (
                <StatusBadge tone="neutral" icon={HelpCircle} label={t("reachableUnknown")} />
              ),
          },
        ]}
      />
    </div>
  );
}
