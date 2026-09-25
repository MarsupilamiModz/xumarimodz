"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowDown, ArrowUp, GripVertical, Loader2, Plus, X } from "lucide-react";
import type { CollectionModerationStatus, CollectionVisibility } from "@prisma/client";
import { deleteCollectionAdmin, searchModsForCollectionAdmin, setCollectionItemsAdmin, updateCollectionAdmin } from "@/actions/admin/collections";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";

type Item = { id: string; title: string; game: string; image: string | null };
type Meta = { title: string; description: string; visibility: CollectionVisibility; moderationStatus: CollectionModerationStatus };

const VISIBILITIES: CollectionVisibility[] = ["PUBLIC", "PRIVATE", "FEATURED"];
const STATUSES: CollectionModerationStatus[] = ["APPROVED", "PENDING", "REJECTED", "ARCHIVED"];

function Thumb({ item }: { item: Item }) {
  return (
    <span className="relative h-9 w-14 shrink-0 overflow-hidden rounded-md bg-elevated">
      {item.image ? <SafeImage src={item.image} alt="" fill className="object-cover" sizes="56px" /> : <CoverPlaceholder name={item.title} variant="thumb" />}
    </span>
  );
}

/**
 * Editor einer Sammlung: Stammdaten und sortierbare Mod-Liste (Drag & Drop, Pfeile per Tastatur),
 * Mod-Suche zum Hinzufügen. Gespeichert wird gesammelt; „Verwerfen“ setzt alles zurück.
 */
export function CollectionEditor({ collectionId, initialMeta, initialItems, redirectTo }: { collectionId: string; initialMeta: Meta; initialItems: Item[]; redirectTo: string }) {
  const t = useTranslations("admin.co");
  const router = useRouter();
  const appToast = useAppToast();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [meta, setMeta] = useState(initialMeta);
  const [items, setItems] = useState(initialItems);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Item[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setMeta(initialMeta);
    setItems(initialItems);
  }, [initialMeta, initialItems]);

  // Suche mit Verzögerung (Debounce), damit nicht jeder Tastendruck den Server fragt.
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      const r = await searchModsForCollectionAdmin(query);
      setSearching(false);
      setResults(r.success ? r.data : []);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const metaDirty = JSON.stringify(meta) !== JSON.stringify(initialMeta);
  const itemsDirty = items.map((i) => i.id).join(",") !== initialItems.map((i) => i.id).join(",");
  const dirty = metaDirty || itemsDirty;

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      if (metaDirty) {
        const r = await updateCollectionAdmin(collectionId, meta);
        if (!r.success) {
          appToast.error(r.error);
          return;
        }
      }
      if (itemsDirty) {
        const r = await setCollectionItemsAdmin(collectionId, items.map((i) => i.id));
        if (!r.success) {
          appToast.error(r.error);
          return;
        }
      }
      appToast.saved(t("saved"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-5 p-4 pb-6">
      <div>
        <label htmlFor={`${uid}-title`} className="label-text mb-1.5 block text-ink-muted">{t("name")}</label>
        <Input id={`${uid}-title`} value={meta.title} maxLength={120} onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))} />
      </div>
      <div>
        <label htmlFor={`${uid}-desc`} className="label-text mb-1.5 block text-ink-muted">{t("description")}</label>
        <Textarea id={`${uid}-desc`} value={meta.description} rows={3} onChange={(e) => setMeta((m) => ({ ...m, description: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${uid}-vis`} className="label-text mb-1.5 block text-ink-muted">{t("visibility")}</label>
          <Select value={meta.visibility} onValueChange={(v) => setMeta((m) => ({ ...m, visibility: v as CollectionVisibility }))}>
            <SelectTrigger id={`${uid}-vis`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {VISIBILITIES.map((v) => <SelectItem key={v} value={v}>{t(`vis.${v}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label htmlFor={`${uid}-mod`} className="label-text mb-1.5 block text-ink-muted">{t("moderation")}</label>
          <Select value={meta.moderationStatus} onValueChange={(v) => setMeta((m) => ({ ...m, moderationStatus: v as CollectionModerationStatus }))}>
            <SelectTrigger id={`${uid}-mod`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{t(`status.${s}`)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <section aria-labelledby={`${uid}-items`}>
        <h3 id={`${uid}-items`} className="section-title">{t("items")}</h3>
        <p className="meta mb-2">{t("dragHint")}</p>
        {items.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-3 py-6 text-center text-sm text-ink-muted">{t("emptyItems")}</p>
        ) : (
          <ol className="space-y-1.5">
            {items.map((item, index) => (
              <li
                key={item.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex !== null) move(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
                className={cn("flex items-center gap-2 rounded-md border bg-canvas px-2 py-1.5", dragIndex === index ? "border-violet opacity-60" : "border-line")}
              >
                <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-ink-faint" aria-hidden />
                <span className="w-5 shrink-0 text-right text-xs tabular-nums text-ink-faint">{index + 1}</span>
                <Thumb item={item} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-ink">{item.title}</span>
                  <span className="meta block truncate">{item.game}</span>
                </span>
                <Button type="button" size="icon" variant="ghost" className="h-[30px] w-[30px]" aria-label={t("moveUp", { title: item.title })} disabled={index === 0} onClick={() => move(index, index - 1)}>
                  <ArrowUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-[30px] w-[30px]" aria-label={t("moveDown", { title: item.title })} disabled={index === items.length - 1} onClick={() => move(index, index + 1)}>
                  <ArrowDown className="h-4 w-4" aria-hidden />
                </Button>
                <Button type="button" size="icon" variant="ghost" className="h-[30px] w-[30px]" aria-label={t("remove", { title: item.title })} onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}>
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section>
        <label htmlFor={`${uid}-search`} className="label-text mb-1.5 block text-ink-muted">{t("addMod")}</label>
        <Input id={`${uid}-search`} type="search" value={query} placeholder={t("addSearch")} onChange={(e) => setQuery(e.target.value)} autoComplete="off" />
        {searching && <Loader2 className="mt-2 h-4 w-4 animate-spin text-ink-faint" aria-hidden />}
        {results && !searching && (
          results.length === 0 ? (
            <p className="mt-2 text-xs text-ink-muted">{t("noResults")}</p>
          ) : (
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto">
              {results.map((r) => {
                const included = items.some((i) => i.id === r.id);
                return (
                  <li key={r.id} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-row-hover">
                    <Thumb item={r} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{r.title}</span>
                      <span className="meta block truncate">{r.game}</span>
                    </span>
                    {included ? (
                      <span className="text-xs text-ink-faint">{t("inList")}</span>
                    ) : (
                      <Button type="button" size="icon" variant="outline" className="h-[30px] w-[30px]" aria-label={t("add", { title: r.title })} onClick={() => setItems((prev) => [...prev, r])}>
                        <Plus className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>
          {t("delete")}
        </Button>
        <div className="flex items-center gap-2" hidden={!dirty}>
          <span className="text-sm text-ink-muted" aria-live="polite">{dirty ? t("unsaved") : ""}</span>
          <Button type="button" variant="ghost" disabled={pending} onClick={() => { setMeta(initialMeta); setItems(initialItems); }}>
            {t("discard")}
          </Button>
          <Button type="button" disabled={pending || !meta.title.trim()} onClick={save}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t("save")}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle", { title: initialMeta.title })}
        description={t("deleteText")}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await deleteCollectionAdmin(collectionId);
            if (!r.success) {
              appToast.error(r.error);
              return;
            }
            setConfirmDelete(false);
            appToast.deleted(t("deleted"));
            router.push(redirectTo);
            router.refresh();
          })
        }
      />
    </div>
  );
}
