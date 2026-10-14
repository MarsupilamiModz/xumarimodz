"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Music } from "lucide-react";
import { createMod } from "@/actions/mods";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppToast } from "@/hooks/use-app-toast";
import { formatCategoryOptions, type FlatCategory } from "@/lib/categories";
import { formatRoleLabel } from "@/lib/role-display";
import { SOUND_CATEGORIES, PREVIEW_TYPES } from "@/lib/sound";
import type { SoundAudioCategory, SoundPreviewType } from "@prisma/client";

type Game = { id: string; name: string; categories: FlatCategory[] };
type Author = { id: string; username: string; displayName: string | null; role: string };

const NONE = "__none__";
const labelClass = "label-text mb-1.5 block";

export function AdminSoundUploadPanel({
  locale,
  games,
  authors,
}: {
  locale: string;
  games: Game[];
  authors: Author[];
}) {
  const t = useTranslations("admin");
  const tn = useTranslations("admin.soundNew");
  const ts = useTranslations("sounds");
  const tm = useTranslations("mods");
  const tc = useTranslations("common");
  const uid = useId();
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [gameId, setGameId] = useState(games[0]?.id ?? NONE);
  const [categoryId, setCategoryId] = useState(NONE);
  const [authorId, setAuthorId] = useState(authors[0]?.id ?? NONE);
  const [pricing, setPricing] = useState<"FREE" | "PREMIUM" | "PAID">("FREE");
  const [audioCategory, setAudioCategory] = useState<SoundAudioCategory>("CUSTOM_AUDIO");
  const [previewType, setPreviewType] = useState<SoundPreviewType>("FULL");

  const resolvedGameId = gameId === NONE ? "" : gameId;
  const resolvedAuthorId = authorId === NONE ? "" : authorId;
  const gameCategories = formatCategoryOptions(
    (games.find((g) => g.id === resolvedGameId)?.categories ?? []) as FlatCategory[]
  );

  if (games.length === 0 || authors.length === 0) {
    return (
      <EmptyState
        className="max-w-2xl"
        icon={Music}
        title={games.length === 0 ? tn("noGamesTitle") : tn("noAuthorsTitle")}
        description={games.length === 0 ? tn("noGamesText") : tn("noAuthorsText")}
      />
    );
  }

  return (
    <SectionCard title={tn("formTitle")} description={t("uploadSoundHint")} className="max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!resolvedGameId || !resolvedAuthorId) {
            appToast.error(tn("selectGameAuthor"));
            return;
          }
          const fd = new FormData(e.currentTarget);
          const tags = (fd.get("tags") as string)
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean);

          startTransition(async () => {
            const r = await createMod({
              productType: "SOUND",
              title: fd.get("title") as string,
              description: fd.get("description") as string,
              shortDescription: (fd.get("shortDescription") as string) || undefined,
              gameId: resolvedGameId,
              categoryId: categoryId !== NONE ? categoryId : undefined,
              pricing,
              priceCents: pricing === "PAID" ? Number(fd.get("priceCents")) * 100 : undefined,
              tags,
              authorId: resolvedAuthorId,
              sound: {
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
              },
            });
            if (r.success) {
              appToast.created();
              router.push(`/${locale}/admin/mods/${r.data.id}`);
            } else appToast.error(r.error);
          });
        }}
        className="space-y-4"
      >
        <div>
          <label htmlFor={`${uid}-author`} className={labelClass}>{t("assignAuthor")}</label>
          <Select value={authorId} onValueChange={setAuthorId}>
            <SelectTrigger id={`${uid}-author`}><SelectValue placeholder={t("assignAuthor")} /></SelectTrigger>
            <SelectContent>
              {authors.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  @{a.username} ({formatRoleLabel(a.role)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label htmlFor={`${uid}-title`} className={labelClass}>{ts("soundTitle")}</label>
          <Input id={`${uid}-title`} name="title" required minLength={3} />
        </div>
        <div>
          <label htmlFor={`${uid}-artist`} className={labelClass}>{ts("artist")}</label>
          <Input id={`${uid}-artist`} name="artist" />
        </div>
        <div>
          <label htmlFor={`${uid}-short`} className={labelClass}>{tn("shortDescription")}</label>
          <Input id={`${uid}-short`} name="shortDescription" maxLength={300} />
        </div>
        <div>
          <label htmlFor={`${uid}-description`} className={labelClass}>{t("soundDescription")}</label>
          <Textarea id={`${uid}-description`} name="description" required minLength={20} rows={5} aria-describedby={`${uid}-description-hint`} />
          <p id={`${uid}-description-hint`} className="meta mt-1">{tn("descriptionHint")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-game`} className={labelClass}>{tn("game")}</label>
            <Select value={gameId} onValueChange={setGameId}>
              <SelectTrigger id={`${uid}-game`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor={`${uid}-category`} className={labelClass}>{tn("category")}</label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id={`${uid}-category`}><SelectValue placeholder={tn("category")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>{tn("noCategory")}</SelectItem>
                {gameCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-audio`} className={labelClass}>{ts("audioCategory")}</label>
          <Select value={audioCategory} onValueChange={(v) => setAudioCategory(v as SoundAudioCategory)}>
            <SelectTrigger id={`${uid}-audio`}><SelectValue placeholder={ts("audioCategory")} /></SelectTrigger>
            <SelectContent>
              {SOUND_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {ts(`categories.${c.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor={`${uid}-duration`} className={labelClass}>{ts("duration")}</label>
            <Input id={`${uid}-duration`} name="durationSeconds" type="number" min={0} className="tabular-nums" />
          </div>
          <div>
            <label htmlFor={`${uid}-bpm`} className={labelClass}>{ts("bpm")}</label>
            <Input id={`${uid}-bpm`} name="bpm" type="number" min={0} className="tabular-nums" />
          </div>
          <div>
            <label htmlFor={`${uid}-genre`} className={labelClass}>{ts("genre")}</label>
            <Input id={`${uid}-genre`} name="genre" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-preview`} className={labelClass}>{ts("previewType")}</label>
            <Select value={previewType} onValueChange={(v) => setPreviewType(v as SoundPreviewType)}>
              <SelectTrigger id={`${uid}-preview`}><SelectValue placeholder={ts("previewType")} /></SelectTrigger>
              <SelectContent>
                {PREVIEW_TYPES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {ts(`preview.${p.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {previewType === "CUSTOM" && (
            <div>
              <label htmlFor={`${uid}-preview-seconds`} className={labelClass}>{ts("previewCustomSeconds")}</label>
              <Input id={`${uid}-preview-seconds`} name="previewCustomSeconds" type="number" min={5} max={600} className="tabular-nums" />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={`${uid}-pricing`} className={labelClass}>{tn("pricing")}</label>
            <Select value={pricing} onValueChange={(v) => setPricing(v as typeof pricing)}>
              <SelectTrigger id={`${uid}-pricing`}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FREE">{tm("free")}</SelectItem>
                <SelectItem value="PREMIUM">{tm("premium")}</SelectItem>
                <SelectItem value="PAID">{tm("paid")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {pricing === "PAID" && (
            <div>
              <label htmlFor={`${uid}-price`} className={labelClass}>{tn("price")}</label>
              <Input id={`${uid}-price`} name="priceCents" type="number" min={0} step={0.01} className="tabular-nums" />
            </div>
          )}
        </div>
        <div>
          <label htmlFor={`${uid}-tags`} className={labelClass}>{tn("tags")}</label>
          <Input id={`${uid}-tags`} name="tags" placeholder={tn("tagsPlaceholder")} />
        </div>

        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {pending ? tc("loading") : t("uploadSound")}
        </Button>
      </form>
    </SectionCard>
  );
}
