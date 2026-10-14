"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { ArrowUp, Layers } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import {
  createCollection,
  updateCollection,
  deleteCollection,
  addModToCollection,
  removeModFromCollection,
  reorderCollectionMods,
} from "@/actions/collections";
import { cn } from "@/lib/utils";
import type { CollectionVisibility } from "@prisma/client";
import type { Locale } from "@/i18n/config";

type CollectionItem = {
  modId: string;
  sortOrder: number;
  note: string | null;
  mod: { id: string; slug: string; title: string };
};

type Collection = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverUrl: string | null;
  visibility: CollectionVisibility;
  items: CollectionItem[];
};

const labelClass = "label-text mb-1.5 block text-ink-muted";

export function CollectionCreateForm({ locale }: { locale: Locale }) {
  const t = useTranslations("common.cx.collectionEditor");
  const tp = useTranslations("creatorPages.collections");
  const tt = useTranslations("toast");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <SectionCard title={t("createTitle")} className="max-w-xl">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(async () => {
            const r = await createCollection({
              title: fd.get("title") as string,
              description: (fd.get("description") as string) || undefined,
              visibility: (fd.get("visibility") as CollectionVisibility) || "PUBLIC",
              coverUrl: (fd.get("coverUrl") as string) || undefined,
            });
            if (r.success) {
              appToast.raw({ title: tt("collectionCreated") });
              router.push(`/${locale}/creator/collections/${r.data.id}`);
            } else appToast.error(r.error);
          });
        }}
      >
        <div>
          <label htmlFor="collection-title" className={labelClass}>{tp("fieldTitle")}</label>
          <Input id="collection-title" name="title" placeholder={t("titlePlaceholder")} required />
        </div>
        <div>
          <label htmlFor="collection-description" className={labelClass}>{tp("fieldDescription")}</label>
          <Textarea id="collection-description" name="description" rows={3} />
        </div>
        <div>
          <label htmlFor="collection-cover" className={labelClass}>{tp("fieldCover")}</label>
          <Input id="collection-cover" name="coverUrl" />
        </div>
        <div>
          <label htmlFor="collection-visibility" className={labelClass}>{tp("fieldVisibility")}</label>
          <select id="collection-visibility" name="visibility" className={cn(controlClassName, "h-9")}>
            <option value="PUBLIC">{t("visibilityPublic")}</option>
            <option value="PRIVATE">{t("visibilityPrivate")}</option>
          </select>
        </div>
        <Button type="submit" disabled={pending} aria-busy={pending}>{t("createSubmit")}</Button>
      </form>
    </SectionCard>
  );
}

export function CollectionEditForm({ locale, collection }: { locale: Locale; collection: Collection }) {
  const t = useTranslations("common.cx.collectionEditor");
  const tp = useTranslations("creatorPages.collections");
  const tt = useTranslations("toast");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modQuery, setModQuery] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function refresh() {
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const r = await deleteCollection(collection.id);
    setDeleting(false);
    if (r.success) {
      setConfirmDelete(false);
      router.push(`/${locale}/creator/collections`);
    } else appToast.error(r.error);
  }

  return (
    <div className="max-w-2xl space-y-6">
      <SectionCard title={tp("detailsTitle")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await updateCollection(collection.id, {
                title: fd.get("title") as string,
                description: (fd.get("description") as string) || undefined,
                visibility: fd.get("visibility") as CollectionVisibility,
                coverUrl: (fd.get("coverUrl") as string) || undefined,
              });
              if (r.success) {
                appToast.saved();
                refresh();
              } else appToast.error(r.error);
            });
          }}
        >
          <div>
            <label htmlFor="collection-title" className={labelClass}>{tp("fieldTitle")}</label>
            <Input id="collection-title" name="title" defaultValue={collection.title} required />
          </div>
          <div>
            <label htmlFor="collection-description" className={labelClass}>{tp("fieldDescription")}</label>
            <Textarea id="collection-description" name="description" defaultValue={collection.description ?? ""} rows={3} />
          </div>
          <div>
            <label htmlFor="collection-cover" className={labelClass}>{tp("fieldCover")}</label>
            <Input id="collection-cover" name="coverUrl" defaultValue={collection.coverUrl ?? ""} />
          </div>
          <div>
            <label htmlFor="collection-visibility" className={labelClass}>{tp("fieldVisibility")}</label>
            <select
              id="collection-visibility"
              name="visibility"
              defaultValue={collection.visibility}
              className={cn(controlClassName, "h-9")}
            >
              <option value="PUBLIC">{t("visibilityPublic")}</option>
              <option value="PRIVATE">{t("visibilityPrivate")}</option>
            </select>
          </div>
          <Button type="submit" disabled={pending} aria-busy={pending}>{t("save")}</Button>
        </form>
      </SectionCard>

      <SectionCard title={t("modsInCollectionTitle")}>
        <div className="space-y-4">
          {collection.items.length === 0 ? (
            <EmptyState icon={Layers} title={t("noMods")} description={tp("emptyModsText")} className="py-8" />
          ) : (
            <ol className="divide-y divide-line rounded-lg border border-line">
              {collection.items.map((item, idx) => (
                <li key={item.modId} className="flex items-center justify-between gap-2 px-4 py-2 text-[13px] text-ink">
                  <span className="min-w-0 truncate">
                    <span className="mr-2 tabular-nums text-ink-faint">{idx + 1}.</span>
                    {item.mod.title}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {idx > 0 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={pending}
                        aria-label={tp("moveUp", { title: item.mod.title })}
                        onClick={() => {
                          const ids = collection.items.map((i) => i.modId);
                          [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
                          startTransition(async () => {
                            await reorderCollectionMods(collection.id, ids);
                            refresh();
                          });
                        }}
                      >
                        <ArrowUp className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await removeModFromCollection(collection.id, item.modId);
                          refresh();
                        })
                      }
                    >
                      {t("removeMod")}
                    </Button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div>
            <label htmlFor="collection-add-mod" className={labelClass}>{tp("addModLabel")}</label>
            <div className="flex gap-2">
              <Input
                id="collection-add-mod"
                value={modQuery}
                onChange={(e) => setModQuery(e.target.value)}
                placeholder={t("modIdPlaceholder")}
              />
              <Button
                variant="outline"
                disabled={pending || !modQuery.trim()}
                onClick={() =>
                  startTransition(async () => {
                    const r = await addModToCollection(collection.id, modQuery.trim());
                    if (r.success) {
                      appToast.raw({ title: tt("modAdded") });
                      setModQuery("");
                      refresh();
                    } else appToast.error(r.error);
                  })
                }
              >
                {t("addMod")}
              </Button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title={t("deleteButton")}
        action={
          <Button variant="destructive" size="sm" disabled={pending} onClick={() => setConfirmDelete(true)}>
            {t("deleteButton")}
          </Button>
        }
      >
        <p className="text-sm text-ink-muted">{tp("deleteSectionText")}</p>
      </SectionCard>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={tp("deleteTitle")}
        description={tp("deleteSectionText")}
        confirmLabel={t("deleteButton")}
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
