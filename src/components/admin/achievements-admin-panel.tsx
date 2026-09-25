"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Plus } from "lucide-react";
import type { AchievementCategory, AchievementRarity } from "@prisma/client";
import { deleteAchievement, saveAchievement } from "@/actions/admin/achievements";
import { AchievementBadge } from "@/components/achievements/achievement-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ENTITY_ICON_KEYS, EntityIcon } from "@/components/ui/entity-icon";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { RARITY_STYLES } from "@/lib/achievement-constants";
import { cn } from "@/lib/utils";

export type AdminAchievement = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  title: string | null;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string | null;
  xpReward: number;
  isHidden: boolean;
  isSeasonal: boolean;
  seasonStart: string | null;
  seasonEnd: string | null;
  animated: boolean;
  glowEffect: boolean;
  isActive: boolean;
  unlockRule: { type: string; threshold?: number } | null;
  holders: number;
};

const CATEGORIES: AchievementCategory[] = ["USER", "CREATOR", "PARTNER", "SEASONAL", "HIDDEN"];
const RARITIES: AchievementRarity[] = ["COMMON", "UNCOMMON", "RARE", "EPIC", "LEGENDARY"];
const RULES = [
  "account_age_days",
  "membership",
  "downloads",
  "mod_purchases",
  "creator_downloads",
  "creator_revenue",
  "creator_featured",
  "partner_conversions",
  "partner_revenue",
  "partner_referrals",
  "manual",
] as const;
const RULES_WITHOUT_THRESHOLD = new Set(["membership", "creator_featured", "manual"]);

type Draft = Omit<AdminAchievement, "id" | "slug" | "holders"> & { id?: string };

const EMPTY: Draft = {
  name: "",
  description: "",
  title: "",
  category: "USER",
  rarity: "COMMON",
  icon: "medal",
  xpReward: 100,
  isHidden: false,
  isSeasonal: false,
  seasonStart: null,
  seasonEnd: null,
  animated: false,
  glowEffect: false,
  isActive: true,
  unlockRule: { type: "manual" },
};

export function AchievementsAdminPanel({ achievements }: { achievements: AdminAchievement[] }) {
  const t = useTranslations("admin.ac");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const current = editing?.id ? achievements.find((a) => a.id === editing.id) : undefined;
  useEffect(() => {
    // Nach dem Speichern die frischen Serverdaten übernehmen.
    if (current) setEditing((d) => (d?.id === current.id ? { ...current } : d));
  }, [current]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const rule = editing.unlockRule?.type ?? "manual";
    startTransition(async () => {
      const r = await saveAchievement({
        id: editing.id,
        slug: current?.slug,
        name: editing.name.trim(),
        description: editing.description?.trim() || undefined,
        title: editing.title?.trim() || undefined,
        category: editing.category,
        rarity: editing.rarity,
        icon: editing.icon || undefined,
        xpReward: Math.max(0, Math.round(editing.xpReward)),
        isHidden: editing.isHidden,
        isSeasonal: editing.isSeasonal,
        seasonStart: editing.isSeasonal && editing.seasonStart ? editing.seasonStart : undefined,
        seasonEnd: editing.isSeasonal && editing.seasonEnd ? editing.seasonEnd : undefined,
        unlockRule: RULES_WITHOUT_THRESHOLD.has(rule) ? { type: rule } : { type: rule, threshold: Math.max(1, Math.round(editing.unlockRule?.threshold ?? 1)) },
        animated: editing.animated,
        glowEffect: editing.glowEffect,
        isActive: editing.isActive,
      });
      if (!r.success) {
        appToast.error(r.error);
        return;
      }
      appToast.saved(t("saved"));
      if (!editing.id) setEditing(null);
      router.refresh();
    });
  }

  const ruleLabel = (a: AdminAchievement) => {
    const type = a.unlockRule?.type ?? "manual";
    const label = t(`rule.${(RULES as readonly string[]).includes(type) ? type : "manual"}`);
    return a.unlockRule?.threshold && !RULES_WITHOUT_THRESHOLD.has(type) ? t("ruleSummary", { rule: label, threshold: a.unlockRule.threshold }) : label;
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
      <section className="rounded-lg border border-line bg-raised" aria-labelledby={`${uid}-list`}>
        <div className="flex h-12 items-center justify-between border-b border-line px-4">
          <h2 id={`${uid}-list`} className="section-title">{t("list")}</h2>
          <Button size="sm" variant="outline" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4" aria-hidden />
            {t("new")}
          </Button>
        </div>
        <ul className="divide-y divide-line">
          {achievements.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setEditing({ ...a })}
                aria-current={editing?.id === a.id ? "true" : undefined}
                className={cn("flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast", editing?.id === a.id ? "bg-violet-soft" : "hover:bg-row-hover")}
              >
                <AchievementBadge name={a.name} icon={a.icon} rarity={a.rarity} size="sm" className="shrink-0 [&>span]:hidden" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">{a.name}</span>
                  <span className="meta block truncate">
                    {t(`cat.${a.category}`)} · {ruleLabel(a)} · {a.xpReward} XP
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs tabular-nums text-ink-muted">{t("holders", { count: a.holders })}</span>
                  {!a.isActive && <span className="text-xs text-ink-faint">{t("inactive")}</span>}
                  {a.isHidden && a.isActive && <span className="text-xs text-ink-faint">{t("hidden")}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-line bg-raised xl:sticky xl:top-6" aria-labelledby={`${uid}-editor`}>
        <h2 id={`${uid}-editor`} className="section-title flex h-12 items-center border-b border-line px-4">{editing?.id ? t("editor") : editing ? t("new") : t("editor")}</h2>
        {!editing ? (
          <div className="p-6 text-center">
            <p className="text-sm font-semibold text-ink">{t("selectTitle")}</p>
            <p className="mt-1 text-sm text-ink-muted">{t("selectText")}</p>
          </div>
        ) : (
          <form onSubmit={save} className="space-y-4 p-4">
            <div className="flex items-center gap-4 rounded-md border border-line bg-canvas p-4">
              <AchievementBadge name={editing.name || "…"} description={editing.description} icon={editing.icon} rarity={editing.rarity} size="lg" />
              <div className="min-w-0 text-sm">
                <p className="label-text text-ink-muted">{t("preview")}</p>
                <p className="font-semibold" style={{ color: RARITY_STYLES[editing.rarity].color }}>{t(`rar.${editing.rarity}`)}</p>
                {editing.title && <p className="meta">„{editing.title}“</p>}
              </div>
            </div>

            <div>
              <label htmlFor={`${uid}-name`} className="label-text mb-1.5 block text-ink-muted">{t("name")}</label>
              <Input id={`${uid}-name`} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} required minLength={2} maxLength={120} />
            </div>
            <div>
              <label htmlFor={`${uid}-desc`} className="label-text mb-1.5 block text-ink-muted">{t("description")}</label>
              <Textarea id={`${uid}-desc`} value={editing.description ?? ""} rows={2} maxLength={2000} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={`${uid}-title`} className="label-text mb-1.5 block text-ink-muted">{t("titleReward")}</label>
                <Input id={`${uid}-title`} value={editing.title ?? ""} maxLength={80} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <label htmlFor={`${uid}-cat`} className="label-text mb-1.5 block text-ink-muted">{t("category")}</label>
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as AchievementCategory })}>
                  <SelectTrigger id={`${uid}-cat`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{t(`cat.${c}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ChipTabs label={t("rarity")} value={editing.rarity} options={RARITIES.map((r) => ({ value: r, label: t(`rar.${r}`) }))} onChange={(v) => setEditing({ ...editing, rarity: v as AchievementRarity })} />

            <fieldset>
              <legend className="label-text mb-1.5 text-ink-muted">{t("icon")}</legend>
              <div className="flex flex-wrap gap-1.5">
                {ENTITY_ICON_KEYS.map((key) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={editing.icon === key}
                    aria-label={key}
                    onClick={() => setEditing({ ...editing, icon: key })}
                    className={cn("flex h-8 w-8 items-center justify-center rounded-md border", editing.icon === key ? "border-violet bg-violet-soft text-ink" : "border-line text-ink-muted hover:text-ink")}
                  >
                    <EntityIcon value={key} className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-3">
              <div>
                <label htmlFor={`${uid}-rule`} className="label-text mb-1.5 block text-ink-muted">{t("condition")}</label>
                <Select value={editing.unlockRule?.type ?? "manual"} onValueChange={(v) => setEditing({ ...editing, unlockRule: { type: v, threshold: editing.unlockRule?.threshold } })}>
                  <SelectTrigger id={`${uid}-rule`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RULES.map((r) => <SelectItem key={r} value={r}>{t(`rule.${r}`)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor={`${uid}-thr`} className="label-text mb-1.5 block text-ink-muted">{t("threshold")}</label>
                <Input
                  id={`${uid}-thr`}
                  type="number"
                  min={1}
                  disabled={RULES_WITHOUT_THRESHOLD.has(editing.unlockRule?.type ?? "manual")}
                  value={editing.unlockRule?.threshold ?? ""}
                  onChange={(e) => setEditing({ ...editing, unlockRule: { type: editing.unlockRule?.type ?? "manual", threshold: Number(e.target.value) } })}
                  className="tabular-nums"
                />
              </div>
            </div>
            <div className="max-w-[140px]">
              <label htmlFor={`${uid}-xp`} className="label-text mb-1.5 block text-ink-muted">{t("xp")}</label>
              <Input id={`${uid}-xp`} type="number" min={0} value={editing.xpReward} onChange={(e) => setEditing({ ...editing, xpReward: Number(e.target.value) })} className="tabular-nums" />
            </div>

            <div className="flex flex-col gap-2">
              <Checkbox checked={editing.isActive} onCheckedChange={(v) => setEditing({ ...editing, isActive: v })} label={t("active")} />
              <Checkbox checked={editing.isHidden} onCheckedChange={(v) => setEditing({ ...editing, isHidden: v })} label={t("hiddenToggle")} />
              <Checkbox checked={editing.isSeasonal} onCheckedChange={(v) => setEditing({ ...editing, isSeasonal: v })} label={t("seasonal")} />
            </div>
            {editing.isSeasonal && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${uid}-ss`} className="label-text mb-1.5 block text-ink-muted">{t("seasonStart")}</label>
                  <Input id={`${uid}-ss`} type="date" value={editing.seasonStart?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, seasonStart: e.target.value || null })} />
                </div>
                <div>
                  <label htmlFor={`${uid}-se`} className="label-text mb-1.5 block text-ink-muted">{t("seasonEnd")}</label>
                  <Input id={`${uid}-se`} type="date" value={editing.seasonEnd?.slice(0, 10) ?? ""} onChange={(e) => setEditing({ ...editing, seasonEnd: e.target.value || null })} />
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-2 border-t border-line pt-4">
              {editing.id ? (
                <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>
                  {t("delete")}
                </Button>
              ) : (
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  {t("cancel")}
                </Button>
              )}
              <Button type="submit" disabled={pending || editing.name.trim().length < 2}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {t("save")}
              </Button>
            </div>
          </form>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle", { name: current?.name ?? "" })}
        description={t("deleteText", { count: current?.holders ?? 0 })}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            if (!current) return;
            const r = await deleteAchievement(current.id);
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            setConfirmDelete(false);
            setEditing(null);
            appToast.deleted(t("deleted"));
            router.refresh();
          })
        }
      />
    </div>
  );
}
