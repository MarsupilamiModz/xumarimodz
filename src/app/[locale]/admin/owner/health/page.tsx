import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requireOwner } from "@/lib/auth";
import { getOwnerHealthMonitor } from "@/actions/admin/health-monitor";
import { SystemHealthMonitor } from "@/components/admin/system-health-monitor";

export default async function OwnerHealthPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireOwner();
  const t = await getTranslations("admin");
  const result = await getOwnerHealthMonitor();
  return (
    <div>
      <AdminPageHeader title={t("healthMonitor")} description={t("ownerHealth.subtitle")} />
      {result.success ? <SystemHealthMonitor initial={result.data} /> : <AdminLoadError message={result.error} />}
    </div>
  );
}
