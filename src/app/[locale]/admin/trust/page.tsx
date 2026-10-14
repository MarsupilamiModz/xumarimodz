import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getTrustCenterStats } from "@/actions/admin/trust";
import { KpiTile } from "@/components/ui/kpi-tile";
import { formatNumber } from "@/lib/format-locale";

export default async function AdminTrustPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("moderation.reports");
  const [t, tb, result] = await Promise.all([getTranslations("admin"), getTranslations("admin.trustPage"), getTrustCenterStats()]);
  const stats = result.success
    ? [
        { key: "openReports", value: result.data.openReports, href: `/${locale}/admin/reports`, warn: result.data.openReports > 0 },
        { key: "malwareReports", value: result.data.malwareReports, href: `/${locale}/admin/reports`, warn: result.data.malwareReports > 0 },
        { key: "openDMCA", value: result.data.openDMCA, href: `/${locale}/admin/dmca`, warn: result.data.openDMCA > 0 },
        { key: "resolvedReports", value: result.data.resolvedReports, href: `/${locale}/admin/reports` },
        { key: "searchQueries", value: result.data.searchQueries },
        { key: "recommendationClicks", value: result.data.recommendationClicks },
      ]
    : [];
  return (
    <div>
      <AdminPageHeader title={t("trustCenter")} description={tb("subtitle")} />
      {!result.success ? (
        <AdminLoadError message={result.error} />
      ) : (
        <section aria-label={tb("statsLabel")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stats.map((s) => (
            <KpiTile
              key={s.key}
              label={tb(`stat.${s.key}`)}
              value={formatNumber(s.value, locale)}
              href={s.href}
              hint={s.href ? tb("open") : undefined}
              tone={s.warn ? "warning" : undefined}
            />
          ))}
        </section>
      )}
    </div>
  );
}
