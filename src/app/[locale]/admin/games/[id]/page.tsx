import { requirePagePermission } from "@/lib/auth";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { getAdminGame } from "@/actions/admin/games";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { GameForm } from "@/components/admin/game-form";
import { GameBannerSettings } from "@/components/admin/game-banner-settings";
import { CategoryTreeEditor } from "@/components/admin/category-tree-editor";
import type { Locale } from "@/i18n/config";

export default async function EditGamePage(
  props: {
    params: Promise<{ locale: Locale; id: string }>;
  }
) {
  const params = await props.params;

  const {
    locale,
    id
  } = params;

  await requirePagePermission("games.write");
  setRequestLocale(locale);
  const [t, tg] = await Promise.all([getTranslations("admin.gameEdit"), getTranslations("admin.gamesAdmin")]);
  const result = await getAdminGame(id);
  if (!result.success) notFound();

  const game = result.data;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={game.name}
        section={t("section")}
        parent={{ label: tg("title"), href: `/${locale}/admin/games` }}
      />
      <GameForm
        locale={locale}
        game={{
          id: game.id,
          name: game.name,
          slug: game.slug,
          description: game.description,
          shortDescription: game.shortDescription,
          seoTitle: game.seoTitle,
          seoDescription: game.seoDescription,
          isFeatured: game.isFeatured,
          isActive: game.isActive,
          sortOrder: game.sortOrder,
          iconUrl: game.iconUrl,
          bannerUrl: game.bannerUrl,
          coverUrl: game.coverUrl,
        }}
      />
      <GameBannerSettings
        gameId={game.id}
        bannerUrl={game.bannerUrl}
        coverUrl={game.coverUrl}
        settings={{
          bannerDisplayType: game.bannerDisplayType,
          bannerHeightPx: game.bannerHeightPx,
          bannerFocusX: game.bannerFocusX,
          bannerFocusY: game.bannerFocusY,
          bannerZoom: game.bannerZoom,
          bannerAlign: game.bannerAlign,
        }}
      />
      <CategoryTreeEditor gameId={game.id} categories={game.categories} />
    </div>
  );
}
