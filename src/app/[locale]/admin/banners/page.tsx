import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getAdminSiteBanners } from "@/actions/admin/banners";
import { BannersAdminPanel } from "@/components/admin/banners-admin-panel";

export default async function AdminBannersPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, tp, result] = await Promise.all([
    getTranslations("admin"),
    getTranslations("admin.siteBanners"),
    getAdminSiteBanners(),
  ]);
  return (
    <div>
      <AdminPageHeader title={t("nav.announcements")} description={tp("subtitle")} />
      {result.success ? <BannersAdminPanel banners={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
