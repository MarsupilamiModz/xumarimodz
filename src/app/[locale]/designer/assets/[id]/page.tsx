import { notFound } from "next/navigation";
import { getGamesAndCategories } from "@/lib/data";
import { getModForEdit } from "@/actions/mods";
import { ModAdminPanel } from "@/components/admin/mod-admin-panel";
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

  const [result, games] = await Promise.all([getModForEdit(id), getGamesAndCategories()]);
  if (!result.success) notFound();

  return (
    <ModAdminPanel
      locale={locale}
      games={games}
      mod={result.data}
      redirectBase="/designer/assets"
    />
  );
}
