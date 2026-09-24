"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import {
  createMod,
  updateMod,
  deleteMod,
  restoreMod,
} from "@/actions/mods";
import { CreatorModVersionUpload } from "@/components/creator/creator-mod-version-upload";
import { SoundPreviewUpload } from "@/components/creator/sound-preview-upload";
import { SoundProfileEditor } from "@/components/creator/sound-profile-editor";
import { ModMediaUploader } from "@/components/mods/mod-media-uploader";
import { mapModMedia } from "@/lib/mod-media";
import type { MediaSettings } from "@/lib/media-settings";
import { parseTags, safeFormOptional, safeFormString } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { type FlatCategory } from "@/lib/categories";
import { formatRoleLabel } from "@/lib/role-display";
import { formatDate } from "@/lib/format-locale";
import { modTone } from "@/lib/status-tones";
import type { ModStatus, SoundAudioCategory, SoundPreviewType } from "@prisma/client";

type Game = {
  id: string;
  name: string;
  modes: { id: string; name: string; slug: string }[];
  categories: FlatCategory[];
};
type Author = { id: string; username: string; displayName: string | null; role: string };

type ModData = {
  id: string;
  slug: string;
  title: string;
  description: string;
  shortDescription: string | null;
  gameId: string;
  modeId: string | null;
  categoryId: string | null;
  authorId: string;
  pricing: string;
  priceCents: number | null;
  status: string;
  visibility: string;
  isFeatured: boolean;
  productType?: string;
  soundProfile?: {
    previewFileKey: string | null;
    coverImageKey: string | null;
    artist: string | null;
    audioCategory: SoundAudioCategory;
    durationSeconds: number | null;
    bpm: number | null;
    genre: string | null;
    previewType: SoundPreviewType;
    previewCustomSeconds: number | null;
  } | null;
  tags: { name: string }[];
  media?: {
    id: string;
    mediaType: "IMAGE" | "YOUTUBE";
    imageUrl: string | null;
    videoUrl: string | null;
    youtubeVideoId: string | null;
    orderIndex: number;
    isFeatured: boolean;
  }[];
  screenshots: { id: string; url: string }[];
  videos: { id: string; url: string; title: string | null }[];
  versions: {
    id?: string;
    version: string;
    createdAt: Date;
    gameVersion?: string | null;
    channel?: string;
    isPrimary?: boolean;
    isArchived?: boolean;
    downloadCount?: number;
  }[];
};

type Pricing = "FREE" | "PREMIUM" | "PAID";
const MOD_STATUSES: ModStatus[] = ["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"];

function resolveCategorySelection(
  categories: FlatCategory[],
  categoryId: string | null | undefined
) {
  if (!categoryId) return { parentCategoryId: "", subcategoryId: "" };
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return { parentCategoryId: "", subcategoryId: "" };
  if (cat.parentId) return { parentCategoryId: cat.parentId, subcategoryId: cat.id };
  return { parentCategoryId: cat.id, subcategoryId: "" };
}

/** Beschriftetes Formularfeld; `id` verbindet Label und Control. */
function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label-text mb-1.5 block text-ink-muted">
        {label}
      </label>
      {children}
      {hint && <p className="meta mt-1 text-ink-faint">{hint}</p>}
    </div>
  );
}

function ModAssignmentFields({
  games,
  gameId,
  modeId,
  parentCategoryId,
  subcategoryId,
  onGameChange,
  onModeChange,
  onParentCategoryChange,
  onSubcategoryChange,
}: {
  games: Game[];
  gameId: string;
  modeId: string;
  parentCategoryId: string;
  subcategoryId: string;
  onGameChange: (id: string) => void;
  onModeChange: (id: string) => void;
  onParentCategoryChange: (id: string) => void;
  onSubcategoryChange: (id: string) => void;
}) {
  const t = useTranslations("admin");
  const uid = useId();

  const selectedGame = games.find((g) => g.id === gameId);
  const gameModes = selectedGame?.modes ?? [];
  const requiresMode = gameModes.length > 0;

  const gameCategories = useMemo(
    () =>
      (selectedGame?.categories ?? []).filter(
        (c) => !modeId || !c.modeId || c.modeId === modeId
      ),
    [selectedGame?.categories, modeId]
  );

  const rootCategories = useMemo(
    () => gameCategories.filter((c) => !c.parentId),
    [gameCategories]
  );

  const subcategories = useMemo(
    () => gameCategories.filter((c) => c.parentId === parentCategoryId),
    [gameCategories, parentCategoryId]
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field id={`${uid}-game`} label={t("reassignGame")}>
        <Select value={gameId} onValueChange={onGameChange}>
          <SelectTrigger id={`${uid}-game`}><SelectValue /></SelectTrigger>
          <SelectContent>
            {games.map((g) => (
              <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {requiresMode && (
        <Field id={`${uid}-mode`} label={t("reassignMode")}>
          <Select value={modeId || "__none__"} onValueChange={(v) => onModeChange(v === "__none__" ? "" : v)}>
            <SelectTrigger id={`${uid}-mode`}><SelectValue placeholder={t("reassignMode")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {gameModes.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}

      <Field id={`${uid}-cat`} label={t("reassignCategory")}>
        <Select
          value={parentCategoryId || "__none__"}
          onValueChange={(v) => onParentCategoryChange(v === "__none__" ? "" : v)}
        >
          <SelectTrigger id={`${uid}-cat`}><SelectValue placeholder={t("reassignCategory")} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">—</SelectItem>
            {rootCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {subcategories.length > 0 && (
        <Field id={`${uid}-sub`} label={t("me.subcategory")}>
          <Select
            value={subcategoryId || "__none__"}
            onValueChange={(v) => onSubcategoryChange(v === "__none__" ? "" : v)}
          >
            <SelectTrigger id={`${uid}-sub`}><SelectValue placeholder={t("me.subcategory")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {subcategories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    </div>
  );
}

function PricingSelect({ id, value, onChange }: { id: string; value: Pricing; onChange: (v: Pricing) => void }) {
  const tm = useTranslations("mods");
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Pricing)}>
      <SelectTrigger id={id}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="FREE">{tm("free")}</SelectItem>
        <SelectItem value="PREMIUM">{tm("premium")}</SelectItem>
        <SelectItem value="PAID">{tm("paid")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

type ConfirmKind = "archive" | "restore" | "delete" | null;

export function ModAdminPanel({
  locale,
  games,
  authors,
  mod,
  mediaSettings,
  isAdmin = false,
  redirectBase,
  showTitle = true,
}: {
  locale: string;
  games: Game[];
  authors?: Author[];
  mod?: ModData;
  mediaSettings?: MediaSettings;
  isAdmin?: boolean;
  redirectBase: string;
  /** false, wenn die Seite den Titel bereits über AdminPageHeader rendert. */
  showTitle?: boolean;
}) {
  const t = useTranslations("admin");
  const ts = useTranslations("status");
  const appToast = useAppToast();
  const router = useRouter();
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const initialGameId = mod?.gameId ?? games[0]?.id ?? "";
  const initialCategories = games.find((g) => g.id === initialGameId)?.categories ?? [];
  const initialCat = resolveCategorySelection(initialCategories, mod?.categoryId);
  const initial = useMemo(
    () => ({
      gameId: initialGameId,
      modeId: mod?.modeId ?? "",
      parentCategoryId: initialCat.parentCategoryId,
      subcategoryId: initialCat.subcategoryId,
      pricing: ((mod?.pricing as Pricing) ?? "FREE") as Pricing,
      authorId: mod?.authorId ?? authors?.[0]?.id ?? "",
      status: mod?.status ?? "DRAFT",
      isFeatured: mod?.isFeatured ?? false,
    }),
    // Nach router.refresh() liefern die Props neue Ausgangswerte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mod, initialGameId, initialCat.parentCategoryId, initialCat.subcategoryId]
  );

  const [gameId, setGameId] = useState(initial.gameId);
  const [modeId, setModeId] = useState(initial.modeId);
  const [parentCategoryId, setParentCategoryId] = useState(initial.parentCategoryId);
  const [subcategoryId, setSubcategoryId] = useState(initial.subcategoryId);
  const [pricing, setPricing] = useState<Pricing>(initial.pricing);
  const [authorId, setAuthorId] = useState(initial.authorId);
  const [status, setStatus] = useState(initial.status);
  const [isFeatured, setIsFeatured] = useState(initial.isFeatured);
  const [textDirty, setTextDirty] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmKind>(null);

  const resolvedCategoryId = subcategoryId || parentCategoryId || null;

  const stateDirty =
    gameId !== initial.gameId ||
    modeId !== initial.modeId ||
    parentCategoryId !== initial.parentCategoryId ||
    subcategoryId !== initial.subcategoryId ||
    pricing !== initial.pricing ||
    (isAdmin && (authorId !== initial.authorId || status !== initial.status || isFeatured !== initial.isFeatured));
  const dirty = !!mod && (textDirty || stateDirty);

  const resetForm = useCallback(() => {
    formRef.current?.reset();
    setGameId(initial.gameId);
    setModeId(initial.modeId);
    setParentCategoryId(initial.parentCategoryId);
    setSubcategoryId(initial.subcategoryId);
    setPricing(initial.pricing);
    setAuthorId(initial.authorId);
    setStatus(initial.status);
    setIsFeatured(initial.isFeatured);
    setTextDirty(false);
  }, [initial]);

  // Warnung beim Verlassen der Seite mit ungespeicherten Änderungen.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

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

  const authorSelect = isAdmin && authors && (
    <Field id={`${uid}-author`} label={t("me.author")}>
      <Select value={authorId} onValueChange={setAuthorId}>
        <SelectTrigger id={`${uid}-author`}><SelectValue placeholder={t("assignAuthor")} /></SelectTrigger>
        <SelectContent>
          {authors.map((a) => (
            <SelectItem key={a.id} value={a.id}>@{a.username} ({formatRoleLabel(a.role)})</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );

  if (mod) {
    const isSound = mod.productType === "SOUND";

    const runConfirmed = () => {
      if (!mod || !confirm) return;
      const kind = confirm;
      startTransition(async () => {
        const r = kind === "restore" ? await restoreMod(mod.id) : await deleteMod(mod.id, kind === "delete");
        if (!r.success) {
          appToast.error(r.error);
          return;
        }
        setConfirm(null);
        if (kind === "delete") {
          appToast.deleted(t("me.deleted"));
          router.push(`/${locale}${redirectBase}`);
        } else {
          appToast.updated(kind === "restore" ? t("me.restored") : t("me.archived"));
          router.refresh();
        }
      });
    };

    return (
      <div className="max-w-3xl space-y-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showTitle ? (
            <div>
              <h1 className="h1-acp">{mod.title}</h1>
              <p className="mono-id mt-1 text-ink-faint">/{mod.slug}</p>
            </div>
          ) : (
            <p className="mono-id text-ink-faint">/{mod.slug}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{isSound ? t("me.typeSound") : t("me.typeMod")}</Badge>
            <StatusBadge tone={modTone(mod.status as ModStatus)} label={ts(`mod.${mod.status}`)} />
            {mod.isFeatured && <Badge variant="premium">{t("featured")}</Badge>}
          </div>
        </div>

        <Card className="space-y-4 p-6">
          <h2 className="section-title">{t("me.details")}</h2>
          <form
            ref={formRef}
            onInput={() => setTextDirty(true)}
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const tags = parseTags(fd.get("tags"));
              startTransition(async () => {
                const priceRaw = fd.get("priceCents");
                const priceCredits =
                  pricing === "PAID" && priceRaw ? Math.max(0, Math.round(Number(priceRaw))) : undefined;
                const r = await updateMod(mod.id, {
                  title: fd.get("title") as string,
                  description: fd.get("description") as string,
                  shortDescription: (fd.get("shortDescription") as string) || undefined,
                  gameId,
                  modeId: modeId || null,
                  categoryId: resolvedCategoryId,
                  pricing,
                  priceCents: priceCredits,
                  tags,
                  ...(isAdmin && {
                    status: status as never,
                    isFeatured,
                    authorId: authorId || undefined,
                  }),
                });
                if (r.success) {
                  setTextDirty(false);
                  appToast.saved();
                  router.refresh();
                } else appToast.error(r.error);
              });
            }}
            className="space-y-4"
          >
            <Field id={`${uid}-title`} label={t("me.title")}>
              <Input id={`${uid}-title`} name="title" defaultValue={mod.title} required />
            </Field>
            <Field id={`${uid}-short`} label={t("me.shortDescription")} hint={t("me.shortDescriptionHint")}>
              <Input id={`${uid}-short`} name="shortDescription" defaultValue={mod.shortDescription ?? ""} maxLength={300} />
            </Field>
            <Field id={`${uid}-desc`} label={t("me.description")}>
              <Textarea id={`${uid}-desc`} name="description" defaultValue={mod.description} required rows={6} />
            </Field>

            {!isSound && (
              <ModAssignmentFields
                games={games}
                gameId={gameId}
                modeId={modeId}
                parentCategoryId={parentCategoryId}
                subcategoryId={subcategoryId}
                onGameChange={onGameChange}
                onModeChange={onModeChange}
                onParentCategoryChange={setParentCategoryId}
                onSubcategoryChange={setSubcategoryId}
              />
            )}

            {authorSelect}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id={`${uid}-pricing`} label={t("me.pricing")}>
                <PricingSelect id={`${uid}-pricing`} value={pricing} onChange={setPricing} />
              </Field>
              {pricing === "PAID" && (
                <Field id={`${uid}-price`} label={t("me.price")}>
                  <Input id={`${uid}-price`} name="priceCents" type="number" defaultValue={mod.priceCents ?? 0} min={0} step={100} className="tabular-nums" />
                </Field>
              )}
              {isAdmin && (
                <Field id={`${uid}-status`} label={t("me.status")} hint={t("me.visibilityHint")}>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id={`${uid}-status`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {MOD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>{ts(`mod.${s}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>

            {isAdmin && <Checkbox checked={isFeatured} onCheckedChange={setIsFeatured} label={t("me.featured")} />}

            <Field id={`${uid}-tags`} label={t("me.tags")} hint={t("me.tagsHint")}>
              <Input id={`${uid}-tags`} name="tags" defaultValue={mod.tags.map((tag) => tag.name).join(", ")} />
            </Field>
          </form>
        </Card>

        <Card className="overflow-hidden">
          <h2 className="section-title flex h-12 items-center border-b border-line px-4">{t("me.versions")}</h2>
          {mod.versions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-muted">{t("me.noVersions")}</p>
          ) : (
            <table className="w-full text-[13px]">
              <caption className="sr-only">{t("me.versions")}</caption>
              <thead>
                <tr className="border-b border-line text-left text-xs text-ink-faint">
                  <th scope="col" className="px-4 py-2 font-medium">{t("me.version")}</th>
                  <th scope="col" className="px-4 py-2 font-medium">{t("me.gameVersion")}</th>
                  <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">{t("me.channel")}</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">{t("me.uploaded")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {mod.versions.map((v, i) => (
                  <tr key={v.id ?? `${v.version}-${i}`} className="hover:bg-row-hover">
                    <td className="px-4 py-2.5">
                      <span className="mono-id text-ink">{v.version}</span>
                      {(v.isPrimary || (i === 0 && v.isPrimary === undefined)) && (
                        <Badge variant="outline" className="ml-2">{t("me.primary")}</Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-muted">{v.gameVersion || t("me.anyVersion")}</td>
                    <td className="hidden px-4 py-2.5 text-ink-muted sm:table-cell">{v.channel ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-ink-muted">{formatDate(v.createdAt, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {isSound && (
          <>
            <SoundProfileEditor modId={mod.id} profile={mod.soundProfile ?? null} />
            <SoundPreviewUpload
              modId={mod.id}
              hasPreview={!!mod.soundProfile?.previewFileKey}
              hasCover={!!mod.soundProfile?.coverImageKey}
            />
          </>
        )}

        <CreatorModVersionUpload modId={mod.id} />

        {!isSound && (
          <ModMediaUploader
            modId={mod.id}
            media={mapModMedia(mod.media ?? [])}
            settings={mediaSettings ?? { minScreenshots: 0, maxScreenshots: 15, allowedTypes: ["image/jpeg", "image/png", "image/webp"], maxFileSizeMb: 5, imageQuality: 0.85 }}
          />
        )}

        {isAdmin && (
          <Card className="space-y-4 border-danger/30 p-6">
            <h2 className="section-title text-danger">{t("me.danger")}</h2>
            <p className="text-sm text-ink-muted">{t("me.dangerText")}</p>
            <div className="flex flex-wrap gap-2">
              {mod.status === "ARCHIVED" ? (
                <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirm("restore")}>
                  {t("me.restore")}
                </Button>
              ) : (
                <Button type="button" variant="outline" disabled={pending} onClick={() => setConfirm("archive")}>
                  {t("me.archive")}
                </Button>
              )}
              <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirm("delete")}>
                {t("me.delete")}
              </Button>
            </div>
          </Card>
        )}

        <ConfirmDialog
          open={confirm !== null}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={confirm === "delete" ? t("me.delete") : confirm === "restore" ? t("me.restore") : t("me.archive")}
          description={
            confirm === "delete"
              ? t("me.deleteConfirm", { title: mod.title })
              : confirm === "restore"
                ? t("me.restoreConfirm")
                : t("me.archiveConfirm")
          }
          confirmLabel={confirm === "delete" ? t("me.delete") : confirm === "restore" ? t("me.restore") : t("me.archive")}
          variant={confirm === "delete" ? "destructive" : "default"}
          loading={pending}
          onConfirm={runConfirmed}
        />

        {/* Leiste für ungespeicherte Änderungen: bleibt am unteren Rand, bis gespeichert oder verworfen. */}
        <div
          role="region"
          aria-label={t("me.unsaved")}
          hidden={!dirty}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-raised lg:left-[232px]"
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <p className="text-sm font-medium text-ink" aria-live="polite">{dirty ? t("me.unsaved") : ""}</p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" disabled={pending} onClick={resetForm}>
                {t("me.discard")}
              </Button>
              <Button type="button" disabled={pending} onClick={() => formRef.current?.requestSubmit()}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {pending ? t("me.saving") : t("me.save")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="max-w-2xl p-6">
      {showTitle && <h2 className="section-title mb-4">{t("uploadMod")}</h2>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const tags = parseTags(fd.get("tags"));
          startTransition(async () => {
            const r = await createMod({
              productType: "MOD",
              title: safeFormString(fd, "title"),
              description: safeFormString(fd, "description"),
              shortDescription: safeFormOptional(fd, "shortDescription"),
              gameId,
              modeId: modeId || undefined,
              categoryId: resolvedCategoryId ?? undefined,
              pricing,
              priceCents: pricing === "PAID" ? Number(fd.get("priceCents")) * 100 : undefined,
              tags,
              ...(isAdmin && authorId ? { authorId } : {}),
            });
            if (r.success) {
              appToast.created();
              router.push(`/${locale}${redirectBase}/${r.data.id}`);
            } else appToast.error(r.error);
          });
        }}
        className="space-y-4"
      >
        <Field id={`${uid}-title`} label={t("me.title")}>
          <Input id={`${uid}-title`} name="title" required minLength={3} />
        </Field>
        <Field id={`${uid}-short`} label={t("me.shortDescription")} hint={t("me.shortDescriptionHint")}>
          <Input id={`${uid}-short`} name="shortDescription" maxLength={300} />
        </Field>
        <Field id={`${uid}-desc`} label={t("me.description")}>
          <Textarea id={`${uid}-desc`} name="description" required minLength={20} rows={6} />
        </Field>

        <ModAssignmentFields
          games={games}
          gameId={gameId}
          modeId={modeId}
          parentCategoryId={parentCategoryId}
          subcategoryId={subcategoryId}
          onGameChange={onGameChange}
          onModeChange={onModeChange}
          onParentCategoryChange={setParentCategoryId}
          onSubcategoryChange={setSubcategoryId}
        />

        {authorSelect}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${uid}-pricing`} label={t("me.pricing")}>
            <PricingSelect id={`${uid}-pricing`} value={pricing} onChange={setPricing} />
          </Field>
          {pricing === "PAID" && (
            <Field id={`${uid}-price`} label={t("me.priceUsd")}>
              <Input id={`${uid}-price`} name="priceCents" type="number" min={0} step={0.01} className="tabular-nums" />
            </Field>
          )}
        </div>
        <Field id={`${uid}-tags`} label={t("me.tags")} hint={t("me.tagsHint")}>
          <Input id={`${uid}-tags`} name="tags" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {t("me.create")}
        </Button>
      </form>
    </Card>
  );
}
