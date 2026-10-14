"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2, Megaphone } from "lucide-react";
import {
  createSiteBanner,
  deleteSiteBanner,
  toggleSiteBanner,
} from "@/actions/admin/banners";
import type { getAdminSiteBanners } from "@/actions/admin/banners";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, controlClassName } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from "@/lib/utils";
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

function Field({ id, label, children, className }: { id: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="label-text mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export function BannersAdminPanel({ banners }: { banners: BannerRow[] }) {
  const t = useTranslations("admin.ui.bannersAdmin");
  const tp = useTranslations("admin.siteBanners");
  const uid = useId();
  const router = useRouter();
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<BannerRow | null>(null);

  const selectClass = cn(controlClassName, "h-9");

  return (
    <div className="space-y-6">
      <SectionCard title={t("createBannerTitle")}>
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const formEl = e.currentTarget;
            const fd = new FormData(formEl);
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
                formEl.reset();
              } else appToast.error(r.error);
            });
          }}
        >
          <Field id={`${uid}-type`} label={tp("type")}>
            <select id={`${uid}-type`} name="type" defaultValue="GLOBAL" className={selectClass}>
              {TYPES.map((type) => (
                <option key={type} value={type}>{tp(`types.${type}`)}</option>
              ))}
            </select>
          </Field>
          <Field id={`${uid}-frequency`} label={tp("frequency")}>
            <select id={`${uid}-frequency`} name="frequency" defaultValue="ALWAYS" className={selectClass}>
              {FREQUENCIES.map((f) => (
                <option key={f} value={f}>{tp(`frequencies.${f}`)}</option>
              ))}
            </select>
          </Field>
          <Field id={`${uid}-title`} label={t("titlePlaceholder")} className="sm:col-span-2">
            <Input id={`${uid}-title`} name="title" required />
          </Field>
          <Field id={`${uid}-description`} label={t("descriptionPlaceholder")} className="sm:col-span-2">
            <Input id={`${uid}-description`} name="description" />
          </Field>
          <Field id={`${uid}-image`} label={t("imageUrlPlaceholder")}>
            <Input id={`${uid}-image`} name="imageUrl" />
          </Field>
          <Field id={`${uid}-link`} label={t("linkUrlPlaceholder")}>
            <Input id={`${uid}-link`} name="linkUrl" />
          </Field>
          <Field id={`${uid}-button`} label={t("buttonTextPlaceholder")}>
            <Input id={`${uid}-button`} name="buttonText" />
          </Field>
          <Field id={`${uid}-priority`} label={t("priorityPlaceholder")}>
            <Input id={`${uid}-priority`} name="priority" type="number" defaultValue={0} className="tabular-nums" />
          </Field>
          <Field id={`${uid}-game`} label={t("gameIdPlaceholder")}>
            <Input id={`${uid}-game`} name="gameId" className="font-mono" />
          </Field>
          <Field id={`${uid}-category`} label={t("gameCategoryIdPlaceholder")}>
            <Input id={`${uid}-category`} name="gameCategoryId" className="font-mono" />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t("createBanner")}
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title={tp("listTitle")}>
        {banners.length === 0 ? (
          <EmptyState icon={Megaphone} title={t("noBanners")} description={tp("emptyText")} />
        ) : (
          <ul className="divide-y divide-line">
            {banners.map((banner) => (
              <li key={banner.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-ink">{banner.title}</p>
                    <p className="meta">
                      {tp(`types.${banner.type}`)} · {tp(`frequencies.${banner.frequency}`)}
                    </p>
                  </div>
                  <StatusBadge tone={banner.isActive ? "success" : "neutral"} label={banner.isActive ? t("statusActive") : t("statusOff")} />
                </div>
                {banner.description && <p className="mt-2 text-sm text-ink-muted">{banner.description}</p>}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        const r = await toggleSiteBanner(banner.id, !banner.isActive);
                        if (r.success) {
                          appToast.updated();
                          router.refresh();
                        } else appToast.error(r.error);
                      })
                    }
                  >
                    {banner.isActive ? t("disable") : t("enable")}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-danger" disabled={pending} onClick={() => setDeleting(banner)}>
                    {t("delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteConfirm")}
        description={tp("deleteText", { title: deleting?.title ?? "" })}
        confirmLabel={t("delete")}
        variant="destructive"
        loading={pending}
        onConfirm={() => {
          if (!deleting) return;
          startTransition(async () => {
            const r = await deleteSiteBanner(deleting.id);
            if (r.success) {
              appToast.deleted();
              setDeleting(null);
              router.refresh();
            } else appToast.error(r.error);
          });
        }}
      />
    </div>
  );
}
