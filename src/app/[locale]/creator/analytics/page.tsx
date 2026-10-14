import { requireAuth } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getCreatorAnalytics,
  getCreatorVersionAnalytics,
  getDailyChartData,
  getUserCommissionSummary,
  type VersionAnalyticsRow,
} from "@/lib/analytics/ecosystem";
import { ConversionChart, RevenueChart } from "@/components/analytics/ecosystem-charts";
import { DataTable } from "@/components/ui/data-table";
import { KpiTile } from "@/components/ui/kpi-tile";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatMoneyFromCents } from "@/lib/currency";
import { formatNumber } from "@/lib/format-locale";
import type { Locale } from "@/i18n/config";

export default async function CreatorAnalyticsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");
  const tp = await getTranslations("creatorPages.analytics");
  const user = await requireAuth();

  const [analytics, commission, chart, versionStats] = await Promise.all([
    getCreatorAnalytics(user.id).catch(() => null),
    getUserCommissionSummary(user.id).catch(() => ({
      pendingCents: 0,
      pendingCount: 0,
      paidCents: 0,
      paidCount: 0,
      payouts: [],
    })),
    getDailyChartData(user.id).catch(() => []),
    getCreatorVersionAnalytics(user.id).catch((): VersionAnalyticsRow[] => []),
  ]);

  const kpis = [
    { label: t("monthlyDownloads"), value: formatNumber(analytics?.monthlyDownloads ?? 0, locale) },
    { label: t("purchaseCount"), value: formatNumber(analytics?.purchaseCount ?? 0, locale) },
    { label: t("revenue"), value: formatMoneyFromCents(analytics?.purchaseRevenue ?? 0, locale) },
    { label: t("couponUses"), value: formatNumber(analytics?.couponUses ?? 0, locale) },
    { label: t("couponRevenue"), value: formatMoneyFromCents(analytics?.couponRevenue ?? 0, locale) },
    { label: t("commission"), value: formatMoneyFromCents(commission.pendingCents, locale) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader level="h2" title={t("analytics")} description={tp("description")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <KpiTile key={k.label} label={k.label} value={k.value} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionChart data={chart} title={t("engagement")} />
        <RevenueChart data={chart} title={t("revenueChart")} />
      </div>

      {versionStats.length > 0 && (
        <section className="space-y-3">
          <h3 className="section-title">{tp("versionDownloads")}</h3>
          <DataTable
            caption={tp("versionDownloads")}
            rows={versionStats}
            rowKey={(v) => `${v.modSlug}-${v.version}`}
            columns={[
              {
                key: "version",
                header: tp("colVersion"),
                width: "minmax(0,2fr)",
                cell: (v) => (
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate font-medium text-ink">
                      {tp("versionLabel", { title: v.modTitle, version: v.version })}
                    </span>
                    {v.isPrimary && <StatusBadge tone="success" label={tp("latest")} />}
                  </span>
                ),
              },
              {
                key: "downloads",
                header: tp("colDownloads"),
                width: "120px",
                align: "right",
                cell: (v) => formatNumber(v.totalDownloads, locale),
              },
            ]}
          />
        </section>
      )}

      {analytics?.mods && analytics.mods.length > 0 && (
        <section className="space-y-3">
          <h3 className="section-title">{t("topProducts")}</h3>
          <DataTable
            caption={t("topProducts")}
            rows={analytics.mods}
            rowKey={(m) => m.id}
            columns={[
              {
                key: "title",
                header: tp("colProduct"),
                width: "minmax(0,2fr)",
                cell: (m) => <span className="block truncate font-medium text-ink">{m.title}</span>,
              },
              {
                key: "downloads",
                header: tp("colDownloads"),
                width: "120px",
                align: "right",
                cell: (m) => formatNumber(m.downloadCount, locale),
              },
            ]}
          />
        </section>
      )}
    </div>
  );
}
