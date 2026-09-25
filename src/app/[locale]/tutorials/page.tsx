import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { GraduationCap, PlayCircle } from "lucide-react";
import { listPublishedTutorials } from "@/lib/tutorials/data";
import { formatDisplayName } from "@/lib/display-name";
import { EmptyState } from "@/components/ui/empty-state";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { SearchField } from "@/components/ui/search-field";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale, namespace: "common.tutorialsPage" });
  return { title: t("title"), description: t("subtitle") };
}

/** Übersicht der veröffentlichten Tutorials (Footer-Link „Tutorials“). */
export default async function TutorialsPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: { q?: string } }) {
  setRequestLocale(locale);
  const t = await getTranslations("common.tutorialsPage");
  const q = searchParams.q?.trim().slice(0, 100) || undefined;
  const tutorials = await listPublishedTutorials({ q }).catch(() => []);

  return (
    <div className="page-section">
      <h1 className="h1-display">{t("title")}</h1>
      <p className="mt-3 max-w-2xl text-ink-muted">{t("subtitle")}</p>
      <form method="get" action={`/${locale}/tutorials`} className="mt-6 max-w-sm">
        <SearchField label={t("search")} name="q" defaultValue={q} />
      </form>
      {tutorials.length === 0 ? (
        <EmptyState className="mt-8" icon={GraduationCap} title={t("emptyTitle")} description={t("emptyText")} />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tutorials.map((tu) => {
            const thumb = tu.youtubeThumbnail ?? tu.videoThumbUrl;
            return (
              <li key={tu.id}>
                <Link href={`/${locale}/tutorials/${tu.slug}`} className="group block overflow-hidden rounded-lg border border-line bg-raised transition-colors duration-fast hover:border-line-control">
                  <span className="relative block aspect-video bg-elevated">
                    {thumb ? <SafeImage src={thumb} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" /> : <CoverPlaceholder name={tu.title} />}
                    {(tu.type === "YOUTUBE" || tu.type === "VIDEO") && (
                      <PlayCircle className="absolute left-3 top-3 h-5 w-5 text-ink" aria-label={t("video")} />
                    )}
                  </span>
                  <span className="block p-4">
                    <span className="block text-[15px] font-semibold text-ink group-hover:text-violet-bright">{tu.title}</span>
                    <span className="meta mt-1 block truncate">
                      {[tu.category?.name, t(`level.${tu.level}`), formatDisplayName(tu.author)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
