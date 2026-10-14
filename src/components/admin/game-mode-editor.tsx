"use client";

import { colors } from "@/styles/tokens";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createGameMode,
  updateGameMode,
  deleteGameMode,
  duplicateGameMode,
  reorderGameModes,
  uploadGameModeAsset,
} from "@/actions/admin/game-modes";
import { updateGameModePickerSettings } from "@/actions/admin/games";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SafeImage } from "@/components/ui/safe-image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAppToast } from "@/hooks/use-app-toast";
import { ChevronDown, ChevronUp, Copy, Layers, Plus, Trash2 } from "lucide-react";

export type AdminGameMode = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  thumbnailUrl: string | null;
  bannerUrl: string | null;
  backgroundUrl: string | null;
  logoUrl: string | null;
  iconUrl: string | null;
  accentColor: string | null;
  sortOrder: number;
  isActive: boolean;
};

type PickerSettings = {
  modePickerOverlay: number;
  modePickerBlurPx: number;
  modePickerGlowEnabled: boolean;
  modePickerAnimation: string;
  modePickerOpacity: number;
};

type AssetType = "thumbnail" | "banner" | "background" | "logo" | "icon";

export function GameModeEditor({
  gameId,
  gameSlug,
  modes: initial,
  pickerSettings,
}: {
  gameId: string;
  gameSlug: string;
  modes: AdminGameMode[];
  pickerSettings: PickerSettings;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const tp = useTranslations("admin.panelGameModes");
  const appToast = useAppToast();
  const router = useRouter();
  const [modes, setModes] = useState(initial);
  const [picker, setPicker] = useState(pickerSettings);
  const [pending, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<AdminGameMode | null>(null);

  const sorted = useMemo(
    () => [...modes].sort((a, b) => a.sortOrder - b.sortOrder),
    [modes]
  );

  function moveMode(id: string, dir: -1 | 1) {
    const idx = sorted.findIndex((m) => m.id === id);
    const target = idx + dir;
    if (target < 0 || target >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[idx], reordered[target]] = [reordered[target], reordered[idx]];
    setModes(reordered.map((m, i) => ({ ...m, sortOrder: i })));

    startTransition(async () => {
      const r = await reorderGameModes(gameId, reordered.map((m) => m.id));
      if (!r.success) appToast.error(r.error);
      else router.refresh();
    });
  }

  async function uploadAsset(modeId: string, type: AssetType, file: File) {
    const fd = new FormData();
    fd.set("file", file);
    startTransition(async () => {
      const r = await uploadGameModeAsset(modeId, type, fd);
      if (r.success && r.data?.url) {
        const fieldMap: Record<AssetType, keyof AdminGameMode> = {
          thumbnail: "thumbnailUrl",
          banner: "bannerUrl",
          background: "backgroundUrl",
          logo: "logoUrl",
          icon: "iconUrl",
        };
        const field = fieldMap[type];
        setModes((prev) =>
          prev.map((m) => (m.id === modeId ? { ...m, [field]: r.data!.url } : m))
        );
        appToast.raw({ title: t("gameModeSaved") });
        router.refresh();
      } else if (!r.success) appToast.error(r.error);
    });
  }

  function savePickerSettings(next: Partial<PickerSettings>) {
    const merged = { ...picker, ...next };
    setPicker(merged);
    startTransition(async () => {
      const r = await updateGameModePickerSettings(gameId, {
        modePickerOverlay: merged.modePickerOverlay,
        modePickerBlurPx: merged.modePickerBlurPx,
        modePickerGlowEnabled: merged.modePickerGlowEnabled,
        modePickerAnimation: merged.modePickerAnimation as "fade" | "scale" | "slide",
        modePickerOpacity: merged.modePickerOpacity,
      });
      if (r.success) appToast.raw({ title: t("gameModeSaved") });
      else appToast.error(r.error);
    });
  }


  const assetLabels: [AssetType, string][] = [
    ["thumbnail", tp("assetThumbnail")],
    ["banner", tp("assetBanner")],
    ["background", t("gameModeBackground")],
    ["logo", t("gameModeLogo")],
    ["icon", tp("assetIcon")],
  ];

  return (
    <div className="space-y-6">
      <SectionCard title={t("modePickerSettings")} description={t("modePickerSettingsHint")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label htmlFor="mode-picker-overlay" className="label-text">{t("modePickerOverlay")}</label>
            <Input
              id="mode-picker-overlay"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={picker.modePickerOverlay}
              onChange={(e) => savePickerSettings({ modePickerOverlay: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mode-picker-blur" className="label-text">{t("modePickerBlur")}</label>
            <Input
              id="mode-picker-blur"
              type="number"
              min={0}
              max={64}
              value={picker.modePickerBlurPx}
              className="tabular-nums"
              onBlur={(e) => savePickerSettings({ modePickerBlurPx: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mode-picker-opacity" className="label-text">{t("modePickerOpacity")}</label>
            <Input
              id="mode-picker-opacity"
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={picker.modePickerOpacity}
              onChange={(e) => savePickerSettings({ modePickerOpacity: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="mode-picker-animation" className="label-text">{t("modePickerAnimation")}</label>
            <Select
              value={picker.modePickerAnimation}
              onValueChange={(v) => savePickerSettings({ modePickerAnimation: v })}
            >
              <SelectTrigger id="mode-picker-animation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fade">{t("animationFade")}</SelectItem>
                <SelectItem value="scale">{t("animationScale")}</SelectItem>
                <SelectItem value="slide">{t("animationSlide")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-start gap-2 pt-6 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={picker.modePickerGlowEnabled}
              onChange={(e) => savePickerSettings({ modePickerGlowEnabled: e.target.checked })}
            />
            <span>
              {t("modePickerGlow")}
              <span className="meta block">{tp("glowNoEffect")}</span>
            </span>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title={t("gameModes")}
        description={t("gameModesHint")}
        action={<span className="meta tabular-nums">{tp("count", { count: modes.length })}</span>}
      >
        {sorted.length === 0 ? (
          <EmptyState icon={Layers} title={t("noGameModes")} />
        ) : (
          <ul className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
            {sorted.map((mode) => {
              const expanded = expandedId === mode.id;
              const thumb =
                mode.thumbnailUrl ?? mode.backgroundUrl ?? mode.bannerUrl ?? mode.logoUrl ?? mode.iconUrl;
              return (
                <li key={mode.id} className="overflow-hidden rounded-lg border border-line bg-raised">
                  <div className="flex flex-wrap items-center gap-2 p-2.5">
                    <button
                      type="button"
                      className="relative h-10 w-14 shrink-0 overflow-hidden rounded-md border border-line bg-elevated"
                      onClick={() => setExpandedId(expanded ? null : mode.id)}
                      aria-expanded={expanded}
                      aria-controls={`mode-details-${mode.id}`}
                      aria-label={expanded ? tp("collapse", { name: mode.name }) : tp("expand", { name: mode.name })}
                    >
                      {thumb ? (
                        <SafeImage src={thumb} alt="" fill className="object-cover" sizes="56px" />
                      ) : (
                        <span className="mono-id flex h-full w-full items-center justify-center text-[10px] text-ink-faint">
                          {mode.slug}
                        </span>
                      )}
                    </button>
                    <Input
                      defaultValue={mode.name}
                      aria-label={tp("nameLabel")}
                      className="h-8 min-w-[120px] flex-1"
                      onBlur={(e) => {
                        if (e.target.value === mode.name) return;
                        startTransition(async () => {
                          const r = await updateGameMode(mode.id, { name: e.target.value });
                          if (r.success) {
                            setModes((prev) =>
                              prev.map((m) => (m.id === mode.id ? { ...m, name: e.target.value } : m))
                            );
                            appToast.raw({ title: t("gameModeSaved") });
                            router.refresh();
                          } else appToast.error(r.error);
                        });
                      }}
                    />
                    <code className="mono-id hidden text-ink-muted sm:inline">{mode.slug}</code>
                    <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink">
                      <input
                        type="checkbox"
                        defaultChecked={mode.isActive}
                        onChange={(e) => {
                          startTransition(async () => {
                            const r = await updateGameMode(mode.id, { isActive: e.target.checked });
                            if (r.success) {
                              setModes((prev) =>
                                prev.map((m) =>
                                  m.id === mode.id ? { ...m, isActive: e.target.checked } : m
                                )
                              );
                              router.refresh();
                            }
                          });
                        }}
                      />
                      {t("visible")}
                    </label>
                    <div className="flex gap-0.5">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={pending}
                        onClick={() => moveMode(mode.id, -1)}
                        aria-label={tp("moveUp", { name: mode.name })}
                      >
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={pending}
                        onClick={() => moveMode(mode.id, 1)}
                        aria-label={tp("moveDown", { name: mode.name })}
                      >
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={pending}
                        title={t("duplicateGameMode")}
                        aria-label={t("duplicateGameMode")}
                        onClick={() =>
                          startTransition(async () => {
                            const r = await duplicateGameMode(mode.id);
                            if (r.success && r.data) {
                              setModes((prev) => [...prev, r.data as AdminGameMode]);
                              appToast.raw({ title: t("gameModeDuplicated") });
                              router.refresh();
                            } else if (!r.success) appToast.error(r.error);
                          })
                        }
                      >
                        <Copy className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-danger"
                        disabled={pending}
                        aria-label={tp("delete", { name: mode.name })}
                        onClick={() => setDeleteMode(mode)}
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    </div>
                  </div>

                  {expanded && (
                    <div id={`mode-details-${mode.id}`} className="space-y-3 border-t border-line bg-elevated p-3">
                      <div className="space-y-1.5">
                        <label htmlFor={`mode-description-${mode.id}`} className="label-text">
                          {t("gameModeDescriptionPlaceholder")}
                        </label>
                        <Textarea
                          id={`mode-description-${mode.id}`}
                          defaultValue={mode.description ?? ""}
                          rows={2}
                          onBlur={(e) => {
                            const value = e.target.value;
                            if (value === (mode.description ?? "")) return;
                            startTransition(async () => {
                              await updateGameMode(mode.id, { description: value || undefined });
                              setModes((prev) =>
                                prev.map((m) => (m.id === mode.id ? { ...m, description: value || null } : m))
                              );
                            });
                          }}
                        />
                      </div>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1.5">
                          <label htmlFor={`mode-accent-${mode.id}`} className="label-text">{t("categoryAccentColor")}</label>
                          <Input
                            id={`mode-accent-${mode.id}`}
                            type="color"
                            defaultValue={mode.accentColor ?? colors.violet}
                            className="h-9 w-16 p-1"
                            onBlur={(e) => {
                              startTransition(async () => {
                                await updateGameMode(mode.id, { accentColor: e.target.value });
                                setModes((prev) =>
                                  prev.map((m) =>
                                    m.id === mode.id ? { ...m, accentColor: e.target.value } : m
                                  )
                                );
                              });
                            }}
                          />
                        </div>
                        {assetLabels.map(([type, label]) => (
                          <div key={type} className="space-y-1.5">
                            <label htmlFor={`mode-${type}-${mode.id}`} className="label-text">{label}</label>
                            <Input
                              id={`mode-${type}-${mode.id}`}
                              type="file"
                              accept="image/*"
                              className="max-w-[140px] text-xs"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) void uploadAsset(mode.id, type, file);
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <p className="meta">
                        {t("gameModeRoutePreview")}: <span className="mono-id">/games/{gameSlug}/{mode.slug}</span>
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newName.trim()) return;
            startTransition(async () => {
              const r = await createGameMode(gameId, { name: newName.trim() });
              if (r.success && r.data) {
                setModes((prev) => [...prev, r.data as AdminGameMode]);
                setNewName("");
                appToast.raw({ title: t("gameModeCreated") });
                router.refresh();
              } else if (!r.success) appToast.error(r.error);
            });
          }}
        >
          <label htmlFor="new-game-mode" className="sr-only">{t("newGameModePlaceholder")}</label>
          <Input
            id="new-game-mode"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder={t("newGameModePlaceholder")}
            className="min-w-[160px] flex-1"
          />
          <Button type="submit" size="sm" disabled={pending || !newName.trim()}>
            <Plus className="h-4 w-4" aria-hidden />
            {tc("save")}
          </Button>
        </form>
      </SectionCard>

      <ConfirmDialog
        open={deleteMode !== null}
        onOpenChange={(open) => !open && setDeleteMode(null)}
        title={tp("deleteConfirmTitle", { name: deleteMode?.name ?? "" })}
        description={tp("deleteConfirmText")}
        confirmLabel={tc("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleteMode) return;
          const id = deleteMode.id;
          startTransition(async () => {
            const r = await deleteGameMode(id);
            if (r.success) {
              setModes((prev) => prev.filter((m) => m.id !== id));
              setDeleteMode(null);
              appToast.raw({ title: t("gameModeDeleted") });
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </div>
  );
}
