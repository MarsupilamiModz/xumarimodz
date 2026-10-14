import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getGamesAndCategories } from "@/lib/data";
import { getModForEdit } from "@/actions/mods";
import { ModAdminPanel } from "@/components/admin/mod-admin-panel";
import { PageHeader } from "@/components/ui/page-header";
import type { Locale } from "@/i18n/config";

export default async function DesignerAssetPage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  const [result, games, tp] = await Promise.all([
    getModForEdit(id),
    getGamesAndCategories(),
    getTranslations("partnerPages.designerAsset"),
  ]);
  if (!result.success) notFound();

  return (
    <div>
      <PageHeader title={result.data.title} description={tp("description")} />
      <ModAdminPanel
        locale={locale}
        games={games}
        mod={result.data}
        redirectBase="/designer/assets"
        showTitle={false}
      />
    </div>
  );
}
