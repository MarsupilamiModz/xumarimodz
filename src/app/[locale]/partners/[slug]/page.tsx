import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { SocialLinks } from "@/components/social/social-links";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { REVALIDATE } from "@/lib/cache";
import { formatDisplayName } from "@/lib/display-name";
import { formatCompactNumber } from "@/lib/format-locale";
import { FollowButton } from "@/components/creator/follow-button";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import { PublicProfileHeader } from "@/components/profile/public-profile-header";
import { getAppUrl } from "@/lib/app-url";
import { getShowcasedAchievements } from "@/lib/achievements";
import { ProfileShowcase } from "@/components/achievements/profile-showcase";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";

export const revalidate = REVALIDATE.catalog;

const visible = { isPublic: true, isBanned: false, isSuspended: false } as const;

export async function generateMetadata({
  params: { locale, slug },
}: {
  params: { locale: Locale; slug: string };
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "ecosystem" });
  const profile = await prisma.partnerProfile.findFirst({
    where: { slug, ...visible },
    select: { tagline: true, description: true, user: { select: { displayName: true, username: true } } },
  });
  if (!profile) return { title: t("partnerHub") };
  return {
    title: `${formatDisplayName(profile.user)} | ${t("partner")}`,
    description: profile.tagline ?? profile.description?.slice(0, 160),
  };
}

export default async function PartnerProfilePage({
  params: { locale, slug },
}: {
  params: { locale: Locale; slug: string };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");

  // Nicht öffentliche Profile waren bisher über die URL erreichbar.
  const profile = await prisma.partnerProfile.findFirst({
    where: { slug, ...visible },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      socialLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!profile) notFound();

  const showcased = await getShowcasedAchievements(profile.userId, locale);
  const name = formatDisplayName(profile.user);
  const referralLink = profile.affiliateCode ? `${getAppUrl().replace(/\/$/, "")}/${locale}?ref=${profile.affiliateCode}` : null;

  return (
    <div className="page-section">
      <Link href={`/${locale}/partners`} className="meta mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {t("allPartners")}
      </Link>

      <PublicProfileHeader
        name={name}
        avatarUrl={profile.user.avatarUrl}
        bannerUrl={profile.bannerUrl}
        tagline={profile.tagline}
        badges={
          <>
            <CreatorLevelBadge level={profile.level} size="sm" />
            {profile.isVerified && profile.level === "UNVERIFIED" && <Badge variant="premium">{t("verified")}</Badge>}
            {profile.isFeatured && <Badge variant="outline">{t("featured")}</Badge>}
          </>
        }
        actions={
          <>
            <FollowButton followingUserId={profile.userId} profileType="partner" locale={locale} />
            <SocialLinks links={profile.socialLinks} size="sm" />
          </>
        }
        stats={[
          { label: t("followers"), value: formatCompactNumber(profile.followerCount, locale) },
          { label: t("conversions"), value: formatCompactNumber(profile.totalConversions, locale) },
        ]}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {profile.description ? (
            <section className="rounded-lg border border-line bg-raised p-5">
              <h2 className="text-[15px] font-semibold text-ink">{t("about", { name })}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{profile.description}</p>
            </section>
          ) : (
            <p className="text-sm text-ink-muted">{t("noDescription")}</p>
          )}
          {showcased.length > 0 && (
            <section className="rounded-lg border border-line bg-raised p-5">
              <ProfileShowcase achievements={showcased} />
            </section>
          )}
        </div>

        {(profile.affiliateCode || referralLink) && (
          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:h-fit">
            {profile.affiliateCode && (
              <section className="rounded-lg border border-line bg-raised p-5">
                <h2 className="text-[15px] font-semibold text-ink">{t("affiliateCode")}</h2>
                <p className="mt-2 break-all font-mono text-lg font-semibold text-violet-bright">{profile.affiliateCode}</p>
                <div className="mt-3">
                  <CopyButton value={profile.affiliateCode} label={t("copy")} copiedLabel={t("copied")} />
                </div>
              </section>
            )}
            {referralLink && (
              <section className="rounded-lg border border-line bg-raised p-5">
                <h2 className="text-[15px] font-semibold text-ink">{t("referralLink")}</h2>
                <p className="mt-2 break-all font-mono text-xs text-ink-muted">{referralLink}</p>
                <div className="mt-3">
                  <CopyButton value={referralLink} label={t("copy")} copiedLabel={t("copied")} />
                </div>
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
