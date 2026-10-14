import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Newspaper } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDisplayName } from "@/lib/display-name";
import { formatDate } from "@/lib/format-locale";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import type { Locale } from "@/i18n/config";

export default async function BlogPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("publicPages.blog");

  const posts = await prisma.blogPost
    .findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: 20,
      include: { author: { select: { username: true, displayName: true } } },
    })
    .catch(() => []);

  return (
    <div className="page-section">
      <div className="max-w-3xl">
        <PageHeader title={t("title")} description={t("subtitle")} />
        {posts.length === 0 ? (
          <EmptyState icon={Newspaper} title={t("emptyTitle")} description={t("emptyText")} />
        ) : (
          <ul className="space-y-4">
            {posts.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/${locale}/blog/${p.slug}`}
                  className="block rounded-lg border border-line bg-raised p-5 transition-colors duration-fast hover:border-line-control"
                >
                  <h2 className="section-title">{p.title}</h2>
                  {p.excerpt && <p className="mt-1 text-sm text-ink-muted">{p.excerpt}</p>}
                  <p className="meta mt-3">
                    {p.publishedAt
                      ? t("byline", { author: formatDisplayName(p.author), date: formatDate(p.publishedAt, locale) })
                      : formatDisplayName(p.author)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
