import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ModCard } from "@/components/mods/mod-card";
import { Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchField } from "@/components/ui/search-field";
import { EmptyState } from "@/components/ui/empty-state";
import { controlClassName } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { CategoryNav } from "@/components/games/category-nav";
import { GameHeroBanner } from "@/components/games/game-hero-banner";
import { getGamePageData, getMods } from "@/lib/data";
import { getGameCoverOverrides } from "@/lib/branding";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import { REVALIDATE } from "@/lib/cache";
import { SITE } from "@/lib/site";
import type { Locale } from "@/i18n/config";

export const revalidate = 60; // REVALIDATE.catalog – Next verlangt ein Literal

export async function generateMetadata(
  props: {
    params: Promise<{ locale: Locale; slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  const data = await getGamePageData(slug);
  if (!data) {
    const t = await getTranslations({ locale, namespace: "publicPages.games" });
    return { title: t("notFound") };
  }

  const { game } = data;
  return {
    title: game.seoTitle ?? `${game.name} Mods`,
    description: game.seoDescription ?? game.description ?? undefined,
    openGraph: {
      title: `${game.name} Mods | ${SITE.name}`,
      description: game.seoDescription ?? game.description ?? undefined,
      images: game.bannerUrl ? [{ url: game.bannerUrl }] : undefined,
    },
  };
}

export default async function GameDetailPage(
  props: {
    params: Promise<{ locale: Locale; slug: string }>;
    searchParams: Promise<{ q?: string; pricing?: string; category?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("mods");
  const tg = await getTranslations("games");

  const pageData = await getGamePageData(slug);
  if (!pageData) notFound();

  const { game, featured, trending, premium, creatorCount } = pageData;
  const covers = await getGameCoverOverrides();
  const cover = covers[game.id];
  // Neues Design: keine Verläufe – cover.backgroundGradient bleibt gespeichert, wird aber nicht angezeigt.
  const heroStyle = undefined;

  const { mods: filteredMods } = await getMods({
    gameSlug: slug,
    search: searchParams.q,
    pricing: searchParams.pricing,
    categorySlug: searchParams.category,
    limit: 24,
  });

  return (
    <div>
      <GameHeroBanner
        name={game.name}
        description={game.description}
        shortDescription={game.shortDescription}
        iconUrl={game.iconUrl}
        bannerUrl={cover?.heroBannerUrl ?? game.bannerUrl}
        coverUrl={game.coverUrl}
        isFeatured={game.isFeatured}
        modCount={game._count.mods}
        creatorCount={creatorCount}
        featuredLabel={tg("featured")}
        modsLabel={tg("modsCount", { count: game._count.mods })}
        creatorsLabel={tg("creatorsCount", { count: creatorCount })}
        banner={{
          bannerDisplayType: game.bannerDisplayType,
          bannerHeightPx: game.bannerHeightPx,
          bannerFocusX: game.bannerFocusX,
          bannerFocusY: game.bannerFocusY,
          bannerZoom: game.bannerZoom,
          bannerAlign: game.bannerAlign,
        }}
        gradientStyle={heroStyle}
      />

      {game.categories.length > 0 && (
        <CategoryNav
          locale={locale}
          gameSlug={slug}
          categories={game.categories}
          activeSlug={searchParams.category}
          allLabel={tg("allCategories")}
          label={tg("categories")}
          breadcrumbLabel={t("breadcrumb")}
        />
      )}

      <div className="page-container py-8">
        <AdLocationSlot location="category" className="mb-6" />
        <form role="search" className="mb-10 flex flex-wrap gap-3">
          <SearchField name="q" defaultValue={searchParams.q} label={t("search")} className="max-w-md flex-1" />
          <label htmlFor="game-pricing" className="sr-only">
            {t("pricingLabel")}
          </label>
          <select
            id="game-pricing"
            name="pricing"
            defaultValue={searchParams.pricing}
            className={cn(controlClassName, "h-9 w-auto")}
          >
            <option value="">{tg("allTypes")}</option>
            <option value="FREE">{t("free")}</option>
            <option value="PREMIUM">{t("premium")}</option>
            <option value="PAID">{t("paid")}</option>
          </select>
          <Button type="submit">{t("filter")}</Button>
        </form>

        {featured.length > 0 && !searchParams.q && (
          <section aria-labelledby="game-featured" className="mb-12">
            <h2 id="game-featured" className="mb-4 text-lg font-semibold text-ink">{tg("featuredMods")}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((mod) => (
                <ModCard key={mod.id} locale={locale} mod={mod} />
              ))}
            </div>
          </section>
        )}

        {premium.length > 0 && !searchParams.q && (
          <section aria-labelledby="game-premium" className="mb-12">
            <h2 id="game-premium" className="mb-4 text-lg font-semibold text-ink">{tg("premiumMods")}</h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {premium.map((mod) => (
                <ModCard key={mod.id} locale={locale} mod={mod} />
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="game-results" className="mb-12">
          <h2 id="game-results" className="mb-4 text-lg font-semibold text-ink">
            {searchParams.q || searchParams.category ? tg("results") : tg("trendingMods")}
          </h2>
          {filteredMods.length === 0 && trending.length === 0 ? (
            <EmptyState icon={Layers} title={tg("noModsYet")} />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(filteredMods.length ? filteredMods : trending).map((mod) => (
                <ModCard key={mod.id} locale={locale} mod={mod} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
