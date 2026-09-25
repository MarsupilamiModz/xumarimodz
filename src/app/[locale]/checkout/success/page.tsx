import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CheckCircle2, Clock } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { getCheckoutResult } from "@/actions/cart";
import { formatEuro } from "@/lib/format-locale";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { ClearCartOnMount } from "@/components/shop/clear-cart-on-mount";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

/** W7 Bestellung fertig: zeigt die Bestellungen der Stripe-Session; „bezahlt“ erst nach bestätigtem Webhook. */
export default async function CheckoutSuccessPage({ params: { locale }, searchParams }: { params: { locale: Locale }; searchParams: { session_id?: string } }) {
  setRequestLocale(locale);
  await requireAuth(`/${locale}/login`);
  const t = await getTranslations("shop");
  const result = searchParams.session_id ? await getCheckoutResult(searchParams.session_id).catch(() => null) : null;

  if (!result || !result.success) {
    return (
      <div className="page-section">
        <EmptyState title={t("successMissingTitle")} description={t("successMissingText")} action={<Button asChild><Link href={`/${locale}/dashboard/orders`}>{t("toOrders")}</Link></Button>} />
      </div>
    );
  }

  const { paid, totalCents, orders } = result.data;
  const confirmed = orders.length > 0 && orders.every((o) => o.paymentStatus === "PAID");

  return (
    <div className="page-section max-w-2xl">
      {paid && <ClearCartOnMount />}
      <div className="flex items-start gap-3">
        {confirmed ? <CheckCircle2 className="mt-1 h-6 w-6 text-success" aria-hidden /> : <Clock className="mt-1 h-6 w-6 text-warning" aria-hidden />}
        <div>
          <h1 className="h1-display">{t("successTitle")}</h1>
          <p className="mt-2 text-ink-muted">{confirmed ? t("successConfirmed") : t("successPending")}</p>
        </div>
      </div>
      <ul className="mt-8 divide-y divide-line rounded-lg border border-line bg-raised">
        {orders.map((o) => (
          <li key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <span>
              <span className="font-semibold text-ink">{o.title}</span>
              {o.invoiceNumber && <span className="mono-id ml-2 text-ink-faint">{o.invoiceNumber}</span>}
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums">{formatEuro(o.finalAmountCents ?? 0, locale)}</span>
              <StatusBadge tone={o.paymentStatus === "PAID" ? "success" : "warning"} label={o.paymentStatus === "PAID" ? t("paid") : t("awaiting")} />
            </span>
          </li>
        ))}
        <li className="flex justify-between p-4 text-sm font-semibold">
          <span>{t("total")}</span>
          <span className="tabular-nums">{formatEuro(totalCents, locale)}</span>
        </li>
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button asChild><Link href={`/${locale}/dashboard/orders`}>{t("toOrders")}</Link></Button>
        <Button variant="outline" asChild><Link href={`/${locale}/shop`}>{t("toShop")}</Link></Button>
      </div>
    </div>
  );
}
