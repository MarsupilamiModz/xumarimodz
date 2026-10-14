import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ChevronLeft } from "lucide-react";
import { getShopProduct } from "@/actions/shop";
import { getCurrentUser } from "@/lib/auth";
import { ShopProductOrderPage } from "@/components/shop/enterprise-shop";
import type { Locale } from "@/i18n/config";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const params = await props.params;

  const {
    slug
  } = params;

  const product = await getShopProduct(slug).catch(() => null);
  if (!product) return { title: "Shop" };
  const image = product.coverImageUrl ?? product.thumbnailUrl ?? undefined;
  return {
    title: product.name,
    description: product.shortDescription ?? undefined,
    openGraph: { title: product.name, description: product.shortDescription ?? undefined, ...(image ? { images: [{ url: image }] } : {}) },
  };
}

export default async function ShopProductPage(props: { params: Promise<{ locale: Locale; slug: string }> }) {
  const params = await props.params;

  const {
    locale,
    slug
  } = params;

  setRequestLocale(locale);
  const [t, product, user] = await Promise.all([
    getTranslations("shop.product"),
    getShopProduct(slug).catch(() => null),
    getCurrentUser(),
  ]);
  if (!product) notFound();

  return (
    <div className="page-section pt-8 md:pt-10">
      <Link href={`/${locale}/shop`} className="mb-6 inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink">
        <ChevronLeft className="h-4 w-4" aria-hidden />
        {t("back")}
      </Link>
      <ShopProductOrderPage product={product} locale={locale} isLoggedIn={!!user} />
    </div>
  );
}
