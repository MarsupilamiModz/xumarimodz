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
  const t = await getTranslations("admin");
  const result = await getPartnerAdsCenterData();
  return (
    <div>
      <AdminPageHeader title={t("nav.ads")} />
      {result.success ? (
        <PartnerAdsAdminPanel partners={result.data.partners} analytics={result.data.analytics} />
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
