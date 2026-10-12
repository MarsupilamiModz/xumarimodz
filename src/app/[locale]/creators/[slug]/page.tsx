import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, Layers } from "lucide-react";
import { prisma } from "@/lib/db";
import { ModCard } from "@/components/mods/mod-card";
import { CreatorLevelBadge } from "@/components/creator/creator-level-badge";
import { SocialLinks } from "@/components/social/social-links";
import { ProfileShowcase } from "@/components/achievements/profile-showcase";
import { CreatorRankBadge } from "@/components/leaderboards/creator-rank-badge";
import { getShowcasedAchievements } from "@/lib/achievements";
import { getUserMembershipTier } from "@/lib/membership";
import { getCreatorModStats } from "@/lib/creator-stats";
import { formatCompactNumber } from "@/lib/format-locale";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { PublicProfileHeader } from "@/components/profile/public-profile-header";
import { REVALIDATE } from "@/lib/cache";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";
import { FollowButton } from "@/components/creator/follow-button";
import { formatDisplayName } from "@/lib/display-name";

export const revalidate = 60; // REVALIDATE.catalog – Next verlangt ein Literal

export async function generateMetadata(
  props: {
    params: Promise<{ locale: Locale; slug: string }>;
  }
): Promise<Metadata> {
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  const t = await getTranslations({ locale, namespace: "ecosystem" });
  const profile = await prisma.creatorProfile.findUnique({
    where: { slug },
    select: { isPublic: true, isSuspended: true, tagline: true, description: true, user: { select: { displayName: true, username: true } } },
  });
  if (!profile || !profile.isPublic || profile.isSuspended) return { title: t("creatorDiscovery") };
  return {
    title: `${formatDisplayName(profile.user)} | Creator`,
    description: profile.tagline ?? profile.description?.slice(0, 160),
  };
}

const MODS_PER_PAGE = 24;

export default async function CreatorProfilePage(
  props: {
    params: Promise<{ locale: Locale; slug: string }>;
    searchParams: Promise<{ page?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");

  const profile = await prisma.creatorProfile.findUnique({
    where: { slug, isSuspended: false, isPublic: true },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      socialLinks: { orderBy: { sortOrder: "asc" } },
    },
  });
  if (!profile) notFound();

  const page = Math.max(1, Math.floor(Number(searchParams.page) || 1));
  const [mods, showcased, membershipTier, stats] = await Promise.all([
    prisma.mod.findMany({
      where: { authorId: profile.userId, status: "PUBLISHED", visibility: "PUBLIC" },
      orderBy: [{ isFeatured: "desc" }, { downloadCount: "desc" }],
      skip: (page - 1) * MODS_PER_PAGE,
      take: MODS_PER_PAGE,
      include: {
        game: { select: { name: true, slug: true } },
        media: { orderBy: [{ isFeatured: "desc" }, { orderIndex: "asc" }] },
        screenshots: { take: 1, orderBy: { sortOrder: "asc" } },
        tags: { take: 3 },
      },
    }),
    getShowcasedAchievements(profile.userId, locale),
    getUserMembershipTier(profile.userId),
    getCreatorModStats([profile.userId]),
  ]);
  const own = stats.get(profile.userId) ?? { downloads: 0, mods: 0 };
  const name = formatDisplayName(profile.user);
  const pages = Math.max(1, Math.ceil(own.mods / MODS_PER_PAGE));

  return (
    <div className="page-section">
      <Link href={`/${locale}/creators`} className="meta mb-6 inline-flex items-center gap-1.5 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        {t("allCreators")}
      </Link>

      <PublicProfileHeader
        name={name}
        avatarUrl={profile.user.avatarUrl}
        bannerUrl={profile.bannerUrl}
        tagline={profile.tagline}
        badges={
          <>
            <CreatorLevelBadge level={profile.level} size="sm" />
            <CreatorRankBadge tier={profile.rankTier} size="sm" />
            {profile.isFeatured && <Badge variant="outline">{t("featured")}</Badge>}
          </>
        }
        actions={
          <>
            <FollowButton followingUserId={profile.userId} profileType="creator" locale={locale} />
            <SocialLinks links={profile.socialLinks} size="sm" />
          </>
        }
        stats={[
          { label: t("downloads"), value: formatCompactNumber(own.downloads, locale) },
          { label: t("statMods"), value: formatCompactNumber(own.mods, locale) },
          { label: t("followers"), value: formatCompactNumber(profile.followerCount, locale) },
        ]}
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-labelledby="creator-mods" className="min-w-0">
          <AdLocationSlot location="creator" className="mb-6" />
          <h2 id="creator-mods" className="mb-4 text-lg font-semibold text-ink">
            {t("uploads")}
            <span className="ml-2 text-sm font-normal tabular-nums text-ink-muted">{own.mods}</span>
          </h2>
          {mods.length === 0 ? (
            <EmptyState icon={Layers} title={t("noMods")} />
          ) : (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {mods.map((mod, index) => (
                  <li key={mod.id}>
                    <ModCard locale={locale} mod={mod} priority={page === 1 && index === 0} />
                  </li>
                ))}
              </ul>
              <Pagination
                className="mt-8"
                page={Math.min(page, pages)}
                pages={pages}
                hrefFor={(p) => `/${locale}/creators/${profile.slug}${p > 1 ? `?page=${p}` : ""}#creator-mods`}
              />
            </>
          )}
        </section>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:h-fit">
          {profile.description && (
            <section className="rounded-lg border border-line bg-raised p-5">
              <h2 className="text-[15px] font-semibold text-ink">{t("about", { name })}</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-muted">{profile.description}</p>
            </section>
          )}
          {profile.creatorCode && (
            <section className="rounded-lg border border-line bg-raised p-5">
              <h2 className="text-[15px] font-semibold text-ink">{t("creatorCode")}</h2>
              <p className="mt-2 break-all font-mono text-lg font-semibold text-violet-bright">{profile.creatorCode}</p>
              <div className="mt-3">
                <CopyButton value={profile.creatorCode} label={t("copy")} copiedLabel={t("copied")} />
              </div>
            </section>
          )}
          {(showcased.length > 0 || membershipTier) && (
            <section className="rounded-lg border border-line bg-raised p-5">
              {/* Rang steht schon im Kopf – hier nur Erfolge und Unterstützer-Stufe. */}
              <ProfileShowcase achievements={showcased} supporterLabel={membershipTier?.name ?? null} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
