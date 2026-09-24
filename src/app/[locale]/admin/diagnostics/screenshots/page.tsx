import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getScreenshotDiagnostics } from "@/actions/admin/screenshot-diagnostics";
import { ScreenshotDiagnosticsPanel } from "@/components/admin/screenshot-diagnostics-panel";

export default async function AdminScreenshotDiagnosticsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin");
  const result = await getScreenshotDiagnostics();
  return (
    <div>
      <AdminPageHeader title={t("nav.media")} />
      {result.success ? <ScreenshotDiagnosticsPanel locale={locale} initial={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
