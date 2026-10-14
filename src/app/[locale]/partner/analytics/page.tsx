import { requireAuth } from "@/lib/auth";
import { getPartnerAnalytics, getDailyChartData } from "@/lib/analytics/ecosystem";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConversionChart, RevenueChart } from "@/components/analytics/ecosystem-charts";
import { PageHeader } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { formatNumber } from "@/lib/format-locale";
import { formatMoneyFromCents } from "@/lib/currency";
import type { Locale } from "@/i18n/config";

export default async function PartnerAnalyticsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const [t, tp] = await Promise.all([
    getTranslations("ecosystem"),
    getTranslations("partnerPages.partnerAnalytics"),
  ]);
  const user = await requireAuth();

  const [analytics, chart] = await Promise.all([
    getPartnerAnalytics(user.id).catch(() => null),
    getDailyChartData(user.id).catch(() => []),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader level="h2" title={t("analytics")} description={tp("description")} className="mb-0" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("clicks")} value={formatNumber(analytics?.clicks ?? 0, locale)} />
        <KpiTile label={t("conversions")} value={formatNumber(analytics?.conversions ?? 0, locale)} />
        <KpiTile label={t("totalUses")} value={formatNumber(analytics?.totalUses ?? 0, locale)} />
        <KpiTile label={t("totalDiscount")} value={formatMoneyFromCents(analytics?.totalDiscount ?? 0, locale)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionChart data={chart} title={t("clicksConversions")} />
        <RevenueChart data={chart} title={t("revenueChart")} />
      </div>
    </div>
  );
}
