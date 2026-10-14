import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader, AdminLoadError } from "@/components/admin/admin-page-header";
import type { Locale } from "@/i18n/config";
import { requirePagePermission } from "@/lib/auth";
import { getGamesAndCategories, getCreatorsForSelect } from "@/lib/data";
import { AdminSoundUploadPanel } from "@/components/admin/admin-sound-upload-panel";

export default async function AdminNewSoundPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("mods.write");
  const t = await getTranslations("admin");
  const [catalog, authors] = await Promise.all([getGamesAndCategories(), getCreatorsForSelect()]);
  const games = catalog.map((g) => ({ id: g.id, name: g.name, categories: g.categories }));
  return (
    <div>
      <AdminPageHeader title={t("uploadSound")} parent={{ label: t("mp.title"), href: `/${locale}/admin/mods` }} />
      <AdminSoundUploadPanel locale={locale} games={games} authors={authors} />
    </div>
  );
}
