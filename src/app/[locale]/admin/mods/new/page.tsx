import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { getGamesAndCategories, getCreatorsForSelect } from "@/lib/data";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { ModAdminPanel } from "@/components/admin/mod-admin-panel";
import type { Locale } from "@/i18n/config";

export default async function AdminNewModPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requireAdmin();
  const [t, games, authors] = await Promise.all([getTranslations("admin"), getGamesAndCategories(), getCreatorsForSelect()]);

  return (
    <div>
      <AdminPageHeader title={t("uploadMod")} parent={{ label: t("mp.title"), href: `/${locale}/admin/mods` }} />
      <ModAdminPanel
        locale={locale}
        games={games}
        authors={authors}
        isAdmin
        redirectBase="/admin/mods"
        showTitle={false}
      />
    </div>
  );
}
