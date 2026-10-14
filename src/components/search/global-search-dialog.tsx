"use client";

import { memo, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Gamepad2, Loader2, SearchX, X } from "lucide-react";
import {
  globalSearchAction,
  type GlobalSearchGroups,
  type GlobalSearchItem,
} from "@/actions/global-search";
import { useGlobalSearch } from "@/components/search/global-search-provider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SafeImage } from "@/components/ui/safe-image";

const EMPTY: GlobalSearchGroups = {
  mods: [],
  sounds: [],
  collections: [],
  modpacks: [],
  creators: [],
  partners: [],
  games: [],
  categories: [],
};

type GroupKey = keyof GlobalSearchGroups;

const GROUP_ORDER: GroupKey[] = [
  "mods",
  "sounds",
  "collections",
  "modpacks",
  "creators",
  "partners",
  "games",
  "categories",
];

function ResultRow({ item, onSelect }: { item: GlobalSearchItem; onSelect: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-hover"
    >
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-elevated">
        {item.thumbnailUrl ? (
          <SafeImage src={item.thumbnailUrl} alt="" fill className="object-cover" sizes="40px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Gamepad2 className="h-4 w-4 text-ink-faint" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">{item.title}</p>
        {item.subtitle && (
          <p className="truncate text-xs text-ink-muted">{item.subtitle}</p>
        )}
      </div>
    </Link>
  );
}

export const GlobalSearchDialog = memo(function GlobalSearchDialog({ locale }: { locale: string }) {
  const t = useTranslations("search");
  const { open, setOpen } = useGlobalSearch();
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<GlobalSearchGroups>(EMPTY);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setGroups(EMPTY);
  }, [setOpen]);

  useEffect(() => {
    if (open) {
      const tId = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(tId);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setGroups(EMPTY);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      startTransition(async () => {
        const result = await globalSearchAction(query, locale);
        if (result.success) setGroups(result.data);
      });
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query, locale]);

  const hasResults = GROUP_ORDER.some((k) => groups[k].length > 0);
  const groupLabels: Record<GroupKey, string> = {
    mods: t("groups.mods"),
    sounds: t("groups.sounds"),
    collections: t("groups.collections"),
    modpacks: t("groups.modpacks"),
    creators: t("groups.creators"),
    partners: t("groups.partners"),
    games: t("groups.games"),
    categories: t("groups.categories"),
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
      <DialogContent hideClose className="max-w-2xl gap-0 overflow-hidden p-0 sm:rounded-lg">
        <DialogTitle className="sr-only">{t("title")}</DialogTitle>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("searchLabel")}
            className="border-0 bg-transparent focus-visible:ring-0"
          />
          {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-muted" aria-label={t("loading")} />}
          <button type="button" onClick={close} className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-hover hover:text-ink" aria-label={t("close")}>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="max-h-[min(70vh,520px)] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-8 text-center text-sm text-ink-faint">{t("hint")}</p>
          ) : !pending && !hasResults ? (
            <EmptyState icon={SearchX} title={t("noResults")} description={t("noResultsText")} className="border-0 py-8" />
          ) : (
            GROUP_ORDER.map((key) => {
              const items = groups[key];
              if (!items.length) return null;
              return (
                <div key={key} className="mb-3">
                  <p className="label-text px-3 py-1.5">
                    {groupLabels[key]}
                  </p>
                  <div className="space-y-0.5">
                    {items.map((item) => (
                      <ResultRow key={`${key}-${item.id}`} item={item} onSelect={close} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-ink-faint">
          <span>{t("shortcutHint")}</span>
          <Link href={`/${locale}/search?q=${encodeURIComponent(query)}`} onClick={close} className="text-violet-bright hover:underline">
            {t("viewAll")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
});
