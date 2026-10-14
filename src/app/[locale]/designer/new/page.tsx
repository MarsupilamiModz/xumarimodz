import { getGamesAndCategories } from "@/lib/data";
import { ModAdminPanel } from "@/components/admin/mod-admin-panel";
import { PageHeader } from "@/components/ui/page-header";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";

export default async function DesignerNewAssetPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const [t, tp, games] = await Promise.all([
    getTranslations("designer"),
    getTranslations("partnerPages.designerNew"),
    getGamesAndCategories(),
  ]);

  return (
    <div>
      <PageHeader title={t("newAsset")} description={tp("description")} />
      <ModAdminPanel locale={locale} games={games} redirectBase="/designer/assets" showTitle={false} />
    </div>
  );
}
