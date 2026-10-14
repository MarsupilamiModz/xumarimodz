import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireRole } from "@/lib/auth";
import { getTutorialsAdminData } from "@/actions/admin/tutorials";
import { TutorialsAdminPanel } from "@/components/admin/tutorials-admin-panel";

export default async function AdminTutorialsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireRole("OWNER", "ADMIN", "CREATOR");
  const [t, result] = await Promise.all([getTranslations("admin"), getTutorialsAdminData()]);
  return (
    <div>
      <AdminPageHeader title={t("tutorials")} description={t("tutorialsAdmin.subtitle")} />
      {result.success ? <TutorialsAdminPanel data={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
