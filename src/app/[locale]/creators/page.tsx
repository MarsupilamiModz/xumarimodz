import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { getFeaturedCreatorsDiscovery, getTrendingCreators } from "@/lib/creators";
import { getCreatorModStats } from "@/lib/creator-stats";
import { formatCompactNumber } from "@/lib/format-locale";
import { CreatorDiscoveryCard, type CreatorCardItem } from "@/components/creator/creator-discovery-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import type { Metadata } from "next";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: "ecosystem" });
  return { title: t("creatorDiscovery"), description: t("creatorDiscoverySubtitle") };
}

type CreatorRow = CreatorCardItem & { userId: string };

function CreatorGrid({ children }: { children: React.ReactNode }) {
  return <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</ul>;
}

export default async function CreatorsPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("ecosystem");

  const [featured, trending, all] = await Promise.all([
    getFeaturedCreatorsDiscovery(8).catch(() => []),
    getTrendingCreators(8).catch(() => []),
    // Reihenfolge wie im ACP unter „Sichtbare Creator“ festgelegt.
    prisma.creatorProfile
      .findMany({
        where: { isPublic: true, isSuspended: false },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        take: 48,
        include: { user: { select: { username: true, displayName: true, avatarUrl: true } } },
      })
      .catch(() => []),
  ]);

  const rows: CreatorRow[] = [...featured, ...trending, ...all];
  const stats = await getCreatorModStats(Array.from(new Set(rows.map((c) => c.userId)))).catch(() => new Map());

  const metaFor = (c: CreatorRow) => {
    const s = stats.get(c.userId) ?? { downloads: 0, mods: 0 };
    return [t("modsCount", { count: s.mods }), t("downloadsCount", { value: formatCompactNumber(s.downloads, locale) })].join(" · ");
  };
  const card = (c: CreatorRow) => (
    <li key={c.id}>
      <CreatorDiscoveryCard locale={locale} creator={c} meta={metaFor(c)} featuredLabel={t("featured")} />
    </li>
  );

  // Hervorgehobene und angesagte Creator stehen oben; darunter alle übrigen, jeder nur einmal.
  const shownAbove = new Set([...featured, ...trending].map((c) => c.id));
  const rest = all.filter((c) => !shownAbove.has(c.id));
  const trendingOnly = trending.filter((c) => !featured.some((f) => f.id === c.id));

  return (
    <div className="page-section">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="h1-display">{t("creatorDiscovery")}</h1>
          <p className="mt-3 max-w-2xl text-ink-muted">{t("creatorDiscoverySubtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/${locale}/become-creator`}>{t("becomeCreator")}</Link>
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-10"
          icon={Users}
          title={t("noCreators")}
          action={
            <Button asChild>
              <Link href={`/${locale}/become-creator`}>{t("becomeCreator")}</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-10 space-y-12">
          {featured.length > 0 && (
            <section aria-labelledby="creators-featured">
              <h2 id="creators-featured" className="mb-4 text-lg font-semibold text-ink">{t("featuredCreators")}</h2>
              <CreatorGrid>{featured.map(card)}</CreatorGrid>
            </section>
          )}
          {trendingOnly.length > 0 && (
            <section aria-labelledby="creators-trending">
              <h2 id="creators-trending" className="mb-4 text-lg font-semibold text-ink">{t("trendingCreators")}</h2>
              <CreatorGrid>{trendingOnly.map(card)}</CreatorGrid>
            </section>
          )}
          {rest.length > 0 && (
            <section aria-labelledby="creators-all">
              <h2 id="creators-all" className="mb-4 text-lg font-semibold text-ink">
                {shownAbove.size > 0 ? t("moreCreators") : t("allCreators")}
              </h2>
              <CreatorGrid>{rest.map(card)}</CreatorGrid>
            </section>
          )}
        </div>
      )}

      {rows.length > 0 && (
      <section className="mt-16 flex flex-col gap-4 rounded-lg border border-line bg-raised p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">{t("creatorCtaTitle")}</h2>
          <p className="mt-1 text-sm text-ink-muted">{t("creatorCtaText")}</p>
        </div>
        <Button asChild>
          <Link href={`/${locale}/become-creator`}>{t("becomeCreator")}</Link>
        </Button>
      </section>
      )}
    </div>
  );
}
