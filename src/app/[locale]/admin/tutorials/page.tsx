import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireRole } from "@/lib/auth";
import { getTutorialsAdminData } from "@/actions/admin/tutorials";
import { TutorialsAdminPanel } from "@/components/admin/tutorials-admin-panel";

export default async function AdminTutorialsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requireRole("OWNER", "ADMIN", "CREATOR");
  const result = await getTutorialsAdminData();
  return (
    <div>
      <AdminPageHeader title="Tutorials" />
      {result.success ? <TutorialsAdminPanel data={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
