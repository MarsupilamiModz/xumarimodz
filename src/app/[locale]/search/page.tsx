import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchPageClient } from "@/components/search/search-page-client";
import { getAllGames, getTrendingMods } from "@/lib/data";
import { getPopularTags } from "@/lib/discovery";
import type { Locale } from "@/i18n/config";

const SORTS = ["downloads", "trending", "rating", "newest", "updated", "likes"] as const;
type Sort = (typeof SORTS)[number];

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "search" });
  // Suchergebnisse nicht indexieren (dünner, doppelter Inhalt).
  return { title: t("pageTitle"), robots: { index: false, follow: true } };
}

export default async function SearchPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ q?: string; tag?: string; game?: string; sort?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const sort: Sort = SORTS.includes(searchParams.sort as Sort) ? (searchParams.sort as Sort) : "downloads";

  const [games, tags, trending] = await Promise.all([
    getAllGames().catch(() => []),
    Promise.resolve(getPopularTags(24)).catch(() => []),
    getTrendingMods(8).catch(() => []),
  ]);

  return (
    <SearchPageClient
      locale={locale}
      initialQuery={searchParams.q?.trim() ?? ""}
      initialTag={searchParams.tag}
      initialGame={searchParams.game}
      initialSort={sort}
      popularTags={tags}
      games={games.map((g) => ({ slug: g.slug, name: g.name }))}
      trendingMods={trending}
    />
  );
}
