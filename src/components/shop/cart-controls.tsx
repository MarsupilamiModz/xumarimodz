"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CART_EVENT, CART_MAX, addToCart, readCart } from "@/lib/cart-store";
import { useAppToast } from "@/hooks/use-app-toast";

function useCartCount() {
  const [slugs, setSlugs] = useState<string[]>([]);
  useEffect(() => {
    const sync = () => setSlugs(readCart());
    sync();
    window.addEventListener(CART_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CART_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return slugs;
}

/** Warenkorb-Symbol im Header mit Anzahl (nur sichtbar, wenn etwas im Warenkorb liegt). */
export function CartLink({ locale }: { locale: string }) {
  const t = useTranslations("shop");
  const slugs = useCartCount();
  if (slugs.length === 0) return null;
  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link href={`/${locale}/cart`} aria-label={t("cartLabel", { count: slugs.length })}>
        <ShoppingCart className="h-4 w-4" aria-hidden />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet px-1 text-[10px] font-bold tabular-nums text-violet-on" aria-hidden>
          {slugs.length}
        </span>
      </Link>
    </Button>
  );
}

export function AddToCartButton({ slug, locale }: { slug: string; locale: string }) {
  const t = useTranslations("shop");
  const appToast = useAppToast();
  const slugs = useCartCount();
  const inCart = slugs.includes(slug);
  if (inCart) {
    return (
      <Button variant="outline" className="w-full" asChild>
        <Link href={`/${locale}/cart`}>
          <Check className="h-4 w-4" aria-hidden />
          {t("inCart")}
        </Link>
      </Button>
    );
  }
  return (
    <Button
      variant="outline"
      className="w-full"
      disabled={slugs.length >= CART_MAX}
      onClick={() => {
        if (addToCart(slug)) appToast.updated(t("added"));
      }}
    >
      <ShoppingCart className="h-4 w-4" aria-hidden />
      {t("addToCart")}
    </Button>
  );
}
