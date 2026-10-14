"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { createMod } from "@/actions/mods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/ui/page-header";
import { useAppToast } from "@/hooks/use-app-toast";
import { type FlatCategory } from "@/lib/categories";
import { SOUND_CATEGORIES, PREVIEW_TYPES } from "@/lib/sound";
import type { SoundAudioCategory, SoundPreviewType } from "@prisma/client";

type Game = {
  id: string;
  name: string;
  modes: { id: string; name: string; slug: string }[];
};
type Category = FlatCategory & { gameId: string; modeId?: string | null };

/** Beschriftetes Formularfeld; `id` verbindet Label und Control, der Hinweis hat die id `${id}-hint`. */
function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  /** Übersetztes „Pflichtfeld“ für Screenreader; das Sternchen ist nur visuell. */
  required?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label-text mb-1.5 block text-ink-muted">
        {label}
        {required && (
          <>
            <span aria-hidden> *</span>
            <span className="sr-only"> ({required})</span>
          </>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="meta mt-1 text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  );
}

export function ProductForm({
  locale,
  games,
  categories,
}: {
  locale: string;
  games: Game[];
  categories: Category[];
}) {
  const t = useTranslations("creator");
  const ts = useTranslations("sounds");
  const tm = useTranslations("mods");
  const tc = useTranslations("common");
  const tp = useTranslations("creatorPages.productForm");
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [productType, setProductType] = useState<"MOD" | "SOUND">("MOD");
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [modeId, setModeId] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [pricing, setPricing] = useState<"FREE" | "PREMIUM" | "PAID">("FREE");
  const [audioCategory, setAudioCategory] = useState<SoundAudioCategory>("CUSTOM_AUDIO");
  const [previewType, setPreviewType] = useState<SoundPreviewType>("FULL");

  const selectedGame = games.find((g) => g.id === gameId);
  const gameModes = selectedGame?.modes ?? [];
  const requiresMode = gameModes.length > 0;

  const gameCategories = categories.filter(
    (c) =>
      c.gameId === gameId &&
      (!modeId || !c.modeId || c.modeId === modeId)
  );
  const rootCategories = gameCategories.filter((c) => !c.parentId);
  const subcategories = gameCategories.filter((c) => c.parentId === parentCategoryId);
  const requiresSubcategory = subcategories.length > 0;

  function onGameChange(nextGameId: string) {
    setGameId(nextGameId);
    setModeId("");
    setParentCategoryId("");
    setSubcategoryId("");
  }

  function onModeChange(nextModeId: string) {
    setModeId(nextModeId);
    setParentCategoryId("");
    setSubcategoryId("");
  }

  function onParentCategoryChange(nextId: string) {
    setParentCategoryId(nextId);
    setSubcategoryId("");
  }

  return (
    <SectionCard className="max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const tags = (fd.get("tags") as string)
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);

          startTransition(async () => {
            const resolvedCategoryId =
              productType === "MOD" ? subcategoryId || parentCategoryId || undefined : undefined;

            if (productType === "MOD" && !resolvedCategoryId) {
              appToast.error(tp("errorCategory"));
              return;
            }
            if (productType === "MOD" && requiresSubcategory && !subcategoryId) {
              appToast.error(tp("errorSubcategory"));
              return;
            }

            if (productType === "MOD" && requiresMode && !modeId) {
              appToast.error(tp("errorMode"));
              return;
            }

            const r = await createMod({
              productType,
              title: fd.get("title") as string,
              description: fd.get("description") as string,
              shortDescription: (fd.get("shortDescription") as string) || undefined,
              gameId,
              modeId: modeId || undefined,
              categoryId: resolvedCategoryId,
              pricing,
              priceCents: pricing === "PAID" ? Number(fd.get("priceCents")) * 100 : undefined,
              tags,
              sound:
                productType === "SOUND"
                  ? {
                      artist: (fd.get("artist") as string) || undefined,
                      audioCategory,
                      durationSeconds: fd.get("durationSeconds")
                        ? Number(fd.get("durationSeconds"))
                        : undefined,
                      bpm: fd.get("bpm") ? Number(fd.get("bpm")) : undefined,
                      genre: (fd.get("genre") as string) || undefined,
                      previewType,
                      previewCustomSeconds:
                        previewType === "CUSTOM" && fd.get("previewCustomSeconds")
                          ? Number(fd.get("previewCustomSeconds"))
                          : undefined,
                    }
                  : undefined,
            });
            if (r.success) {
              appToast.created();
              router.push(`/${locale}/creator/mods/${r.data.id}`);
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
        className="space-y-4"
      >
        <Field id="product-type" label={ts("productType")} required={tp("required")}>
          <Select value={productType} onValueChange={(v) => setProductType(v as "MOD" | "SOUND")}>
            <SelectTrigger id="product-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MOD">{ts("typeMod")}</SelectItem>
              <SelectItem value="SOUND">{ts("typeSound")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field id="product-title" label={productType === "SOUND" ? ts("soundTitle") : tp("fieldTitle")} required={tp("required")}>
          <Input id="product-title" name="title" required minLength={3} />
        </Field>

        {productType === "SOUND" && (
          <Field id="product-artist" label={ts("artist")}>
            <Input id="product-artist" name="artist" />
          </Field>
        )}

        <Field id="product-short" label={tp("shortDescription")} hint={tp("shortDescriptionHint")}>
          <Input id="product-short" name="shortDescription" maxLength={300} aria-describedby="product-short-hint" />
        </Field>

        <Field id="product-description" label={tp("fieldDescription")} hint={tp("descriptionHint")} required={tp("required")}>
          <Textarea
            id="product-description"
            name="description"
            required
            minLength={20}
            rows={6}
            aria-describedby="product-description-hint"
          />
        </Field>

        {productType === "MOD" && requiresMode && (
          <Field id="product-mode" label={t("gameMode")} required={tp("required")}>
            <Select value={modeId} onValueChange={onModeChange}>
              <SelectTrigger id="product-mode"><SelectValue placeholder={tp("modePlaceholder")} /></SelectTrigger>
              <SelectContent>
                {gameModes.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="product-game" label={tp("game")} required={tp("required")}>
            <Select value={gameId} onValueChange={onGameChange}>
              <SelectTrigger id="product-game"><SelectValue /></SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {productType === "MOD" ? (
            <Field id="product-category" label={t("category")} required={tp("required")}>
              <Select value={parentCategoryId} onValueChange={onParentCategoryChange}>
                <SelectTrigger id="product-category"><SelectValue placeholder={tp("categoryPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {rootCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : (
            <Field id="product-audio-category" label={ts("audioCategory")} required={tp("required")}>
              <Select value={audioCategory} onValueChange={(v) => setAudioCategory(v as SoundAudioCategory)}>
                <SelectTrigger id="product-audio-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOUND_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {ts(`categories.${c.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>

        {productType === "MOD" && parentCategoryId && subcategories.length > 0 && (
          <Field id="product-subcategory" label={t("subcategory")} required={tp("required")}>
            <Select value={subcategoryId} onValueChange={setSubcategoryId}>
              <SelectTrigger id="product-subcategory"><SelectValue placeholder={tp("subcategoryPlaceholder")} /></SelectTrigger>
              <SelectContent>
                {subcategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        {productType === "SOUND" && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="product-duration" label={ts("duration")}>
              <Input id="product-duration" name="durationSeconds" type="number" min={0} />
            </Field>
            <Field id="product-bpm" label={ts("bpm")}>
              <Input id="product-bpm" name="bpm" type="number" min={0} />
            </Field>
            <Field id="product-genre" label={ts("genre")}>
              <Input id="product-genre" name="genre" />
            </Field>
          </div>
        )}

        {productType === "SOUND" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="product-preview" label={ts("previewType")}>
              <Select value={previewType} onValueChange={(v) => setPreviewType(v as SoundPreviewType)}>
                <SelectTrigger id="product-preview"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PREVIEW_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {ts(`preview.${p.labelKey}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {previewType === "CUSTOM" && (
              <Field id="product-preview-seconds" label={ts("previewCustomSeconds")}>
                <Input id="product-preview-seconds" name="previewCustomSeconds" type="number" min={5} max={600} />
              </Field>
            )}
          </div>
        )}

        <Field id="product-pricing" label={tp("pricing")}>
          <Select value={pricing} onValueChange={(v) => setPricing(v as typeof pricing)}>
            <SelectTrigger id="product-pricing"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="FREE">{tm("free")}</SelectItem>
              <SelectItem value="PREMIUM">{tm("premium")}</SelectItem>
              <SelectItem value="PAID">{tm("paid")}</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {pricing === "PAID" && (
          <Field id="product-price" label={tp("price")}>
            <Input id="product-price" name="priceCents" type="number" min={0} step={0.01} />
          </Field>
        )}

        <Field id="product-tags" label={tp("tags")} hint={tp("tagsHint")}>
          <Input id="product-tags" name="tags" aria-describedby="product-tags-hint" />
        </Field>

        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? tc("loading") : productType === "SOUND" ? ts("createSound") : t("createMod")}
        </Button>
      </form>
    </SectionCard>
  );
}

/** @deprecated Use ProductForm */
export const ModForm = ProductForm;
