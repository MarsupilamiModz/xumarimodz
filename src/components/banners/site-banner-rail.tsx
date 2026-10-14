"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { X } from "lucide-react";
import type { SiteBannerFrequency } from "@prisma/client";
import { SafeImage } from "@/components/ui/safe-image";
import { Button } from "@/components/ui/button";
import { bannerStorageKey, FREQUENCY_MS } from "@/lib/site-banner-utils";

export type SiteBannerData = {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  buttonText: string | null;
  frequency: SiteBannerFrequency;
};

function shouldShowBanner(banner: SiteBannerData): boolean {
  if (typeof window === "undefined") return true;
  const key = bannerStorageKey(banner.id, banner.frequency);
  const stored = localStorage.getItem(key);
  const now = Date.now();

  switch (banner.frequency) {
    case "ALWAYS":
      return true;
    case "ONCE_SESSION": {
      if (sessionStorage.getItem(key)) return false;
      return true;
    }
    case "ONCE_DAY": {
      if (!stored) return true;
      const ts = Number(stored);
      return Number.isNaN(ts) || now - ts > 86400000;
    }
    case "EVERY_5_MIN":
    case "EVERY_15_MIN": {
      const interval = FREQUENCY_MS[banner.frequency] ?? 0;
      if (!stored) return true;
      const ts = Number(stored);
      return Number.isNaN(ts) || now - ts >= interval;
    }
    default:
      return true;
  }
}

function markBannerSeen(banner: SiteBannerData) {
  const key = bannerStorageKey(banner.id, banner.frequency);
  const now = String(Date.now());
  if (banner.frequency === "ONCE_SESSION") {
    sessionStorage.setItem(key, now);
  } else if (banner.frequency !== "ALWAYS") {
    localStorage.setItem(key, now);
  }
}

export function SiteBannerRail({ banners }: { banners: SiteBannerData[] }) {
  const t = useTranslations();
  const [visible, setVisible] = useState<SiteBannerData[]>([]);

  useEffect(() => {
    setVisible(banners.filter(shouldShowBanner));
  }, [banners]);

  const dismiss = useCallback((banner: SiteBannerData) => {
    markBannerSeen(banner);
    setVisible((prev) => prev.filter((b) => b.id !== banner.id));
  }, []);

  if (!visible.length) return null;

  return (
    <div className="space-y-2">
      {visible.map((banner) => (
        <div
          key={banner.id}
          className="relative border-b border-line bg-raised"
        >
          <div className="page-container flex items-center gap-4 py-3">
            {banner.imageUrl && (
              <div className="relative hidden h-12 w-20 shrink-0 overflow-hidden rounded-md sm:block">
                <SafeImage src={banner.imageUrl} alt="" fill className="object-cover" sizes="80px" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{banner.title}</p>
              {banner.description && (
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{banner.description}</p>
              )}
            </div>
            {banner.linkUrl && (
              <Button variant="outline" size="sm" asChild className="shrink-0">
                <Link href={banner.linkUrl}>{banner.buttonText ?? t("common.learnMore")}</Link>
              </Button>
            )}
            <button
              type="button"
              aria-label={t("ui.dismiss")}
              className="shrink-0 rounded-md p-1 text-ink-muted hover:bg-hover hover:text-ink"
              onClick={() => dismiss(banner)}
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
