import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/auth";
import { getOwnerEmailMonitor } from "@/actions/admin/email-monitor";
import { EmailMonitorPanel } from "@/components/admin/email-monitor-panel";

export default async function OwnerEmailPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations("admin");
  const result = await getOwnerEmailMonitor();
  return (
    <div>
      <AdminPageHeader title={t("nav.email")} />
      {result.success ? <EmailMonitorPanel data={result.data} locale={locale} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
