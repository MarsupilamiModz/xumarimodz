import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireAdmin } from "@/lib/auth";
import { getPartnerAdsCenterData } from "@/actions/admin/partner-ads";
import { PartnerAdsAdminPanel } from "@/components/admin/partner-ads-admin-panel";

export default async function AdminPartnerAdsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAdmin();
  const [t, tp, result] = await Promise.all([
    getTranslations("admin"),
    getTranslations("admin.partnerAdsAdmin"),
    getPartnerAdsCenterData(),
  ]);
  return (
    <div>
      <AdminPageHeader title={tp("title")} description={tp("subtitle")} parent={{ label: t("nav.ads"), href: `/${locale}/admin/ads` }} />
      {result.success ? (
        <PartnerAdsAdminPanel partners={result.data.partners} analytics={result.data.analytics} locale={locale} />
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
