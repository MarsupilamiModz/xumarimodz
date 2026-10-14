import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight, Crown, ShoppingBag } from "lucide-react";
import { getShopCatalog } from "@/actions/shop";
import { getCachedPublicBranding } from "@/lib/branding-data";
import { resolvePageContent } from "@/lib/branding-cms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { ShopPrice } from "@/components/shop/shop-price";
import { PageHeader } from "@/components/ui/page-header";
import { ChipTabs } from "@/components/ui/chip-tabs";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const t = await getTranslations({ locale, namespace: "shop" });
  return { title: t("title"), description: t("subtitle") };
}

// TODO(backend): Warenkorb und Kasse in 3 Schritten fehlen. Heute kauft man je Produkt direkt über
// Stripe (startShopProductCheckout) oder stellt eine Anfrage. Ein Warenkorb braucht ein eigenes Modell,
// einen Checkout mit mehreren Positionen, serverseitige Gutscheinprüfung und Tests im Stripe-Testmodus.
export default async function ShopPage(
  props: {
    params: Promise<{ locale: Locale }>;
    searchParams: Promise<{ category?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  const {
    locale
  } = params;

  setRequestLocale(locale);
  const t = await getTranslations("shop");
  const activeCategory = searchParams.category?.trim() || undefined;

  const [catalog, cms] = await Promise.all([
    getShopCatalog({ categorySlug: activeCategory }).catch(() => ({ products: [], categories: [] })),
    getCachedPublicBranding(),
  ]);
  const txt = (field: string, fallback: string) => resolvePageContent(cms.pageContent, "shop", locale, field, fallback);
  const { products, categories } = catalog;

  return (
    <div className="page-section">
      <PageHeader title={txt("heroTitle", t("title"))} description={txt("heroSubtitle", t("subtitle"))} />

      <Link
        href={`/${locale}/premium`}
        className="flex flex-col gap-4 rounded-lg border border-line bg-raised p-6 transition-colors duration-fast hover:border-line-control sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="flex items-center gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-elevated text-ink">
            <Crown className="h-5 w-5" aria-hidden />
          </span>
          <span>
            <span className="block text-lg font-semibold text-ink">{t("membershipTitle")}</span>
            <span className="block text-sm text-ink-muted">{t("membershipText")}</span>
          </span>
        </span>
        <span className="link inline-flex items-center gap-1 text-sm font-semibold">
          {t("membershipCta")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </Link>

      {categories.length > 0 && (
        <ChipTabs
          className="mt-8"
          label={t("categoriesLabel")}
          options={[{ value: "", label: t("allCategories") }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]}
          value={activeCategory ?? ""}
          hrefFor={(slug) => (slug ? `/${locale}/shop?category=${slug}` : `/${locale}/shop`)}
        />
      )}

      {products.length === 0 ? (
        <EmptyState className="mt-8" icon={ShoppingBag} title={activeCategory ? t("emptyCategory") : t("empty")} />
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
          {products.map((p) => {
            const image = p.coverImageUrl ?? p.thumbnailUrl ?? p.media[0]?.url ?? null;
            return (
              <li key={p.id} className="group relative flex flex-col overflow-hidden rounded-lg border border-line bg-raised transition-colors duration-fast hover:border-line-control focus-within:border-line-control">
                <div className="relative aspect-[16/10] bg-elevated">
                  {image ? (
                    <SafeImage src={image} alt="" fill className="object-cover" sizes="(max-width: 640px) 100vw, 25vw" />
                  ) : (
                    <CoverPlaceholder name={p.name} />
                  )}
                  <div className="absolute left-3 top-3 flex gap-1.5">
                    {p.isFeatured && <Badge variant="premium">{t("featured")}</Badge>}
                    {p.salePercent > 0 && <Badge variant="warning">−{p.salePercent} %</Badge>}
                  </div>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  {p.shopCategory && <p className="meta">{p.shopCategory.name}</p>}
                  <h2 className="mt-1 text-[15px] font-semibold text-ink">
                    <Link
                      href={`/${locale}/shop/${p.slug}`}
                      className="outline-none after:absolute after:inset-0 after:content-[''] focus-visible:after:rounded-lg focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-violet-bright"
                    >
                      {p.name}
                    </Link>
                  </h2>
                  {p.shortDescription && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{p.shortDescription}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-4">
                    <ShopPrice priceCents={p.priceCents} pricingMode={p.pricingMode} locale={locale} className="text-lg font-bold tabular-nums text-ink" />
                    <Button variant="outline" size="sm" tabIndex={-1} aria-hidden asChild>
                      <span>{t("viewProduct")}</span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="meta mt-6">{t("vatNote")}</p>
    </div>
  );
}
