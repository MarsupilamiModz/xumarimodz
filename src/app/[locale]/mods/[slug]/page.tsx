import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronRight, Download, MessageSquare, MonitorDown, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModCard } from "@/components/mods/mod-card";
import { ModDetailMedia } from "@/components/mods/mod-detail-media";
import { FavoriteButton } from "@/components/mods/favorite-button";
import { ReviewForm } from "@/components/mods/review-form";
import { ModDependenciesPanel } from "@/components/mods/mod-dependencies-panel";
import { ModVersionsPanel } from "@/components/mods/mod-versions-panel";
import { ModDownloadButton } from "@/components/mods/mod-download-button";
import { ModPurchaseButton } from "@/components/mods/mod-purchase-button";
import { ModSecurityPanel } from "@/components/security/mod-security-panel";
import { ReportContentButton } from "@/components/trust/report-content-button";
import { checkMissingDependencies } from "@/lib/mod-dependencies";
import { getModBySlug, getTrendingMods } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { SITE } from "@/lib/site";
import { getFeaturedMediaUrl, getGalleryImages, getYouTubeVideos, mapModMedia } from "@/lib/mod-media";
import { getLocalizedModContent } from "@/lib/localization";
import { SafeImage } from "@/components/ui/safe-image";
import { UserIdentity } from "@/components/user/user-identity";
import { getInlineBadgesForUsers } from "@/lib/user-badges";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import { formatMoneyFromCents } from "@/lib/currency";
import { formatBytes } from "@/lib/file-size";
import { formatCompactNumber, formatDate } from "@/lib/format-locale";
import { formatDisplayName } from "@/lib/display-name";
import { safeIntlNumberFormat } from "@/lib/i18n/safe-locale";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    slug
  } = params;

  const mod = await getModBySlug(slug);
  if (!mod) return { title: "Mod not found" };
  const media = mapModMedia(mod.media ?? []);
  const cover = getFeaturedMediaUrl(media, mod.screenshots);
  const description = mod.shortDescription ?? mod.description.slice(0, 160);
  return {
    title: mod.title,
    description,
    openGraph: {
      title: `${mod.title} | ${SITE.name}`,
      description,
      ...(cover ? { images: [{ url: cover }] } : {}),
    },
    twitter: { card: cover ? "summary_large_image" : "summary", title: mod.title, description },
  };
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-right text-sm font-semibold tabular-nums text-ink">{children}</dd>
    </div>
  );
}

export default async function ModDetailPage(props: { params: Promise<{ locale: Locale; slug: string }> }) {
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("mods");
  const mod = await getModBySlug(slug);
  if (!mod || mod.status !== "PUBLISHED") notFound();

  const [localized, user] = await Promise.all([
    getLocalizedModContent(mod.id, locale, {
      title: mod.title,
      description: mod.description,
      shortDescription: mod.shortDescription,
    }),
    getCurrentUser(),
  ]);

  const media = mapModMedia(mod.media ?? []);
  const featuredUrl = getFeaturedMediaUrl(media, mod.screenshots);
  const featuredImage = media.find((m) => m.isFeatured && m.mediaType === "IMAGE");
  const featuredVideo = media.find((m) => m.isFeatured && m.mediaType === "YOUTUBE");
  const videos = getYouTubeVideos(media);
  const galleryImages = getGalleryImages(media);
  const heroVideoId =
    featuredVideo?.youtubeVideoId ??
    (galleryImages.length === 0 && videos[0]?.youtubeVideoId ? videos[0].youtubeVideoId : null);
  const heroIsVideo = !!heroVideoId && !featuredImage?.imageUrl;

  const reviewUserIds = mod.reviews.map((r) => r.userId);
  const authorId = mod.author.id;

  const [favorited, related, badgeMap, owned, depCheck] = await Promise.all([
    user ? prisma.modFavorite.findUnique({ where: { modId_userId: { modId: mod.id, userId: user.id } } }) : null,
    getTrendingMods(5, mod.gameId),
    getInlineBadgesForUsers([authorId, ...reviewUserIds], locale),
    user
      ? prisma.modPurchase.findFirst({ where: { modId: mod.id, userId: user.id, refundedAt: null } }).catch(() => null)
      : null,
    checkMissingDependencies(mod.id, user?.id ?? null),
  ]);

  const relatedMods = related.filter((m) => m.id !== mod.id).slice(0, 4);
  const creatorSlug = mod.author.creatorProfile?.slug ?? mod.author.username;
  const creatorBadges = badgeMap.get(authorId) ?? [];
  const primaryVersion = mod.versions.find((v) => v.isPrimary && !v.isArchived) ?? mod.versions.find((v) => !v.isArchived);
  const sizeLabel = primaryVersion ? formatBytes(primaryVersion.fileSize, locale) : null;
  const pricingLabel = mod.pricing === "FREE" ? t("free") : mod.pricing === "PREMIUM" ? t("premium") : t("paid");
  const isPaid = mod.pricing === "PAID" && !!mod.priceCents && mod.priceCents > 0;
  const hasRatings = mod.reviews.length > 0 && mod.averageRating > 0;
  // Changelog: eigene Einträge, sonst die Notizen der Versionen.
  const changelog =
    mod.changelog.length > 0
      ? mod.changelog.map((c) => ({ id: c.id, version: c.version, date: c.createdAt, content: c.content }))
      : mod.versions
          .filter((v) => v.changelog?.trim())
          .map((v) => ({ id: v.id, version: v.version, date: v.createdAt, content: v.changelog as string }));

  const catalogGameHref = `/${locale}/mods?game=${mod.game.slug}`;

  return (
    <div className="page-section pt-8 md:pt-10">
      <nav aria-label={t("breadcrumb")}>
        <ol className="flex flex-wrap items-center gap-1 text-[13px] text-ink-muted">
          <li>
            <Link href={`/${locale}/mods`} className="hover:text-ink">{t("title")}</Link>
          </li>
          <li aria-hidden className="flex"><ChevronRight className="h-3.5 w-3.5" /></li>
          <li>
            <Link href={catalogGameHref} className="hover:text-ink">{mod.game.name}</Link>
          </li>
          {mod.category && (
            <>
              <li aria-hidden className="flex"><ChevronRight className="h-3.5 w-3.5" /></li>
              <li>
                <Link href={`${catalogGameHref}&category=${mod.category.slug}`} className="hover:text-ink">
                  {mod.category.name}
                </Link>
              </li>
            </>
          )}
          <li aria-hidden className="flex"><ChevronRight className="h-3.5 w-3.5" /></li>
          <li aria-current="page" className="max-w-[240px] truncate text-ink">{localized.title}</li>
        </ol>
      </nav>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2">
          {mod.pricing !== "FREE" && <Badge variant="premium">{pricingLabel}</Badge>}
        </div>
        <h1 className="h1-display mt-2">
          {localized.title}
        </h1>
        <p className="meta mt-2">
          {[mod.game.name, mod.category?.name, t("byAuthor", { name: formatDisplayName(mod.author) })].filter(Boolean).join(" · ")}
        </p>
        {localized.shortDescription && <p className="mt-3 max-w-3xl text-ink-muted">{localized.shortDescription}</p>}
      </header>

      <AdLocationSlot location="mod-detail" className="mt-6" />

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-8">
          <ModDetailMedia
            title={localized.title}
            media={media}
            featuredUrl={featuredUrl}
            featuredIsVideo={heroIsVideo}
            featuredVideoId={heroVideoId}
            excludeVideoId={heroIsVideo ? heroVideoId : null}
          />

          <Tabs defaultValue="description">
            <TabsList>
              <TabsTrigger value="description">{t("tabDescription")}</TabsTrigger>
              <TabsTrigger value="changelog">{t("tabChangelog")}</TabsTrigger>
              <TabsTrigger value="files">{t("tabFiles")}</TabsTrigger>
              <TabsTrigger value="comments">
                {t("tabComments")}
                <span className="rounded-sm bg-elevated px-1.5 text-xs tabular-nums text-ink-muted">{mod.reviews.length}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="description">
              <div className="max-w-3xl whitespace-pre-wrap leading-7 text-ink-muted">{localized.description}</div>
              {mod.tags.length > 0 && (
                <div className="mt-6">
                  <p className="text-[13px] font-semibold text-ink">{t("tagsTitle")}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {mod.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline">{tag.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="changelog">
              {changelog.length === 0 ? (
                <p className="text-ink-muted">{t("noChangelog")}</p>
              ) : (
                <ol className="space-y-6">
                  {changelog.map((entry) => (
                    <li key={entry.id}>
                      <p className="font-semibold tabular-nums text-ink">
                        {entry.version}
                        <span className="meta ml-3 font-normal">{formatDate(entry.date, locale)}</span>
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-ink-muted">{entry.content}</p>
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>

            <TabsContent value="files">
              <ModVersionsPanel modId={mod.id} versions={mod.versions} />
            </TabsContent>

            <TabsContent value="comments" className="space-y-6">
              {user ? (
                <ReviewForm modId={mod.id} />
              ) : (
                <p className="text-sm text-ink-muted">
                  <Link href={`/${locale}/login?redirect=/${locale}/mods/${mod.slug}`} className="link font-semibold">
                    {t("signIn")}
                  </Link>{" "}
                  · {t("leaveReview")}
                </p>
              )}
              {mod.reviews.length === 0 ? (
                <EmptyState icon={MessageSquare} title={t("noReviews")} />
              ) : (
                <ul className="divide-y divide-line border-y border-line">
                  {mod.reviews.map((r) => (
                    <li key={r.id} className="py-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <UserIdentity
                          username={r.user.username}
                          displayName={r.user.displayName}
                          badges={badgeMap.get(r.user.id) ?? []}
                          size="sm"
                        />
                        <span className="flex items-center gap-1 text-sm tabular-nums text-ink-muted" aria-label={t("ratingLabel", { rating: r.rating })}>
                          <Star className="h-4 w-4 fill-violet-bright text-violet-bright" aria-hidden />
                          {r.rating}/5
                        </span>
                        <span className="meta">{formatDate(r.createdAt, locale)}</span>
                      </div>
                      {r.content && <p className="mt-2 text-sm text-ink-muted">{r.content}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:h-fit">
          <div className="rounded-xl border border-line bg-raised p-5">
            {/* TODO(backend): Der Launcher verarbeitet xumarimodz:// bisher nur für den Login.
                Sobald er Installations-Links kennt, hier auf xumarimodz://install/<slug> umstellen. */}
            <Button className="w-full" size="lg" asChild>
              <Link href={`/${locale}/download?mod=${mod.slug}`}>
                <MonitorDown className="h-4 w-4" aria-hidden />
                {t("installInApp")}
              </Link>
            </Button>
            <p className="meta mt-2">{t("installHint")}</p>

            <div className="mt-4 flex gap-2">
              <ModDownloadButton
                modId={mod.id}
                variant="outline"
                label={sizeLabel ? t("downloadWithSize", { size: sizeLabel }) : t("download")}
              />
              <FavoriteButton modId={mod.id} initialFavorited={!!favorited} />
            </div>

            {isPaid && user && (
              <div className="mt-3">
                <ModPurchaseButton modId={mod.id} priceCents={mod.priceCents!} owned={!!owned} locale={locale} />
              </div>
            )}
            {isPaid && !user && (
              <p className="mt-3 text-center text-lg font-bold tabular-nums text-ink">
                {formatMoneyFromCents(mod.priceCents!, locale)}
              </p>
            )}
            {!user && mod.pricing !== "FREE" && (
              <p className="mt-3 text-sm text-ink-muted">
                <Link href={`/${locale}/login?redirect=/${locale}/mods/${mod.slug}`} className="link font-semibold">
                  {t("signIn")}
                </Link>{" "}
                – {t("signInForPremium")}
              </p>
            )}
          </div>

          {primaryVersion && (
            <ModSecurityPanel
              scanStatus={primaryVersion.scanStatus}
              scannedAt={primaryVersion.scannedAt}
              isTrusted={!!primaryVersion.trustedFile}
              locale={locale}
            />
          )}

          <div className="rounded-xl border border-line bg-raised p-5">
            <h2 className="text-base font-semibold text-ink">{t("factsTitle")}</h2>
            <dl className="mt-2 divide-y divide-line">
              {primaryVersion && <Fact label={t("factVersion")}>{primaryVersion.version}</Fact>}
              {primaryVersion?.gameVersion && <Fact label={t("factGameVersion")}>{primaryVersion.gameVersion}</Fact>}
              <Fact label={t("factUpdated")}>{formatDate(mod.updatedAt, locale)}</Fact>
              {sizeLabel && <Fact label={t("factSize")}>{sizeLabel}</Fact>}
              <Fact label={t("factDownloads")}>
                <span className="inline-flex items-center gap-1">
                  <Download className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
                  {formatCompactNumber(mod.downloadCount, locale)}
                </span>
              </Fact>
              <Fact label={t("factRating")}>
                {hasRatings
                  ? `${safeIntlNumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(mod.averageRating)} · ${t("reviewCount", { count: mod.reviews.length })}`
                  : t("noRatingYet")}
              </Fact>
              <Fact label={t("factGame")}>{mod.game.name}</Fact>
              {mod.category && <Fact label={t("factCategory")}>{mod.category.name}</Fact>}
            </dl>
          </div>

          <ModDependenciesPanel
            locale={locale}
            required={depCheck.required}
            optional={depCheck.optional}
            missing={depCheck.missing}
          />

          <div className="rounded-xl border border-line bg-raised p-5">
            <p className="text-[13px] font-semibold text-ink-muted">{t("creatorLabel")}</p>
            <Link
              href={`/${locale}/creators/${creatorSlug}`}
              className="-mx-2 mt-2 flex items-center gap-3 rounded-md p-2 transition-colors duration-fast hover:bg-hover"
            >
              <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-elevated">
                <SafeImage src={mod.author.avatarUrl} alt="" fill className="object-cover" sizes="40px" />
              </span>
              <UserIdentity username={mod.author.username} displayName={mod.author.displayName} badges={creatorBadges} />
            </Link>
          </div>

          <div className="flex justify-end">
            <ReportContentButton targetType="MOD" targetId={mod.id} label={t("reportMod")} />
          </div>

          <AdLocationSlot location="sidebar" />
        </aside>
      </div>

      {relatedMods.length > 0 && (
        <section className="mt-16">
          <h2 className="text-lg font-semibold text-ink">{t("relatedTitle")}</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {relatedMods.map((m) => (
              <ModCard key={m.id} locale={locale} mod={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
