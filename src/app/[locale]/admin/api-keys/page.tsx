import { getTranslations, setRequestLocale } from "next-intl/server";
import { requirePagePermission } from "@/lib/auth";
import { listApiKeysAdmin } from "@/actions/admin/api-keys";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import { ApiKeysPanel } from "@/components/admin/api-keys-panel";
import type { Locale } from "@/i18n/config";

export default async function AdminApiKeysPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const [t, result] = await Promise.all([getTranslations("admin.ak"), listApiKeysAdmin()]);

  return (
    <div>
      <AdminPageHeader title={t("title")} description={t("subtitle")} />
      {result.success ? (
        <ApiKeysPanel locale={locale} keys={result.data.keys} totals={result.data.totals} recentLogs={result.data.recentLogs} />
      ) : (
        <AdminLoadError message={result.error} />
      )}
    </div>
  );
}
