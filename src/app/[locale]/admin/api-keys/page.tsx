import { requirePagePermission } from "@/lib/auth";
import { listApiKeysAdmin } from "@/actions/admin/api-keys";
import { ApiKeysPanel } from "@/components/admin/api-keys-panel";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";

export default async function AdminApiKeysPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  await requirePagePermission("settings.write");
  const t = await getTranslations("admin.apiKeys");

  const result = await listApiKeysAdmin();
  const data = result.success
    ? result.data
    : {
        keys: [],
        totals: { _sum: { requestCount: null, errorCount: null, uploadCount: null, uploadBytes: null }, _count: 0 },
        recentLogs: [],
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
      </div>
      <ApiKeysPanel keys={data.keys} totals={data.totals} recentLogs={data.recentLogs} />
    </div>
  );
}
