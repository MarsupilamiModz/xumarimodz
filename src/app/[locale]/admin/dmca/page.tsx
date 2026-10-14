import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getAdminDMCAClaims } from "@/actions/admin/trust";
import { DMCAAdminPanel } from "@/components/admin/dmca-admin-panel";

export default async function AdminDmcaPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("moderation.reports");
  const [t, result] = await Promise.all([getTranslations("admin.dmcaAdmin"), getAdminDMCAClaims()]);
  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? <DMCAAdminPanel claims={result.data.claims} locale={locale} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
