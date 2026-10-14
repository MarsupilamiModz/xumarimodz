import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/auth";
import { getOwnerEmailMonitor } from "@/actions/admin/email-monitor";
import { EmailMonitorPanel } from "@/components/admin/email-monitor-panel";

export default async function OwnerEmailPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations("admin.ui.emailMonitor");
  const result = await getOwnerEmailMonitor();
  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? <EmailMonitorPanel data={result.data} locale={locale} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
