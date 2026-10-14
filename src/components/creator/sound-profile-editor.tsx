"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSoundProfile } from "@/actions/sounds";
import { SOUND_CATEGORIES, PREVIEW_TYPES } from "@/lib/sound";
import type { SoundAudioCategory, SoundPreviewType } from "@prisma/client";

type Profile = {
  artist: string | null;
  audioCategory: SoundAudioCategory;
  durationSeconds: number | null;
  bpm: number | null;
  genre: string | null;
  previewType: SoundPreviewType;
  previewCustomSeconds: number | null;
};

export function SoundProfileEditor({ modId, profile }: { modId: string; profile: Profile | null }) {
  const ts = useTranslations("sounds");
  const t = useTranslations("sharedTools.soundProfile");
  const uid = useId();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    artist: profile?.artist ?? "",
    audioCategory: profile?.audioCategory ?? "CUSTOM_AUDIO",
    durationSeconds: profile?.durationSeconds?.toString() ?? "",
    bpm: profile?.bpm?.toString() ?? "",
    genre: profile?.genre ?? "",
    previewType: profile?.previewType ?? "FULL",
    previewCustomSeconds: profile?.previewCustomSeconds?.toString() ?? "",
  });

  useEffect(() => {
    setForm({
      artist: profile?.artist ?? "",
      audioCategory: profile?.audioCategory ?? "CUSTOM_AUDIO",
      durationSeconds: profile?.durationSeconds?.toString() ?? "",
      bpm: profile?.bpm?.toString() ?? "",
      genre: profile?.genre ?? "",
      previewType: profile?.previewType ?? "FULL",
      previewCustomSeconds: profile?.previewCustomSeconds?.toString() ?? "",
    });
  }, [profile]);

  function save() {
    startTransition(async () => {
      const r = await updateSoundProfile(modId, {
        artist: form.artist || undefined,
        audioCategory: form.audioCategory,
        durationSeconds: form.durationSeconds ? Number(form.durationSeconds) : undefined,
        bpm: form.bpm ? Number(form.bpm) : undefined,
        genre: form.genre || undefined,
        previewType: form.previewType,
        previewCustomSeconds:
          form.previewType === "CUSTOM" && form.previewCustomSeconds
            ? Number(form.previewCustomSeconds)
            : undefined,
      });
      if (r.success) toast({ title: "toast.soundMetaSaved" });
      else toast({ title: r.error, variant: "destructive" });
    });
  }

  return (
    <SectionCard title={ts("metadata")}>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-artist`} className="label-text">{ts("artist")}</label>
          <Input id={`${uid}-artist`} value={form.artist} onChange={(e) => setForm((f) => ({ ...f, artist: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-audioCategory`} className="label-text">{ts("audioCategory")}</label>
          <Select
            value={form.audioCategory}
            onValueChange={(v) => setForm((f) => ({ ...f, audioCategory: v as SoundAudioCategory }))}
          >
            <SelectTrigger id={`${uid}-audioCategory`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {SOUND_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {ts(`categories.${c.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-duration`} className="label-text">{ts("duration")}</label>
          <Input
            id={`${uid}-duration`}
            type="number"
            className="tabular-nums"
            value={form.durationSeconds}
            onChange={(e) => setForm((f) => ({ ...f, durationSeconds: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-bpm`} className="label-text">{ts("bpm")}</label>
          <Input id={`${uid}-bpm`} inputMode="numeric" value={form.bpm} onChange={(e) => setForm((f) => ({ ...f, bpm: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-genre`} className="label-text">{ts("genre")}</label>
          <Input id={`${uid}-genre`} value={form.genre} onChange={(e) => setForm((f) => ({ ...f, genre: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`${uid}-previewType`} className="label-text">{ts("previewType")}</label>
          <Select
            value={form.previewType}
            onValueChange={(v) => setForm((f) => ({ ...f, previewType: v as SoundPreviewType }))}
          >
            <SelectTrigger id={`${uid}-previewType`}><SelectValue /></SelectTrigger>
            <SelectContent>
              {PREVIEW_TYPES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {ts(`preview.${p.labelKey}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {form.previewType === "CUSTOM" && (
          <div className="space-y-1.5">
            <label htmlFor={`${uid}-previewCustomSeconds`} className="label-text">{ts("previewCustomSeconds")}</label>
            <Input
              id={`${uid}-previewCustomSeconds`}
              type="number"
              className="tabular-nums"
              value={form.previewCustomSeconds}
              onChange={(e) => setForm((f) => ({ ...f, previewCustomSeconds: e.target.value }))}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <Button onClick={save} disabled={pending} size="sm">
            {t("save")}
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
