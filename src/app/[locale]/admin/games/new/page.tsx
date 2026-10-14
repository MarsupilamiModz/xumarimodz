import { requirePagePermission } from "@/lib/auth";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GameForm } from "@/components/admin/game-form";
import type { Locale } from "@/i18n/config";

export default async function NewGamePage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  await requirePagePermission("games.write");
  const [t, tg] = await Promise.all([getTranslations("admin.gameEdit"), getTranslations("admin.gamesAdmin")]);
  return (
    <div>
      <AdminPageHeader
        title={t("newTitle")}
        description={t("newSubtitle")}
        parent={{ label: tg("title"), href: `/${locale}/admin/games` }}
      />
      <GameForm locale={locale} />
    </div>
  );
}
