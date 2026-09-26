"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { BannerAlign, BannerDisplayType } from "@prisma/client";
import { updateGameBannerSettings } from "@/actions/admin/games";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAppToast } from "@/hooks/use-app-toast";
import { SafeImage } from "@/components/ui/safe-image";
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
    <Card className="p-6 space-y-6">
      <div>
        <h3 className="font-semibold">{t("heading")}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {t("hint")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t("displayType")}</label>
            <select
              value={displayType}
              onChange={(e) => setDisplayType(e.target.value as BannerDisplayType)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
            >
              <option value="SMALL">{t("displayTypeSmall")}</option>
              <option value="FEATURED">{t("displayTypeFeatured")}</option>
              <option value="CUSTOM">{t("displayTypeCustom")}</option>
            </select>
          </div>

          {displayType === "CUSTOM" && (
            <div>
              <label className="text-sm font-medium">{t("heightPx")}</label>
              <div className="flex flex-wrap gap-2 mt-2 mb-2">
                {BANNER_HEIGHT_PRESETS.map((h) => (
                  <Button
                    key={h}
                    type="button"
                    size="sm"
                    variant={heightPx === h ? "default" : "outline"}
                    onClick={() => setHeightPx(h)}
                  >
                    {h}px
                  </Button>
                ))}
              </div>
              <Input
                type="number"
                min={120}
                max={800}
                value={heightPx}
                onChange={(e) => setHeightPx(Number(e.target.value) || 400)}
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium">{t("alignment")}</label>
            <select
              value={align}
              onChange={(e) => setAlign(e.target.value as BannerAlign)}
              className="mt-1 h-10 w-full rounded-md border border-input bg-background/50 px-3 text-sm"
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
              <label className="text-xs text-muted-foreground">{t("focusX", { value: focusX })}</label>
              <Input
                type="range"
                min={0}
                max={100}
                value={focusX}
                onChange={(e) => setFocusX(Number(e.target.value))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t("focusY", { value: focusY })}</label>
              <Input
                type="range"
                min={0}
                max={100}
                value={focusY}
                onChange={(e) => setFocusY(Number(e.target.value))}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">{t("zoom", { value: zoom.toFixed(2) })}</label>
            <Input
              type="range"
              min={1}
              max={2}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="mt-1"
            />
          </div>

          <Button type="button" disabled={pending} onClick={save}>
            {t("save")}
          </Button>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-2">{t("livePreview")}</p>
          <div
            className="relative rounded-xl overflow-hidden border border-border/50 bg-muted/20"
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
              <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                {t("uploadToPreview")}
              </div>
            )}
            <div className="absolute inset-0" />
            <div className="absolute bottom-3 left-3 text-xs font-medium">
              {t("previewDimensions", { height: previewHeight, displayType })}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
