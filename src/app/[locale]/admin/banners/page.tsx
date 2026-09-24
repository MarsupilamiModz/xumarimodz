import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getAdminSiteBanners } from "@/actions/admin/banners";
import { BannersAdminPanel } from "@/components/admin/banners-admin-panel";

export default async function AdminBannersPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin");
  const result = await getAdminSiteBanners();
  return (
    <div>
      <AdminPageHeader title={t("nav.announcements")} />
      {result.success ? <BannersAdminPanel banners={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
