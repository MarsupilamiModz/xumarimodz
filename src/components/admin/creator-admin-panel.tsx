"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PublisherLevel, SocialPlatform } from "@prisma/client";
import {
  updateCreatorProfile,
  deleteCreatorProfile,
  banCreator,
  setCreatorLevel,
  assignCreatorCode,
  assignCreatorCouponCode,
  upsertCreatorSocialLinks,
  syncCreatorStatsAction,
} from "@/actions/admin/creators";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { KpiTile } from "@/components/ui/kpi-tile";
import { SectionCard } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import { SocialLinks } from "@/components/social/social-links";
import { SOCIAL_LABELS, SOCIAL_PLATFORMS } from "@/lib/affiliate";
import { LEVEL_OPTIONS, CREATOR_LEVELS, effectiveRevenueShareBps } from "@/lib/creator-levels";
import { formatCents } from "@/lib/affiliate";
import { formatNumber } from "@/lib/format-locale";
import { useAppToast } from "@/hooks/use-app-toast";
import type { CreatorAdminAnalytics } from "@/lib/creator-admin-analytics";

type CreatorData = {
  id: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  creatorCode: string | null;
  couponCode: string | null;
  referralCode: string | null;
  level: PublisherLevel;
  commissionRateBps: number;
  commissionOverrideBps: number | null;
  isVerified: boolean;
  isFeatured: boolean;
  isSuspended: boolean;
  isPublic: boolean;
  isHomepage: boolean;
  isTrending: boolean;
  sortOrder: number;
  totalDownloads: number;
  totalRevenueCents: number;
  totalSales: number;
  totalCouponUses: number;
  totalDiscountCents: number;
  totalClicks: number;
  totalConversions: number;
  followerCount: number;
  user: {
    id: string;
    username: string;
    displayName: string | null;
    email: string;
    avatarUrl: string | null;
    isBanned: boolean;
  };
  socialLinks: { platform: SocialPlatform; url: string }[];
  analytics?: CreatorAdminAnalytics;
};

const kpiGrid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-4";
const checkboxClass = "h-4 w-4 accent-violet";

export function CreatorAdminPanel({ locale, creator }: { locale: string; creator: CreatorData }) {
  const t = useTranslations("ecosystem");
  const tc = useTranslations("admin.creatorEdit");
  const uid = useId();
  const appToast = useAppToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [level, setLevel] = useState(creator.level);
  const [confirm, setConfirm] = useState<"ban" | "delete" | null>(null);
  const share = effectiveRevenueShareBps(level, creator.commissionOverrideBps, creator.commissionRateBps);

  const conversionRate = creator.totalClicks > 0 ? (creator.totalConversions / creator.totalClicks) * 100 : 0;
  const pct = (value: number) => `${formatNumber(Math.round(value * 10) / 10, locale)} %`;

  const flags: { key: string; show: boolean; label: string; tone: "success" | "neutral" | "danger" | "warning" }[] = [
    { key: "featured", show: creator.isFeatured, label: t("featured"), tone: "success" },
    { key: "public", show: creator.isPublic, label: t("public"), tone: "neutral" },
    { key: "homepage", show: creator.isHomepage, label: t("homepage"), tone: "neutral" },
    { key: "trending", show: creator.isTrending, label: t("trending"), tone: "neutral" },
    { key: "suspended", show: creator.isSuspended, label: t("suspended"), tone: "warning" },
    { key: "banned", show: creator.user.isBanned, label: t("banned"), tone: "danger" },
  ];

  const runSimple = (action: () => Promise<{ success: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await action();
      if (r.success) {
        appToast.updated();
        router.refresh();
      } else appToast.error(r.error);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <CreatorLevelBadge level={creator.level} size="md" />
        {flags.filter((f) => f.show).map((f) => (
          <StatusBadge key={f.key} tone={f.tone} label={f.label} />
        ))}
      </div>

      <div className={kpiGrid}>
        <KpiTile label={t("revenue")} value={formatCents(creator.totalRevenueCents, locale)} />
        <KpiTile label={t("clicks")} value={formatNumber(creator.totalClicks, locale)} />
        <KpiTile label={t("conversions")} value={formatNumber(creator.totalConversions, locale)} />
        <KpiTile label={t("conversionRate")} value={pct(conversionRate)} />
        <KpiTile label={t("downloads")} value={formatNumber(creator.totalDownloads, locale)} />
        <KpiTile label={t("couponUses")} value={formatNumber(creator.totalCouponUses, locale)} />
        <KpiTile label={t("totalDiscount")} value={formatCents(creator.totalDiscountCents, locale)} />
        <KpiTile label={t("followers")} value={formatNumber(creator.followerCount, locale)} />
      </div>

      {creator.analytics && (
        <>
          <SectionCard title={tc("overviewTitle")}>
            <div className={kpiGrid}>
              <KpiTile label={tc("uploads")} value={formatNumber(creator.analytics.overview.totalUploads, locale)} />
              <KpiTile label={tc("downloads")} value={formatNumber(creator.analytics.overview.totalDownloads, locale)} />
              <KpiTile label={tc("likes")} value={formatNumber(creator.analytics.overview.totalLikes, locale)} />
              <KpiTile label={tc("reviews")} value={formatNumber(creator.analytics.overview.totalReviews, locale)} />
              <KpiTile label={tc("comments")} value={formatNumber(creator.analytics.overview.totalComments, locale)} />
              <KpiTile label={tc("followers")} value={formatNumber(creator.analytics.overview.followers, locale)} />
              <KpiTile label={tc("revenue")} value={formatCents(creator.analytics.overview.totalRevenueCents, locale)} />
              <KpiTile label={tc("premiumSales")} value={formatNumber(creator.analytics.overview.premiumSales, locale)} />
              <KpiTile label={tc("shopSales")} value={formatNumber(creator.analytics.overview.shopSales, locale)} />
            </div>
          </SectionCard>

          <SectionCard title={tc("revenueTitle")}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KpiTile label={tc("today")} value={formatCents(creator.analytics.revenue.today, locale)} />
              <KpiTile label={tc("days7")} value={formatCents(creator.analytics.revenue.week, locale)} />
              <KpiTile label={tc("days30")} value={formatCents(creator.analytics.revenue.month, locale)} />
              <KpiTile label={tc("days90")} value={formatCents(creator.analytics.revenue.quarter, locale)} />
              <KpiTile label={tc("total")} value={formatCents(creator.analytics.revenue.total, locale)} />
            </div>
          </SectionCard>

          {creator.analytics.topMods.length > 0 && (
            <SectionCard title={tc("topMods")}>
              <DataTable
                caption={tc("topMods")}
                rows={creator.analytics.topMods}
                rowKey={(m) => m.id}
                columns={[
                  { key: "mod", header: tc("colMod"), width: "minmax(0,2fr)", cell: (m) => <span className="block truncate font-medium text-ink">{m.title}</span> },
                  { key: "downloads", header: tc("colDownloads"), align: "right", cell: (m) => formatNumber(m.downloadCount, locale) },
                  { key: "revenue", header: tc("colRevenue"), align: "right", hideOnMobile: true, cell: (m) => formatCents(m.revenueCents, locale) },
                  {
                    key: "rating",
                    header: tc("colRating"),
                    align: "right",
                    cell: (m) =>
                      m.reviewCount > 0
                        ? tc("rating", { rating: formatNumber(Math.round((m.averageRating ?? 0) * 10) / 10, locale), count: m.reviewCount })
                        : "—",
                  },
                ]}
              />
            </SectionCard>
          )}
        </>
      )}

      <SectionCard title={t("editCreator")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const r = await updateCreatorProfile(creator.id, {
                tagline: fd.get("tagline") as string,
                description: fd.get("description") as string,
                slug: fd.get("slug") as string,
                isFeatured: fd.get("isFeatured") === "on",
                isPublic: fd.get("isPublic") === "on",
                isHomepage: fd.get("isHomepage") === "on",
                isTrending: fd.get("isTrending") === "on",
                isSuspended: fd.get("isSuspended") === "on",
                commissionOverrideBps: fd.get("override") ? Number(fd.get("override")) : null,
              });
              if (r.success) {
                appToast.saved();
                router.refresh();
              } else appToast.error(r.error);
            });
          }}
        >
          <div>
            <label htmlFor={`${uid}-slug`} className="label-text mb-1.5 block">{tc("slug")}</label>
            <Input id={`${uid}-slug`} name="slug" defaultValue={creator.slug} className="font-mono" />
          </div>
          <div>
            <label htmlFor={`${uid}-tagline`} className="label-text mb-1.5 block">{t("tagline")}</label>
            <Input id={`${uid}-tagline`} name="tagline" defaultValue={creator.tagline ?? ""} />
          </div>
          <div>
            <label htmlFor={`${uid}-description`} className="label-text mb-1.5 block">{tc("description")}</label>
            <Textarea id={`${uid}-description`} name="description" defaultValue={creator.description ?? ""} rows={4} />
          </div>
          <fieldset>
            <legend className="label-text mb-2">{tc("visibility")}</legend>
            <div className="flex flex-wrap gap-4 text-sm text-ink">
              {(
                [
                  ["isFeatured", creator.isFeatured, t("featured")],
                  ["isPublic", creator.isPublic, t("public")],
                  ["isHomepage", creator.isHomepage, t("homepage")],
                  ["isTrending", creator.isTrending, t("trending")],
                  ["isSuspended", creator.isSuspended, t("suspended")],
                ] as const
              ).map(([name, checked, label]) => (
                <label key={name} className="flex items-center gap-2">
                  <input type="checkbox" name={name} defaultChecked={checked} className={checkboxClass} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${uid}-level`} className="label-text mb-1.5 block">{t("creatorLevel")}</label>
              <Select
                value={level}
                onValueChange={(v) => {
                  setLevel(v as PublisherLevel);
                  startTransition(async () => {
                    const r = await setCreatorLevel(creator.id, v as PublisherLevel);
                    if (r.success) router.refresh();
                    else appToast.error(r.error);
                  });
                }}
              >
                <SelectTrigger id={`${uid}-level`}><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((l) => (
                    <SelectItem key={l} value={l}>{t(CREATOR_LEVELS[l].labelKey)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="meta mt-1 tabular-nums">{t("revenueShare")}: {pct(share / 100)}</p>
            </div>
            <div>
              <label htmlFor={`${uid}-override`} className="label-text mb-1.5 block">{t("overrideShare")}</label>
              <Input id={`${uid}-override`} name="override" type="number" className="tabular-nums" defaultValue={creator.commissionOverrideBps ?? ""} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>{t("save")}</Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await syncCreatorStatsAction(creator.id);
                  router.refresh();
                  appToast.updated();
                })
              }
            >
              {t("syncStats")}
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title={t("codes")}>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="label-text">{t("creatorCode")}</dt>
              <dd className="mt-0.5 font-mono text-ink">{creator.creatorCode ?? "—"}</dd>
            </div>
            <div>
              <dt className="label-text">{t("couponCode")}</dt>
              <dd className="mt-0.5 font-mono text-ink">{creator.couponCode ?? "—"}</dd>
            </div>
            <div>
              <dt className="label-text">{t("referralLink")}</dt>
              <dd className="mono-id mt-0.5 break-all">/{locale}?ref={creator.referralCode ?? creator.creatorCode ?? "—"}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" disabled={pending} onClick={() => runSimple(() => assignCreatorCode(creator.id))}>
              {t("regenerateCode")}
            </Button>
            <Button variant="outline" size="sm" disabled={pending} onClick={() => runSimple(() => assignCreatorCouponCode(creator.id))}>
              {t("setCouponCode")}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={t("socialLinks")}>
          <SocialLinks links={creator.socialLinks} />
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const links = SOCIAL_PLATFORMS.map((p) => ({
                platform: p,
                url: (fd.get(p) as string)?.trim() ?? "",
              })).filter((l) => l.url);
              startTransition(async () => {
                const r = await upsertCreatorSocialLinks(creator.id, links);
                if (r.success) {
                  appToast.saved();
                  router.refresh();
                } else appToast.error(r.error);
              });
            }}
          >
            {SOCIAL_PLATFORMS.map((p) => (
              <div key={p}>
                <label htmlFor={`${uid}-social-${p}`} className="label-text mb-1.5 block">{SOCIAL_LABELS[p]}</label>
                <Input
                  id={`${uid}-social-${p}`}
                  name={p}
                  defaultValue={creator.socialLinks.find((l) => l.platform === p)?.url ?? ""}
                />
              </div>
            ))}
            <Button type="submit" variant="outline" size="sm" disabled={pending}>{t("save")}</Button>
          </form>
        </SectionCard>
      </div>

      <SectionCard title={tc("dangerZone")} description={tc("dangerText")}>
        <div className="flex flex-wrap gap-2">
          {creator.user.isBanned ? (
            <Button variant="outline" size="sm" disabled={pending} onClick={() => runSimple(() => banCreator(creator.id, false))}>
              {t("unban")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="text-danger" disabled={pending} onClick={() => setConfirm("ban")}>
              {t("banCreator")}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-danger" disabled={pending} onClick={() => setConfirm("delete")}>
            {t("deleteCreator")}
          </Button>
        </div>
      </SectionCard>

      <ConfirmDialog
        open={confirm === "ban"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={tc("banTitle", { name: creator.user.displayName ?? creator.user.username })}
        description={tc("banText")}
        confirmLabel={t("banCreator")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await banCreator(creator.id, true);
            if (r.success) {
              setConfirm(null);
              appToast.updated();
              router.refresh();
            } else appToast.error(r.error);
          })
        }
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("confirmDelete")}
        description={tc("deleteText")}
        confirmLabel={t("deleteCreator")}
        variant="destructive"
        loading={pending}
        onConfirm={() =>
          startTransition(async () => {
            const r = await deleteCreatorProfile(creator.id);
            if (r.success) {
              appToast.deleted();
              router.push(`/${locale}/admin/creators`);
            } else appToast.error(r.error);
          })
        }
      />
    </div>
  );
}
