import Link from "next/link";
import { BookOpen, ShoppingBag } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { requireAuth } from "@/lib/auth";
import { getUserLibrary } from "@/actions/shop";
import { ModCard } from "@/components/mods/mod-card";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { formatCreditsFromCents } from "@/lib/credits";
import { formatDateTime } from "@/lib/format-locale";
import { mapModMedia } from "@/lib/mod-media";
import type { Locale } from "@/i18n/config";

export default async function LibraryPage(props: { params: Promise<{ locale: Locale }> }) {
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const user = await requireAuth(`/${locale}/login`);
  const [t, ta] = await Promise.all([getTranslations("dashboard"), getTranslations("accountPages.library")]);
  const { modPurchases, shopPurchases } = await getUserLibrary(user.id);

  return (
    <div>
      <PageHeader title={t("library")} description={ta("description")} />

      <div className="space-y-6">
        <section aria-labelledby="library-mods">
          <h2 id="library-mods" className="section-title mb-4">
            {ta("ownedMods", { count: modPurchases.length })}
          </h2>
          {modPurchases.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={ta("emptyModsTitle")}
              description={ta("emptyModsText")}
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/${locale}/shop`}>{ta("visitShop")}</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {modPurchases.map((p) =>
                p.mod ? (
                  <ModCard
                    key={p.id}
                    locale={locale}
                    mod={{
                      id: p.mod.id,
                      slug: p.mod.slug,
                      title: p.mod.title,
                      pricing: p.mod.pricing,
                      downloadCount: p.mod.downloadCount,
                      averageRating: 0,
                      game: p.mod.game,
                      media: mapModMedia(p.mod.media ?? []),
                      screenshots: p.mod.screenshots,
                    }}
                    showLike={false}
                  />
                ) : null
              )}
            </div>
          )}
        </section>

        <section aria-labelledby="library-shop">
          <h2 id="library-shop" className="section-title mb-4">
            {ta("shopPurchases", { count: shopPurchases.length })}
          </h2>
          <DataTable
            caption={ta("shopPurchases", { count: shopPurchases.length })}
            rows={shopPurchases}
            rowKey={(p) => p.id}
            empty={<EmptyState icon={ShoppingBag} title={ta("emptyShopTitle")} description={ta("emptyShopText")} />}
            columns={[
              {
                key: "product",
                header: ta("colProduct"),
                width: "minmax(0,2fr)",
                cell: (p) => <span className="block truncate font-medium text-ink">{p.product.name}</span>,
              },
              {
                key: "type",
                header: ta("colType"),
                width: "140px",
                hideOnMobile: true,
                cell: (p) => <span className="text-ink-muted">{ta(`productType.${p.product.productType}`)}</span>,
              },
              {
                key: "date",
                header: ta("colDate"),
                width: "160px",
                hideOnMobile: true,
                cell: (p) => <span className="text-ink-muted">{formatDateTime(p.createdAt, locale)}</span>,
              },
              {
                key: "price",
                header: ta("colPrice"),
                width: "120px",
                align: "right",
                cell: (p) =>
                  p.creditsSpent > 0
                    ? formatCreditsFromCents(p.creditsSpent, locale)
                    : formatCreditsFromCents(p.priceCents, locale),
              },
            ]}
          />
        </section>
      </div>
    </div>
  );
}
