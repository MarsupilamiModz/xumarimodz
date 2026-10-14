"use client";

import { colors } from "@/styles/tokens";
import { useId, useMemo, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createGameCategory,
  updateGameCategory,
  deleteGameCategory,
  reorderCategories,
  uploadGameCategoryAsset,
} from "@/actions/admin/games";
import { buildCategoryTree, flattenCategoryTree, type FlatCategory } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { SafeImage } from "@/components/ui/safe-image";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { CategoryImageCropUpload } from "@/components/upload/category-image-crop-upload";
import { ChevronDown, ChevronUp, FolderTree, Plus, Trash2, ImageIcon } from "lucide-react";

type AdminCategory = FlatCategory & {
  thumbnailUrl?: string | null;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  accentColor?: string | null;
};

export function CategoryTreeEditor({
  gameId,
  categories: initial,
}: {
  gameId: string;
  categories: AdminCategory[];
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tg = useTranslations("admin.gameEdit.categories");
  const uid = useId();
  const [deleting, setDeleting] = useState<AdminCategory | null>(null);
  const [flat, setFlat] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const tree = useMemo(() => buildCategoryTree(flat), [flat]);
  const rows = useMemo(() => flattenCategoryTree(tree), [tree]);

  function moveSibling(id: string, dir: -1 | 1) {
    const node = flat.find((c) => c.id === id);
    if (!node) return;
    const siblings = flat
      .filter((c) => c.parentId === node.parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = siblings.findIndex((c) => c.id === id);
    const target = idx + dir;
    if (target < 0 || target >= siblings.length) return;

    const reordered = [...siblings];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];

    const nextFlat = flat.map((c) => {
      const newIdx = reordered.findIndex((r) => r.id === c.id);
      if (newIdx >= 0 && c.parentId === node.parentId) {
        return { ...c, sortOrder: newIdx };
      }
      return c;
    });
    const prevFlat = flat;
    setFlat(nextFlat);

    startTransition(async () => {
      const r = await reorderCategories(gameId, reordered.map((c) => c.id));
      if (!r.success) {
        setFlat(prevFlat);
        toast({ title: r.error, variant: "destructive" });
      }
    });
  }

  async function uploadCategoryAsset(categoryId: string, type: "thumbnail" | "banner" | "icon", file: File) {
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await uploadGameCategoryAsset(categoryId, type, fd);
      if (r.success && r.data?.url) {
        const field =
          type === "thumbnail" ? "thumbnailUrl" : type === "banner" ? "bannerUrl" : "iconUrl";
        setFlat((prev) =>
          prev.map((c) => (c.id === categoryId ? { ...c, [field]: r.data!.url } : c))
        );
        toast({ title: t("categorySaved") });
      } else if (!r.success) {
        toast({ title: r.error, variant: "destructive" });
      }
    });
  }

  return (
    <SectionCard
      title={t("categoryTree")}
      description={t("categoryTreeHint")}
      action={<span className="meta tabular-nums">{tg("count", { count: flat.length })}</span>}
    >
      <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
        {rows.length === 0 ? (
          <EmptyState icon={FolderTree} title={t("noCategories")} className="py-8" />
        ) : (
          rows.map((cat) => {
            const expanded = expandedId === cat.id;
            const thumb = cat.thumbnailUrl ?? cat.iconUrl;
            return (
              <div
                key={cat.id}
                className="overflow-hidden rounded-md border border-line bg-elevated"
                style={{ marginLeft: cat.depth * 16 }}
              >
                <div className="flex flex-wrap items-center gap-2 p-2.5">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-label={expanded ? tg("collapse", { name: cat.name }) : tg("expand", { name: cat.name })}
                    className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-line bg-raised"
                    onClick={() => setExpandedId(expanded ? null : cat.id)}
                  >
                    {thumb ? (
                      <SafeImage src={thumb} alt="" fill className="object-cover" sizes="40px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-ink-faint" aria-hidden />
                      </span>
                    )}
                  </button>
                  <Input
                    aria-label={tg("name", { name: cat.name })}
                    defaultValue={cat.name}
                    className="h-8 min-w-[100px] flex-1"
                    onBlur={(e) => {
                      if (e.target.value === cat.name) return;
                      startTransition(async () => {
                        const r = await updateGameCategory(cat.id, { name: e.target.value });
                        if (r.success) {
                          setFlat((prev) =>
                            prev.map((c) => (c.id === cat.id ? { ...c, name: e.target.value } : c))
                          );
                          toast({ title: t("categorySaved") });
                        } else toast({ title: r.error, variant: "destructive" });
                      });
                    }}
                  />
                  <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-muted">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-violet"
                      defaultChecked={cat.isVisible}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        startTransition(async () => {
                          const r = await updateGameCategory(cat.id, { isVisible: checked });
                          if (r.success) {
                            setFlat((prev) =>
                              prev.map((c) => (c.id === cat.id ? { ...c, isVisible: checked } : c))
                            );
                          } else toast({ title: r.error, variant: "destructive" });
                        });
                      }}
                    />
                    {t("visible")}
                  </label>
                  <div className="flex gap-0.5">
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={tg("moveUp", { name: cat.name })} disabled={pending} onClick={() => moveSibling(cat.id, -1)}>
                      <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={tg("moveDown", { name: cat.name })} disabled={pending} onClick={() => moveSibling(cat.id, 1)}>
                      <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={pending}
                      title={t("addSubcategory")}
                      aria-label={t("addSubcategory")}
                      onClick={() => setNewParentId(cat.id)}
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-danger"
                      aria-label={tg("delete", { name: cat.name })}
                      disabled={pending}
                      onClick={() => setDeleting(cat)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </Button>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3 border-t border-line bg-raised p-3">
                    <Textarea
                      aria-label={t("categoryDescriptionPlaceholder")}
                      defaultValue={cat.description ?? ""}
                      rows={2}
                      placeholder={t("categoryDescriptionPlaceholder")}
                      className="text-sm"
                      onBlur={(e) => {
                        const value = e.target.value;
                        if (value === (cat.description ?? "")) return;
                        startTransition(async () => {
                          const r = await updateGameCategory(cat.id, { description: value || undefined });
                          if (r.success) {
                            setFlat((prev) =>
                              prev.map((c) => (c.id === cat.id ? { ...c, description: value || null } : c))
                            );
                          }
                        });
                      }}
                    />
                    <div className="flex flex-wrap items-end gap-3">
                      <div>
                        <label htmlFor={`${uid}-${cat.id}-accent`} className="label-text mb-1 block">{t("categoryAccentColor")}</label>
                        <Input
                          id={`${uid}-${cat.id}-accent`}
                          type="color"
                          defaultValue={cat.accentColor ?? colors.violet}
                          className="h-9 w-16 p-1"
                          onBlur={(e) => {
                            startTransition(async () => {
                              await updateGameCategory(cat.id, { accentColor: e.target.value });
                              setFlat((prev) =>
                                prev.map((c) => (c.id === cat.id ? { ...c, accentColor: e.target.value } : c))
                              );
                            });
                          }}
                        />
                      </div>
                      {(["thumbnail", "icon", "banner"] as const).map((type) => (
                        <div key={type}>
                          <label htmlFor={type === "thumbnail" ? undefined : `${uid}-${cat.id}-${type}`} className="label-text mb-1 block">{tg(`assets.${type}`)}</label>
                          {type === "thumbnail" ? (
                            <CategoryImageCropUpload
                              label={tg("uploadCrop")}
                              categoryName={cat.name}
                              onCropped={(file) => uploadCategoryAsset(cat.id, type, file)}
                              disabled={pending}
                            />
                          ) : (
                            <Input
                              id={`${uid}-${cat.id}-${type}`}
                              type="file"
                              accept="image/*"
                              className="max-w-[140px] text-xs"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadCategoryAsset(cat.id, type, file);
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <form
        className="mt-4 flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newName.trim()) return;
          startTransition(async () => {
            const r = await createGameCategory(gameId, {
              name: newName.trim(),
              parentId: newParentId || null,
            });
            if (r.success) {
              setFlat((prev) => [...prev, r.data as AdminCategory]);
              setNewName("");
              setNewParentId("");
              toast({ title: t("categoryCreated") });
            } else toast({ title: r.error, variant: "destructive" });
          });
        }}
      >
        <select
          aria-label={tg("parent")}
          value={newParentId}
          onChange={(e) => setNewParentId(e.target.value)}
          className={cn(controlClassName, "h-9 w-auto min-w-[140px]")}
        >
          <option value="">{t("rootCategory")}</option>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Input
          aria-label={t("newCategoryPlaceholder")}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("newCategoryPlaceholder")}
          className="flex-1 min-w-[160px]"
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending || !newName.trim()}>
          {tc("save")}
        </Button>
      </form>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={tg("deleteTitle", { name: deleting?.name ?? "" })}
        description={tg("deleteText")}
        confirmLabel={tg("deleteConfirm")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          const cat = deleting;
          startTransition(async () => {
            const r = await deleteGameCategory(cat.id);
            if (r.success) {
              setFlat((prev) => prev.filter((c) => c.id !== cat.id && c.parentId !== cat.id));
              setDeleting(null);
              toast({ title: t("categoryDeleted") });
            } else toast({ title: r.error, variant: "destructive" });
          });
        }}
      />
    </SectionCard>
  );
}
