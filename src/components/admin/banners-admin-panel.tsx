"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createSiteBanner,
  deleteSiteBanner,
  toggleSiteBanner,
} from "@/actions/admin/banners";
import type { getAdminSiteBanners } from "@/actions/admin/banners";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { SiteBannerFrequency, SiteBannerType } from "@prisma/client";

type BannerRow = Extract<
  Awaited<ReturnType<typeof getAdminSiteBanners>>,
  { success: true }
>["data"][number];

const TYPES: SiteBannerType[] = ["GLOBAL", "GAME", "CATEGORY", "MOD", "PARTNER"];
const FREQUENCIES: SiteBannerFrequency[] = [
  "ALWAYS",
  "EVERY_5_MIN",
  "EVERY_15_MIN",
  "ONCE_SESSION",
  "ONCE_DAY",
];

export function BannersAdminPanel({ banners }: { banners: BannerRow[] }) {
  const t = useTranslations("admin.ui.bannersAdmin");
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <h3 className="font-semibold">{t("createBannerTitle")}</h3>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await createSiteBanner({
                type: fd.get("type") as SiteBannerType,
                title: fd.get("title") as string,
                description: (fd.get("description") as string) || undefined,
                imageUrl: (fd.get("imageUrl") as string) || undefined,
                linkUrl: (fd.get("linkUrl") as string) || undefined,
                buttonText: (fd.get("buttonText") as string) || undefined,
                frequency: fd.get("frequency") as SiteBannerFrequency,
                priority: Number(fd.get("priority") || 0),
                gameId: (fd.get("gameId") as string) || null,
                gameCategoryId: (fd.get("gameCategoryId") as string) || null,
              });
              if (r.success) {
                appToast.saved();
                router.refresh();
                e.currentTarget.reset();
              } else appToast.error(r.error);
            });
          }}
        >
          <select name="type" defaultValue="GLOBAL" className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm">
            {TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select name="frequency" defaultValue="ALWAYS" className="h-10 rounded-md border border-input bg-background/50 px-3 text-sm">
            {FREQUENCIES.map((f) => (
              <option key={f} value={f}>{f.replace(/_/g, " ")}</option>
            ))}
          </select>
          <Input name="title" placeholder={t("titlePlaceholder")} required className="sm:col-span-2" />
          <Input name="description" placeholder={t("descriptionPlaceholder")} className="sm:col-span-2" />
          <Input name="imageUrl" placeholder={t("imageUrlPlaceholder")} />
          <Input name="linkUrl" placeholder={t("linkUrlPlaceholder")} />
          <Input name="buttonText" placeholder={t("buttonTextPlaceholder")} />
          <Input name="priority" type="number" defaultValue={0} placeholder={t("priorityPlaceholder")} />
          <Input name="gameId" placeholder={t("gameIdPlaceholder")} />
          <Input name="gameCategoryId" placeholder={t("gameCategoryIdPlaceholder")} />
          <Button type="submit" disabled={pending} className="sm:col-span-2">
            {t("createBanner")}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">{t("activeBannersTitle")}</h3>
        <div className="space-y-3">
          {banners.map((banner) => (
            <div key={banner.id} className="rounded-lg border border-border/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{banner.title}</p>
                  <p className="text-xs text-muted-foreground">{banner.type} · {banner.frequency}</p>
                </div>
                <Badge variant={banner.isActive ? "premium" : "outline"}>
                  {banner.isActive ? t("statusActive") : t("statusOff")}
                </Badge>
              </div>
              {banner.description && (
                <p className="text-sm text-muted-foreground mt-2">{banner.description}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      const r = await toggleSiteBanner(banner.id, !banner.isActive);
                      if (r.success) router.refresh();
                    })
                  }
                >
                  {banner.isActive ? t("disable") : t("enable")}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(t("deleteConfirm"))) return;
                    startTransition(async () => {
                      const r = await deleteSiteBanner(banner.id);
                      if (r.success) router.refresh();
                    });
                  }}
                >
                  {t("delete")}
                </Button>
              </div>
            </div>
          ))}
          {banners.length === 0 && (
            <p className="text-sm text-muted-foreground">{t("noBanners")}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
