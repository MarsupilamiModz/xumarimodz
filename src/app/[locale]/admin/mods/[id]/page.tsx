import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { getGamesAndCategories, getCreatorsForSelect } from "@/lib/data";
import { getModForEdit } from "@/actions/mods";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ModAdminPanel } from "@/components/admin/mod-admin-panel";
import { getMediaSettings } from "@/lib/media-settings";
import type { Locale } from "@/i18n/config";

export default async function AdminEditModPage({
  params: { locale, id },
}: {
  params: { locale: Locale; id: string };
}) {
  setRequestLocale(locale);
  await requireAdmin();
  const [result, games, authors, mediaSettings, t] = await Promise.all([
    getModForEdit(id),
    getGamesAndCategories(),
    getCreatorsForSelect(),
    getMediaSettings(),
    getTranslations("admin"),
  ]);

  if (!result.success) notFound();

  return (
    <div>
      <AdminPageHeader
        title={result.data.title}
        section={t("mp.edit")}
        parent={{ label: t("mp.title"), href: `/${locale}/admin/mods` }}
      />
      <ModAdminPanel
        locale={locale}
        games={games}
        authors={authors}
        mod={result.data}
        mediaSettings={mediaSettings}
        isAdmin
        redirectBase="/admin/mods"
        showTitle={false}
      />
    </div>
  );
}
