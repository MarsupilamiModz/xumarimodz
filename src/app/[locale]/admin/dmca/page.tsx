import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getAdminDMCAClaims } from "@/actions/admin/trust";
import { DMCAAdminPanel } from "@/components/admin/dmca-admin-panel";

export default async function AdminDmcaPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("moderation.reports");
  const result = await getAdminDMCAClaims();
  return (
    <div>
      <AdminPageHeader title="DMCA" />
      {result.success ? <DMCAAdminPanel claims={result.data.claims} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
