import { requirePagePermission } from "@/lib/auth";
import { listCollectionsAdmin } from "@/actions/admin/collections";
import { CollectionsAdminPanel } from "@/components/admin/collections-admin-panel";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);
  const admin = await requirePagePermission("settings.write");

  const result = await listCollectionsAdmin();
  const collections = result.success ? result.data.items : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1-acp">Collections & Modpacks</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Moderate, feature, and manage platform collections
        </p>
      </div>
      <CollectionsAdminPanel collections={collections} locale={locale} adminUserId={admin.id} />
    </div>
  );
}
