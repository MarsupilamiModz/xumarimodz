import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getScreenshotDiagnostics } from "@/actions/admin/screenshot-diagnostics";
import { ScreenshotDiagnosticsPanel } from "@/components/admin/screenshot-diagnostics-panel";

export default async function AdminScreenshotDiagnosticsPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, ts, result] = await Promise.all([
    getTranslations("admin"),
    getTranslations("admin.screenshotDiag"),
    getScreenshotDiagnostics(),
  ]);
  return (
    <div>
      <AdminPageHeader
        title={ts("title")}
        description={ts("subtitle")}
        parent={{ label: t("nav.media"), href: `/${locale}/admin/media` }}
      />
      {result.success ? <ScreenshotDiagnosticsPanel locale={locale} initial={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
