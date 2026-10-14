"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Search, SearchX } from "lucide-react";
import { searchModsAction } from "@/actions/search";
import { ModCard } from "@/components/mods/mod-card";
import { Input, controlClassName } from "@/components/ui/input";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

type ModRow = Parameters<typeof ModCard>[0]["mod"];
type Sort = "downloads" | "trending" | "rating" | "newest" | "updated" | "likes";
const SORTS: Sort[] = ["downloads", "trending", "rating", "likes", "newest", "updated"];

const selectClass = cn(controlClassName, "h-10 w-auto");

export function SearchPageClient({
  locale,
  initialQuery,
  initialTag,
  initialGame,
  initialSort,
  popularTags,
  games,
  trendingMods,
}: {
  locale: string;
  initialQuery: string;
  initialTag?: string;
  initialGame?: string;
  initialSort: Sort;
  popularTags: { name: string; count: number }[];
  games: { slug: string; name: string }[];
  trendingMods: ModRow[];
}) {
  const t = useTranslations("search");
  const tm = useTranslations("mods");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [tag, setTag] = useState(initialTag ?? "");
  const [gameSlug, setGameSlug] = useState(initialGame ?? "");
  const [sort, setSort] = useState<Sort>(initialSort);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [mods, setMods] = useState<ModRow[]>([]);
  const [total, setTotal] = useState(0);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();
  const requestId = useRef(0);

  const pricingLabels: Record<string, string> = { FREE: tm("free"), PREMIUM: tm("premium"), PAID: tm("paid") };

  function runSearch(q = query) {
    const id = ++requestId.current;
    startTransition(async () => {
      const r = await searchModsAction({
        query: q,
        tag: tag || undefined,
        gameSlug: gameSlug || undefined,
        sort,
        verifiedCreator: verifiedOnly,
      });
      // Nur die neueste Antwort anzeigen (ältere Anfragen können später ankommen).
      if (id !== requestId.current) return;
      if (r.success) {
        setMods(r.data.mods as ModRow[]);
        setTotal(r.data.total);
        setSearched(true);
      }
    });
  }

  // URL aktuell halten, damit Suchen teilbar sind und „Zurück“ funktioniert.
  function syncUrl(q: string) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    if (gameSlug) params.set("game", gameSlug);
    if (sort !== "downloads") params.set("sort", sort);
    const qs = params.toString();
    router.replace(`/${locale}/search${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tag, gameSlug, sort, verifiedOnly, initialQuery]);

  return (
    <div className="page-section">
      <PageHeader title={t("pageTitle")} description={t("pageSubtitle")} />

      <form
        role="search"
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const q = query.trim();
          // Neue URL löst die Suche über initialQuery aus; gleiche Suche direkt wiederholen.
          if (q === initialQuery) runSearch(q);
          else syncUrl(q);
        }}
      >
        <div className="relative flex-1">
          <label htmlFor="search-query" className="sr-only">{t("searchLabel")}</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden />
          <Input
            id="search-query"
            type="search"
            placeholder={t("placeholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-12 pl-9 text-base"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending}>
          {t("submit")}
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="sr-only" htmlFor="search-game">{t("gameLabel")}</label>
        <select id="search-game" value={gameSlug} onChange={(e) => setGameSlug(e.target.value)} className={selectClass}>
          <option value="">{t("allGames")}</option>
          {games.map((g) => (
            <option key={g.slug} value={g.slug}>{g.name}</option>
          ))}
        </select>
        <label className="sr-only" htmlFor="search-sort">{t("sortLabel")}</label>
        <select id="search-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectClass}>
          {SORTS.map((s) => (
            <option key={s} value={s}>{t(`sort.${s}`)}</option>
          ))}
        </select>
        <label htmlFor="search-verified" className="ml-1 flex items-center gap-2 text-sm text-ink">
          <Switch id="search-verified" checked={verifiedOnly} onCheckedChange={setVerifiedOnly} />
          {t("verifiedOnly")}
        </label>
      </div>

      {popularTags.length > 0 && (
        <div className="mt-6">
          <p className="label-text">{t("tagsLabel")}</p>
          <ChipTabs
            className="mt-2"
            label={t("tagsLabel")}
            options={popularTags.map((pt) => ({ value: pt.name, label: pt.name, count: pt.count }))}
            value={tag}
            onChange={(name) => setTag(tag === name ? "" : name)}
          />
        </div>
      )}

      <p className="meta mt-8 flex items-center gap-2 tabular-nums" aria-live="polite">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending ? t("loading") : searched ? t("resultsCount", { count: total }) : null}
      </p>

      {mods.length === 0 && !pending && searched ? (
        <EmptyState className="mt-4" icon={SearchX} title={t("noResults")} description={t("noResultsText")} />
      ) : (
        <div className={cn("mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6", pending && "opacity-60")} aria-busy={pending}>
          {mods.map((m) => (
            <ModCard key={m.id ?? m.slug} locale={locale} mod={m} pricingLabel={pricingLabels[m.pricing]} />
          ))}
        </div>
      )}

      {trendingMods.length > 0 && mods.length === 0 && !pending && (
        <section className="mt-16">
          <h2 className="text-lg font-semibold text-ink">{t("trendingTitle")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
            {trendingMods.map((m) => (
              <ModCard key={m.id ?? m.slug} locale={locale} mod={m} pricingLabel={pricingLabels[m.pricing]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
