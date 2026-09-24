"use client";

import { Fragment, useCallback, useEffect, useId, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, SearchX, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { ModCard } from "@/components/mods/mod-card";
import { SOUND_CATEGORIES } from "@/lib/sound";
import { cn } from "@/lib/utils";

type Game = { id: string; slug: string; name: string };
type Category = { id: string; slug: string; name: string };
type Mod = Parameters<typeof ModCard>[0]["mod"];

export type CatalogFilters = {
  q?: string;
  game?: string;
  category?: string;
  pricing?: string;
  sort?: string;
  type?: string;
  audioCategory?: string;
  genre?: string;
};

const selectClass =
  "h-10 w-full rounded-md border border-line-control bg-elevated px-3 text-sm text-ink transition-colors duration-fast hover:border-ink-faint disabled:cursor-not-allowed disabled:opacity-50";
const labelClass = "mb-1.5 block text-[13px] font-semibold text-ink";

export function ModsCatalogClient({
  locale,
  initialMods,
  games,
  categories,
  total,
  filters,
  listingAdBreak,
}: {
  locale: string;
  initialMods: Mod[];
  games: Game[];
  categories: Category[];
  total: number;
  filters: CatalogFilters;
  listingAdBreak?: React.ReactNode;
}) {
  const t = useTranslations("mods");
  const ts = useTranslations("sounds");
  const router = useRouter();
  const searchParams = useSearchParams();
  const panelId = useId();
  const [q, setQ] = useState(filters.q ?? "");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const pushFilters = useCallback(
    (next: Partial<CatalogFilters>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(next)) {
        if (val === undefined) continue;
        if (val) params.set(key, val);
        else params.delete(key);
      }
      // Jede Filteränderung startet auf Seite 1; Kategorie gilt nur mit Spiel.
      params.delete("page");
      if ("game" in next) params.delete("category");
      const qs = params.toString();
      startTransition(() => {
        router.push(`/${locale}/mods${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [locale, router, searchParams]
  );

  // Suche mit kurzer Verzögerung, damit nicht jeder Tastendruck lädt.
  useEffect(() => {
    const timer = setTimeout(() => {
      if (q !== (filters.q ?? "")) pushFilters({ q });
    }, 350);
    return () => clearTimeout(timer);
  }, [q, filters.q, pushFilters]);

  const pricingLabels: Record<string, string> = {
    FREE: t("free"),
    PREMIUM: t("premium"),
    PAID: t("paid"),
  };
  const hasFilters = Boolean(
    filters.q || filters.game || filters.category || filters.pricing || filters.type || filters.audioCategory || filters.genre
  );
  const showSoundFilters = filters.type === "SOUND";

  const resetFilters = () => {
    setQ("");
    startTransition(() => router.push(`/${locale}/mods`, { scroll: false }));
  };

  return (
    <div className="mt-8 flex flex-col gap-8 lg:flex-row">
      {/* Filter: Seitenleiste ab lg, darunter ausklappbar */}
      <div className="lg:w-64 lg:shrink-0">
        <Button
          type="button"
          variant="outline"
          className="w-full lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls={panelId}
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {t("showFilters")}
        </Button>
        <div
          id={panelId}
          className={cn(
            "mt-4 space-y-5 rounded-lg border border-line bg-raised p-5 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:mt-0 lg:block",
            filtersOpen ? "block" : "hidden"
          )}
        >
          <div>
            <label htmlFor="filter-game" className={labelClass}>{t("gameLabel")}</label>
            <select
              id="filter-game"
              value={filters.game ?? ""}
              onChange={(e) => pushFilters({ game: e.target.value })}
              className={selectClass}
            >
              <option value="">{t("allGames")}</option>
              {games.map((g) => (
                <option key={g.id} value={g.slug}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filter-category" className={labelClass}>{t("categoryLabel")}</label>
            <select
              id="filter-category"
              value={filters.category ?? ""}
              onChange={(e) => pushFilters({ category: e.target.value })}
              disabled={!filters.game || categories.length === 0}
              className={selectClass}
              aria-describedby={!filters.game ? "filter-category-hint" : undefined}
            >
              <option value="">{t("allCategories")}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            {!filters.game && (
              <p id="filter-category-hint" className="meta mt-1">
                {t("chooseGameFirst")}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="filter-type" className={labelClass}>{t("typeLabel")}</label>
            <select
              id="filter-type"
              value={filters.type ?? ""}
              onChange={(e) => pushFilters({ type: e.target.value, ...(e.target.value !== "SOUND" && { audioCategory: "", genre: "" }) })}
              className={selectClass}
            >
              <option value="">{ts("filterAllTypes")}</option>
              <option value="MOD">{ts("typeMod")}</option>
              <option value="SOUND">{ts("typeSound")}</option>
            </select>
          </div>

          {showSoundFilters && (
            <>
              <div>
                <label htmlFor="filter-audio" className={labelClass}>{ts("allAudioCategories")}</label>
                <select
                  id="filter-audio"
                  value={filters.audioCategory ?? ""}
                  onChange={(e) => pushFilters({ audioCategory: e.target.value })}
                  className={selectClass}
                >
                  <option value="">{ts("allAudioCategories")}</option>
                  {SOUND_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {ts(`categories.${c.labelKey}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filter-genre" className={labelClass}>{t("genreLabel")}</label>
                <Input
                  id="filter-genre"
                  defaultValue={filters.genre ?? ""}
                  onBlur={(e) => pushFilters({ genre: e.target.value.trim() })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") pushFilters({ genre: e.currentTarget.value.trim() });
                  }}
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="filter-pricing" className={labelClass}>{t("pricingLabel")}</label>
            <select
              id="filter-pricing"
              value={filters.pricing ?? ""}
              onChange={(e) => pushFilters({ pricing: e.target.value })}
              className={selectClass}
            >
              <option value="">{t("allPricing")}</option>
              <option value="FREE">{t("free")}</option>
              <option value="PREMIUM">{t("premium")}</option>
              <option value="PAID">{t("paid")}</option>
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="filter-premium" className="text-sm font-semibold text-ink">
              {t("premiumOnly")}
            </label>
            <Switch
              id="filter-premium"
              checked={filters.pricing === "PREMIUM"}
              onCheckedChange={(checked) => pushFilters({ pricing: checked ? "PREMIUM" : "" })}
            />
          </div>

          {hasFilters && (
            <button type="button" onClick={resetFilters} className="link text-sm font-semibold">
              {t("resetFilters")}
            </button>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <label htmlFor="catalog-search" className="sr-only">{t("searchLabel")}</label>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input
              id="catalog-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search")}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="catalog-sort" className="text-sm text-ink-muted">{t("sortLabel")}</label>
            <select
              id="catalog-sort"
              value={filters.sort ?? ""}
              onChange={(e) => pushFilters({ sort: e.target.value })}
              className={cn(selectClass, "w-auto")}
            >
              <option value="">{t("sortPopular")}</option>
              <option value="date">{t("sortNewest")}</option>
              <option value="likes">{t("sortLikes")}</option>
            </select>
          </div>
        </div>

        <p className="meta mt-4 tabular-nums" aria-live="polite">
          {t("resultsCount", { count: total })}
        </p>

        {initialMods.length === 0 ? (
          <EmptyState
            className="mt-6"
            icon={SearchX}
            title={t("noResultsTitle")}
            description={t("noResultsText")}
            action={
              hasFilters ? (
                <Button variant="outline" onClick={resetFilters}>
                  {t("resetFilters")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div
            aria-busy={pending}
            className={cn(
              "mt-6 grid gap-4 transition-opacity duration-fast sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 lg:gap-6",
              pending && "opacity-60"
            )}
          >
            {initialMods.map((mod, index) => (
              <Fragment key={mod.slug}>
                <ModCard locale={locale} mod={mod} pricingLabel={pricingLabels[mod.pricing] ?? mod.pricing} />
                {listingAdBreak && index === 5 && <div className="col-span-full">{listingAdBreak}</div>}
              </Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
