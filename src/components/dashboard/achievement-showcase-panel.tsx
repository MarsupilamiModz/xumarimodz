"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Star, StarOff, RefreshCw, ChevronUp, ChevronDown, GripVertical, Trophy } from "lucide-react";
import { SectionCard } from "@/components/ui/page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import {
  toggleAchievementShowcase,
  refreshMyAchievements,
  setShowcaseOrder,
} from "@/actions/achievements";
import { SHOWCASE_MAX } from "@/lib/achievement-constants";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatDate, formatNumber } from "@/lib/format-locale";
import { cn } from "@/lib/utils";
import type { AchievementRarity } from "@prisma/client";

type AchievementRow = {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: AchievementRarity;
  animated: boolean;
  glowEffect: boolean;
  unlockedAt: Date;
  isShowcased: boolean;
  showcaseOrder: number | null;
  grantedBy?: { username: string; displayName: string | null } | null;
};

const RARITY_RANK: Record<AchievementRarity, number> = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 3,
  EPIC: 4,
  LEGENDARY: 5,
};

export function AchievementShowcasePanel({
  achievements,
  xp,
  level,
  showTitle = true,
}: {
  achievements: AchievementRow[];
  xp: number;
  level: number;
  /** Aus, wenn die Seite den Titel schon als H1 zeigt (Erfolge-Seite). */
  showTitle?: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const ta = useTranslations("accountPages.achievements");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "featured" | "locked">("all");
  const [sort, setSort] = useState<"date" | "rarity" | "name">("date");

  const showcased = achievements.filter((a) => a.isShowcased);
  const showcasedIds = showcased
    .sort((a, b) => (a.showcaseOrder ?? 99) - (b.showcaseOrder ?? 99))
    .map((a) => a.id);

  const filtered = useMemo(() => {
    let list = [...achievements];
    if (filter === "featured") list = list.filter((a) => a.isShowcased);
    if (filter === "locked") list = list.filter((a) => !a.isShowcased);
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "rarity") return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
      return new Date(b.unlockedAt).getTime() - new Date(a.unlockedAt).getTime();
    });
    return list;
  }, [achievements, filter, sort]);

  function moveShowcase(id: string, direction: -1 | 1) {
    const idx = showcasedIds.indexOf(id);
    if (idx < 0) return;
    const next = idx + direction;
    if (next < 0 || next >= showcasedIds.length) return;
    const reordered = [...showcasedIds];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    startTransition(async () => {
      const r = await setShowcaseOrder(reordered);
      if (r.success) router.refresh();
      else appToast.error(r.error);
    });
  }

  return (
    <SectionCard
      className="max-w-3xl"
      title={showTitle ? t("achievementsTitle") : undefined}
      description={`${ta("progress", { level, xp: formatNumber(xp, locale) })} · ${t("featuredCount", { count: showcased.length })}`}
      action={
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const r = await refreshMyAchievements();
              if (r.success) {
                appToast.saved();
                if (r.data?.unlocked?.length) {
                  appToast.raw({ title: "toast.newAchievements", description: r.data.unlocked.join(", ") });
                }
                router.refresh();
              } else appToast.error(r.error);
            })
          }
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> {t("sync")}
        </Button>
      }
    >
      <div className="space-y-4">
        {showcased.length > 0 && (
          <div className="rounded-lg border border-line bg-elevated p-3">
            <p className="label-text mb-2">{t("featuredShowcase")}</p>
            <div className="flex flex-wrap gap-2">
              {showcasedIds.map((id, i) => {
                const a = achievements.find((x) => x.id === id);
                if (!a) return null;
                return (
                  <div key={id} className="flex items-center gap-1 rounded-md border border-line bg-raised px-2 py-1">
                    <GripVertical className="h-3 w-3 text-ink-faint" aria-hidden />
                    <AchievementBadge
                      name={a.name}
                      description={a.description}
                      icon={a.icon}
                      rarity={a.rarity}
                      animated={a.animated}
                      glowEffect={a.glowEffect}
                      unlockedAt={a.unlockedAt}
                      size="sm"
                    />
                    <div className="flex flex-col">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        aria-label={ta("moveUp", { name: a.name })}
                        disabled={pending || i === 0}
                        onClick={() => moveShowcase(id, -1)}
                      >
                        <ChevronUp className="h-3 w-3" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        aria-label={ta("moveDown", { name: a.name })}
                        disabled={pending || i === showcasedIds.length - 1}
                        onClick={() => moveShowcase(id, 1)}
                      >
                        <ChevronDown className="h-3 w-3" aria-hidden />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <ChipTabs
            label={ta("filterLabel")}
            value={filter}
            onChange={(v) => setFilter(v as typeof filter)}
            options={[
              { value: "all", label: t("filterAll") },
              { value: "featured", label: t("filterFeatured") },
              { value: "locked", label: t("filterNotFeatured") },
            ]}
          />
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="h-[30px] w-[140px] text-xs" aria-label={ta("sortLabel")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">{t("sortNewest")}</SelectItem>
              <SelectItem value="rarity">{t("sortRarity")}</SelectItem>
              <SelectItem value="name">{t("sortName")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState icon={Trophy} title={ta("emptyTitle")} description={ta("emptyText")} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((a) => (
              <div key={a.id} className="flex items-center gap-3 rounded-lg border border-line p-3">
                <AchievementBadge
                  name={a.name}
                  description={a.description}
                  icon={a.icon}
                  rarity={a.rarity}
                  animated={a.animated}
                  glowEffect={a.glowEffect}
                  unlockedAt={a.unlockedAt}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{a.name}</p>
                  {a.description && <p className="line-clamp-2 text-xs text-ink-muted">{a.description}</p>}
                  <p className="meta mt-0.5">
                    {ta(`rarity.${a.rarity}`)} · {ta("unlockedOn", { date: formatDate(a.unlockedAt, locale) })}
                    {a.grantedBy && ` · ${ta("grantedBy", { username: a.grantedBy.username })}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(a.isShowcased && "text-violet-bright")}
                  disabled={pending}
                  aria-pressed={a.isShowcased}
                  aria-label={a.isShowcased ? ta("unfeature") : ta("feature", { max: SHOWCASE_MAX })}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await toggleAchievementShowcase(a.id, !a.isShowcased);
                      if (r.success) router.refresh();
                      else appToast.error(r.error);
                    })
                  }
                >
                  {a.isShowcased ? <Star className="h-4 w-4" aria-hidden /> : <StarOff className="h-4 w-4" aria-hidden />}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </SectionCard>
  );
}
