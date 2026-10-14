import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ModsCatalogClient, type CatalogFilters } from "@/components/mods/mods-catalog-client";
import { ModGridSkeleton } from "@/components/ui/page-skeleton";
import { Pagination } from "@/components/ui/pagination";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import { getAllGames, getCatalogCategories, getMods } from "@/lib/data";
import type { Locale } from "@/i18n/config";

type SearchParams = CatalogFilters & { page?: string };

const FILTER_KEYS = ["q", "game", "category", "pricing", "sort", "type", "audioCategory", "genre", "view"] as const;

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "mods" });
  return { title: t("title"), description: t("subtitle") };
}

function pickFilters(searchParams: SearchParams): CatalogFilters {
  const out: CatalogFilters = {};
  for (const key of FILTER_KEYS) {
    const value = searchParams[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

async function CatalogContent({ locale, searchParams }: { locale: Locale; searchParams: SearchParams }) {
  const filters = pickFilters(searchParams);
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [{ mods, total, pages }, games, categories] = await Promise.all([
    getMods({
      search: filters.q,
      gameSlug: filters.game,
      categorySlug: filters.game ? filters.category : undefined,
      pricing: filters.pricing,
      sort: filters.sort,
      productType: filters.type,
      audioCategory: filters.audioCategory,
      genre: filters.genre,
      page,
    }),
    getAllGames(),
    filters.game ? getCatalogCategories(filters.game).catch(() => []) : Promise.resolve([]),
  ]);

  const hrefFor = (p: number) => {
    const params = new URLSearchParams(filters as Record<string, string>);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/${locale}/mods${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <ModsCatalogClient
        locale={locale}
        initialMods={mods}
        games={games}
        categories={categories}
        total={total}
        filters={filters}
        listingAdBreak={<AdLocationSlot location="listing" className="my-2" />}
      />
      <Pagination className="mt-10" page={page} pages={pages} hrefFor={hrefFor} />
    </>
  );
}

export default async function ModsPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<SearchParams>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("mods");

  return (
    <div className="page-section">
      <h1 className="h1-display">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">{t("subtitle")}</p>
      <Suspense fallback={<ModGridSkeleton />}>
        <CatalogContent locale={locale} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
