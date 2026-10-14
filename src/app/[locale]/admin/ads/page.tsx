import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { getAdminAdDashboard } from "@/actions/admin/ads";
import { formatNumber } from "@/lib/format-locale";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { AdsAdminPanel } from "@/components/admin/ads-admin-panel";
import { AdsOverview } from "@/components/admin/ads-overview";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { KpiTile } from "@/components/ui/kpi-tile";
import type { Locale } from "@/i18n/config";

export default async function AdminAdsPage(
  props: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ tab?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin.ad");
  const base = `/${locale}/admin/ads`;
  const tab = searchParams.tab === "providers" ? "providers" : "overview";
  const result = await getAdminAdDashboard();

  const tabs = (
    <ChipTabs
      label={t("tabs")}
      value={tab}
      options={[
        { value: "overview", label: t("tabOverview") },
        { value: "providers", label: t("tabProviders") },
      ]}
      hrefFor={(v) => (v === "overview" ? base : `${base}?tab=${v}`)}
    />
  );

  if (!result.success) {
    return (
      <div>
        <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
        <AdminLoadError message={result.error} />
      </div>
    );
  }

  const { settings, placements, totalImpressions, totalClicks } = result.data;
  const ctr = totalImpressions > 0 ? `${((totalClicks / totalImpressions) * 100).toFixed(2)} %` : "—";

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} actions={tabs} />
      {tab === "providers" ? (
        <AdsAdminPanel data={result.data} />
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <KpiTile label={t("impressions")} value={formatNumber(totalImpressions, locale)} />
            <KpiTile label={t("clicks")} value={formatNumber(totalClicks, locale)} />
            <KpiTile label={t("ctr")} value={ctr} />
          </div>
          <AdsOverview
            locale={locale}
            settings={settings}
            campaigns={placements.map((p) => ({
              id: p.id,
              name: p.name,
              location: p.location,
              format: p.format,
              width: p.width,
              height: p.height,
              isEnabled: p.isEnabled,
              scheduleStart: p.scheduleStart?.toISOString() ?? null,
              scheduleEnd: p.scheduleEnd?.toISOString() ?? null,
              impressions: p.impressions,
              clicks: p.clicks,
            }))}
          />
        </>
      )}
    </div>
  );
}
