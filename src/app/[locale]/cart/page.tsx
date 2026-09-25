import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { CartCheckout } from "@/components/shop/cart-checkout";
import type { Locale } from "@/i18n/config";

export async function generateMetadata({ params: { locale } }: { params: { locale: Locale } }) {
  const t = await getTranslations({ locale, namespace: "shop" });
  return { title: t("cartTitle"), robots: { index: false } };
}

/** W6 Warenkorb und Kasse. */
export default async function CartPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const [t, user] = await Promise.all([getTranslations("shop"), getCurrentUser()]);
  return (
    <div className="page-section">
      <h1 className="h1-display">{t("cartTitle")}</h1>
      <p className="mb-8 mt-3 text-ink-muted">{t("cartSubtitle")}</p>
      <CartCheckout locale={locale} loggedIn={!!user} />
    </div>
  );
}
