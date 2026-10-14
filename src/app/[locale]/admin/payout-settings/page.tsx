import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getAdminRevenueShareDashboard } from "@/actions/admin/revenue-sharing";
import { RevenueSharingPanel } from "@/components/admin/revenue-sharing-panel";

export default async function AdminPayoutSettingsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin");
  const result = await getAdminRevenueShareDashboard();
  return (
    <div>
      <AdminPageHeader title={t("ui.revenueSharing.heading")} description={t("ui.revenueSharing.subheading")} />
      {result.success ? <RevenueSharingPanel data={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
