import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Layers } from "lucide-react";
import { listPublicCollections } from "@/lib/collections-data";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export default async function CollectionsPage(
  props: {
    params: Promise<{ locale: Locale }>;
  }
) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const [t, te] = await Promise.all([getTranslations("publicPages.collections"), getTranslations("ecosystem")]);
  const { items } = await listPublicCollections(1, 24);

  return (
    <div className="page-section">
      <PageHeader title={t("title")} description={t("subtitle")} />

      {items.length === 0 ? (
        <EmptyState icon={Layers} title={t("emptyTitle")} description={t("emptyText")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${locale}/collections/${c.slug}`}
                className="flex h-full flex-col rounded-lg border border-line bg-raised p-5 transition-colors duration-fast hover:border-line-control"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="section-title">{c.title}</h2>
                  {c.isFeatured && <Badge variant="outline">{te("featured")}</Badge>}
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-ink-muted">{c.description ?? te("noDescription")}</p>
                <p className="meta mt-auto pt-4 tabular-nums">
                  {t("stats", { mods: c._count.items, followers: c._count.followers, downloads: c.downloadCount })}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
