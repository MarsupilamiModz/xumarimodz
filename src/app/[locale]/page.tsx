import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  ArrowRight,
  Download,
  Gamepad2,
  HeartHandshake,
  History,
  Layers,
  ShieldCheck,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SafeImage } from "@/components/ui/safe-image";
import { ModCard } from "@/components/mods/mod-card";
import { GameDiscoveryGrid } from "@/components/games/game-discovery-grid";
import { getGamesDiscoveryCards } from "@/lib/game-discovery";
import { getTrendingMods, getGameBySlug } from "@/lib/data";
import { primaryGameSlug } from "@/i18n/config";
import { getActiveAnnouncements } from "@/actions/admin/announcements";
import { AnnouncementBar } from "@/components/announcements/announcement-bar";
import { REVALIDATE } from "@/lib/cache";
import { AdLocationSlot } from "@/components/ads/ad-location-slot";
import { getCachedPublicBranding } from "@/lib/branding-data";
import { resolvePageContent } from "@/lib/branding-cms";
import type { Locale } from "@/i18n/config";
import { MembershipCampaignBanner } from "@/components/membership/membership-campaign-banner";
import { FaqList } from "@/components/faq/faq-list";
import { getFaqEntries } from "@/lib/faq";

export const revalidate = REVALIDATE.homepage;

const FEATURE_ICONS: LucideIcon[] = [Download, ShieldCheck, Layers, History, UserRound, HeartHandshake];

function SectionHeader({ title, href, linkLabel }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      {href && linkLabel && (
        <Link href={href} className="link inline-flex items-center gap-1 text-sm font-semibold">
          {linkLabel}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
    </div>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;

  setRequestLocale(locale);
  const t = await getTranslations("landing");
  const tm = await getTranslations("mods");
  const tc = await getTranslations("common");

  const [games, primaryGame, announcements, cms] = await Promise.all([
    getGamesDiscoveryCards().catch(() => []),
    getGameBySlug(primaryGameSlug).catch(() => null),
    getActiveAnnouncements().catch(() => []),
    getCachedPublicBranding(),
  ]);

  const mods = await getTrendingMods(8, primaryGame?.id).catch(() => []);

  const page = cms.pageContent;
  const txt = (field: string, fallback: string) =>
    resolvePageContent(page, "homepage", locale, field, fallback);
  // Nur im ACP gesetzte Werte, ohne Standardtext (Hero-Bild).
  const cmsOnly = (field: string) => resolvePageContent(page, "homepage", locale, field, "").trim();

  const pricingLabels: Record<string, string> = {
    FREE: tm("free"),
    PREMIUM: tm("premium"),
    PAID: tm("paid"),
  };

  const features = FEATURE_ICONS.map((icon, i) => {
    const n = i + 1;
    return {
      icon,
      title: txt(`feature${n}Title`, t(`feature${n}Title`)),
      text: txt(`feature${n}Text`, t(`feature${n}Text`)),
    };
  });

  const faqs = await getFaqEntries(locale);

  // TODO(content): App-Screenshot im ACP hinterlegen (Webseite → Inhalte → Startseite → heroImageUrl).
  const heroImageUrl = cmsOnly("heroImageUrl");

  return (
    <div>
      <MembershipCampaignBanner locale={locale} />
      {announcements.length > 0 && (
        <div className="page-container pt-4">
          <AnnouncementBar
            items={announcements.map((a) => ({ id: a.id, title: a.title, content: a.content, link: a.link, kind: a.kind }))}
            kindLabels={{
              news: tc("announcementKind.news"),
              update: tc("announcementKind.update"),
              maintenance: tc("announcementKind.maintenance"),
              warning: tc("announcementKind.warning"),
            }}
            moreLabel={t("announcementMore")}
          />
        </div>
      )}

      {/* Hero: Text links, App-Screenshot rechts */}
      <section className="page-section">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <p className="meta font-semibold">{txt("heroBadge", t("heroBadge"))}</p>
            <h1 className="h1-display mt-3">{txt("heroTitle", t("heroTitle"))}</h1>
            <p className="mt-5 max-w-xl text-base text-ink-muted md:text-lg">
              {txt("heroSubtitle", t("heroSubtitle"))}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href={`/${locale}/download`}>
                  <Download className="h-4 w-4" aria-hidden />
                  {txt("heroDownload", t("heroDownload"))}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href={`/${locale}/premium`}>{txt("goPremium", t("heroPremium"))}</Link>
              </Button>
              <Link href={`/${locale}/mods`} className="link px-2 text-sm font-semibold">
                {txt("browseMods", t("browseMods"))}
              </Link>
            </div>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-line bg-elevated">
            {heroImageUrl ? (
              <SafeImage src={heroImageUrl} alt={t("heroScreenshot")} fill priority className="object-cover" sizes="(max-width: 1024px) 100vw, 55vw" />
            ) : (
              <div role="img" aria-label={t("heroScreenshot")} className="flex h-full items-center justify-center p-6">
                <span className="text-lg font-bold text-ink-muted">{t("heroScreenshot")}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <AdLocationSlot location="homepage" className="page-container" />

      <section className="page-section">
        <SectionHeader title={t("gamesTitle")} href={`/${locale}/games`} linkLabel={t("viewAllGames")} />
        {games.length === 0 ? (
          <EmptyState icon={Gamepad2} title={t("noGamesYet")} />
        ) : (
          <GameDiscoveryGrid locale={locale} games={games} priorityCount={5} />
        )}
      </section>

      <section className="page-section border-y border-line bg-raised">
        <SectionHeader title={txt("featuresTitle", t("featuresTitle"))} />
        <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <li key={title}>
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-elevated text-ink">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-muted">{text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="page-section">
        <SectionHeader
          title={t("popularTitle")}
          href={mods.length > 0 ? `/${locale}/mods` : undefined}
          linkLabel={t("viewAllMods")}
        />
        {mods.length === 0 ? (
          <EmptyState icon={Layers} title={t("noModsYet")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {mods.map((mod, index) => (
              <ModCard key={mod.id} locale={locale} mod={mod} pricingLabel={pricingLabels[mod.pricing] ?? mod.pricing} priority={index === 0} />
            ))}
          </div>
        )}
      </section>

      <section className="page-container">
        <div className="flex flex-col gap-6 rounded-xl border border-line bg-raised p-8 md:flex-row md:items-center md:justify-between md:p-10">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold text-ink">{txt("premiumBanner", t("premiumBanner"))}</h2>
            <p className="mt-2 text-ink-muted">{txt("premiumBannerDesc", t("premiumBannerDesc"))}</p>
          </div>
          <Button size="lg" asChild>
            <Link href={`/${locale}/premium`}>{txt("premiumCta", t("premiumCta"))}</Link>
          </Button>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="page-section">
          <div className="max-w-3xl">
            <SectionHeader title={txt("faqTitle", t("faqTitle"))} href={`/${locale}/faq`} linkLabel={t("faqAll")} />
            <FaqList entries={faqs} />
          </div>
        </section>
      )}
    </div>
  );
}
