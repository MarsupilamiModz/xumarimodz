"use client";

import { useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BannerAlign, BannerDisplayType } from "@prisma/client";
import { updateGameBannerSettings } from "@/actions/admin/games";
import { Button } from "@/components/ui/button";
import { ChipTabs } from "@/components/ui/chip-tabs";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { useAppToast } from "@/hooks/use-app-toast";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils";
import {
  BANNER_HEIGHT_PRESETS,
  bannerImageStyle,
  resolveBannerHeight,
} from "@/lib/game-banner";

type Props = {
  gameId: string;
  bannerUrl?: string | null;
  coverUrl?: string | null;
  settings: {
    bannerDisplayType: BannerDisplayType;
    bannerHeightPx?: number | null;
    bannerFocusX: number;
    bannerFocusY: number;
    bannerZoom: number;
    bannerAlign: BannerAlign;
  };
};

export function GameBannerSettings({ gameId, bannerUrl, coverUrl, settings }: Props) {
  const t = useTranslations("admin.ui.gameBanner");
  const uid = useId();
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [displayType, setDisplayType] = useState<BannerDisplayType>(settings.bannerDisplayType);
  const [heightPx, setHeightPx] = useState(settings.bannerHeightPx ?? 400);
  const [focusX, setFocusX] = useState(settings.bannerFocusX);
  const [focusY, setFocusY] = useState(settings.bannerFocusY);
  const [zoom, setZoom] = useState(settings.bannerZoom);
  const [align, setAlign] = useState<BannerAlign>(settings.bannerAlign);

  const previewConfig = useMemo(
    () => ({
      bannerDisplayType: displayType,
      bannerHeightPx: heightPx,
      bannerFocusX: focusX,
      bannerFocusY: focusY,
      bannerZoom: zoom,
      bannerAlign: align,
    }),
    [displayType, heightPx, focusX, focusY, zoom, align]
  );

  const previewHeight = resolveBannerHeight(previewConfig);
  const imageSrc = bannerUrl ?? coverUrl;

  function save() {
    startTransition(async () => {
      const r = await updateGameBannerSettings(gameId, {
        bannerDisplayType: displayType,
        bannerHeightPx: displayType === "CUSTOM" ? heightPx : null,
        bannerFocusX: focusX,
        bannerFocusY: focusY,
        bannerZoom: zoom,
        bannerAlign: align,
      });
      if (r.success) {
        appToast.saved();
        router.refresh();
      } else appToast.error(r.error);
    });
  }

  return (
    <SectionCard title={t("heading")} description={t("hint")}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label htmlFor={`${uid}-type`} className="label-text mb-1.5 block">{t("displayType")}</label>
            <select
              id={`${uid}-type`}
              value={displayType}
              onChange={(e) => setDisplayType(e.target.value as BannerDisplayType)}
              className={cn(controlClassName, "h-9")}
            >
              <option value="SMALL">{t("displayTypeSmall")}</option>
              <option value="FEATURED">{t("displayTypeFeatured")}</option>
              <option value="CUSTOM">{t("displayTypeCustom")}</option>
            </select>
          </div>

          {displayType === "CUSTOM" && (
            <div>
              <label htmlFor={`${uid}-height`} className="label-text mb-1.5 block">{t("heightPx")}</label>
              <ChipTabs
                className="mb-2"
                label={t("heightPx")}
                value={String(heightPx)}
                options={BANNER_HEIGHT_PRESETS.map((h) => ({ value: String(h), label: `${h}px` }))}
                onChange={(v) => setHeightPx(Number(v))}
              />
              <Input
                id={`${uid}-height`}
                className="tabular-nums"
                type="number"
                min={120}
                max={800}
                value={heightPx}
                onChange={(e) => setHeightPx(Number(e.target.value) || 400)}
              />
            </div>
          )}

          <div>
            <label htmlFor={`${uid}-align`} className="label-text mb-1.5 block">{t("alignment")}</label>
            <select
              id={`${uid}-align`}
              value={align}
              onChange={(e) => setAlign(e.target.value as BannerAlign)}
              className={cn(controlClassName, "h-9")}
            >
              <option value="CENTER">{t("alignCenter")}</option>
              <option value="TOP">{t("alignTop")}</option>
              <option value="BOTTOM">{t("alignBottom")}</option>
              <option value="LEFT">{t("alignLeft")}</option>
              <option value="RIGHT">{t("alignRight")}</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${uid}-fx`} className="label-text mb-1.5 block tabular-nums">{t("focusX", { value: focusX })}</label>
              <Input
                id={`${uid}-fx`}
                type="range"
                min={0}
                max={100}
                value={focusX}
                onChange={(e) => setFocusX(Number(e.target.value))}
              />
            </div>
            <div>
              <label htmlFor={`${uid}-fy`} className="label-text mb-1.5 block tabular-nums">{t("focusY", { value: focusY })}</label>
              <Input
                id={`${uid}-fy`}
                type="range"
                min={0}
                max={100}
                value={focusY}
                onChange={(e) => setFocusY(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <label htmlFor={`${uid}-zoom`} className="label-text mb-1.5 block tabular-nums">{t("zoom", { value: zoom.toFixed(2) })}</label>
            <Input
              id={`${uid}-zoom`}
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </div>

          <Button type="button" disabled={pending} onClick={save}>
            {t("save")}
          </Button>
        </div>

        <div>
          <p className="label-text mb-2">{t("livePreview")}</p>
          <div
            className="relative overflow-hidden rounded-lg border border-line bg-elevated"
            style={{ height: Math.min(previewHeight, 320) }}
          >
            {imageSrc ? (
              <SafeImage
                src={imageSrc}
                alt=""
                fill
                className="object-cover opacity-70"
                style={bannerImageStyle(previewConfig)}
                sizes="400px"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-ink-faint">
                {t("uploadToPreview")}
              </div>
            )}
            <div className="absolute inset-0" />
            <div className="absolute bottom-3 left-3 rounded-sm bg-canvas/80 px-2 py-0.5 text-xs font-medium tabular-nums text-ink">
              {t("previewDimensions", { height: previewHeight, displayType })}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
