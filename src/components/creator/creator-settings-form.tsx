"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getCreatorSettings, updateCreatorSettings } from "@/actions/creator/settings";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { KpiTile, KpiTileSkeleton } from "@/components/ui/kpi-tile";
import { SectionCard } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import { SOCIAL_LABELS, SOCIAL_PLATFORMS } from "@/lib/affiliate";
import { effectiveRevenueShareBps } from "@/lib/creator-levels";
import { formatMoneyFromCents } from "@/lib/currency";
import { formatNumber } from "@/lib/format-locale";
import type { PublisherLevel, SocialPlatform } from "@prisma/client";
import { useAppToast } from "@/hooks/use-app-toast";

type Profile = {
  tagline: string | null;
  description: string | null;
  website: string | null;
  level: PublisherLevel;
  creatorCode: string | null;
  couponCode: string | null;
  referralCode: string | null;
  commissionRateBps: number;
  commissionOverrideBps: number | null;
  totalRevenueCents: number;
  totalSales: number;
  totalCouponUses: number;
  totalDiscountCents: number;
  totalClicks: number;
  totalConversions: number;
  followerCount: number;
  totalDownloads: number;
  socialLinks: { platform: SocialPlatform; url: string }[];
};

const labelClass = "label-text mb-1.5 block text-ink-muted";

export function CreatorSettingsForm({ locale }: { locale: string }) {
  const t = useTranslations("ecosystem");
  const tp = useTranslations("creatorPages.settings");
  const appToast = useAppToast();
  const [pending, startTransition] = useTransition();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getCreatorSettings()
      .then((r) => {
        if (r.success) setProfile(r.data as Profile);
        else setFailed(true);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (failed) return <ErrorState message={tp("loadError")} onRetry={load} />;

  if (!profile) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
        <span className="sr-only">{t("loading")}</span>
        {Array.from({ length: 6 }, (_, i) => (
          <KpiTileSkeleton key={i} />
        ))}
      </div>
    );
  }

  const share = effectiveRevenueShareBps(profile.level, profile.commissionOverrideBps, profile.commissionRateBps);
  const convRate = profile.totalClicks > 0 ? (profile.totalConversions / profile.totalClicks) * 100 : 0;
  const referralLink = `/${locale}?ref=${profile.referralCode ?? profile.creatorCode}`;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <CreatorLevelBadge level={profile.level} size="md" />
        <span className="text-sm text-ink-muted">
          {t("revenueShare")}: <span className="tabular-nums text-ink">{tp("revenueShareValue", { value: formatNumber(Number((share / 100).toFixed(1)), locale) })}</span>
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiTile label={t("revenue")} value={formatMoneyFromCents(profile.totalRevenueCents, locale)} />
        <KpiTile label={t("downloads")} value={formatNumber(profile.totalDownloads, locale)} />
        <KpiTile label={t("couponUses")} value={formatNumber(profile.totalCouponUses, locale)} />
        <KpiTile label={t("totalDiscount")} value={formatMoneyFromCents(profile.totalDiscountCents, locale)} />
        <KpiTile label={t("clicks")} value={formatNumber(profile.totalClicks, locale)} />
        <KpiTile
          label={t("conversionRate")}
          value={tp("conversionRateValue", { value: formatNumber(Number(convRate.toFixed(1)), locale) })}
        />
      </div>

      <SectionCard title={tp("codesTitle")}>
        <dl className="space-y-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <dt className="label-text text-ink-muted">{t("creatorCode")}</dt>
              <dd className="mono-id text-ink">{profile.creatorCode ?? tp("noCode")}</dd>
            </div>
            {profile.creatorCode && (
              <CopyButton value={profile.creatorCode} label={t("copy")} copiedLabel={t("copied")} />
            )}
          </div>
          <div>
            <dt className="label-text text-ink-muted">{t("couponCode")}</dt>
            <dd className="mono-id text-ink">{profile.couponCode ?? tp("noCode")}</dd>
          </div>
          <div>
            <dt className="label-text text-ink-muted">{t("referralLink")}</dt>
            <dd className="mono-id break-all text-ink">{referralLink}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title={tp("profileTitle")}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const links = SOCIAL_PLATFORMS.map((p) => ({
              platform: p,
              url: (fd.get(p) as string)?.trim() ?? "",
            })).filter((l) => l.url);
            startTransition(async () => {
              const r = await updateCreatorSettings({
                tagline: fd.get("tagline") as string,
                description: fd.get("description") as string,
                website: fd.get("website") as string,
                socialLinks: links,
              });
              if (r.success) appToast.saved();
              else appToast.error(r.error);
            });
          }}
        >
          <div>
            <label htmlFor="creator-tagline" className={labelClass}>{t("tagline")}</label>
            <Input id="creator-tagline" name="tagline" defaultValue={profile.tagline ?? ""} />
          </div>
          <div>
            <label htmlFor="creator-bio" className={labelClass}>{t("bio")}</label>
            <Textarea id="creator-bio" name="description" defaultValue={profile.description ?? ""} rows={4} />
          </div>
          <div>
            <label htmlFor="creator-website" className={labelClass}>{tp("website")}</label>
            <Input id="creator-website" name="website" defaultValue={profile.website ?? ""} />
          </div>

          <fieldset className="space-y-3">
            <legend className="section-title mb-3">{t("socialLinks")}</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              {SOCIAL_PLATFORMS.map((p) => (
                <div key={p}>
                  <label htmlFor={`creator-social-${p}`} className={labelClass}>
                    {p === "WEBSITE" ? tp("website") : SOCIAL_LABELS[p]}
                  </label>
                  <Input
                    id={`creator-social-${p}`}
                    name={p}
                    defaultValue={profile.socialLinks.find((l) => l.platform === p)?.url ?? ""}
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <Button type="submit" disabled={pending} aria-busy={pending}>{t("save")}</Button>
        </form>
      </SectionCard>
    </div>
  );
}
