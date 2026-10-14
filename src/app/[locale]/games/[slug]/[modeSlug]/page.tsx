import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft, Layers } from "lucide-react";
import { getGameModeBySlug } from "@/lib/game-modes";
import { getMods } from "@/lib/data";
import { ModCard } from "@/components/mods/mod-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import { SITE } from "@/lib/site";
import { PageHeader } from "@/components/ui/page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import type { Locale } from "@/i18n/config";

const SORTS = ["", "date", "likes"] as const;

export async function generateMetadata(
  props: {
    params: Promise<{ slug: string; modeSlug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    slug,
    modeSlug
  } = params;

  const mode = await getGameModeBySlug(slug, modeSlug).catch(() => null);
  if (!mode) return { title: "Mods" };
  const title = `${mode.name} – ${mode.game.name} Mods`;
  return {
    title,
    description: mode.description ?? mode.game.seoDescription ?? mode.game.description ?? undefined,
    openGraph: { title: `${title} | ${SITE.name}`, images: mode.game.bannerUrl ? [{ url: mode.game.bannerUrl }] : undefined },
  };
}

/** Katalog eines Spielbereichs (Ziel der Spielkarten, der Bereichsauswahl und des Spiele-Menüs). */
export default async function GameModePage(
  props: {
    params: Promise<{ locale: Locale; slug: string; modeSlug: string }>;
    searchParams: Promise<{ sort?: string; page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale,
    slug,
    modeSlug
  } = params;

  setRequestLocale(locale);
  const mode = await getGameModeBySlug(slug, modeSlug).catch(() => null);
  if (!mode) notFound();

  const [t, tg] = await Promise.all([getTranslations("mods"), getTranslations("games")]);
  const sort = SORTS.includes(searchParams.sort as (typeof SORTS)[number]) ? searchParams.sort ?? "" : "";
  const page = Math.max(1, Number(searchParams.page) || 1);
  const { mods, total, pages } = await getMods({ gameSlug: slug, modeSlug, sort: sort || undefined, page }).catch(() => ({
    mods: [],
    total: 0,
    pages: 0,
  }));

  const pricingLabels: Record<string, string> = { FREE: t("free"), PREMIUM: t("premium"), PAID: t("paid") };
  const base = `/${locale}/games/${slug}/${modeSlug}`;
  const hrefFor = (p: number, s = sort) => {
    const params = new URLSearchParams();
    if (s) params.set("sort", s);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `${base}${qs ? `?${qs}` : ""}`;
  };
  const sortLabel: Record<string, string> = { "": t("sortPopular"), date: t("sortNewest"), likes: t("sortLikes") };

  return (
    <div className="page-section pt-8 md:pt-10">
      <Link href={`/${locale}/games/${slug}`} className="meta mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
        {tg("modeBack", { game: mode.game.name })}
      </Link>
      <PageHeader
        title={mode.name}
        description={mode.description ?? tg("modeSubtitle", { mode: mode.name, game: mode.game.name })}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="meta tabular-nums">{t("resultsCount", { count: total })}</p>
        <ChipTabs
          label={t("sortLabel")}
          options={SORTS.map((s) => ({ value: s, label: sortLabel[s] }))}
          value={sort}
          hrefFor={(s) => hrefFor(1, s)}
        />
      </div>

      <AdLocationSlot location="listing" className="mt-6" />

      {mods.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Layers}
          title={tg("modeEmpty")}
          action={
            <Link href={`/${locale}/mods?game=${slug}`} className="link text-sm font-semibold">
              {tg("allModsOfGame", { game: mode.game.name })}
            </Link>
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
          {mods.map((mod) => (
            <ModCard key={mod.id} locale={locale} mod={mod} pricingLabel={pricingLabels[mod.pricing] ?? mod.pricing} />
          ))}
        </div>
      )}

      <Pagination className="mt-10" page={page} pages={pages} hrefFor={(p) => hrefFor(p)} />
    </div>
  );
}
