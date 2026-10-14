import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  getPartnerAnalytics,
  getUserCommissionSummary,
  getDailyChartData,
} from "@/lib/analytics/ecosystem";
import { ConversionChart, RevenueChart } from "@/components/analytics/ecosystem-charts";
import { PageHeader, SectionCard } from "@/components/ui/page-header";
import { KpiTile } from "@/components/ui/kpi-tile";
import { StatusBadge } from "@/components/ui/status-badge";
import { CopyButton } from "@/components/ui/copy-button";
import { formatNumber } from "@/lib/format-locale";
import { safeIntlNumberFormat } from "@/lib/i18n/safe-locale";
import { formatMoneyFromCents } from "@/lib/currency";
import type { Locale } from "@/i18n/config";

export default async function PartnerPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const [t, tp] = await Promise.all([
    getTranslations("ecosystem"),
    getTranslations("partnerPages.partnerOverview"),
  ]);
  const user = await requireAuth();

  const [profile, analytics, commission, chart] = await Promise.all([
    prisma.partnerProfile.findUnique({ where: { userId: user.id } }),
    getPartnerAnalytics(user.id).catch(() => null),
    getUserCommissionSummary(user.id).catch(() => ({
      pendingCents: 0,
      pendingCount: 0,
      paidCents: 0,
      paidCount: 0,
      payouts: [],
    })),
    getDailyChartData(user.id).catch(() => []),
  ]);

  const conversionRate = safeIntlNumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(
    (analytics?.conversionRate ?? 0) / 100
  );

  return (
    <div className="space-y-6">
      <PageHeader level="h2" title={t("overview")} description={tp("description")} className="mb-0" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiTile label={t("clicks")} value={formatNumber(analytics?.clicks ?? profile?.totalClicks ?? 0, locale)} />
        <KpiTile
          label={t("conversions")}
          value={formatNumber(analytics?.conversions ?? profile?.totalConversions ?? 0, locale)}
        />
        <KpiTile label={t("conversionRate")} value={conversionRate} />
        <KpiTile label={t("revenue")} value={formatMoneyFromCents(analytics?.totalRevenue ?? 0, locale)} />
        <KpiTile label={t("commission")} value={formatMoneyFromCents(commission.pendingCents, locale)} hint={t("pending")} />
        <KpiTile label={t("referrals")} value={formatNumber(analytics?.referrals ?? 0, locale)} />
      </div>

      {profile?.affiliateCode && (
        <SectionCard
          title={t("affiliateCode")}
          description={tp("affiliateCodeHint")}
          action={profile.isVerified ? <StatusBadge tone="success" label={t("verified")} /> : undefined}
        >
          <div className="flex flex-wrap items-center gap-3">
            <p className="mono-id text-lg text-ink">{profile.affiliateCode}</p>
            <CopyButton value={profile.affiliateCode} label={t("copy")} copiedLabel={t("copied")} />
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <ConversionChart data={chart} title={t("clicksConversions")} />
        <RevenueChart data={chart} title={t("revenueChart")} />
      </div>
    </div>
  );
}
