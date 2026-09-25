"use client";

import Link from "next/link";
import { useEffect, useId, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, ShoppingCart, X } from "lucide-react";
import { getCartQuote, startCartCheckout } from "@/actions/cart";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { SafeImage } from "@/components/ui/safe-image";
import { CoverPlaceholder } from "@/components/ui/cover-placeholder";
import { useAppToast } from "@/hooks/use-app-toast";
import { CART_EVENT, readCart, removeFromCart } from "@/lib/cart-store";
import { formatEuro } from "@/lib/format-locale";

type Item = { slug: string; name: string; priceCents: number; thumbnailUrl: string | null; available: boolean };

/** W6 Kasse: Warenkorb mit Serverpreisen, Pflicht-Checkboxen AGB/Widerruf, Weiterleitung zu Stripe. */
export function CartCheckout({ locale, loggedIn }: { locale: string; loggedIn: boolean }) {
  const t = useTranslations("shop");
  const appToast = useAppToast();
  const uid = useId();
  const [items, setItems] = useState<Item[] | null>(null);
  const [total, setTotal] = useState(0);
  const [terms, setTerms] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [discord, setDiscord] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    const load = async () => {
      const slugs = readCart();
      if (slugs.length === 0) {
        if (active) {
          setItems([]);
          setTotal(0);
        }
        return;
      }
      const r = await getCartQuote(slugs);
      if (!active) return;
      if (r.success) {
        setItems(r.data.items);
        setTotal(r.data.totalCents);
      } else setItems([]);
    };
    void load();
    window.addEventListener(CART_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(CART_EVENT, load);
    };
  }, []);

  if (items === null) {
    return <div className="h-48 animate-pulse rounded-lg bg-raised" aria-busy="true" />;
  }
  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShoppingCart}
        title={t("cartEmptyTitle")}
        description={t("cartEmptyText")}
        action={
          <Button asChild>
            <Link href={`/${locale}/shop`}>{t("toShop")}</Link>
          </Button>
        }
      />
    );
  }

  const unavailable = items.some((i) => !i.available);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ul className="divide-y divide-line rounded-lg border border-line bg-raised">
        {items.map((i) => (
          <li key={i.slug} className="flex items-center gap-4 p-4">
            <span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-elevated">
              {i.thumbnailUrl ? <SafeImage src={i.thumbnailUrl} alt="" fill className="object-cover" sizes="80px" /> : <CoverPlaceholder name={i.name} variant="thumb" />}
            </span>
            <span className="min-w-0 flex-1">
              <Link href={`/${locale}/shop/${i.slug}`} className="block truncate text-sm font-semibold text-ink hover:text-violet-bright">{i.name}</Link>
              {!i.available && <span className="text-xs text-warning">{t("notAvailable")}</span>}
            </span>
            <span className="tabular-nums text-ink">{i.available ? formatEuro(i.priceCents, locale) : "—"}</span>
            <Button variant="ghost" size="icon" aria-label={t("remove", { name: i.name })} onClick={() => removeFromCart(i.slug)}>
              <X className="h-4 w-4" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>

      <aside className="space-y-4 rounded-lg border border-line bg-raised p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-ink-muted">{t("total")}</span>
          <span className="text-2xl font-bold tabular-nums text-ink">{formatEuro(total, locale)}</span>
        </div>
        <p className="meta">{t("vatNote")}</p>
        {!loggedIn ? (
          <Button className="w-full" asChild>
            <Link href={`/${locale}/login?redirect=/${locale}/cart`}>{t("signInToCheckout")}</Link>
          </Button>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const r = await startCartCheckout({
                  slugs: items.filter((i) => i.available).map((i) => i.slug),
                  acceptTerms: terms as true,
                  waiveWithdrawal: waiver as true,
                  discord: discord.trim() || undefined,
                  locale,
                  origin: window.location.origin,
                });
                if (!r.success) {
                  appToast.error(r.error);
                  return;
                }
                if (r.data.checkoutUrl) window.location.href = r.data.checkoutUrl;
              });
            }}
          >
            <div>
              <label htmlFor={`${uid}-discord`} className="label-text mb-1.5 block text-ink-muted">{t("discordOptional")}</label>
              <Input id={`${uid}-discord`} value={discord} onChange={(e) => setDiscord(e.target.value)} maxLength={64} />
            </div>
            <Checkbox
              checked={terms}
              onCheckedChange={setTerms}
              label={
                <span>
                  {t("acceptTerms")}{" "}
                  <Link href={`/${locale}/legal/terms`} className="link" target="_blank">{t("termsLink")}</Link>
                </span>
              }
            />
            <Checkbox
              checked={waiver}
              onCheckedChange={setWaiver}
              label={
                <span>
                  {t("withdrawalWaiver")}{" "}
                  <Link href={`/${locale}/legal/withdrawal`} className="link" target="_blank">{t("withdrawalLink")}</Link>
                </span>
              }
            />
            {unavailable && <p className="text-xs text-warning">{t("removeUnavailable")}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={pending || !terms || !waiver || unavailable} aria-busy={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {t("payNow")}
            </Button>
          </form>
        )}
      </aside>
    </div>
  );
}
